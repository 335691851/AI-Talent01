import readExcelFile from "read-excel-file/node";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";

export type ParsedEmployeeRow = {
  rowNo: number;
  employeeNo: string;
  name: string;
  phone: string;
  email: string;
  position: string;
  positionDescription: string;
  level: string;
  productAbility: string;
  technicalAbility: string;
  projectExperience: string;
  status: "valid" | "invalid";
  errorMessage?: string;
  raw: Record<string, unknown>;
};

const headerMap: Record<string, keyof Omit<ParsedEmployeeRow, "rowNo" | "status" | "errorMessage" | "raw">> = {
  工号: "employeeNo",
  姓名: "name",
  手机号: "phone",
  邮箱: "email",
  岗位: "position",
  岗位描述: "positionDescription",
  级别: "level",
  产品能力: "productAbility",
  技术栈能力: "technicalAbility",
  项目经验: "projectExperience",
};

function columnNameToNumber(columnName: string) {
  return columnName.split("").reduce((sum, char) => sum * 26 + char.charCodeAt(0) - 64, 0);
}

function numberToColumnName(value: number) {
  let columnName = "";
  let current = value;

  while (current > 0) {
    const remainder = (current - 1) % 26;
    columnName = String.fromCharCode(65 + remainder) + columnName;
    current = Math.floor((current - 1) / 26);
  }

  return columnName || "A";
}

function normalizeWorksheetDimensions(buffer: Buffer) {
  const files = unzipSync(buffer);
  let changed = false;

  for (const [path, content] of Object.entries(files)) {
    if (!/^xl\/worksheets\/sheet\d+\.xml$/.test(path)) continue;

    const xml = strFromU8(content);
    const cellRefs = [...xml.matchAll(/<c\s+[^>]*r="([A-Z]+)(\d+)"/g)].map((match) => ({
      column: columnNameToNumber(match[1]),
      row: Number(match[2]),
    }));

    if (!cellRefs.length) continue;

    const maxColumn = Math.max(...cellRefs.map((cell) => cell.column));
    const maxRow = Math.max(...cellRefs.map((cell) => cell.row));
    const ref = `A1:${numberToColumnName(maxColumn)}${maxRow}`;
    const updatedXml = xml.includes("<dimension ")
      ? xml.replace(/<dimension\b[^>]*?(?:\/>|><\/dimension>)/, `<dimension ref="${ref}"></dimension>`)
      : xml.replace(/<sheetViews|<sheetFormatPr|<sheetData/, `<dimension ref="${ref}"></dimension>$&`);

    if (updatedXml !== xml) {
      files[path] = strToU8(updatedXml);
      changed = true;
    }
  }

  return changed ? Buffer.from(zipSync(files)) : buffer;
}

function cellText(value: unknown) {
  return String(value ?? "").trim();
}

function isBlankRow(row: unknown[]) {
  return row.every((cell) => !cellText(cell));
}

function findHeaderRow(sheet: unknown[][]) {
  return sheet.findIndex((row) => {
    const headers = new Set(row.map(cellText));
    return headers.has("工号") && headers.has("姓名") && headers.has("手机号");
  });
}

function pickSheetWithHeader(sheets: Array<{ sheet: string; data: unknown[][] }>) {
  for (const sheet of sheets) {
    const headerRowIndex = findHeaderRow(sheet.data);
    if (headerRowIndex >= 0) {
      return { sheetName: sheet.sheet, sheet: sheet.data, headerRowIndex };
    }
  }

  return null;
}

export async function parseEmployeeExcel(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const sheets = await readExcelFile(normalizeWorksheetDimensions(buffer));
  const matchedSheet = pickSheetWithHeader(sheets);

  if (!matchedSheet) {
    throw new Error("Excel 未找到有效表头，请确认包含：工号、姓名、手机号。");
  }

  const headers = matchedSheet.sheet[matchedSheet.headerRowIndex] ?? [];
  const dataRows = matchedSheet.sheet
    .slice(matchedSheet.headerRowIndex + 1)
    .filter((row) => !isBlankRow(row));
  const headerIndex = new Map(headers.map((header, index) => [cellText(header), index]));

  if (!dataRows.length) {
    throw new Error(`工作表「${matchedSheet.sheetName}」没有可导入的数据行。`);
  }

  return dataRows.map((row, index) => {
    const normalized = Object.entries(headerMap).reduce(
      (acc, [header, key]) => {
        const columnIndex = headerIndex.get(header);
        acc[key] = columnIndex === undefined ? "" : cellText(row[columnIndex]);
        return acc;
      },
      {} as Record<keyof Omit<ParsedEmployeeRow, "rowNo" | "status" | "errorMessage" | "raw">, string>,
    );

    const errors = [];
    if (!normalized.employeeNo) errors.push("工号缺失");
    if (!normalized.name) errors.push("姓名缺失");
    if (!normalized.phone) errors.push("手机号缺失");

    return {
      rowNo: matchedSheet.headerRowIndex + index + 2,
      ...normalized,
      status: errors.length ? "invalid" : "valid",
      errorMessage: errors.join("；") || undefined,
      raw: Object.fromEntries(headers.map((header, headerIndex) => [cellText(header), row[headerIndex] ?? ""])),
    } satisfies ParsedEmployeeRow;
  });
}
