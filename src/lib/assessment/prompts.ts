import type { AssessmentMessage, EmployeeProfile } from "@/lib/types";

export const ASSESSMENT_DIMENSIONS = [
  "AI 产品与系统使用熟练度",
  "技术栈理解与工程实现能力",
  "项目经验真实性与复杂度",
  "业务问题拆解与场景匹配能力",
  "提示词、流程编排与自动化意识",
  "数据、安全、合规与风险意识",
];

export function buildAssessmentSystemPrompt(profile: EmployeeProfile) {
  return [
    "你是企业 AI 人才评估助手，任务是通过 10 轮对话评估员工 AI 能力。",
    "每轮只提出 1 个清晰问题，不要一次问多个问题。",
    "问题要结合员工档案，逐步覆盖产品能力、技术栈、项目经验、业务拆解、自动化与风险意识。",
    "语气专业、简洁、可执行，不要输出评分，只有第 10 轮结束后才生成结果。",
    "",
    "员工档案：",
    `姓名：${profile.name}`,
    `岗位：${profile.position || "-"}`,
    `岗位描述：${profile.positionDescription || "-"}`,
    `级别：${profile.level || "-"}`,
    `产品能力：${profile.productAbility || "-"}`,
    `技术栈能力：${profile.technicalAbility || "-"}`,
    `项目经验：${profile.projectExperience || "-"}`,
  ].join("\n");
}

export function buildNextQuestionPrompt(round: number, messages: AssessmentMessage[]) {
  const transcript = messages
    .map((message) => `${message.role === "assistant" ? "AI" : "员工"}：${message.content}`)
    .join("\n");

  return [
    `现在需要生成第 ${round} 轮问题。`,
    "请根据已经完成的对话继续追问，问题要更具体，避免重复。",
    "只输出这一轮问题本身。",
    "",
    "已有对话：",
    transcript || "暂无",
  ].join("\n");
}

export function buildFinalEvaluationPrompt(profile: EmployeeProfile, messages: AssessmentMessage[]) {
  const transcript = messages
    .map((message) => `${message.role === "assistant" ? "AI" : "员工"}：${message.content}`)
    .join("\n");

  return [
    "你是企业 AI 人才评估专家。请基于员工档案和 10 轮 AI 自评估对话生成最终评估结果。",
    "必须只输出 JSON，不要输出 Markdown，不要输出额外说明。",
    "评分标准：0-59 基础薄弱；60-74 入门可用；75-84 熟练应用；85-94 复合型 AI 能力；95-100 高潜专家。",
    "JSON 字段：score(number, 0-100), explanation(string, 长文本), structured_summary(string, 面向管理员检索的结构化摘要), strengths(string[]), risks(string[]), recommended_projects(string[])。",
    "",
    `评估维度：${ASSESSMENT_DIMENSIONS.join("、")}`,
    "",
    "员工档案：",
    `姓名：${profile.name}`,
    `岗位：${profile.position || "-"}`,
    `岗位描述：${profile.positionDescription || "-"}`,
    `级别：${profile.level || "-"}`,
    `产品能力：${profile.productAbility || "-"}`,
    `技术栈能力：${profile.technicalAbility || "-"}`,
    `项目经验：${profile.projectExperience || "-"}`,
    "",
    "10 轮对话：",
    transcript,
  ].join("\n");
}

export function buildDemoQuestion(round: number) {
  const questions = [
    "请先说明你目前最常使用的 AI 产品或系统，以及它们主要帮助你完成哪些工作任务？",
    "请选择一个你最熟悉的 AI 工具，说明你如何把一个业务需求拆成可执行的 AI 工作流。",
    "请描述你在技术栈、框架或数据处理方面的能力，哪些能力可以支持 AI 项目落地？",
    "请举一个你参与过的 AI 或自动化相关项目，说明目标、技术方案、你的职责和最终效果。",
    "当 AI 输出不稳定或质量不达标时，你通常会如何定位问题并改进？",
    "如果让你为当前岗位设计一个 AI 提效场景，你会选择哪个场景，为什么？",
    "请说明你对数据安全、隐私、权限或模型幻觉风险的理解，以及实际处理方式。",
    "你是否搭建过 RAG、数据查询助手、智能体或类似系统？请说明架构和关键难点。",
    "在跨部门 AI 项目中，你如何和业务、技术、管理角色协作推进？",
    "最后请总结你的 AI 能力优势、短板，以及未来 3 个月最想提升的方向。",
  ];

  return questions[Math.max(0, Math.min(questions.length - 1, round - 1))];
}

export function buildDemoEvaluation(profile: EmployeeProfile) {
  const score = profile.technicalAbility || profile.projectExperience ? 82 : 72;
  return {
    score,
    explanation:
      "员工已具备可用的 AI 产品使用经验，能够围绕岗位场景描述 AI 提效方式。技术栈和项目经验信息可继续补充可验证成果、数据规模、系统边界和风险控制细节，以便提升综合评估置信度。",
    structured_summary: `岗位为${profile.position || "未填写"}，产品能力：${profile.productAbility || "未填写"}；技术栈能力：${profile.technicalAbility || "未填写"}；项目经验：${profile.projectExperience || "未填写"}。适合进入 AI 工具使用、流程提效和轻量数据查询助手类项目候选池。`,
    strengths: ["AI 产品使用意识较明确", "能结合岗位描述业务场景"],
    risks: ["项目成果量化信息不足", "工程实现深度需要进一步核验"],
    recommended_projects: ["AI 办公提效", "数据查询助手", "业务流程自动化"],
  };
}

export function parseEvaluationJson(text: string) {
  const jsonText = text.match(/\{[\s\S]*\}/)?.[0] ?? text;
  const parsed = JSON.parse(jsonText) as {
    score: number;
    explanation: string;
    structured_summary: string;
    strengths?: string[];
    risks?: string[];
    recommended_projects?: string[];
  };

  return {
    score: Math.max(0, Math.min(100, Math.round(Number(parsed.score) || 0))),
    explanation: String(parsed.explanation || ""),
    structured_summary: String(parsed.structured_summary || ""),
    strengths: parsed.strengths ?? [],
    risks: parsed.risks ?? [],
    recommended_projects: parsed.recommended_projects ?? [],
  };
}
