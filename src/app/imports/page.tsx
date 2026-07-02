import { Download } from "lucide-react";
import { Button, PageHeader, Panel } from "@/components/ui";
import { ImportUploader } from "@/components/import-uploader";
import { requireRole } from "@/lib/auth/session";

export default async function ImportsPage() {
  await requireRole("admin");

  return (
    <>
      <PageHeader
        eyebrow="管理员能力"
        title="Excel 员工导入"
        description="管理员统一导入员工基础信息和 AI 档案初始内容；工号作为主 ID，重复工号覆盖更新，手机号为必填字段。"
        actions={
          <a href="/api/import/template">
            <Button variant="secondary">
              <Download className="h-4 w-4" />
              下载模板
            </Button>
          </a>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <Panel title="上传文件">
          <ImportUploader />
        </Panel>

        <Panel title="导入规则">
          <div className="grid gap-3 text-sm text-slate-700">
            {[
              "工号为最终唯一标识，导入时作为主 ID。",
              "手机号必须填写，缺失手机号的行拒绝导入。",
              "重复工号执行覆盖更新，不创建重复员工。",
              "管理员支持编辑员工档案，但禁止删除员工。",
              "导入或保存档案后，系统会尝试自动生成员工 embedding；未配置 Cloudflare 时会跳过，不影响基础功能。",
            ].map((item) => (
              <div key={item} className="rounded-md border border-slate-200 bg-white px-3 py-2">
                {item}
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}
