import { NextResponse } from "next/server";
import writeXlsxFile from "write-excel-file/node";
import { requireRole } from "@/lib/auth/session";

export async function GET() {
  await requireRole("admin");

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
      "E-1001",
      "张岚",
      "13800001001",
      "zhanglan@example.com",
      "产品经理",
      "负责 AI 办公与数据产品需求分析、方案设计和落地跟进。",
      "P6",
      "熟练使用 Codex、ChatGPT、飞书智能伙伴进行文档、数据处理和需求拆解。",
      "了解 Python、SQL、LangChain、RAG 基本架构，可与研发协作完成方案设计。",
      "2025 年参与质量视觉分析助手项目，负责业务场景拆解、验收指标设计和上线推进。",
    ],
  ];

  const buffer = await writeXlsxFile(rows, { sheet: "员工档案" }).toBuffer();
  const body = new ArrayBuffer(buffer.byteLength);
  new Uint8Array(body).set(buffer);

  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="ai-talent-employee-template.xlsx"',
    },
  });
}
