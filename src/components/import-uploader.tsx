"use client";

import { ChangeEvent, useState } from "react";
import { UploadCloud } from "lucide-react";
import { Badge } from "@/components/ui";

type ImportResult = {
  total: number;
  imported: number;
  failed: number;
  errors?: Array<{ rowNumber: number; employeeNo?: string; errors: string[] }>;
};

export function ImportUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null);
    setResult(null);
    setError("");
  }

  async function upload() {
    if (!file) return;
    setPending(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/import/employees", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "导入失败。");
      setResult(payload);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "导入失败。");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <label className="flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-blue-300 bg-blue-50/70 p-8 text-center hover:bg-blue-50">
        <UploadCloud className="h-10 w-10 text-blue-600" />
        <div className="mt-4 text-base font-semibold text-slate-950">{file ? file.name : "选择 Excel 文件"}</div>
        <div className="mt-2 max-w-md text-sm leading-6 text-slate-600">
          支持 .xlsx / .xls。导入后员工可使用手机号和初始密码 88888888 登录并编辑自己的档案。
        </div>
        <input className="hidden" type="file" accept=".xlsx,.xls" onChange={handleFile} />
      </label>

      <button
        type="button"
        onClick={upload}
        disabled={!file || pending}
        className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-slate-300"
      >
        <UploadCloud className="h-4 w-4" />
        {pending ? "导入中..." : "确认导入"}
      </button>

      {error ? <div className="rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-700">{error}</div> : null}

      {result ? (
        <div className="rounded-md border border-slate-200 bg-white p-3">
          <div className="mb-3 flex flex-wrap gap-2">
            <Badge tone="slate">总行数 {result.total}</Badge>
            <Badge tone="green">成功 {result.imported}</Badge>
            <Badge tone={result.failed ? "orange" : "green"}>失败 {result.failed}</Badge>
          </div>
          {result.errors?.length ? (
            <div className="space-y-2 text-sm">
              {result.errors.map((item) => (
                <div key={`${item.rowNumber}-${item.employeeNo}`} className="rounded border border-orange-200 bg-orange-50 px-3 py-2 text-orange-800">
                  第 {item.rowNumber} 行 {item.employeeNo ? `(${item.employeeNo})` : ""}：{item.errors.join("；")}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-emerald-700">导入完成，没有行级错误。</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
