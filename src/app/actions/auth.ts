"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { getSupabaseAdmin, isDatabaseConfigured } from "@/lib/db/client";
import { createSession, clearSession } from "@/lib/auth/session";
import { env } from "@/lib/config";
import type { UserRole } from "@/lib/types";

type LoginUserRow = {
  id: string;
  employee_id: string | null;
  username: string | null;
  phone: string | null;
  password_hash: string;
  role: UserRole;
  status: string;
  employees: { name: string } | { name: string }[] | null;
};

export type LoginState = {
  error?: string;
};

export async function loginAction(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const account = String(formData.get("account") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!account || !password) {
    return { error: "请输入账号和密码。" };
  }

  if (!isDatabaseConfigured()) {
    if (account === env.adminUsername && password === env.adminInitialPassword) {
      await createSession({
        id: "local-admin",
        role: "admin",
        username: env.adminUsername,
        name: "本地管理员",
      });
      redirect("/");
    }
    return { error: "未配置 Supabase，本地演示仅支持 admin / admin。" };
  }

  const supabase = getSupabaseAdmin();
  const { data: user, error } = await supabase
    .from("app_users")
    .select("id, employee_id, username, phone, password_hash, role, status, employees(name)")
    .or(`username.eq.${account},phone.eq.${account}`)
    .returns<LoginUserRow[]>()
    .maybeSingle();

  if (error || !user || user.status !== "active") {
    return { error: "账号不存在或已停用。" };
  }

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    return { error: "密码不正确。" };
  }

  const employeeName = Array.isArray(user.employees)
    ? user.employees[0]?.name
    : user.employees?.name;

  await createSession({
    id: user.id,
    role: user.role,
    username: user.username,
    phone: user.phone,
    employeeId: user.employee_id,
    name: employeeName ?? user.username ?? user.phone,
  });

  redirect("/");
}

export async function logoutAction() {
  await clearSession();
  redirect("/login");
}
