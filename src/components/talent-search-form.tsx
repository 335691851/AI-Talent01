"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import { Badge, Button } from "@/components/ui";

export function TalentSearchForm({
  initialQuery,
  initialMinScore,
}: {
  initialQuery: string;
  initialMinScore: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState(initialQuery);
  const [minScore, setMinScore] = useState(initialMinScore);

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (minScore.trim()) params.set("minScore", minScore.trim());

    startTransition(() => {
      router.push(`/search${params.toString() ? `?${params.toString()}` : ""}`);
    });
  }

  return (
    <form className="surface mb-4 rounded-lg p-4" onSubmit={submitSearch}>
      <div className="grid gap-3 lg:grid-cols-[1fr_140px_128px]">
        <div className="flex min-h-12 items-center gap-3 rounded-md border border-slate-300 bg-white px-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
          <Search className="h-5 w-5 shrink-0 text-blue-600" />
          <input
            name="q"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full text-sm outline-none"
            placeholder="列出熟悉 LangChain、Python 数据处理，并有视觉识别项目经验的员工"
          />
        </div>
        <input
          name="minScore"
          value={minScore}
          onChange={(event) => setMinScore(event.target.value)}
          className="min-h-12 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          placeholder="最低分"
        />
        <Button disabled={isPending || !query.trim()}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          {isPending ? "检索中..." : "检索"}
        </Button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Badge tone="slate">方式：结构化 + 语义检索</Badge>
        <Badge tone="slate">权限：仅管理员</Badge>
        <Badge tone="slate">结果：展示完整档案</Badge>
        {isPending ? (
          <span className="inline-flex items-center gap-2 rounded border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            正在生成查询向量并检索 pgvector，请稍候
          </span>
        ) : null}
      </div>
    </form>
  );
}
