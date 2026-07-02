"use client";

import { useActionState } from "react";
import { LogIn } from "lucide-react";
import { loginAction, type LoginState } from "@/app/actions/auth";
import { Button } from "@/components/ui";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="mt-5 space-y-4">
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
      <Button>
        <LogIn className="h-4 w-4" />
        {pending ? "登录中..." : "登录系统"}
      </Button>
    </form>
  );
}
