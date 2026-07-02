import path from "node:path";
import fs from "node:fs/promises";
import writeXlsxFile from "write-excel-file/node";

export const artifactsDir = path.resolve(process.cwd(), "tests", "e2e", ".artifacts");

export async function createEmployeeImportFile() {
  await fs.mkdir(artifactsDir, { recursive: true });
  const filePath = path.join(artifactsDir, "test-employee.xlsx");
  const rows = [
    [
      "工号",
      "姓名",
      "手机号",
      "邮箱",
      "岗位",
      "岗位描述",
      "级别",
      "产品能力",
      "技术栈能力",
      "项目经验",
    ],
    [
      "TEST-1001",
      "测试员工",
      "13900001001",
      "test1001@example.com",
      "AI 测试工程师",
      "负责本地可用性测试、AI 工具验证与数据查询助手场景验证。",
      "P6",
      "熟练使用 Codex、ChatGPT 和飞书智能伙伴完成文档、测试和数据处理。",
      "熟悉 Python、SQL、LangChain、RAG 和基础前端测试自动化。",
      "参与过数据查询助手和质量视觉分析助手项目，负责测试方案、验收指标和上线回归。",
    ],
  ];

  await writeXlsxFile(rows, { sheet: "员工档案" }).toFile(filePath);
  return filePath;
}

export async function createInvalidEmployeeImportFile() {
  await fs.mkdir(artifactsDir, { recursive: true });
  const filePath = path.join(artifactsDir, "test-employee-invalid.xlsx");
  const rows = [
    ["工号", "姓名", "手机号", "岗位"],
    ["TEST-BAD", "缺手机号员工", "", "测试"],
  ];

  await writeXlsxFile(rows, { sheet: "员工档案" }).toFile(filePath);
  return filePath;
}
