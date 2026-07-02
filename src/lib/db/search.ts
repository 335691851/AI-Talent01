import { env, hasCloudflareEnv } from "@/lib/config";
import { embedTexts } from "@/lib/ai/embedding";
import { getSupabaseAdmin, isDatabaseConfigured } from "@/lib/db/client";
import { listEmployeeProfiles } from "@/lib/db/queries";
import type { EmployeeProfile } from "@/lib/types";

export type TalentSearchResult = EmployeeProfile & {
  matchScore: number;
  matchReason: string;
  evidence: string[];
};

export type TalentSearchTraceEvent = {
  step: string;
  status: "started" | "completed" | "skipped" | "failed";
  message: string;
  elapsedMs: number;
  data?: Record<string, unknown>;
};

export type TalentSearchTrace = {
  requestId: string;
  startedAt: string;
  elapsedMs: number;
  mode: "structured" | "structured+semantic" | "structured-fallback";
  caller: {
    route: string;
    role: "admin";
    user: string;
  };
  input: {
    query: string;
    minScore?: number;
    matchCount: number;
    semanticMinSimilarity: number;
    semanticStrongSimilarity: number;
    extractedTerms: string[];
  };
  technical: {
    databaseConfigured: boolean;
    embeddingConfigured: boolean;
    embeddingProvider: "Cloudflare Workers AI";
    embeddingModel: string;
    embeddingDimensions: number;
    vectorStore: "Supabase Postgres pgvector";
    rpc: "match_employee_embeddings";
  };
  output: {
    totalProfiles: number;
    structuredMatches: number;
    semanticCandidates: number;
    semanticMatches: number;
    finalResults: number;
    topResults: Array<{
      employeeNo: string;
      name: string;
      position: string;
      matchScore: number;
      matchReason: string;
      evidenceCount: number;
    }>;
  };
  events: TalentSearchTraceEvent[];
};

export type TalentSearchDetailedResult = {
  results: TalentSearchResult[];
  trace: TalentSearchTrace;
};

type SemanticMatchRow = {
  employee_id: string;
  similarity?: number | string | null;
  evidence?: string[] | null;
};

type SearchTraceInput = {
  route?: string;
  user?: string;
};

function requestId() {
  return globalThis.crypto?.randomUUID?.() ?? `trace-${Date.now()}`;
}

const STOP_TERMS = new Set([
  "我们",
  "我想",
  "我要",
  "需要",
  "一位",
  "一名",
  "一个",
  "一类",
  "做过",
  "有过",
  "并有",
  "相关",
  "相关的",
  "项目",
  "员工",
  "人员",
  "人才",
  "能力",
  "经验",
  "负责",
  "适合",
  "可以",
  "能够",
  "希望",
  "要求",
  "寻找",
  "进行",
  "具备",
  "熟悉",
]);

const CHINESE_FILLER_PATTERN =
  /我们|我想|我要|需要|一位|一名|一个|一类|做过|有过|并有|相关的|相关|项目|员工|人员|人才|能力|经验|负责|适合|可以|能够|希望|要求|寻找|进行|具备|熟悉|的/g;

function uniqueTerms(terms: string[]) {
  return Array.from(new Set(terms.filter((term) => term.length >= 2 && !STOP_TERMS.has(term)))).slice(0, 80);
}

export function extractSearchTerms(query: string) {
  const normalized = query.toLowerCase().trim();
  if (!normalized) return [];

  const terms: string[] = [];
  terms.push(...(normalized.match(/[a-z0-9][a-z0-9+#._/-]{1,}/g) ?? []));

  const chineseSegments = normalized.match(/[\u4e00-\u9fff]{2,}/g) ?? [];
  for (const segment of chineseSegments) {
    const meaningfulParts = segment
      .replace(CHINESE_FILLER_PATTERN, " ")
      .split(/\s+/)
      .map((item) => item.trim())
      .filter((item) => item.length >= 2);

    for (const part of meaningfulParts) {
      if (part.length <= 8) terms.push(part);
      for (const size of [4, 3, 2]) {
        if (part.length <= size) continue;
        for (let index = 0; index <= part.length - size; index += 1) {
          terms.push(part.slice(index, index + size));
        }
      }
    }
  }

  return uniqueTerms(terms).sort((a, b) => b.length - a.length);
}

function snippet(content: string, term: string) {
  const lowerContent = content.toLowerCase();
  const index = lowerContent.indexOf(term.toLowerCase());
  if (index === -1) return content.slice(0, 180);

  const start = Math.max(0, index - 70);
  const end = Math.min(content.length, index + term.length + 110);
  return `${start > 0 ? "..." : ""}${content.slice(start, end)}${end < content.length ? "..." : ""}`;
}

function collectEvidence(profile: EmployeeProfile, hits: string[]) {
  const fields = [
    ["产品能力", profile.productAbility],
    ["技术栈能力", profile.technicalAbility],
    ["项目经验", profile.projectExperience],
    ["最新评估说明", profile.assessmentExplanation],
    [
      "结构化摘要",
      typeof profile.structuredSummary === "string"
        ? profile.structuredSummary
        : JSON.stringify(profile.structuredSummary ?? {}),
    ],
  ] as const;

  const evidence: string[] = [];
  for (const [label, value] of fields) {
    const content = value?.trim();
    if (!content) continue;
    const hit = hits.find((term) => content.toLowerCase().includes(term.toLowerCase()));
    if (hit) evidence.push(`${label}：${snippet(content, hit)}`);
  }

  if (evidence.length) return evidence.slice(0, 4);

  return fields
    .map(([label, value]) => (value?.trim() ? `${label}：${value.trim().slice(0, 180)}` : ""))
    .filter(Boolean)
    .slice(0, 3);
}

function evidenceContainsTerm(evidence: string[], terms: string[]) {
  const content = evidence.join("\n").toLowerCase();
  return terms.some((term) => content.includes(term.toLowerCase()));
}

export function structuredMatch(profile: EmployeeProfile, query: string, minScore?: number): TalentSearchResult | null {
  const haystack = [
    profile.name,
    profile.employeeNo,
    profile.phone,
    profile.email,
    profile.position,
    profile.positionDescription,
    profile.level,
    profile.productAbility,
    profile.technicalAbility,
    profile.projectExperience,
    profile.assessmentExplanation,
    typeof profile.structuredSummary === "string" ? profile.structuredSummary : JSON.stringify(profile.structuredSummary ?? {}),
  ].join("\n").toLowerCase();

  const terms = extractSearchTerms(query);

  const hits = terms.filter((term) => haystack.includes(term));
  const scoreByQuery = hits.length ? Math.min(95, 60 + hits.length * 8) : 20;
  const scoreByAssessment = profile.latestScore ?? 0;
  const passesScore = minScore ? scoreByAssessment >= minScore : true;

  if (query && hits.length === 0) return null;
  if (!passesScore) return null;

  const evidence = collectEvidence(profile, hits);

  return {
    ...profile,
    matchScore: Math.max(scoreByQuery, Math.min(99, scoreByAssessment)),
    matchReason: hits.length ? `命中关键词：${hits.join("、")}` : "符合结构化筛选条件",
    evidence,
  };
}

export async function searchTalentsDetailed(
  query: string,
  minScore?: number,
  traceInput: SearchTraceInput = {},
): Promise<TalentSearchDetailedResult> {
  const started = Date.now();
  const events: TalentSearchTraceEvent[] = [];
  const databaseConfigured = isDatabaseConfigured();
  const embeddingConfigured = hasCloudflareEnv();
  const extractedTerms = extractSearchTerms(query);
  const semanticMinSimilarity = Math.max(env.ragMinScore, 0.45);
  const semanticStrongSimilarity = Math.max(semanticMinSimilarity + 0.2, 0.68);
  let mode: TalentSearchTrace["mode"] = "structured";
  let semanticCandidates = 0;
  let semanticMatches = 0;

  function log(
    step: string,
    status: TalentSearchTraceEvent["status"],
    message: string,
    data?: Record<string, unknown>,
  ) {
    events.push({
      step,
      status,
      message,
      elapsedMs: Date.now() - started,
      data,
    });
  }

  log("request.received", "started", "收到管理员人才检索请求。", {
    query,
    minScore: minScore ?? null,
    extractedTerms,
    semanticMinSimilarity,
    semanticStrongSimilarity,
    route: traceInput.route ?? "/search",
  });

  const profiles = await listEmployeeProfiles();
  log("profiles.loaded", "completed", "已加载员工档案，用于结构化匹配和结果合并。", {
    totalProfiles: profiles.length,
  });

  const structuredResults = profiles
    .map((profile) => structuredMatch(profile, query, minScore))
    .filter((item): item is TalentSearchResult => Boolean(item));
  log("structured.match", "completed", "完成结构化关键词匹配。", {
    structuredMatches: structuredResults.length,
    extractedTerms,
    fields: [
      "name",
      "employeeNo",
      "phone",
      "email",
      "position",
      "positionDescription",
      "level",
      "productAbility",
      "technicalAbility",
      "projectExperience",
      "assessmentExplanation",
      "structuredSummary",
    ],
  });

  if (!databaseConfigured || !embeddingConfigured || !query.trim()) {
    const skippedReason = !databaseConfigured
      ? "数据库未配置，跳过 pgvector 语义检索。"
      : !embeddingConfigured
        ? "Cloudflare Workers AI embedding 未配置，跳过语义检索。"
        : "检索词为空，跳过语义检索。";
    log("semantic.skipped", "skipped", skippedReason, {
      databaseConfigured,
      embeddingConfigured,
      hasQuery: Boolean(query.trim()),
    });

    const results = structuredResults.sort((a, b) => b.matchScore - a.matchScore);
    log("response.ready", "completed", "返回结构化检索结果。", {
      finalResults: results.length,
    });
    return {
      results,
      trace: buildTrace({
        requestStartedAt: started,
        mode,
        query,
        minScore,
        traceInput,
        databaseConfigured,
        embeddingConfigured,
        totalProfiles: profiles.length,
        structuredMatches: structuredResults.length,
        semanticCandidates,
        semanticMatches,
        results,
        events,
        semanticMinSimilarity,
        semanticStrongSimilarity,
        extractedTerms,
      }),
    };
  }

  try {
    mode = "structured+semantic";
    const supabase = getSupabaseAdmin();
    log("embedding.query.started", "started", "开始使用检索词生成 query embedding。", {
      provider: "Cloudflare Workers AI",
      model: env.cloudflareEmbeddingModel,
      dimensions: env.cloudflareEmbeddingDimensions,
    });
    const [queryEmbedding] = await embedTexts([query]);
    log("embedding.query.completed", "completed", "query embedding 生成完成。", {
      vectorDimensions: queryEmbedding?.length ?? 0,
    });

    log("pgvector.rpc.started", "started", "开始调用 Supabase RPC 执行 pgvector 相似度检索。", {
      rpc: "match_employee_embeddings",
      matchCount: 20,
      semanticMinSimilarity,
      semanticStrongSimilarity,
      operator: "vector_cosine_ops",
    });
    const { data, error } = await supabase.rpc("match_employee_embeddings", {
      query_embedding: queryEmbedding,
      match_count: 20,
    });

    if (error) throw error;
    const semanticRows = (data ?? []) as SemanticMatchRow[];
    semanticCandidates = semanticRows.length;
    const acceptedSemanticRows = semanticRows.filter((item) => {
      const similarity = Number(item.similarity ?? 0);
      const evidence = (item.evidence ?? []).filter(Boolean);
      const keywordMatched = evidenceContainsTerm(evidence, extractedTerms);
      if (extractedTerms.length) {
        return keywordMatched || similarity >= semanticStrongSimilarity;
      }
      return similarity >= semanticMinSimilarity;
    });
    semanticMatches = acceptedSemanticRows.length;
    log("pgvector.rpc.completed", "completed", "pgvector 相似度检索完成。", {
      semanticCandidates,
      semanticMatches,
      rejectedBySimilarity: semanticCandidates - semanticMatches,
      matchedEmployeeIds: acceptedSemanticRows.map((item) => item.employee_id).slice(0, 10),
      topCandidates: semanticRows.slice(0, 5).map((item) => ({
        employeeId: item.employee_id,
        similarity: Number(item.similarity ?? 0),
        accepted:
          extractedTerms.length
            ? evidenceContainsTerm((item.evidence ?? []).filter(Boolean), extractedTerms) ||
              Number(item.similarity ?? 0) >= semanticStrongSimilarity
            : Number(item.similarity ?? 0) >= semanticMinSimilarity,
      })),
    });

    const semanticByEmployee = new Map<string, { similarity: number; evidence: string[] }>();
    for (const item of acceptedSemanticRows) {
      semanticByEmployee.set(item.employee_id, {
        similarity: Number(item.similarity ?? 0),
        evidence: (item.evidence ?? []).filter(Boolean),
      });
    }

    const merged = new Map<string, TalentSearchResult>();
    for (const item of structuredResults) merged.set(item.id, item);
    log("results.merge.started", "started", "开始合并结构化结果和语义检索结果。", {
      structuredMatches: structuredResults.length,
      semanticCandidates,
      semanticMatches,
      semanticMinSimilarity,
      semanticStrongSimilarity,
    });

    for (const profile of profiles) {
      const semantic = semanticByEmployee.get(profile.id);
      if (!semantic) continue;
      if (minScore && (profile.latestScore ?? 0) < minScore) continue;

      const existing = merged.get(profile.id);
      const semanticScore = Math.round(semantic.similarity * 100);
      merged.set(profile.id, {
        ...(existing ?? profile),
        matchScore: Math.max(existing?.matchScore ?? 0, semanticScore),
        matchReason: existing
          ? `${existing.matchReason}；语义相似度 ${semanticScore}`
          : `语义相似度 ${semanticScore}`,
        evidence: [...(existing?.evidence ?? []), ...semantic.evidence].slice(0, 5),
      });
    }

    const results = Array.from(merged.values()).sort((a, b) => b.matchScore - a.matchScore);
    log("results.merge.completed", "completed", "结果合并完成，按匹配分降序排序。", {
      finalResults: results.length,
    });
    log("response.ready", "completed", "返回人才检索结果和 trace 日志。", {
      finalResults: results.length,
      topEmployeeNos: results.slice(0, 5).map((item) => item.employeeNo),
    });

    return {
      results,
      trace: buildTrace({
        requestStartedAt: started,
        mode,
        query,
        minScore,
        traceInput,
        databaseConfigured,
        embeddingConfigured,
        totalProfiles: profiles.length,
        structuredMatches: structuredResults.length,
        semanticCandidates,
        semanticMatches,
        results,
        events,
        semanticMinSimilarity,
        semanticStrongSimilarity,
        extractedTerms,
      }),
    };
  } catch (error) {
    console.warn("Semantic search failed, using structured search:", error);
    mode = "structured-fallback";
    log("semantic.failed", "failed", "语义检索失败，已降级为结构化检索。", {
      error: error instanceof Error ? error.message : "未知错误",
    });
    const results = structuredResults.sort((a, b) => b.matchScore - a.matchScore);
    log("response.ready", "completed", "返回降级后的结构化检索结果。", {
      finalResults: results.length,
    });
    return {
      results,
      trace: buildTrace({
        requestStartedAt: started,
        mode,
        query,
        minScore,
        traceInput,
        databaseConfigured,
        embeddingConfigured,
        totalProfiles: profiles.length,
        structuredMatches: structuredResults.length,
        semanticCandidates,
        semanticMatches,
        results,
        events,
        semanticMinSimilarity,
        semanticStrongSimilarity,
        extractedTerms,
      }),
    };
  }
}

function buildTrace({
  requestStartedAt,
  mode,
  query,
  minScore,
  traceInput,
  databaseConfigured,
  embeddingConfigured,
  totalProfiles,
  structuredMatches,
  semanticCandidates,
  semanticMatches,
  results,
  events,
  semanticMinSimilarity,
  semanticStrongSimilarity,
  extractedTerms,
}: {
  requestStartedAt: number;
  mode: TalentSearchTrace["mode"];
  query: string;
  minScore?: number;
  traceInput: SearchTraceInput;
  databaseConfigured: boolean;
  embeddingConfigured: boolean;
  totalProfiles: number;
  structuredMatches: number;
  semanticCandidates: number;
  semanticMatches: number;
  results: TalentSearchResult[];
  events: TalentSearchTraceEvent[];
  semanticMinSimilarity: number;
  semanticStrongSimilarity: number;
  extractedTerms: string[];
}): TalentSearchTrace {
  return {
    requestId: requestId(),
    startedAt: new Date(requestStartedAt).toISOString(),
    elapsedMs: Date.now() - requestStartedAt,
    mode,
    caller: {
      route: traceInput.route ?? "/search",
      role: "admin",
      user: traceInput.user ?? "unknown",
    },
    input: {
      query,
      minScore,
      matchCount: 20,
      semanticMinSimilarity,
      semanticStrongSimilarity,
      extractedTerms,
    },
    technical: {
      databaseConfigured,
      embeddingConfigured,
      embeddingProvider: "Cloudflare Workers AI",
      embeddingModel: env.cloudflareEmbeddingModel,
      embeddingDimensions: env.cloudflareEmbeddingDimensions,
      vectorStore: "Supabase Postgres pgvector",
      rpc: "match_employee_embeddings",
    },
    output: {
      totalProfiles,
      structuredMatches,
      semanticCandidates,
      semanticMatches,
      finalResults: results.length,
      topResults: results.slice(0, 5).map((item) => ({
        employeeNo: item.employeeNo,
        name: item.name,
        position: item.position ?? "未填写岗位",
        matchScore: item.matchScore,
        matchReason: item.matchReason,
        evidenceCount: item.evidence.length,
      })),
    },
    events,
  };
}

export async function searchTalents(query: string, minScore?: number): Promise<TalentSearchResult[]> {
  const { results } = await searchTalentsDetailed(query, minScore);
  return results;
}
