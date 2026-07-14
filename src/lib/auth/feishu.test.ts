import { describe, expect, it } from "vitest";
import {
  buildFeishuAuthorizeUrl,
  isFeishuUserAgent,
  normalizePhone,
} from "@/lib/auth/feishu";

describe("isFeishuUserAgent", () => {
  it("detects Feishu and Lark embedded browsers", () => {
    expect(isFeishuUserAgent("Mozilla/5.0 Feishu/7.20.0")).toBe(true);
    expect(isFeishuUserAgent("Mozilla/5.0 Lark/7.20.0")).toBe(true);
    expect(isFeishuUserAgent("Mozilla/5.0 LarkClient/7.20.0")).toBe(true);
  });

  it("rejects ordinary and empty user agents", () => {
    expect(isFeishuUserAgent("Mozilla/5.0 Chrome/126.0")).toBe(false);
    expect(isFeishuUserAgent(null)).toBe(false);
  });
});

describe("buildFeishuAuthorizeUrl", () => {
  it("requests permission to read the signed-in user's phone number", () => {
    const url = new URL(buildFeishuAuthorizeUrl("test-state"));

    expect(url.searchParams.get("scope")).toBe("contact:user.phone:readonly");
  });
});

describe("normalizePhone", () => {
  it("normalizes China mobile numbers from Feishu profile data", () => {
    expect(normalizePhone("+86 138-0013-8000")).toBe("13800138000");
    expect(normalizePhone("8613800138000")).toBe("13800138000");
    expect(normalizePhone("138 0013 8000")).toBe("13800138000");
  });

  it("returns null for empty phone values", () => {
    expect(normalizePhone(null)).toBeNull();
    expect(normalizePhone("")).toBeNull();
  });
});
