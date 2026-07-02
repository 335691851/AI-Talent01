import { describe, expect, it } from "vitest";
import { extractSearchTerms, structuredMatch } from "@/lib/db/search";
import type { EmployeeProfile } from "@/lib/types";

const profile: EmployeeProfile = {
  id: "employee-1",
  employeeNo: "E-1001",
  name: "张岚",
  phone: "13800001001",
  position: "AI 产品经理",
  positionDescription: "负责质量视觉分析助手",
  level: "P6",
  productAbility: "熟练使用 Codex 和飞书智能伙伴",
  technicalAbility: "Python SQL LangChain RAG",
  projectExperience: "视觉识别项目，端上瑕疵识别",
  profileCompletion: 100,
  latestScore: 88,
  assessmentExplanation: "具备业务拆解和项目落地能力",
  structuredSummary: "适合数据查询助手和视觉识别项目",
  assessmentStatus: "已完成",
};

describe("structuredMatch", () => {
  it("extracts useful Chinese terms from natural language search input", () => {
    const terms = extractSearchTerms("我需要一位做过飞机相关的项目");

    expect(terms).toContain("飞机");
    expect(terms).not.toContain("需要");
    expect(terms).not.toContain("项目");
  });

  it("returns evidence and reason when profile hits query terms", () => {
    const result = structuredMatch(profile, "LangChain Python 视觉识别", 80);

    expect(result).not.toBeNull();
    expect(result?.matchReason).toContain("langchain");
    expect(result?.evidence.length).toBeGreaterThan(0);
  });

  it("filters out profiles below minimum score", () => {
    const result = structuredMatch(profile, "LangChain", 90);

    expect(result).toBeNull();
  });

  it("returns null when no query term matches", () => {
    const result = structuredMatch(profile, "强化学习");

    expect(result).toBeNull();
  });

  it("matches aircraft project wording inside a long project experience field", () => {
    const result = structuredMatch(
      {
        ...profile,
        projectExperience:
          "2023年 车间机床刀具损耗智能预警系统搭建项目\n项目描述 机床刀具预警。\n\n2026年 航空飞机主体焊接拼装AI化项目",
      },
      "我需要一位做过飞机相关的项目",
    );

    expect(result?.matchReason).toContain("飞机");
    expect(result?.evidence.join("\n")).toContain("航空飞机主体焊接");
  });
});
