import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getFeishuUserByClientCode, normalizePhone } from "@/lib/auth/feishu";
import { createSession } from "@/lib/auth/session";
import { hasFeishuEnv } from "@/lib/config";
import { findSessionUserByPhone } from "@/lib/db/auth";
import { isDatabaseConfigured } from "@/lib/db/client";

export const runtime = "nodejs";

function log(requestId: string, step: string, details?: Record<string, unknown>) {
  console.info("[feishu-client-login]", { requestId, step, ...details });
}

export async function POST(request: Request) {
  const requestId = randomUUID();
  log(requestId, "request_received", {
    userAgent: request.headers.get("user-agent")?.slice(0, 200) ?? null,
  });

  if (!hasFeishuEnv()) {
    log(requestId, "configuration_missing");
    return NextResponse.json({ error: "not_configured", requestId }, { status: 503 });
  }
  if (!isDatabaseConfigured()) {
    log(requestId, "database_missing");
    return NextResponse.json(
      { error: "database_not_configured", requestId },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    code?: unknown;
    clientEvent?: unknown;
    errno?: unknown;
    message?: unknown;
  } | null;
  if (body && typeof body.clientEvent === "string") {
    log(requestId, "client_failure", {
      event: body.clientEvent.slice(0, 80),
      errno: typeof body.errno === "number" ? body.errno : null,
      message: typeof body.message === "string" ? body.message.slice(0, 200) : null,
    });
    return NextResponse.json({ ok: true, requestId });
  }

  if (!body || typeof body.code !== "string" || !body.code) {
    log(requestId, "code_missing");
    return NextResponse.json({ error: "missing_code", requestId }, { status: 400 });
  }

  try {
    log(requestId, "exchange_started");
    const feishuUser = await getFeishuUserByClientCode(body.code);
    const phone = normalizePhone(feishuUser.mobile);
    log(requestId, "user_info_received", {
      hasMobile: Boolean(phone),
      hasOpenId: Boolean(feishuUser.open_id),
    });

    if (!phone) {
      return NextResponse.json({ error: "missing_mobile", requestId }, { status: 403 });
    }

    const sessionUser = await findSessionUserByPhone(phone);
    if (!sessionUser) {
      log(requestId, "account_not_found", { phoneSuffix: phone.slice(-4) });
      return NextResponse.json(
        { error: "account_not_found", requestId },
        { status: 403 },
      );
    }

    await createSession(sessionUser);
    log(requestId, "session_created", { userId: sessionUser.id });
    return NextResponse.json({ ok: true, requestId });
  } catch (error) {
    console.error("[feishu-client-login]", {
      requestId,
      step: "failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "client_login_failed", requestId }, { status: 502 });
  }
}
