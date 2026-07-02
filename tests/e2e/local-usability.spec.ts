import { expect, test } from "@playwright/test";
import {
  cleanupTestEmployees,
  closeTestDatabase,
  getLatestTestAssessmentResult,
  getTestEmbeddingCount,
  getTestEmployee,
} from "./helpers/db";
import { createEmployeeImportFile, createInvalidEmployeeImportFile } from "./helpers/excel";
import { loginAsAdmin, loginAsTestEmployee } from "./helpers/auth";

test.describe.serial("AI Talent local usability", () => {
  test.beforeAll(async () => {
    await cleanupTestEmployees();
  });

  test.afterAll(async () => {
    await closeTestDatabase();
  });

  test("admin can log in, navigate core pages, and see usable empty/status states", async ({ page }) => {
    await loginAsAdmin(page);

    const pages = [
      { href: "/", heading: "企业 AI 人才概览" },
      { href: "/employees", heading: "员工 AI 档案管理" },
      { href: "/search", heading: "AI 人才检索" },
      { href: "/imports", heading: "Excel 员工导入" },
      { href: "/settings", heading: "实施配置总览" },
    ];

    for (const item of pages) {
      await page.goto(item.href);
      await expect(page.getByRole("heading", { name: item.heading })).toBeVisible();
      await expect(page.getByText("Application error")).toHaveCount(0);
    }

    await expect(page.getByText("员工数据向量化")).toBeVisible();
    await expect(page.getByText(/数据库已连接|数据库未配置/)).toBeVisible();
  });

  test("admin can import a valid employee and sees row-level errors for invalid Excel", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/imports");

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("link", { name: "下载模板" }).click();
    const templateDownload = await downloadPromise;
    expect(templateDownload.suggestedFilename()).toBe("ai-talent-employee-template.xlsx");

    const invalidFile = await createInvalidEmployeeImportFile();
    await page.locator('input[type="file"]').setInputFiles(invalidFile);
    await page.getByRole("button", { name: "确认导入" }).click();
    await expect(page.getByText("失败 1")).toBeVisible();
    await expect(page.getByText("手机号缺失")).toBeVisible();

    const validFile = await createEmployeeImportFile();
    await page.locator('input[type="file"]').setInputFiles(validFile);
    await page.getByRole("button", { name: "确认导入" }).click();
    await expect(page.getByText("成功 1")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText("导入完成，没有行级错误。")).toBeVisible();

    const employee = await getTestEmployee();
    expect(employee?.employee_no).toBe("TEST-1001");

    await page.goto("/employees");
    await page.getByPlaceholder("搜索姓名 / 工号 / 手机号").fill("TEST-1001");
    await page.getByRole("button", { name: "查询" }).click();
    await expect(page.getByText(/当前筛选 1 \//)).toBeVisible();
    await expect(page.locator("body")).toContainText("TEST-1001");
    await expect(page.locator("body")).toContainText("测试员工");
    await page.getByRole("button", { name: "查看详情" }).click();
    await expect(page.locator('input[name="employeeNo"]')).toHaveValue("TEST-1001");
    await page.getByRole("button", { name: "关闭档案详情" }).click();
    await expect(page.locator('input[name="employeeNo"]')).toHaveCount(0);

    await page.getByPlaceholder("搜索姓名 / 工号 / 手机号").fill("NO-SUCH-EMPLOYEE");
    await page.getByRole("button", { name: "查询" }).click();
    await expect(page.getByText(/当前筛选 0 \//)).toBeVisible();
    await expect(page.getByText("没有匹配的员工")).toBeVisible();
  });

  test("test employee can log in, edit own profile, and complete 10-round demo assessment", async ({ page }) => {
    await loginAsTestEmployee(page);

    await page.goto("/employees");
    await expect(page.getByRole("heading", { name: "员工 AI 档案管理" })).toBeVisible();
    await page.getByLabel("产品能力").fill("熟练使用 Codex、ChatGPT、飞书智能伙伴和数据分析助手。");
    await page.getByLabel("技术栈能力").fill("Python、SQL、LangChain、RAG、Playwright、Next.js。");
    await page.getByLabel("项目经验").fill("参与本地 AI Talent 测试闭环，覆盖导入、评估、向量化与语义检索。");
    await page.getByRole("button", { name: "保存档案" }).click();
    await expect(page.getByText("档案已保存。")).toBeVisible();

    await page.goto("/assessment");
    await expect(page.getByText("还没有进行中的 AI 自评估").or(page.getByText(/第 \d+ \/ 10 轮/))).toBeVisible();
    await page.getByRole("button", { name: "开始新评估" }).click();
    await expect(page.getByText("第 1 / 10 轮")).toBeVisible();

    for (let round = 1; round <= 10; round += 1) {
      await page.getByPlaceholder("输入本轮回答...").fill(
        `第 ${round} 轮回答：我会结合业务场景、AI 产品能力、Python SQL LangChain RAG 技术栈和项目经验说明能力。`,
      );
      if (round === 1) {
        await page.getByPlaceholder("输入本轮回答...").press("Enter");
      } else {
        await page.getByRole("button", { name: "发送" }).click();
      }

      if (round < 10) {
        await expect(page.getByText(`第 ${round + 1} / 10 轮`)).toBeVisible({ timeout: 20_000 });
      } else {
        await expect(page.getByText("评估完成。AI 分数")).toBeVisible({ timeout: 20_000 });
      }
    }

    await expect(page.getByText("最新评估结果")).toBeVisible();
    await expect(page.getByText(/AI 分数/)).toBeVisible();

    const result = await getLatestTestAssessmentResult();
    expect(result?.score).toBeGreaterThanOrEqual(0);
    expect(result?.assessment_explanation).toContain("员工");
  });

  test("admin can search imported employee without seeing full chat data", async ({ page }) => {
    await loginAsAdmin(page);

    await page.goto("/search?q=LangChain%20Python%20RAG%20测试&minScore=0");
    await expect(page.getByRole("heading", { name: "AI 人才检索" })).toBeVisible();
    await expect(page.getByText("本次检索 Trace")).toBeVisible();
    await page.getByText("本次检索 Trace").click();
    const trace = page.locator("details").first();
    await expect(trace.getByText("请求上下文", { exact: true })).toBeVisible();
    await expect(trace.getByText("技术链路", { exact: true })).toBeVisible();
    await expect(trace.getByText("返回摘要", { exact: true })).toBeVisible();
    await expect(trace.getByText("核心业务和技术日志", { exact: true })).toBeVisible();
    await expect(page.locator("body")).toContainText("TEST-1001");
    await expect(page.locator("body")).toContainText("测试员工");
    await expect(page.getByText("匹配原因").first()).toBeVisible();
    await expect(page.getByText("第 1 轮回答")).toHaveCount(0);

    await page.goto("/assessment");
    await expect(page.getByText("账号未绑定员工档案")).toBeVisible();

    const embeddingCount = await getTestEmbeddingCount();
    expect(embeddingCount).toBeGreaterThan(0);
  });

  test("employee cannot access admin-only pages", async ({ page }) => {
    await loginAsTestEmployee(page);

    await page.goto("/imports");
    await expect(page).not.toHaveURL(/\/imports$/);

    await page.goto("/search");
    await expect(page).not.toHaveURL(/\/search$/);

    await page.goto("/settings");
    await expect(page).not.toHaveURL(/\/settings$/);

    await page.goto("/api/import/template");
    await expect(page).not.toHaveURL(/\/api\/import\/template$/);
  });
});
