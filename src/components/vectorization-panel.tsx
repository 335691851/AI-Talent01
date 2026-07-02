"use client";

import { useActionState } from "react";
import { DatabaseZap, Loader2 } from "lucide-react";
import { backfillEmbeddingsAction, type BackfillEmbeddingsState } from "@/app/actions/admin";
import { Badge, ProgressBar } from "@/components/ui";
import type { VectorizationStatus } from "@/lib/db/admin";

const initialState: BackfillEmbeddingsState = {};

export function VectorizationPanel({ status }: { status: VectorizationStatus }) {
  const [state, formAction, pending] = useActionState(backfillEmbeddingsAction, initialState);
  const percent = status.totalEmployees
    ? Math.round((status.vectorizedEmployees / status.totalEmployees) * 100)
    : 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-md border border-slate-200 bg-white p-3">
          <div className="text-xs text-slate-500">员工总数</div>
          <div className="mt-1 text-2xl font-semibold text-slate-950">{status.totalEmployees}</div>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-3">
          <div className="text-xs text-slate-500">已向量化员工</div>
          <div className="mt-1 text-2xl font-semibold text-slate-950">{status.vectorizedEmployees}</div>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-3">
          <div className="text-xs text-slate-500">向量片段</div>
          <div className="mt-1 text-2xl font-semibold text-slate-950">{status.embeddingChunks}</div>
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-slate-500">向量化进度</span>
          <span className="font-medium text-slate-900">{percent}%</span>
        </div>
        <ProgressBar value={percent} tone={percent === 100 ? "green" : "blue"} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge tone={status.databaseReady ? "green" : "orange"}>{status.databaseReady ? "数据库已连接" : "数据库未配置"}</Badge>
        <Badge tone={status.embeddingReady ? "green" : "orange"}>{status.embeddingReady ? "Embedding 已配置" : "Embedding 未配置"}</Badge>
        <Badge tone={status.pendingEmployees === 0 ? "green" : "orange"}>待处理 {status.pendingEmployees}</Badge>
        {status.updatedAt ? <Badge tone="slate">最近更新 {new Date(status.updatedAt).toLocaleString("zh-CN")}</Badge> : null}
      </div>

      <form action={formAction}>
        <button
          type="submit"
          disabled={pending || !status.databaseReady || !status.embeddingReady || status.totalEmployees === 0}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <DatabaseZap className="h-4 w-4" />}
          {pending ? "正在生成向量..." : "补齐员工向量"}
        </button>
      </form>

      {pending ? (
        <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm leading-6 text-blue-800">
          正在逐个员工生成 embedding 并写入 Supabase pgvector。员工数量较多时请保持页面打开。
        </div>
      ) : null}

      {state.message ? (
        <div className={`rounded-md border px-3 py-2 text-sm leading-6 ${state.ok ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-orange-200 bg-orange-50 text-orange-700"}`}>
          {state.message}
        </div>
      ) : null}

      {state.errors?.length ? (
        <div className="space-y-2">
          {state.errors.slice(0, 5).map((error) => (
            <div key={error} className="rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-800">
              {error}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
