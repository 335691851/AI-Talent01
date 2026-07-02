import { expect, test } from "@playwright/test";

test("DeepSeek configuration smoke test", async () => {
  const apiKey = process.env.DEEPSEEK_API_KEY;

  test.skip(!apiKey, "DEEPSEEK_API_KEY is not configured.");

  const response = await fetch(`${process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com"}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.DEEPSEEK_MODEL ?? "deepseek-v4-flash",
      messages: [{ role: "user", content: "只回复 OK" }],
      max_tokens: 8,
      stream: false,
    }),
  });

  const text = await response.text();
  expect(response.ok, text).toBe(true);
  const payload = JSON.parse(text);
  expect(Array.isArray(payload.choices)).toBe(true);
  expect(payload.choices.length).toBeGreaterThan(0);
  expect(payload.choices[0].message ?? payload.choices[0].finish_reason).toBeTruthy();
});
