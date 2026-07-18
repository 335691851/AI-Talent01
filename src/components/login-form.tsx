"use client";

import { useActionState } from "react";
import { LogIn } from "lucide-react";
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
  client_access_failed: "飞书端内授权失败，请确认应用版本、可用范围和客户端版本。",
  client_sdk_unavailable: "当前飞书客户端不支持端内免登接口，请升级飞书后重试。",
  client_sdk_load_failed: "飞书免登组件加载失败，请检查网络后重试。",
  client_login_failed: "飞书端内免登处理失败，请根据诊断编号检查服务端日志。",
};

export function LoginForm({
  feishuError,
  feishuRequestId,
}: {
  feishuError?: string;
  feishuRequestId?: string;
}) {
  const [state, formAction, pending] = useActionState(loginAction, initialState);
  const feishuErrorMessage = feishuError
    ? feishuErrorMessages[feishuError] ?? "飞书免登失败，请重试。"
    : null;

  return (
    <div className="mt-5 space-y-5">
      {feishuErrorMessage ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {feishuErrorMessage}
          {feishuRequestId ? (
            <div className="mt-1 font-mono text-xs">诊断编号：{feishuRequestId}</div>
          ) : null}
        </div>
      ) : null}

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
