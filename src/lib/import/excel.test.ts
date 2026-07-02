import { describe, expect, it } from "vitest";
import writeXlsxFile from "write-excel-file/node";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { parseEmployeeExcel } from "@/lib/import/excel";

async function createExcelFile(rows: Array<Record<string, string>>) {
  const headers = ["工号", "姓名", "手机号", "邮箱", "岗位", "岗位描述", "级别", "产品能力", "技术栈能力", "项目经验"];
  const data = [
    headers,
    ...rows.map((row) => headers.map((header) => row[header] ?? "")),
  ];
  const buffer = await writeXlsxFile(data, { sheet: "员工档案" }).toBuffer();
  return new File([buffer], "employees.xlsx", {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

async function createRawExcelFile(data: unknown[][], sheet = "员工档案") {
  const buffer = await writeXlsxFile(data, { sheet }).toBuffer();
  return new File([buffer], "employees.xlsx", {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

async function createExcelFileWithBrokenDimension(data: unknown[][]) {
  const buffer = Buffer.from(await writeXlsxFile(data, { sheet: "员工信息表" }).toBuffer());
  const files = unzipSync(buffer);

  for (const [path, content] of Object.entries(files)) {
    if (/^xl\/worksheets\/sheet\d+\.xml$/.test(path)) {
      files[path] = strToU8(strFromU8(content).replace(/<dimension[^>]*>/, '<dimension ref="A1">'));
    }
  }

  return new File([Buffer.from(zipSync(files))], "employees-broken-dimension.xlsx", {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

describe("parseEmployeeExcel", () => {
  it("maps fixed template headers to employee profile fields", async () => {
    const rows = await parseEmployeeExcel(
      await createExcelFile([
        {
          工号: "E-1001",
          姓名: "张岚",
          手机号: "13800001001",
          邮箱: "zhang@example.com",
          岗位: "产品经理",
          岗位描述: "负责 AI 产品",
          级别: "P6",
          产品能力: "Codex",
          技术栈能力: "Python",
          项目经验: "RAG 助手",
        },
      ]),
    );

    expect(rows[0]).toMatchObject({
      rowNo: 2,
      employeeNo: "E-1001",
      name: "张岚",
      phone: "13800001001",
      status: "valid",
    });
  });

  it("rejects rows without required phone", async () => {
    const rows = await parseEmployeeExcel(
      await createExcelFile([{ 工号: "E-1002", 姓名: "赵宁", 手机号: "" }]),
    );

    expect(rows[0].status).toBe("invalid");
    expect(rows[0].errorMessage).toContain("手机号缺失");
  });

  it("finds the template header when the sheet has title rows before it", async () => {
    const rows = await parseEmployeeExcel(
      await createRawExcelFile([
        ["AI Talent 员工导入表"],
        ["请从下一行开始填写员工信息"],
        ["工号", "姓名", "手机号", "邮箱", "岗位", "岗位描述", "级别", "产品能力", "技术栈能力", "项目经验"],
        ["E-2001", "李明", "13800002001", "", "研发", "", "P5", "Codex", "Python", "RAG"],
      ]),
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      rowNo: 4,
      employeeNo: "E-2001",
      status: "valid",
    });
  });

  it("returns a clear error when the sheet has headers but no data rows", async () => {
    await expect(
      parseEmployeeExcel(
        await createRawExcelFile([
          ["工号", "姓名", "手机号", "邮箱", "岗位", "岗位描述", "级别", "产品能力", "技术栈能力", "项目经验"],
        ]),
      ),
    ).rejects.toThrow("没有可导入的数据行");
  });

  it("repairs malformed worksheet dimensions exported by some spreadsheet tools", async () => {
    const rows = await parseEmployeeExcel(
      await createExcelFileWithBrokenDimension([
        ["工号", "姓名", "手机号", "邮箱", "岗位", "岗位描述", "级别", "产品能力", "技术栈能力", "项目经验"],
        ["600001", "李知遥", "13876549201", "lin@example.com", "数控车床操作员", "岗位说明", "P6", "Devin", "Python", "视觉检测项目"],
      ]),
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      employeeNo: "600001",
      name: "李知遥",
      phone: "13876549201",
      status: "valid",
    });
  });
});
