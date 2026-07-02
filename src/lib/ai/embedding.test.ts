import { describe, expect, it } from "vitest";
import { formatVector } from "@/lib/ai/embedding";

describe("embedding helpers", () => {
  it("formats a vector for pgvector insertion", () => {
    expect(formatVector([0.1, -0.2, 3])).toBe("[0.1,-0.2,3]");
  });
});
