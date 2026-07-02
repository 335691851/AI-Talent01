import { expect, type Page } from "@playwright/test";

export async function login(page: Page, account: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("账号 / 手机号").fill(account);
  await page.getByLabel("密码").fill(password);
  await page.getByRole("button", { name: "登录系统" }).click();
}

export async function loginAsAdmin(page: Page) {
  await login(page, "admin", "admin");
  await expect(page.getByRole("heading", { name: "企业 AI 人才概览" })).toBeVisible();
}

export async function loginAsTestEmployee(page: Page) {
  await login(page, "13900001001", "88888888");
  await expect(page.getByRole("heading", { name: "AI 自评估 Chatbox" })).toBeVisible();
}
