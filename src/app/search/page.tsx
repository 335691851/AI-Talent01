import { Search } from "lucide-react";
import { Badge, FieldBlock, PageHeader, Panel } from "@/components/ui";
import { TalentSearchForm } from "@/components/talent-search-form";
import { SearchTraceWindow } from "@/components/search-trace-window";
import { requireRole } from "@/lib/auth/session";
import { searchTalentsDetailed } from "@/lib/db/search";

async function runTalentSearch(query: string, minScore?: number) {
  if (!query) return { results: [], trace: null };
  return searchTalentsDetailed(query, minScore, {
    route: "/search",
  });
}

export default async function TalentSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; minScore?: string }>;
}) {
  const user = await requireRole("admin");
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const minScore = params.minScore ? Number(params.minScore) : undefined;
  const validMinScore = Number.isFinite(minScore) ? minScore : undefined;
  const { results, trace } = query
    ? await searchTalentsDetailed(query, validMinScore, {
        route: "/search",
        user: user.name ?? user.username ?? user.phone ?? user.id,
      })
    : await runTalentSearch(query, validMinScore);

  return (
    <>
      <PageHeader
        eyebrow="管理员能力"
        title="AI 人才检索"
        description="管理员可通过自然语言和结构化条件检索人才，系统融合档案字段、最新评估结果和 embedding 语义相似度进行排序。"
      />

      <TalentSearchForm initialQuery={query} initialMinScore={params.minScore ?? ""} />

      {trace ? <SearchTraceWindow trace={trace} /> : null}

      <div className="mt-4 space-y-4">
        {query && results.length ? (
          results.map((item, index) => (
            <Panel
              key={item.id}
              title={`${index + 1}. ${item.name} / ${item.position || "未填写岗位"}`}
              action={<Badge tone={(item.latestScore ?? 0) >= 85 ? "green" : "blue"}>{item.latestScore ?? "暂无"} 分</Badge>}
            >
              <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="grid gap-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <FieldBlock label="工号">{item.employeeNo}</FieldBlock>
                    <FieldBlock label="手机号">{item.phone}</FieldBlock>
                    <FieldBlock label="级别">{item.level || "-"}</FieldBlock>
                    <FieldBlock label="匹配分">{item.matchScore}</FieldBlock>
                  </div>
                  <FieldBlock label="岗位描述">{item.positionDescription || "-"}</FieldBlock>
                  <FieldBlock label="匹配原因">{item.matchReason}</FieldBlock>
                  <FieldBlock label="证据片段">{item.evidence.length ? item.evidence.join("\n\n") : "暂无证据片段。"}</FieldBlock>
                </div>
                <div className="grid gap-3">
                  <FieldBlock label="产品能力">{item.productAbility || "-"}</FieldBlock>
                  <FieldBlock label="技术栈能力">{item.technicalAbility || "-"}</FieldBlock>
                  <FieldBlock label="项目经验">{item.projectExperience || "-"}</FieldBlock>
                  <FieldBlock label="最新评估说明">{item.assessmentExplanation || "-"}</FieldBlock>
                  <FieldBlock label="结构化摘要">
                    {typeof item.structuredSummary === "string"
                      ? item.structuredSummary
                      : JSON.stringify(item.structuredSummary ?? {}, null, 2)}
                  </FieldBlock>
                </div>
              </div>
            </Panel>
          ))
        ) : null}

        {query && !results.length ? (
          <Panel title="暂无匹配结果">
            <div className="text-sm text-slate-500">请调整关键词或降低最低分筛选条件。</div>
          </Panel>
        ) : null}

        {!query ? (
          <Panel title="输入检索条件">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Search className="h-4 w-4 text-blue-600" />
              请输入人才需求，例如“熟悉 Python 数据处理，并有视觉识别项目经验的员工”。
            </div>
          </Panel>
        ) : null}
      </div>
    </>
  );
}
