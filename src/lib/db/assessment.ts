import type { AssessmentMessage, AssessmentSession, EmployeeProfile } from "@/lib/types";
import { env } from "@/lib/config";
import { getSupabaseAdmin } from "@/lib/db/client";
import { getEmployeeProfileById } from "@/lib/db/queries";
import { buildDemoEvaluation, buildDemoQuestion } from "@/lib/assessment/prompts";

type SessionRow = {
  id: string;
  employee_id: string;
  status: "in_progress" | "completed" | "abandoned";
  current_round: number;
  total_rounds: number;
  started_at: string;
  completed_at: string | null;
};

type MessageRow = {
  id: string;
  session_id: string;
  role: "assistant" | "user" | "system";
  round_no: number;
  content: string;
  created_at: string;
};

function mapSession(row: SessionRow, messages: MessageRow[]): AssessmentSession {
  return {
    id: row.id,
    employeeId: row.employee_id,
    status: row.status,
    currentRound: row.current_round,
    totalRounds: row.total_rounds,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    messages: messages.map(mapMessage),
  };
}

function mapMessage(row: MessageRow): AssessmentMessage {
  return {
    id: row.id,
    role: row.role === "system" ? "assistant" : row.role,
    content: row.content,
    roundNo: row.round_no,
    createdAt: row.created_at,
  };
}

export async function getAssessmentSession(sessionId: string) {
  const supabase = getSupabaseAdmin();
  const { data: session, error: sessionError } = await supabase
    .from("assessment_sessions")
    .select("*")
    .eq("id", sessionId)
    .single<SessionRow>();

  if (sessionError || !session) return null;

  const { data: messages, error: messagesError } = await supabase
    .from("assessment_messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })
    .returns<MessageRow[]>();

  if (messagesError) throw messagesError;
  return mapSession(session, messages ?? []);
}

export async function getEmployeeAssessmentState(employeeId: string) {
  const supabase = getSupabaseAdmin();
  const { data: sessions, error } = await supabase
    .from("assessment_sessions")
    .select("*")
    .eq("employee_id", employeeId)
    .order("started_at", { ascending: false })
    .limit(8)
    .returns<SessionRow[]>();

  if (error) throw error;

  const active = sessions?.find((item) => item.status === "in_progress") ?? null;
  const activeSession = active ? await getAssessmentSession(active.id) : null;

  const { data: results, error: resultsError } = await supabase
    .from("assessment_results")
    .select("id, session_id, score, assessment_explanation, structured_summary, created_at, is_latest")
    .eq("employee_id", employeeId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (resultsError) throw resultsError;

  return {
    activeSession,
    sessions: sessions ?? [],
    results: results ?? [],
  };
}

export async function createAssessmentSession(employeeId: string) {
  const supabase = getSupabaseAdmin();
  const profile = await getEmployeeProfileById(employeeId);

  if (!profile) {
    throw new Error("员工档案不存在，无法开始评估。");
  }

  await supabase
    .from("assessment_sessions")
    .update({
      status: "abandoned",
    })
    .eq("employee_id", employeeId)
    .eq("status", "in_progress");

  const { data: session, error } = await supabase
    .from("assessment_sessions")
    .insert({
      employee_id: employeeId,
      status: "in_progress",
      current_round: 1,
      total_rounds: env.assessmentTotalRounds,
    })
    .select("*")
    .single<SessionRow>();

  if (error || !session) throw error;

  await supabase.from("assessment_messages").insert({
    session_id: session.id,
    role: "assistant",
    round_no: 1,
    content: buildDemoQuestion(1),
  });

  return session.id;
}

export async function saveUserAssessmentMessage(sessionId: string, roundNo: number, content: string) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("assessment_messages").insert({
    session_id: sessionId,
    role: "user",
    round_no: roundNo,
    content,
  });

  if (error) throw error;
}

export async function saveAssistantAssessmentMessage(sessionId: string, roundNo: number, content: string) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("assessment_messages").insert({
    session_id: sessionId,
    role: "assistant",
    round_no: roundNo,
    content,
  });

  if (error) throw error;
}

export async function advanceAssessmentRound(sessionId: string, nextRound: number) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("assessment_sessions")
    .update({ current_round: nextRound })
    .eq("id", sessionId);

  if (error) throw error;
}

export async function completeAssessmentSession(sessionId: string, profile: EmployeeProfile, evaluation: ReturnType<typeof buildDemoEvaluation>) {
  const supabase = getSupabaseAdmin();

  await supabase
    .from("assessment_results")
    .update({ is_latest: false })
    .eq("employee_id", profile.id);

  const { error: insertError } = await supabase.from("assessment_results").insert({
    session_id: sessionId,
    employee_id: profile.id,
    score: evaluation.score,
    assessment_explanation: evaluation.explanation,
    structured_summary: evaluation.structured_summary,
    is_latest: true,
  });

  if (insertError) throw insertError;

  const { error: sessionError } = await supabase
    .from("assessment_sessions")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", sessionId);

  if (sessionError) throw sessionError;
}
