import { ChevronDown, Clock3, ServerCog } from "lucide-react";
import { Badge } from "@/components/ui";
import type { TalentSearchTrace } from "@/lib/db/search";

function statusTone(status: TalentSearchTrace["events"][number]["status"]) {
  if (status === "completed") return "green";
  if (status === "failed") return "orange";
  if (status === "skipped") return "slate";
  return "blue";
}

export function SearchTraceWindow({ trace }: { trace: TalentSearchTrace }) {
  return (
    <details className="mb-4 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-700">
            <ServerCog className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-slate-950">本次检索 Trace</span>
              <Badge tone={trace.mode === "structured+semantic" ? "green" : "orange"}>
                {trace.mode}
              </Badge>
              <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                <Clock3 className="h-3.5 w-3.5" />
                {trace.elapsedMs} ms
              </span>
            </div>
            <div className="mt-1 truncate text-xs text-slate-500">
              请求 {trace.requestId} · 结果 {trace.output.finalResults} 人 · 点击展开完整业务和技术日志
            </div>
          </div>
        </div>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
      </summary>

      <div className="border-t border-slate-200 bg-slate-50/70 p-4">
        <div className="max-h-[420px] overflow-y-auto pr-2">
          <div className="grid gap-3 xl:grid-cols-3">
            <section className="rounded-md border border-slate-200 bg-white p-3">
              <div className="text-xs font-semibold text-slate-500">请求上下文</div>
              <dl className="mt-2 space-y-1 text-xs leading-5 text-slate-700">
                <div className="flex justify-between gap-3"><dt>调用方</dt><dd>{trace.caller.route}</dd></div>
                <div className="flex justify-between gap-3"><dt>角色</dt><dd>{trace.caller.role}</dd></div>
                <div className="flex justify-between gap-3"><dt>用户</dt><dd className="truncate">{trace.caller.user}</dd></div>
                <div className="flex justify-between gap-3"><dt>开始时间</dt><dd>{trace.startedAt}</dd></div>
                <div className="flex justify-between gap-3"><dt>最低分</dt><dd>{trace.input.minScore ?? "未设置"}</dd></div>
                <div className="flex justify-between gap-3"><dt>语义阈值</dt><dd>{trace.input.semanticMinSimilarity}</dd></div>
                <div className="flex justify-between gap-3"><dt>强语义阈值</dt><dd>{trace.input.semanticStrongSimilarity}</dd></div>
              </dl>
              <div className="mt-3 rounded bg-slate-50 p-2 text-xs leading-5 text-slate-700">
                <div className="font-medium text-slate-900">输入信息</div>
                <div className="mt-1 whitespace-pre-wrap break-words">{trace.input.query}</div>
              </div>
              <div className="mt-3 rounded bg-slate-50 p-2 text-xs leading-5 text-slate-700">
                <div className="font-medium text-slate-900">抽取关键词</div>
                <div className="mt-1 whitespace-pre-wrap break-words">
                  {trace.input.extractedTerms.length ? trace.input.extractedTerms.join("、") : "未抽取到关键词"}
                </div>
              </div>
            </section>

            <section className="rounded-md border border-slate-200 bg-white p-3">
              <div className="text-xs font-semibold text-slate-500">技术链路</div>
              <dl className="mt-2 space-y-1 text-xs leading-5 text-slate-700">
                <div className="flex justify-between gap-3"><dt>数据库</dt><dd>{trace.technical.databaseConfigured ? "已配置" : "未配置"}</dd></div>
                <div className="flex justify-between gap-3"><dt>Embedding</dt><dd>{trace.technical.embeddingConfigured ? "已配置" : "未配置"}</dd></div>
                <div className="flex justify-between gap-3"><dt>Provider</dt><dd>{trace.technical.embeddingProvider}</dd></div>
                <div className="flex justify-between gap-3"><dt>模型</dt><dd>{trace.technical.embeddingModel}</dd></div>
                <div className="flex justify-between gap-3"><dt>维度</dt><dd>{trace.technical.embeddingDimensions}</dd></div>
                <div className="flex justify-between gap-3"><dt>向量库</dt><dd>{trace.technical.vectorStore}</dd></div>
                <div className="flex justify-between gap-3"><dt>RPC</dt><dd>{trace.technical.rpc}</dd></div>
              </dl>
            </section>

            <section className="rounded-md border border-slate-200 bg-white p-3">
              <div className="text-xs font-semibold text-slate-500">返回摘要</div>
              <dl className="mt-2 space-y-1 text-xs leading-5 text-slate-700">
                <div className="flex justify-between gap-3"><dt>员工档案总数</dt><dd>{trace.output.totalProfiles}</dd></div>
                <div className="flex justify-between gap-3"><dt>结构化命中</dt><dd>{trace.output.structuredMatches}</dd></div>
                <div className="flex justify-between gap-3"><dt>语义候选</dt><dd>{trace.output.semanticCandidates}</dd></div>
                <div className="flex justify-between gap-3"><dt>有效语义命中</dt><dd>{trace.output.semanticMatches}</dd></div>
                <div className="flex justify-between gap-3"><dt>最终结果</dt><dd>{trace.output.finalResults}</dd></div>
              </dl>
              <pre className="mt-3 max-h-36 overflow-auto rounded bg-slate-950 p-2 text-xs leading-5 text-slate-100">
                {JSON.stringify(trace.output.topResults, null, 2)}
              </pre>
            </section>
          </div>

          <section className="mt-3 rounded-md border border-slate-200 bg-white p-3">
            <div className="mb-2 text-xs font-semibold text-slate-500">核心业务和技术日志</div>
            <div className="space-y-2">
              {trace.events.map((event, index) => (
                <div key={`${event.step}-${index}`} className="grid gap-2 rounded-md border border-slate-100 bg-slate-50 p-2 text-xs md:grid-cols-[76px_150px_1fr]">
                  <div className="font-mono text-slate-500">+{event.elapsedMs}ms</div>
                  <div className="flex items-center gap-2">
                    <Badge tone={statusTone(event.status)}>{event.status}</Badge>
                    <span className="font-mono text-slate-700">{event.step}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="text-slate-800">{event.message}</div>
                    {event.data ? (
                      <pre className="mt-1 max-h-28 overflow-auto whitespace-pre-wrap break-words rounded bg-white p-2 text-slate-600">
                        {JSON.stringify(event.data, null, 2)}
                      </pre>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </details>
  );
}
