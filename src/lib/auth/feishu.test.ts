import { describe, expect, it } from "vitest";
import { buildFeishuAuthorizeUrl, normalizePhone } from "@/lib/auth/feishu";

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
