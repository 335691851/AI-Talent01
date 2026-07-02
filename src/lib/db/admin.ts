import { generateEmployeeEmbeddings } from "@/lib/ai/embedding";
import { hasCloudflareEnv } from "@/lib/config";
import { getSupabaseAdmin, isDatabaseConfigured } from "@/lib/db/client";

export type VectorizationStatus = {
  databaseReady: boolean;
  embeddingReady: boolean;
  totalEmployees: number;
  vectorizedEmployees: number;
  embeddingChunks: number;
  pendingEmployees: number;
  updatedAt?: string | null;
};

export async function getVectorizationStatus(): Promise<VectorizationStatus> {
  if (!isDatabaseConfigured()) {
    return {
      databaseReady: false,
      embeddingReady: hasCloudflareEnv(),
      totalEmployees: 0,
      vectorizedEmployees: 0,
      embeddingChunks: 0,
      pendingEmployees: 0,
    };
  }

  const supabase = getSupabaseAdmin();
  const [{ count: totalEmployees }, { data: embeddings, count: embeddingChunks }] =
    await Promise.all([
      supabase.from("employees").select("id", { count: "exact", head: true }),
      supabase.from("employee_embeddings").select("employee_id, source_updated_at", { count: "exact" }),
    ]);

  const vectorizedIds = new Set((embeddings ?? []).map((item) => item.employee_id));
  const latestUpdate = (embeddings ?? [])
    .map((item) => item.source_updated_at)
    .filter(Boolean)
    .sort()
    .at(-1) ?? null;

  return {
    databaseReady: true,
    embeddingReady: hasCloudflareEnv(),
    totalEmployees: totalEmployees ?? 0,
    vectorizedEmployees: vectorizedIds.size,
    embeddingChunks: embeddingChunks ?? 0,
    pendingEmployees: Math.max(0, (totalEmployees ?? 0) - vectorizedIds.size),
    updatedAt: latestUpdate,
  };
}

export async function backfillEmployeeEmbeddings() {
  if (!isDatabaseConfigured()) {
    return {
      ok: false,
      total: 0,
      success: 0,
      failed: 0,
      errors: ["Supabase 尚未配置。"],
    };
  }

  if (!hasCloudflareEnv()) {
    return {
      ok: false,
      total: 0,
      success: 0,
      failed: 0,
      errors: ["Cloudflare Workers AI embedding 参数尚未配置。"],
    };
  }

  const supabase = getSupabaseAdmin();
  const { data: employees, error } = await supabase
    .from("employees")
    .select("id, employee_no, name")
    .order("employee_no");

  if (error) {
    return {
      ok: false,
      total: 0,
      success: 0,
      failed: 1,
      errors: [error.message],
    };
  }

  const errors: string[] = [];
  let success = 0;

  for (const employee of employees ?? []) {
    try {
      await generateEmployeeEmbeddings(employee.id);
      success += 1;
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "未知错误";
      errors.push(`${employee.employee_no} ${employee.name}: ${message}`);
    }
  }

  return {
    ok: errors.length === 0,
    total: employees?.length ?? 0,
    success,
    failed: errors.length,
    errors,
  };
}
