import { Cloud, Database, KeyRound, Shield } from "lucide-react";
import { Badge, FieldBlock, PageHeader, Panel } from "@/components/ui";
import { VectorizationPanel } from "@/components/vectorization-panel";
import { env, hasCloudflareEnv, hasDeepSeekEnv, hasSupabaseEnv } from "@/lib/config";
import { getVectorizationStatus } from "@/lib/db/admin";
import { requireRole } from "@/lib/auth/session";

function StatusBadge({ ready }: { ready: boolean }) {
  return <Badge tone={ready ? "green" : "orange"}>{ready ? "已配置" : "未配置"}</Badge>;
}

export default async function SettingsPage() {
  await requireRole("admin");
  const vectorizationStatus = await getVectorizationStatus();

  return (
    <>
      <PageHeader
        eyebrow="系统配置"
        title="实施配置总览"
        description="展示本地 .env.local 中关键服务配置状态，所有服务端密钥只在 Server Actions 和 Route Handlers 中读取，不暴露到浏览器。"
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="账号与权限">
          <div className="grid gap-4">
            <div className="flex items-start gap-3">
              <Shield className="mt-1 h-5 w-5 text-blue-600" />
              <FieldBlock label="角色模型">仅管理员和员工两种角色；不提供租户、部门级权限和员工删除能力。</FieldBlock>
            </div>
            <div className="flex items-start gap-3">
              <KeyRound className="mt-1 h-5 w-5 text-blue-600" />
              <FieldBlock label="初始账号">主管理员 {env.adminUsername} / {env.adminInitialPassword}；员工手机号登录，初始密码 {env.defaultEmployeePassword}。</FieldBlock>
            </div>
          </div>
        </Panel>

        <Panel title="AI 服务">
          <div className="grid gap-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <Cloud className="mt-1 h-5 w-5 text-blue-600" />
                <FieldBlock label="LLM">DeepSeek {env.deepseekModel}，用于 AI 自评估 10 轮对话和最终评估说明生成。</FieldBlock>
              </div>
              <StatusBadge ready={hasDeepSeekEnv()} />
            </div>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <Database className="mt-1 h-5 w-5 text-blue-600" />
                <FieldBlock label="Embedding">Cloudflare Workers AI {env.cloudflareEmbeddingModel}，向量写入 Supabase Postgres pgvector。</FieldBlock>
              </div>
              <StatusBadge ready={hasCloudflareEnv()} />
            </div>
          </div>
        </Panel>

        <Panel title="数据访问策略">
          <div className="space-y-3 text-sm leading-6 text-slate-700">
            <div className="rounded-md border border-slate-200 bg-white p-3">
              Server Components 优先负责读取页面数据，Server Actions 负责档案更新、导入确认等服务端变更。
            </div>
            <div className="rounded-md border border-slate-200 bg-white p-3">
              Chatbox 流式响应用 Route Handler 承接，避免把 DeepSeek Key 暴露到浏览器。
            </div>
            <div className="rounded-md border border-slate-200 bg-white p-3">
              评估完整对话仅员工本人可访问；管理员只使用最新有效评估结果、评分说明和结构化摘要。
            </div>
          </div>
        </Panel>

        <Panel title="环境变量">
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
              <span>Supabase / Postgres</span>
              <StatusBadge ready={hasSupabaseEnv()} />
            </div>
            <div className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
              <span>DeepSeek API</span>
              <StatusBadge ready={hasDeepSeekEnv()} />
            </div>
            <div className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
              <span>Cloudflare Workers AI</span>
              <StatusBadge ready={hasCloudflareEnv()} />
            </div>
          </div>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <Panel title="员工数据向量化">
          <VectorizationPanel status={vectorizationStatus} />
        </Panel>

        <Panel title="安全边界">
          <div className="space-y-3 text-sm leading-6 text-slate-700">
            <div className="rounded-md border border-slate-200 bg-white p-3">
              数据库业务表已启用 RLS，并撤销匿名与普通 authenticated 角色的直接访问权限。
            </div>
            <div className="rounded-md border border-slate-200 bg-white p-3">
              应用服务端使用 service role 访问数据库；所有页面、Server Actions 和 Route Handlers 先校验本系统 session 与角色。
            </div>
            <div className="rounded-md border border-slate-200 bg-white p-3">
              `assessment_messages` 不在管理员页面展示，Chat API 只允许评估员工本人提交和读取流式响应。
            </div>
          </div>
        </Panel>
      </div>
    </>
  );
}
