import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getFeishuUserByCode, normalizePhone } from "@/lib/auth/feishu";
import { feishuOAuthStateCookieName } from "@/lib/auth/feishu-oauth";
import { createSession } from "@/lib/auth/session";
import { hasFeishuEnv } from "@/lib/config";
import { findSessionUserByPhone } from "@/lib/db/auth";
import { isDatabaseConfigured } from "@/lib/db/client";

export const runtime = "nodejs";

function loginRedirect(requestUrl: string, error: string) {
  return NextResponse.redirect(
    new URL(`/login?feishu_error=${encodeURIComponent(error)}`, requestUrl),
  );
}

function parseState(state: string) {
  try {
    const payload = JSON.parse(Buffer.from(state, "base64url").toString("utf8")) as {
      nonce?: string;
      next?: string;
    };
    return {
      nonce: payload.nonce,
      next: payload.next?.startsWith("/") ? payload.next : "/",
    };
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  if (!hasFeishuEnv()) return loginRedirect(request.url, "not_configured");
  if (!isDatabaseConfigured()) return loginRedirect(request.url, "database_not_configured");

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieStore = await cookies();
  const storedState = cookieStore.get(feishuOAuthStateCookieName)?.value;
  cookieStore.delete(feishuOAuthStateCookieName);

  if (!code) return loginRedirect(request.url, "missing_code");
  if (!state || !storedState || state !== storedState) {
    return loginRedirect(request.url, "invalid_state");
  }

  const parsedState = parseState(state);
  if (!parsedState?.nonce) {
    return loginRedirect(request.url, "invalid_state");
  }

  try {
    const feishuUser = await getFeishuUserByCode(code);
    const phone = normalizePhone(feishuUser.mobile);

    if (!phone) {
      return loginRedirect(request.url, "missing_mobile");
    }

    const sessionUser = await findSessionUserByPhone(phone);
    if (!sessionUser) {
      return loginRedirect(request.url, "account_not_found");
    }

    await createSession(sessionUser);
    return NextResponse.redirect(new URL(parsedState.next, request.url));
  } catch (error) {
    console.error("Feishu login failed:", error);
    return loginRedirect(request.url, "callback_failed");
  }
}
