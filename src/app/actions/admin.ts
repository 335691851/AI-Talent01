"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { backfillEmployeeEmbeddings } from "@/lib/db/admin";

export type BackfillEmbeddingsState = {
  ok?: boolean;
  total?: number;
  success?: number;
  failed?: number;
  errors?: string[];
  message?: string;
};

export async function backfillEmbeddingsAction(
  prevState: BackfillEmbeddingsState,
): Promise<BackfillEmbeddingsState> {
  void prevState;
  await requireRole("admin");
  const result = await backfillEmployeeEmbeddings();
  revalidatePath("/settings");

  return {
    ...result,
    message: result.ok
      ? `向量化完成：${result.success}/${result.total} 名员工已处理。`
      : `向量化未完全完成：成功 ${result.success}，失败 ${result.failed}。`,
  };
}
