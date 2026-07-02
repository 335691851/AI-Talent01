import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { env } from "@/lib/config";
import { getSupabaseAdmin, isDatabaseConfigured } from "@/lib/db/client";
import { parseEmployeeExcel } from "@/lib/import/excel";
import { generateEmployeeEmbeddings } from "@/lib/ai/embedding";

export async function POST(request: Request) {
  await requireRole("admin");

  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Supabase 尚未配置，不能导入员工。" },
      { status: 400 },
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "请上传 Excel 文件。" }, { status: 400 });
  }

  let rows;
  try {
    rows = await parseEmployeeExcel(file);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Excel 解析失败，请检查文件格式。",
      },
      { status: 400 },
    );
  }
  const supabase = getSupabaseAdmin();
  const { data: batch, error: batchError } = await supabase
    .from("import_batches")
    .insert({
      file_name: file.name,
      total_rows: rows.length,
      success_rows: rows.filter((row) => row.status === "valid").length,
      failed_rows: rows.filter((row) => row.status === "invalid").length,
      status: "completed",
    })
    .select("id")
    .single();

  if (batchError || !batch) {
    return NextResponse.json({ ok: false, error: batchError?.message }, { status: 500 });
  }

  await supabase.from("import_rows").insert(
    rows.map((row) => ({
      batch_id: batch.id,
      row_no: row.rowNo,
      employee_no: row.employeeNo,
      raw_data: row.raw,
      status: row.status,
      error_message: row.errorMessage ?? null,
    })),
  );

  const imported: string[] = [];
  const rejected = rows.filter((row) => row.status === "invalid");

  for (const row of rows.filter((item) => item.status === "valid")) {
    const { data: phoneOwner } = await supabase
      .from("employees")
      .select("employee_no")
      .eq("phone", row.phone)
      .neq("employee_no", row.employeeNo)
      .maybeSingle();

    if (phoneOwner) {
      rejected.push({ ...row, status: "invalid", errorMessage: "手机号已被其他工号使用" });
      continue;
    }

    const { data: employee, error } = await supabase
      .from("employees")
      .upsert(
        {
          employee_no: row.employeeNo,
          name: row.name,
          phone: row.phone,
          email: row.email || null,
          position: row.position || null,
          position_description: row.positionDescription || null,
          level: row.level || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "employee_no" },
      )
      .select("id")
      .single();

    if (error || !employee) {
      rejected.push({ ...row, status: "invalid", errorMessage: error?.message ?? "写入失败" });
      continue;
    }

    const completed = [
      row.position,
      row.positionDescription,
      row.level,
      row.productAbility,
      row.technicalAbility,
      row.projectExperience,
    ].filter(Boolean).length;

    await supabase.from("employee_ai_profiles").upsert(
      {
        employee_id: employee.id,
        product_ability: row.productAbility || null,
        technical_ability: row.technicalAbility || null,
        project_experience: row.projectExperience || null,
        profile_completion: Math.round((completed / 6) * 100),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "employee_id" },
    );

    const { data: existingUser } = await supabase
      .from("app_users")
      .select("id")
      .eq("phone", row.phone)
      .maybeSingle();

    if (!existingUser) {
      await supabase.from("app_users").insert({
        employee_id: employee.id,
        phone: row.phone,
        password_hash: await bcrypt.hash(env.defaultEmployeePassword, 10),
        role: "employee",
        status: "active",
      });
    }

    await generateEmployeeEmbeddings(employee.id).catch((embeddingError) => {
      console.warn("Embedding generation skipped/failed:", embeddingError);
    });
    imported.push(row.employeeNo);
  }

  return NextResponse.json({
    ok: true,
    batchId: batch.id,
    total: rows.length,
    imported: imported.length,
    failed: rejected.length,
    errors: rejected.map((row) => ({
      rowNumber: row.rowNo,
      employeeNo: row.employeeNo,
      errors: row.errorMessage ? row.errorMessage.split("；") : ["导入失败"],
    })),
    importedCount: imported.length,
    rejectedCount: rejected.length,
    rows,
    rejected,
  });
}
