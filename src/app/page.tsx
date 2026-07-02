import Link from "next/link";
import {
  Activity,
  ArrowRight,
  FileCheck2,
  Gauge,
  Search,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { redirect } from "next/navigation";
import { Badge, MetricCard, PageHeader, Panel, ProgressBar } from "@/components/ui";
import { getSessionUser } from "@/lib/auth/session";
import { getDashboardStats, listEmployeeProfiles } from "@/lib/db/queries";

function buildScoreBands(scores: number[]) {
  const bands = [
    { label: "95-100", min: 95, max: 100, tone: "green" as const },
    { label: "85-94", min: 85, max: 94, tone: "blue" as const },
    { label: "75-84", min: 75, max: 84, tone: "cyan" as const },
    { label: "60-74", min: 60, max: 74, tone: "orange" as const },
    { label: "0-59", min: 0, max: 59, tone: "orange" as const },
  ];

  return bands.map((band) => {
    const count = scores.filter((score) => score >= band.min && score <= band.max).length;
    return {
      ...band,
      count,
      value: scores.length ? Math.max(8, Math.round((count / scores.length) * 100)) : 0,
    };
  });
}

function topKeywords(profiles: Awaited<ReturnType<typeof listEmployeeProfiles>>) {
  const keywords = ["Codex", "Python", "LangChain", "RAG", "数据处理", "视觉识别", "自动化", "SQL"];
  return keywords
    .map((keyword) => ({
      label: keyword,
      value: profiles.filter((profile) =>
        [profile.productAbility, profile.technicalAbility, profile.projectExperience, profile.assessmentExplanation]
          .join("\n")
          .toLowerCase()
          .includes(keyword.toLowerCase()),
      ).length,
    }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
}

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role === "employee") redirect("/assessment");

  const [stats, profiles] = await Promise.all([getDashboardStats(), listEmployeeProfiles()]);
  const assessed = profiles.filter((item) => item.latestScore !== null && item.latestScore !== undefined);
  const scoreBands = buildScoreBands(assessed.map((item) => item.latestScore ?? 0));
  const keywords = topKeywords(profiles);

  return (
    <>
      <PageHeader
        eyebrow="管理员首页"
        title="企业 AI 人才概览"
        description="集中查看员工 AI 档案完善度、AI 自评估结果和企业内部 AI 能力分布，为人才盘点和项目组建提供依据。"
        actions={
          <>
            <Link className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" href="/imports">
              <FileCheck2 className="h-4 w-4" />
              导入员工
            </Link>
            <Link className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700" href="/search">
              <Search className="h-4 w-4" />
              发起检索
            </Link>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="员工总数" value={`${stats.totalEmployees}`} trend="覆盖一个企业主体" icon={UsersRound} />
        <MetricCard label="已完善 AI 档案" value={`${stats.completedProfiles}`} trend="档案完整度 80% 及以上" icon={FileCheck2} />
        <MetricCard label="平均 AI 分数" value={`${stats.averageScore}`} trend="基于最新有效评估" icon={Gauge} />
        <MetricCard label="高潜 AI 人才" value={`${stats.highPotential}`} trend="85 分及以上员工" icon={Sparkles} />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Panel title="AI 分数分布">
          <div className="space-y-4">
            {scoreBands.map((band) => (
              <div key={band.label} className="grid grid-cols-[120px_1fr_40px] items-center gap-3 text-sm">
                <span className="text-slate-600">{band.label}</span>
                <ProgressBar value={band.value} tone={band.tone} />
                <span className="text-right font-medium text-slate-800">{band.count}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="能力关键词 Top 5">
          <div className="space-y-4">
            {keywords.length ? (
              keywords.map((item) => (
                <div key={item.label} className="grid grid-cols-[84px_1fr_42px] items-center gap-3 text-sm">
                  <span className="text-slate-600">{item.label}</span>
                  <ProgressBar value={Math.min(100, Math.max(10, item.value * 12))} tone={item.value > 3 ? "blue" : "cyan"} />
                  <span className="text-right font-medium text-slate-800">{item.value}</span>
                </div>
              ))
            ) : (
              <div className="text-sm text-slate-500">暂无关键词统计，导入员工档案后自动生成。</div>
            )}
          </div>
        </Panel>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-3">
        <Panel title="高分人才">
          <div className="space-y-3">
            {assessed
              .filter((item) => (item.latestScore ?? 0) >= 85)
              .slice(0, 6)
              .map((item) => (
                <div key={item.id} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-slate-950">{item.name}</div>
                    <Badge tone="green">{item.latestScore} 分</Badge>
                  </div>
                  <div className="mt-1 text-sm text-slate-500">{item.position || "-"} / {item.level || "-"}</div>
                </div>
              ))}
            {!assessed.some((item) => (item.latestScore ?? 0) >= 85) ? <div className="text-sm text-slate-500">暂无 85 分以上员工。</div> : null}
          </div>
        </Panel>

        <Panel title="待完善档案">
          <div className="space-y-3">
            {profiles
              .filter((item) => item.profileCompletion < 90)
              .slice(0, 6)
              .map((item) => (
                <div key={item.id} className="grid grid-cols-[1fr_76px] items-center gap-3 border-b border-slate-100 pb-3 last:border-0">
                  <div>
                    <div className="font-medium text-slate-950">{item.name}</div>
                    <div className="text-sm text-slate-500">{item.position || "-"} / 档案完整度</div>
                  </div>
                  <div>
                    <div className="mb-1 text-right text-xs text-slate-500">{item.profileCompletion}%</div>
                    <ProgressBar value={item.profileCompletion} tone="orange" />
                  </div>
                </div>
              ))}
          </div>
        </Panel>

        <Panel title="最近评估" action={<ArrowRight className="h-4 w-4 text-slate-400" />}>
          <div className="space-y-3">
            {assessed.slice(0, 5).map((item) => (
              <div key={item.id} className="flex items-center gap-3 border-b border-slate-100 pb-3 last:border-0">
                <div className="rounded-md bg-blue-50 p-2 text-blue-700">
                  <Activity className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-slate-950">{item.name} 完成 AI 自评</div>
                  <div className="text-sm text-slate-500">{item.latestAssessmentAt ? new Date(item.latestAssessmentAt).toLocaleString("zh-CN") : "-"}</div>
                </div>
                <Badge tone="blue">{item.latestScore}</Badge>
              </div>
            ))}
            {assessed.length === 0 ? <div className="text-sm text-slate-500">暂无评估记录。</div> : null}
          </div>
        </Panel>
      </div>
    </>
  );
}
