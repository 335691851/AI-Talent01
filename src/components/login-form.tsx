"use client";

import { useActionState } from "react";
import { LogIn, MessageSquareText } from "lucide-react";
import { loginAction, type LoginState } from "@/app/actions/auth";
import { Button } from "@/components/ui";

const initialState: LoginState = {};

const feishuErrorMessages: Record<string, string> = {
  not_configured: "飞书免登尚未配置，请先配置 FEISHU_APP_ID 和 FEISHU_APP_SECRET。",
  database_not_configured: "数据库尚未配置，暂时无法使用飞书免登。",
  missing_code: "飞书未返回登录授权码，请从飞书工作台重新打开应用。",
  invalid_state: "飞书登录状态校验失败，请重新发起免登。",
  missing_mobile: "飞书未返回手机号，请确认应用已开通手机号权限，并完成权限发布。",
  account_not_found: "未找到与飞书手机号匹配的员工账号，请确认员工档案手机号与飞书手机号一致。",
  callback_failed: "飞书免登处理失败，请检查飞书应用配置、回调地址和接口权限。",
};

export function LoginForm({
  hasFeishuLogin,
  feishuError,
}: {
  hasFeishuLogin: boolean;
  feishuError?: string;
}) {
  const [state, formAction, pending] = useActionState(loginAction, initialState);
  const feishuErrorMessage = feishuError
    ? feishuErrorMessages[feishuError] ?? "飞书免登失败，请重试。"
    : null;

  return (
    <div className="mt-5 space-y-5">
      {hasFeishuLogin ? (
        <a
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-3 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
          href="/api/auth/feishu/start?next=/"
        >
          <MessageSquareText className="h-4 w-4" />
          飞书工作台免登
        </a>
      ) : (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
          飞书免登未启用：请在 Vercel 环境变量中配置飞书应用信息。
        </div>
      )}

      {feishuErrorMessage ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {feishuErrorMessage}
        </div>
      ) : null}

      <div className="flex items-center gap-3 text-xs text-slate-400">
        <div className="h-px flex-1 bg-slate-200" />
        <span>或使用账号密码</span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      <form action={formAction} className="space-y-4">
        <label className="block">
          <span className="field-label">账号 / 手机号</span>
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            defaultValue="admin"
            name="account"
          />
        </label>
        <label className="block">
          <span className="field-label">密码</span>
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            defaultValue="admin"
            name="password"
            type="password"
          />
        </label>
        {state.error ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.error}
          </div>
        ) : null}
        <Button disabled={pending}>
          <LogIn className="h-4 w-4" />
          {pending ? "登录中..." : "登录系统"}
        </Button>
      </form>
    </div>
  );
}
