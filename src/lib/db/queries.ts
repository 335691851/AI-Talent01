import { employees as mockEmployees } from "@/data/mock";
import { isDatabaseConfigured, getSupabaseAdmin } from "@/lib/db/client";
import type { DashboardStats, EmployeeProfile } from "@/lib/types";

function mockProfiles(): EmployeeProfile[] {
  return mockEmployees.map((item) => ({
    id: item.id,
    employeeNo: item.id,
    name: item.name,
    phone: item.phone,
    email: item.email,
    position: item.role,
    positionDescription: item.jobDescription,
    level: item.level,
    productAbility: item.productAbility,
    technicalAbility: item.technicalAbility,
    projectExperience: item.projectExperience,
    profileCompletion: item.profileCompletion,
    latestScore: item.score || null,
    latestAssessmentAt: item.lastAssessment === "-" ? null : item.lastAssessment,
    assessmentExplanation: item.explanation,
    structuredSummary: { summary: item.summary, tags: item.tags },
    assessmentStatus: item.assessmentStatus,
    tags: item.tags,
  }));
}

export async function listEmployeeProfiles(): Promise<EmployeeProfile[]> {
  if (!isDatabaseConfigured()) return mockProfiles();

  const supabase = getSupabaseAdmin();
  const [{ data: employees, error: employeeError }, { data: profiles }, { data: results }] =
    await Promise.all([
      supabase.from("employees").select("*").order("employee_no"),
      supabase.from("employee_ai_profiles").select("*"),
      supabase
        .from("assessment_results")
        .select("*")
        .eq("is_latest", true)
        .order("created_at", { ascending: false }),
    ]);

  if (employeeError) {
    console.warn("Falling back to mock employees:", employeeError.message);
    return mockProfiles();
  }

  const profileMap = new Map((profiles ?? []).map((item) => [item.employee_id, item]));
  const resultMap = new Map((results ?? []).map((item) => [item.employee_id, item]));

  return (employees ?? []).map((item) => {
    const profile = profileMap.get(item.id);
    const result = resultMap.get(item.id);
    return {
      id: item.id,
      employeeNo: item.employee_no,
      name: item.name,
      phone: item.phone,
      email: item.email,
      position: item.position,
      positionDescription: item.position_description,
      level: item.level,
      productAbility: profile?.product_ability ?? "",
      technicalAbility: profile?.technical_ability ?? "",
      projectExperience: profile?.project_experience ?? "",
      profileCompletion: profile?.profile_completion ?? 0,
      latestScore: result?.score ?? null,
      latestAssessmentAt: result?.created_at ?? null,
      assessmentExplanation: result?.assessment_explanation ?? null,
      structuredSummary: result?.structured_summary ?? null,
      assessmentStatus: result ? "已完成" : "未评估",
      tags: [],
    } satisfies EmployeeProfile;
  });
}

export async function getEmployeeProfileById(id?: string | null) {
  const profiles = await listEmployeeProfiles();
  if (!id) return profiles[0] ?? null;
  return profiles.find((profile) => profile.id === id || profile.employeeNo === id) ?? null;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const profiles = await listEmployeeProfiles();
  const assessed = profiles.filter((item) => item.latestScore !== null && item.latestScore !== undefined);
  const completedProfiles = profiles.filter((item) => item.profileCompletion >= 80).length;
  const averageScore = assessed.length
    ? Math.round(assessed.reduce((sum, item) => sum + (item.latestScore ?? 0), 0) / assessed.length)
    : 0;

  return {
    totalEmployees: profiles.length,
    completedProfiles,
    completedAssessments: assessed.length,
    averageScore,
    highPotential: assessed.filter((item) => (item.latestScore ?? 0) >= 85).length,
  };
}
