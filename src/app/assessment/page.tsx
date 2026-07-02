import { Bot, CheckCircle2, History } from "lucide-react";
import { redirect } from "next/navigation";
import { AssessmentChatbox } from "@/components/assessment-chatbox";
import { Badge, FieldBlock, PageHeader, Panel, ProgressBar } from "@/components/ui";
import { startAssessmentAction } from "@/app/actions/assessment";
import { getSessionUser } from "@/lib/auth/session";
import { isDatabaseConfigured } from "@/lib/db/client";
import { getEmployeeAssessmentState, getAssessmentSession } from "@/lib/db/assessment";
import { getEmployeeProfileById } from "@/lib/db/queries";

export default async function AssessmentPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const databaseReady = isDatabaseConfigured();
  const params = await searchParams;
  const selectedSession = params.session ? await getAssessmentSession(params.session) : null;
  const employeeId = user.employeeId;
  const employee = employeeId && databaseReady ? await getEmployeeProfileById(employeeId) : null;
  const state = employeeId && databaseReady ? await getEmployeeAssessmentState(employeeId) : null;
  const activeSession = selectedSession ?? state?.activeSession ?? null;
  const latestResult = state?.results?.[0] ?? null;
  const progress = activeSession
    ? Math.round((activeSession.currentRound / activeSession.totalRounds) * 100)
    : 0;

  return (
    <>
      <PageHeader
        eyebrow="员工端"
        title="AI 自评估 Chatbox"
        description="员工主动发起 AI 能力测评任务，AI 通过 10 轮多轮对话完成引导和评估；未完成 10 轮退出，本次过程不生成有效结果。"
        actions={
          <form action={startAssessmentAction}>
            <button className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">
              <Bot className="h-4 w-4" />
              开始新评估
            </button>
          </form>
        }
      />

      {!databaseReady ? (
        <Panel title="环境未配置">
          <div className="text-sm leading-6 text-orange-700">
            请先在 <span className="font-mono">.env.local</span> 中配置 Supabase 参数并执行 <span className="font-mono">npm run db:push</span>。
            DeepSeek Key 可稍后配置，未配置时系统会使用本地演示问题跑通流程。
          </div>
        </Panel>
      ) : !employee ? (
        <Panel title="账号未绑定员工档案">
          <div className="text-sm leading-6 text-slate-600">当前账号没有员工档案，AI 自评估仅支持员工账号发起。</div>
        </Panel>
      ) : (
        <>
          <div className="grid gap-4 xl:grid-cols-[0.75fr_1.25fr]">
            <div className="space-y-4">
              <Panel title="当前员工">
                <div className="space-y-4">
                  <FieldBlock label="姓名">{employee.name} / {employee.employeeNo}</FieldBlock>
                  <FieldBlock label="岗位">{employee.position || "-"} / {employee.level || "-"}</FieldBlock>
                  <FieldBlock label="岗位描述">{employee.positionDescription || "-"}</FieldBlock>
                  <div>
                    <div className="mb-2 flex justify-between text-sm">
                      <span className="text-slate-500">本轮进度</span>
                      <span className="font-medium text-slate-900">{activeSession ? `${activeSession.currentRound} / ${activeSession.totalRounds}` : "0 / 10"}</span>
                    </div>
                    <ProgressBar value={progress} tone="blue" />
                  </div>
                  <div className="rounded-md border border-orange-200 bg-orange-50 p-3 text-sm leading-6 text-orange-800">
                    规则：完成 10 轮后才生成分数和评估说明，中途退出不保留有效结果；管理员仅查看最终评估结果和结构化摘要。
                  </div>
                </div>
              </Panel>

              <Panel title="历史评估记录">
                <div className="space-y-3">
                  {state?.results?.length ? (
                    state.results.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 border-b border-slate-100 pb-3 last:border-0">
                        <History className="h-4 w-4 text-slate-400" />
                        <div className="flex-1">
                          <div className="font-medium text-slate-900">{new Date(item.created_at).toLocaleString("zh-CN")}</div>
                          <div className="text-sm text-slate-500">{item.is_latest ? "最新有效结果" : "历史结果"}</div>
                        </div>
                        <Badge tone={item.is_latest ? "green" : "slate"}>{item.score} 分</Badge>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-slate-500">暂无历史评估结果。</div>
                  )}
                </div>
              </Panel>
            </div>

            <Panel title="10 轮 AI 能力测评" action={<Badge tone="blue">流式响应</Badge>}>
              <AssessmentChatbox
                key={
                  activeSession
                    ? `${activeSession.id}-${activeSession.currentRound}-${activeSession.status}-${activeSession.messages.length}`
                    : "empty"
                }
                session={activeSession}
              />
            </Panel>
          </div>

          <div className="mt-4">
            <Panel title="最新评估结果" action={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}>
              {latestResult ? (
                <div className="grid gap-4 md:grid-cols-[180px_1fr]">
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-center">
                    <div className="text-sm text-emerald-700">AI 分数</div>
                    <div className="mt-2 text-4xl font-semibold text-emerald-700">{latestResult.score}</div>
                  </div>
                  <FieldBlock label="评估说明">{latestResult.assessment_explanation}</FieldBlock>
                </div>
              ) : (
                <div className="text-sm text-slate-500">完成 10 轮评估后，这里会展示分数和长文本评估说明。</div>
              )}
            </Panel>
          </div>
        </>
      )}
    </>
  );
}
