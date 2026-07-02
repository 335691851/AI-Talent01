import { ShieldCheck } from "lucide-react";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <div className="mx-auto grid min-h-[calc(100vh-150px)] max-w-5xl items-center gap-8 md:grid-cols-[1fr_380px]">
      <section>
        <div className="mb-4 inline-flex items-center gap-2 rounded-md bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700">
          <ShieldCheck className="h-4 w-4" />
          AI Talent
        </div>
        <h1 className="text-3xl font-semibold text-slate-950">企业 AI 人才评估管理系统</h1>
        <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600">
          支持员工维护 AI 档案、通过 10 轮 AI Chatbox 完成自评估，并帮助管理员检索企业内部 AI 能力人才。
        </p>
      </section>

      <section className="surface rounded-lg p-5">
        <h2 className="text-lg font-semibold text-slate-950">登录</h2>
        <LoginForm />
        <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-500">
          管理员：admin / admin；员工使用手机号和初始密码 88888888。
        </div>
      </section>
    </div>
  );
}
