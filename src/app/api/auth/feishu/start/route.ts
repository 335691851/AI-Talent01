import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { buildFeishuAuthorizeUrl } from "@/lib/auth/feishu";
import { feishuOAuthStateCookieName } from "@/lib/auth/feishu-oauth";
import { hasFeishuEnv } from "@/lib/config";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!hasFeishuEnv()) {
    return NextResponse.redirect(new URL("/login?feishu_error=not_configured", request.url));
  }

  const requestUrl = new URL(request.url);
  const next = requestUrl.searchParams.get("next") ?? "/";
  const statePayload = JSON.stringify({
    nonce: randomBytes(24).toString("base64url"),
    next: next.startsWith("/") ? next : "/",
  });
  const state = Buffer.from(statePayload).toString("base64url");

  const cookieStore = await cookies();
  cookieStore.set(feishuOAuthStateCookieName, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });

  return NextResponse.redirect(buildFeishuAuthorizeUrl(state));
}
