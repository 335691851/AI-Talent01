"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, CheckCircle2, Loader2, Send, UserRound } from "lucide-react";
import type { AssessmentMessage, AssessmentSession } from "@/lib/types";

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
}

function MessageBubble({
  message,
  streaming,
}: {
  message: AssessmentMessage;
  streaming: boolean;
}) {
  const isUser = message.role === "user";
  const content = message.content || (streaming && !isUser ? "AI 正在生成..." : "");

  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser ? (
        <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-blue-600 text-white">
          <Bot className="h-4 w-4" />
        </div>
      ) : null}
      <div className={`max-w-[78%] ${isUser ? "items-end" : "items-start"} flex flex-col`}>
        <div className={`mb-1 flex items-center gap-2 text-xs ${isUser ? "justify-end text-blue-700" : "text-slate-500"}`}>
          <span>{isUser ? "我" : "AI 能力测评助手"}</span>
          <span className="font-mono">{formatTime(message.createdAt)}</span>
          <span>第 {message.roundNo} 轮</span>
        </div>
        <div
          className={[
            "whitespace-pre-wrap break-words rounded-lg px-4 py-3 text-sm leading-6 shadow-sm",
            isUser
              ? "bg-blue-600 text-white"
              : "border border-slate-200 bg-white text-slate-800",
          ].join(" ")}
        >
          {content}
          {streaming && !isUser && !message.content ? (
            <span className="ml-1 inline-flex align-middle">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
            </span>
          ) : null}
        </div>
      </div>
      {isUser ? (
        <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-700">
          <UserRound className="h-4 w-4" />
        </div>
      ) : null}
    </div>
  );
}

export function AssessmentChatbox({ session }: { session: AssessmentSession | null }) {
  const router = useRouter();
  const [messages, setMessages] = useState<AssessmentMessage[]>(session?.messages ?? []);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState("");
  const scrollAnchorRef = useRef<HTMLDivElement>(null);

  const progress = useMemo(() => {
    if (!session) return { current: 0, total: 10, percent: 0 };
    return {
      current: session.currentRound,
      total: session.totalRounds,
      percent: Math.round((session.currentRound / session.totalRounds) * 100),
    };
  }, [session]);

  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, streaming]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || streaming || !input.trim()) return;

    const userMessage: AssessmentMessage = {
      id: `local-user-${Date.now()}`,
      role: "user",
      content: input.trim(),
      roundNo: session.currentRound,
      createdAt: new Date().toISOString(),
    };
    const assistantId = `local-assistant-${Date.now()}`;

    setMessages((items) => [
      ...items,
      userMessage,
      {
        id: assistantId,
        role: "assistant",
        content: "",
        roundNo: Math.min(session.currentRound + 1, session.totalRounds),
        createdAt: new Date().toISOString(),
      },
    ]);
    setInput("");
    setStreaming(true);
    setError("");

    try {
      const response = await fetch("/api/assessment/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.id, message: userMessage.content }),
      });

      if (!response.ok || !response.body) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "AI 响应失败。");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((items) =>
          items.map((message) =>
            message.id === assistantId
              ? { ...message, content: `${message.content}${chunk}` }
              : message,
          ),
        );
      }

      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "AI 响应失败。");
    } finally {
      setStreaming(false);
    }
  }

  function handleInputKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;

    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }

  if (!session) {
    return (
      <div className="flex min-h-[640px] items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
        <div>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-blue-600 text-white">
            <Bot className="h-5 w-5" />
          </div>
          <div className="mt-4 text-base font-semibold text-slate-950">还没有进行中的 AI 自评估</div>
          <div className="mt-2 text-sm text-slate-500">点击“开始新评估”后，AI 会主动发起 10 轮能力测评。</div>
        </div>
      </div>
    );
  }

  const isCompleted = session.status !== "in_progress";

  return (
    <div className="flex h-[720px] min-h-[640px] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white">
      <header className="border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-blue-600 text-white">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-semibold text-slate-950">AI 能力测评助手</h2>
                <span className="rounded border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                  流式对话
                </span>
                {isCompleted ? (
                  <span className="inline-flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    已完成
                  </span>
                ) : null}
              </div>
              <div className="mt-1 text-sm text-slate-500">
                第 {progress.current} / {progress.total} 轮
              </div>
            </div>
          </div>
          <div className="min-w-[240px]">
            <div className="mb-1 flex justify-between text-xs text-slate-500">
              <span>测评进度</span>
              <span className="font-mono">{progress.percent}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded bg-slate-100">
              <div className="h-full rounded bg-blue-600" style={{ width: `${progress.percent}%` }} />
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto bg-slate-50/80 px-4 py-5">
        <div className="mx-auto flex max-w-5xl flex-col gap-5">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} streaming={streaming} />
          ))}
          <div ref={scrollAnchorRef} />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="border-t border-slate-200 bg-white p-4">
        {error ? (
          <div className="mb-3 rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-700">
            {error}
          </div>
        ) : null}
        <div className="mx-auto max-w-5xl">
          <div className="flex items-end gap-3 rounded-lg border border-slate-300 bg-white p-2 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleInputKeyDown}
              disabled={streaming || isCompleted}
              rows={2}
              className="max-h-36 min-h-12 flex-1 resize-none bg-transparent px-2 py-2 text-sm leading-6 outline-none disabled:text-slate-400"
              placeholder={isCompleted ? "本次评估已结束" : "输入本轮回答..."}
            />
            <button
              type="submit"
              disabled={streaming || isCompleted || !input.trim()}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              aria-label="发送"
            >
              {streaming ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
