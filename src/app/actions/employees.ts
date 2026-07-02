"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/session";
import { env } from "@/lib/config";
import { getSupabaseAdmin, isDatabaseConfigured } from "@/lib/db/client";
import { generateEmployeeEmbeddings } from "@/lib/ai/embedding";

function completionScore(fields: Array<string | null | undefined>) {
  const completed = fields.filter((field) => field && field.trim().length > 0).length;
  return Math.round((completed / fields.length) * 100);
}

export type SaveEmployeeState = {
  error?: string;
  success?: string;
};

export async function saveEmployeeAction(
  _prevState: SaveEmployeeState,
  formData: FormData,
): Promise<SaveEmployeeState> {
  const session = await requireSession();

  if (!isDatabaseConfigured()) {
    return { error: "Supabase 尚未配置，当前只能查看原型数据。" };
  }

  const employeeId = String(formData.get("employeeId") ?? "");
  const employeeNo = String(formData.get("employeeNo") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const position = String(formData.get("position") ?? "").trim();
  const positionDescription = String(formData.get("positionDescription") ?? "").trim();
  const level = String(formData.get("level") ?? "").trim();
  const productAbility = String(formData.get("productAbility") ?? "").trim();
  const technicalAbility = String(formData.get("technicalAbility") ?? "").trim();
  const projectExperience = String(formData.get("projectExperience") ?? "").trim();

  if (session.role !== "admin" && session.employeeId !== employeeId) {
    return { error: "你只能编辑自己的档案。" };
  }

  if (!employeeNo || !name || !phone) {
    return { error: "工号、姓名、手机号为必填。" };
  }

  const supabase = getSupabaseAdmin();
  const employeePayload = {
    employee_no: employeeNo,
    name,
    phone,
    email: email || null,
    position: position || null,
    position_description: positionDescription || null,
    level: level || null,
    updated_at: new Date().toISOString(),
  };

  const { data: employee, error } = await supabase
    .from("employees")
    .upsert(employeePayload, { onConflict: "employee_no" })
    .select("id")
    .single();

  if (error || !employee) {
    return { error: error?.message ?? "保存员工失败。" };
  }

  const profileCompletion = completionScore([
    position,
    positionDescription,
    level,
    productAbility,
    technicalAbility,
    projectExperience,
  ]);

  const { error: profileError } = await supabase.from("employee_ai_profiles").upsert(
    {
      employee_id: employee.id,
      product_ability: productAbility || null,
      technical_ability: technicalAbility || null,
      project_experience: projectExperience || null,
      profile_completion: profileCompletion,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "employee_id" },
  );

  if (profileError) {
    return { error: profileError.message };
  }

  const { data: existingUser } = await supabase
    .from("app_users")
    .select("id")
    .eq("phone", phone)
    .maybeSingle();

  if (!existingUser) {
    const passwordHash = await bcrypt.hash(env.defaultEmployeePassword, 10);
    await supabase.from("app_users").insert({
      employee_id: employee.id,
      phone,
      password_hash: passwordHash,
      role: "employee",
      status: "active",
    });
  }

  await generateEmployeeEmbeddings(employee.id).catch((embeddingError) => {
    console.warn("Embedding generation skipped/failed:", embeddingError);
  });

  revalidatePath("/employees");
  revalidatePath("/");
  return { success: "档案已保存。" };
}
