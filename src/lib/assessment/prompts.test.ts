import { describe, expect, it } from "vitest";
import {
  buildAssessmentSystemPrompt,
  buildDemoEvaluation,
  buildDemoQuestion,
  parseEvaluationJson,
} from "@/lib/assessment/prompts";
import type { EmployeeProfile } from "@/lib/types";

const profile: EmployeeProfile = {
  id: "employee-1",
  employeeNo: "E-1001",
  name: "张岚",
  phone: "13800001001",
  position: "产品经理",
  positionDescription: "负责 AI 办公产品",
  level: "P6",
  productAbility: "熟练使用 Codex 处理办公和数据任务",
  technicalAbility: "了解 Python、SQL、LangChain",
  projectExperience: "参与 RAG 数据查询助手项目",
  profileCompletion: 100,
  latestScore: null,
  assessmentStatus: "未评估",
};

describe("assessment prompts", () => {
  it("builds a system prompt with profile context and 10-round rule", () => {
    const prompt = buildAssessmentSystemPrompt(profile);

    expect(prompt).toContain("10 轮对话");
    expect(prompt).toContain("张岚");
    expect(prompt).toContain("Codex");
    expect(prompt).toContain("LangChain");
  });

  it("returns deterministic demo questions inside 10 rounds", () => {
    expect(buildDemoQuestion(1)).toContain("AI 产品");
    expect(buildDemoQuestion(10)).toContain("未来 3 个月");
    expect(buildDemoQuestion(99)).toContain("未来 3 个月");
  });

  it("parses final evaluation JSON and clamps score", () => {
    const result = parseEvaluationJson(`{"score": 108, "explanation": "说明", "structured_summary": "摘要"}`);

    expect(result.score).toBe(100);
    expect(result.explanation).toBe("说明");
    expect(result.structured_summary).toBe("摘要");
  });

  it("generates a demo evaluation that includes profile signals", () => {
    const result = buildDemoEvaluation(profile);

    expect(result.score).toBeGreaterThanOrEqual(75);
    expect(result.structured_summary).toContain("产品经理");
  });
});
