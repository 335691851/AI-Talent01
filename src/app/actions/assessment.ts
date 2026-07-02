"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAssessmentSession } from "@/lib/db/assessment";
import { isDatabaseConfigured } from "@/lib/db/client";
import { requireSession } from "@/lib/auth/session";

export async function startAssessmentAction(): Promise<void> {
  const user = await requireSession();

  if (!isDatabaseConfigured()) {
    redirect("/settings");
  }

  if (user.role !== "employee" || !user.employeeId) {
    redirect("/employees");
  }

  const sessionId = await createAssessmentSession(user.employeeId);
  revalidatePath("/assessment");
  redirect(`/assessment?session=${sessionId}`);
}
