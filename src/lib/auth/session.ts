import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { jwtVerify, SignJWT } from "jose";
import type { SessionUser, UserRole } from "@/lib/types";
import { env } from "@/lib/config";

const cookieName = "ai_talent_session";

function getSecret() {
  return new TextEncoder().encode(env.authSecret);
}

export async function createSession(user: SessionUser) {
  const token = await new SignJWT({
    role: user.role,
    username: user.username ?? null,
    phone: user.phone ?? null,
    employeeId: user.employeeId ?? null,
    name: user.name ?? null,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());

  const cookieStore = await cookies();
  cookieStore.set(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(cookieName);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(cookieName)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    return {
      id: payload.sub ?? "",
      role: payload.role as UserRole,
      username: (payload.username as string | null) ?? null,
      phone: (payload.phone as string | null) ?? null,
      employeeId: (payload.employeeId as string | null) ?? null,
      name: (payload.name as string | null) ?? null,
    };
  } catch {
    return null;
  }
}

export async function requireSession() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(role: UserRole) {
  const user = await requireSession();
  if (user.role !== role) redirect("/");
  return user;
}
