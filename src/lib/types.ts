export type UserRole = "admin" | "employee";

export type SessionUser = {
  id: string;
  role: UserRole;
  username?: string | null;
  phone?: string | null;
  employeeId?: string | null;
  name?: string | null;
};

export type EmployeeProfile = {
  id: string;
  employeeNo: string;
  name: string;
  phone: string;
  email?: string | null;
  position?: string | null;
  positionDescription?: string | null;
  level?: string | null;
  productAbility?: string | null;
  technicalAbility?: string | null;
  projectExperience?: string | null;
  profileCompletion: number;
  latestScore?: number | null;
  latestAssessmentAt?: string | null;
  assessmentExplanation?: string | null;
  structuredSummary?: string | Record<string, unknown> | null;
  assessmentStatus: "已完成" | "未评估" | "进行中";
  tags?: string[];
};

export type DashboardStats = {
  totalEmployees: number;
  completedProfiles: number;
  completedAssessments: number;
  averageScore: number;
  highPotential: number;
};

export type AssessmentMessage = {
  id: string;
  sessionId?: string;
  roundNo: number;
  role: "system" | "assistant" | "user";
  content: string;
  createdAt: string;
};

export type AssessmentSession = {
  id: string;
  employeeId: string;
  status: "in_progress" | "completed" | "abandoned";
  currentRound: number;
  totalRounds: number;
  startedAt?: string;
  completedAt?: string | null;
  messages: AssessmentMessage[];
};
