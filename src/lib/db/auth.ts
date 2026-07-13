import type { SessionUser, UserRole } from "@/lib/types";
import { normalizePhone } from "@/lib/auth/feishu";
import { getSupabaseAdmin } from "@/lib/db/client";

type LoginUserRow = {
  id: string;
  employee_id: string | null;
  username: string | null;
  phone: string | null;
  role: UserRole;
  status: string;
  employees: { name: string } | { name: string }[] | null;
};

function mapSessionUser(user: LoginUserRow): SessionUser | null {
  if (user.status !== "active") return null;

  const employeeName = Array.isArray(user.employees)
    ? user.employees[0]?.name
    : user.employees?.name;

  return {
    id: user.id,
    role: user.role,
    username: user.username,
    phone: user.phone,
    employeeId: user.employee_id,
    name: employeeName ?? user.username ?? user.phone,
  };
}

export async function findSessionUserByPhone(rawPhone: string) {
  const phone = normalizePhone(rawPhone);
  if (!phone) return null;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("app_users")
    .select("id, employee_id, username, phone, role, status, employees(name)")
    .eq("phone", phone)
    .returns<LoginUserRow[]>()
    .maybeSingle();

  if (error || !data) return null;
  return mapSessionUser(data);
}
