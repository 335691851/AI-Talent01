import { NextRequest } from "next/server";
import { generateText, streamText } from "ai";
import { z } from "zod";
import { env, hasDeepSeekEnv } from "@/lib/config";
import { getDeepSeekChatModel } from "@/lib/ai/deepseek";
import { generateEmployeeEmbeddings } from "@/lib/ai/embedding";
import {
  advanceAssessmentRound,
  completeAssessmentSession,
  getAssessmentSession,
  saveAssistantAssessmentMessage,
  saveUserAssessmentMessage,
} from "@/lib/db/assessment";
import { getEmployeeProfileById } from "@/lib/db/queries";
import { requireSession } from "@/lib/auth/session";
import {
  buildAssessmentSystemPrompt,
  buildDemoEvaluation,
  buildDemoQuestion,
  buildFinalEvaluationPrompt,
  buildNextQuestionPrompt,
  parseEvaluationJson,
} from "@/lib/assessment/prompts";

export const maxDuration = 60;

const requestSchema = z.object({
  sessionId: z.string().uuid(),
  message: z.string().min(1).max(6000),
});

function textResponse(text: string) {
  const encoder = new TextEncoder();
  const chunks = text.match(/.{1,18}/g) ?? [text];

  const stream = new ReadableStream({
    async start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
        await new Promise((resolve) => setTimeout(resolve, 18));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(request: NextRequest) {
  const user = await requireSession();
  const body = requestSchema.parse(await request.json());
  const useDemoAi =
    env.forceDemoAiResponses ||
    (process.env.NODE_ENV !== "production" && request.headers.get("x-ai-demo-mode") === "true") ||
    !hasDeepSeekEnv();
  const session = await getAssessmentSession(body.sessionId);

  if (!session) {
    return Response.json({ error: "评估会话不存在。" }, { status: 404 });
  }

  if (user.role !== "employee" || user.employeeId !== session.employeeId) {
    return Response.json({ error: "AI 自评估对话只允许员工本人访问，管理员不能查看或操作完整 Chat 数据。" }, { status: 403 });
  }

  if (session.status !== "in_progress") {
    return Response.json({ error: "该评估会话已结束。" }, { status: 409 });
  }

  const profile = await getEmployeeProfileById(session.employeeId);
  if (!profile) {
    return Response.json({ error: "员工档案不存在。" }, { status: 404 });
  }

  const roundNo = session.currentRound;
  await saveUserAssessmentMessage(session.id, roundNo, body.message);

  const messages = [
    ...session.messages,
    {
      id: "current",
      role: "user" as const,
      content: body.message,
      roundNo,
      createdAt: new Date().toISOString(),
    },
  ];

  if (roundNo >= session.totalRounds) {
    if (useDemoAi) {
      const evaluation = buildDemoEvaluation(profile);
      const finalText = [
        `评估完成。AI 分数：${evaluation.score} 分。`,
        "",
        evaluation.explanation,
        "",
        `结构化摘要：${evaluation.structured_summary}`,
      ].join("\n");

      await completeAssessmentSession(session.id, profile, evaluation);
      await generateEmployeeEmbeddings(profile.id).catch((error) => {
        console.warn("Embedding generation failed after demo assessment:", error);
      });
      return textResponse(finalText);
    }

    const { text } = await generateText({
      model: getDeepSeekChatModel(),
      system: "你必须严格输出 JSON，不要输出 Markdown。",
      prompt: buildFinalEvaluationPrompt(profile, messages),
    });
    const evaluation = parseEvaluationJson(text);
    const finalText = [
      `评估完成。AI 分数：${evaluation.score} 分。`,
      "",
      evaluation.explanation,
      "",
      `结构化摘要：${evaluation.structured_summary}`,
    ].join("\n");

    await completeAssessmentSession(session.id, profile, evaluation);
    await generateEmployeeEmbeddings(profile.id).catch((error) => {
      console.warn("Embedding generation failed after assessment:", error);
    });
    return textResponse(finalText);
  }

  const nextRound = roundNo + 1;

  if (useDemoAi) {
    const answer = buildDemoQuestion(nextRound);
    await saveAssistantAssessmentMessage(session.id, nextRound, answer);
    await advanceAssessmentRound(session.id, nextRound);
    return textResponse(answer);
  }

  const result = streamText({
    model: getDeepSeekChatModel(),
    system: buildAssessmentSystemPrompt(profile),
    prompt: buildNextQuestionPrompt(nextRound, messages),
  });

  const encoder = new TextEncoder();
  let fullText = "";

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const delta of result.textStream) {
          fullText += delta;
          controller.enqueue(encoder.encode(delta));
        }
        await saveAssistantAssessmentMessage(session.id, nextRound, fullText);
        await advanceAssessmentRound(session.id, nextRound);
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
