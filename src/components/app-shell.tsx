import { ShieldCheck } from "lucide-react";
import { getSessionUser } from "@/lib/auth/session";
import { logoutAction } from "@/app/actions/auth";
import { TopNav } from "@/components/top-nav";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="bg-[linear-gradient(105deg,#0b2254_0%,#174ea6_58%,#2b6fe8_100%)] text-white">
          <div className="mx-auto flex min-h-[76px] max-w-[1500px] items-center justify-between gap-4 px-4 py-4 md:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-white/14 ring-1 ring-white/25">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-lg font-semibold leading-6">AI Talent</div>
                <div className="mt-1 truncate text-xs text-blue-50/90">
                  企业 AI 人才评估管理系统
                </div>
              </div>
            </div>
            <div className="hidden items-center gap-2 text-xs md:flex">
              <span className="rounded-md bg-white/12 px-3 py-1.5 ring-1 ring-white/20">
                {user?.role === "employee" ? "员工" : "管理员"}
              </span>
              <span className="rounded-md bg-white/12 px-3 py-1.5 ring-1 ring-white/20">
                {user?.name ?? user?.username ?? user?.phone ?? "未登录"}
              </span>
              {user ? (
                <form action={logoutAction}>
                  <button className="rounded-md bg-white/12 px-3 py-1.5 ring-1 ring-white/20 hover:bg-white/20">
                    退出
                  </button>
                </form>
              ) : null}
            </div>
          </div>
        </div>
        <TopNav role={user?.role ?? null} />
      </header>
      <main className="mx-auto max-w-[1500px] px-4 py-6 md:px-6">{children}</main>
    </div>
  );
}
