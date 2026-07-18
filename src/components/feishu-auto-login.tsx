"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";
import { isFeishuUserAgent } from "@/lib/auth/feishu";

type FeishuResult = { code?: string };
type FeishuError = { errno?: number; errString?: string; errMsg?: string };
type FeishuApi = {
  requestAccess?: (options: {
    appID: string;
    scopeList: string[];
    success: (result: FeishuResult) => void;
    fail: (error: FeishuError) => void;
  }) => void;
  requestAuthCode?: (options: {
    appId: string;
    success: (result: FeishuResult) => void;
    fail: (error: FeishuError) => void;
  }) => void;
};

declare global {
  interface Window {
    h5sdk?: { ready: (callback: () => void) => void };
    tt?: FeishuApi;
  }
}

export function FeishuAutoLogin({
  appId,
  enabled,
}: {
  appId: string;
  enabled: boolean;
}) {
  const started = useRef(false);
  const [sdkLoaded, setSdkLoaded] = useState(false);

  const reportFailure = useCallback(
    async (clientEvent: string, error: FeishuError = {}) => {
      const response = await fetch("/api/auth/feishu/client-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientEvent,
          errno: error.errno,
          message: error.errString ?? error.errMsg,
        }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        requestId?: string;
      };
      const requestId = result.requestId
        ? `&feishu_request_id=${encodeURIComponent(result.requestId)}`
        : "";
      window.location.replace(`/login?feishu_error=${clientEvent}${requestId}`);
    },
    [],
  );

  const finishLogin = useCallback(async (code?: string) => {
    if (!code) {
      window.location.replace("/login?feishu_error=missing_code");
      return;
    }

    const response = await fetch("/api/auth/feishu/client-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const result = (await response.json().catch(() => ({}))) as {
      error?: string;
      requestId?: string;
    };
    if (response.ok) {
      window.location.replace("/");
      return;
    }

    const error = result.error ?? "client_login_failed";
    const requestId = result.requestId
      ? `&feishu_request_id=${encodeURIComponent(result.requestId)}`
      : "";
    window.location.replace(`/login?feishu_error=${encodeURIComponent(error)}${requestId}`);
  }, []);

  const startLogin = useCallback(() => {
    if (!enabled || !sdkLoaded || started.current) return;

    if (!isFeishuUserAgent(window.navigator.userAgent)) return;

    started.current = true;
    window.h5sdk?.ready(() => {
      if (window.tt?.requestAccess) {
        window.tt.requestAccess({
          appID: appId,
          scopeList: [],
          success: ({ code }) => void finishLogin(code),
          fail: (error) => void reportFailure("client_access_failed", error),
        });
        return;
      }

      if (window.tt?.requestAuthCode) {
        window.tt.requestAuthCode({
          appId,
          success: ({ code }) => void finishLogin(code),
          fail: (error) => void reportFailure("client_access_failed", error),
        });
        return;
      }

      void reportFailure("client_sdk_unavailable");
    });
  }, [appId, enabled, finishLogin, reportFailure, sdkLoaded]);

  useEffect(() => {
    startLogin();
  }, [startLogin]);

  return enabled ? (
    <Script
      src="https://lf-scm-cn.feishucdn.com/lark/op/h5-js-sdk-1.5.34.js"
      strategy="afterInteractive"
      onLoad={() => setSdkLoaded(true)}
      onError={() => void reportFailure("client_sdk_load_failed")}
    />
  ) : null;
}
