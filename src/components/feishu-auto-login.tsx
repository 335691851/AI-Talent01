"use client";

import { useEffect, useRef } from "react";
import { isFeishuUserAgent } from "@/lib/auth/feishu";

export function FeishuAutoLogin({ enabled }: { enabled: boolean }) {
  const started = useRef(false);

  useEffect(() => {
    if (!enabled || started.current) return;

    if (!isFeishuUserAgent(window.navigator.userAgent)) return;

    started.current = true;
    window.location.assign("/api/auth/feishu/start?next=/");
  }, [enabled]);

  return null;
}
