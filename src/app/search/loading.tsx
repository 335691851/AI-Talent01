import { Loader2 } from "lucide-react";
import { PageHeader, Panel } from "@/components/ui";

export default function TalentSearchLoading() {
  return (
    <>
      <PageHeader
        eyebrow="管理员能力"
        title="AI 人才检索"
        description="正在执行结构化匹配、查询向量生成和 pgvector 相似度检索。"
      />
      <Panel title="检索中">
        <div className="flex items-center gap-3 rounded-md border border-blue-100 bg-blue-50 px-4 py-5 text-sm text-blue-800">
          <Loader2 className="h-5 w-5 animate-spin" />
          正在检索人才数据，请稍候...
        </div>
      </Panel>
    </>
  );
}
