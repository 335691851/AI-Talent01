"use client";

import { useEffect, useRef } from "react";

export function FeishuAutoLogin({ enabled }: { enabled: boolean }) {
  const started = useRef(false);

  useEffect(() => {
    if (!enabled || started.current) return;

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isFeishuClient =
      userAgent.includes("feishu") ||
      userAgent.includes("lark") ||
      userAgent.includes("larkclient");

    if (!isFeishuClient) return;

    started.current = true;
    window.location.assign("/api/auth/feishu/start?next=/");
  }, [enabled]);

  return null;
}
