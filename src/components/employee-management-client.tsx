"use client";

import { useMemo, useState } from "react";
import {
  BriefcaseBusiness,
  ChevronRight,
  FileText,
  Search,
  UserRoundCheck,
  UsersRound,
  X,
} from "lucide-react";
import { Badge, Button, Panel, ProgressBar } from "@/components/ui";
import { EmployeeProfileForm } from "@/components/employee-profile-form";
import type { EmployeeProfile, UserRole } from "@/lib/types";

type Props = {
  employees: EmployeeProfile[];
  role: UserRole;
};

type DetailBlockProps = {
  label: string;
  value?: string | number | null;
};

function includesKeyword(employee: EmployeeProfile, keyword: string) {
  const value = keyword.trim().toLowerCase();
  if (!value) return true;

  return [
    employee.employeeNo,
    employee.name,
    employee.phone,
    employee.email,
    employee.position,
    employee.positionDescription,
    employee.level,
    employee.productAbility,
    employee.technicalAbility,
    employee.projectExperience,
    employee.assessmentExplanation,
  ]
    .filter(Boolean)
    .some((item) => String(item).toLowerCase().includes(value));
}

function isNonEmptyString(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function detailText(value?: string | number | null) {
  if (value === 0) return "0";
  return value ? String(value) : "未填写";
}

function DetailBlock({ label, value }: DetailBlockProps) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50/70 p-3">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-slate-900">
        {detailText(value)}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone = "blue",
}: {
  label: string;
  value: string | number;
  tone?: "blue" | "green" | "orange" | "slate";
}) {
  const toneClass = {
    blue: "bg-blue-50 text-blue-700 ring-blue-100",
    green: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    orange: "bg-orange-50 text-orange-700 ring-orange-100",
    slate: "bg-slate-50 text-slate-700 ring-slate-100",
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className={`mt-2 inline-flex rounded-md px-2.5 py-1 text-lg font-semibold ring-1 ${toneClass[tone]}`}>
        {value}
      </div>
    </div>
  );
}

export function EmployeeManagementClient({ employees, role }: Props) {
  const [keyword, setKeyword] = useState("");
  const [submittedKeyword, setSubmittedKeyword] = useState("");
  const [position, setPosition] = useState("all");
  const [level, setLevel] = useState("all");
  const [selectedId, setSelectedId] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const positions = useMemo(
    () => Array.from(new Set(employees.map((item) => item.position).filter(isNonEmptyString))).sort(),
    [employees],
  );
  const levels = useMemo(
    () => Array.from(new Set(employees.map((item) => item.level).filter(isNonEmptyString))).sort(),
    [employees],
  );

  const filteredEmployees = useMemo(() => {
    return employees.filter((employee) => {
      const positionMatched = position === "all" || employee.position === position;
      const levelMatched = level === "all" || employee.level === level;
      return positionMatched && levelMatched && includesKeyword(employee, submittedKeyword);
    });
  }, [employees, level, position, submittedKeyword]);

  const selected =
    filteredEmployees.find((employee) => employee.id === selectedId) ??
    employees.find((employee) => employee.id === selectedId) ??
    null;
  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pagedEmployees = filteredEmployees.slice(
    (safeCurrentPage - 1) * pageSize,
    safeCurrentPage * pageSize,
  );

  const stats = useMemo(() => {
    const assessed = employees.filter((employee) => employee.latestScore !== null && employee.latestScore !== undefined);
    const completeProfiles = employees.filter((employee) => employee.profileCompletion >= 90);
    const averageScore = assessed.length
      ? Math.round(assessed.reduce((sum, employee) => sum + (employee.latestScore ?? 0), 0) / assessed.length)
      : "暂无";

    return {
      total: employees.length,
      filtered: filteredEmployees.length,
      completeProfiles: completeProfiles.length,
      averageScore,
    };
  }, [employees, filteredEmployees.length]);

  function submitSearch() {
    setSubmittedKeyword(keyword);
    setCurrentPage(1);
    setSelectedId("");
    setDrawerOpen(false);
  }

  function resetFilters() {
    setKeyword("");
    setSubmittedKeyword("");
    setPosition("all");
    setLevel("all");
    setCurrentPage(1);
    setSelectedId("");
    setDrawerOpen(false);
  }

  function openDetail(employeeId: string) {
    setSelectedId(employeeId);
    setDrawerOpen(true);
  }

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_190px_160px_96px_96px]">
          <label className="flex min-h-11 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
            <Search className="h-4 w-4 shrink-0 text-blue-600" />
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") submitSearch();
              }}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              placeholder="搜索姓名 / 工号 / 手机号 / 岗位 / 能力关键词"
            />
          </label>
          <select
            value={position}
            onChange={(event) => {
              setPosition(event.target.value);
              setCurrentPage(1);
            }}
            className="min-h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-500"
          >
            <option value="all">全部岗位</option>
            {positions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select
            value={level}
            onChange={(event) => {
              setLevel(event.target.value);
              setCurrentPage(1);
            }}
            className="min-h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-500"
          >
            <option value="all">全部级别</option>
            {levels.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <Button type="button" onClick={submitSearch}>
            查询
          </Button>
          <Button type="button" variant="secondary" onClick={resetFilters}>
            重置
          </Button>
        </div>
        <div className="mt-3 text-xs text-slate-500">
          当前筛选 {stats.filtered} / {stats.total} 人。列表每页展示 {pageSize} 条，点击员工可从右侧打开档案详情。
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-4">
        <StatCard label="员工总数" value={stats.total} tone="blue" />
        <StatCard label="当前结果" value={stats.filtered} tone="slate" />
        <StatCard label="档案较完整" value={stats.completeProfiles} tone="green" />
        <StatCard label="平均 AI 分数" value={stats.averageScore} tone="orange" />
      </div>

      <Panel
        title="员工档案列表"
        action={<Badge tone="blue">当前结果：{filteredEmployees.length} 人</Badge>}
      >
        <div className="overflow-x-auto rounded-md border border-slate-200">
          <table className="w-full min-w-[1040px] border-collapse bg-white text-left text-sm">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200 text-xs font-medium text-slate-500">
                <th className="w-[230px] px-4 py-3">员工</th>
                <th className="w-[280px] px-4 py-3">岗位信息</th>
                <th className="w-[140px] px-4 py-3">级别</th>
                <th className="w-[160px] px-4 py-3">AI 评估</th>
                <th className="w-[190px] px-4 py-3">档案完整度</th>
                <th className="w-[120px] px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {pagedEmployees.map((item) => {
                const active = selected?.id === item.id;
                return (
                  <tr
                    key={item.id}
                    className={[
                      "border-b border-slate-100 transition last:border-0 hover:bg-blue-50/50",
                      active ? "bg-blue-50/80" : "bg-white",
                    ].join(" ")}
                  >
                    <td className="px-4 py-4 align-top">
                      <button
                        type="button"
                        onClick={() => openDetail(item.id)}
                        className="group flex w-full items-start gap-3 text-left focus:outline-none"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-100 text-blue-700 group-hover:bg-blue-100">
                          <UserRoundCheck className="h-4 w-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="block font-semibold text-slate-950">{item.name}</span>
                          <span className="mt-1 block font-mono text-xs text-slate-500">{item.employeeNo}</span>
                          <span className="mt-1 block truncate text-xs text-slate-500">{item.phone}</span>
                        </span>
                      </button>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <div className="font-medium text-slate-800">{item.position || "未填写岗位"}</div>
                      <div className="mt-1 line-clamp-2 max-w-[260px] text-xs leading-5 text-slate-500">
                        {item.positionDescription || "暂无岗位描述"}
                      </div>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <Badge tone="slate">{item.level || "未填写"}</Badge>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <div className="flex items-center gap-2">
                        {item.latestScore ? (
                          <Badge tone={(item.latestScore ?? 0) >= 85 ? "green" : "blue"}>{item.latestScore} 分</Badge>
                        ) : (
                          <Badge tone="orange">未评估</Badge>
                        )}
                      </div>
                      <div className="mt-2 text-xs text-slate-500">{item.assessmentStatus}</div>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <div className="flex items-center gap-3">
                        <div className="w-24">
                          <ProgressBar
                            value={item.profileCompletion}
                            tone={item.profileCompletion >= 90 ? "green" : "orange"}
                          />
                        </div>
                        <span className="font-mono text-xs text-slate-600">{item.profileCompletion}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <button
                        type="button"
                        onClick={() => openDetail(item.id)}
                        className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-white px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50"
                      >
                        查看详情
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!filteredEmployees.length ? (
            <div className="border-t border-slate-200 bg-slate-50 p-10 text-center">
              <div className="text-sm font-medium text-slate-800">没有匹配的员工</div>
              <div className="mt-1 text-sm text-slate-500">请调整搜索条件或点击重置后重新查询。</div>
            </div>
          ) : null}
        </div>
        {filteredEmployees.length ? (
          <div className="mt-4 flex flex-col gap-3 border-t border-slate-200 pt-4 md:flex-row md:items-center md:justify-between">
            <div className="text-xs text-slate-500">
              第 {(safeCurrentPage - 1) * pageSize + 1}-
              {Math.min(safeCurrentPage * pageSize, filteredEmployees.length)} 条，共 {filteredEmployees.length} 条
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={safeCurrentPage <= 1}
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              >
                上一页
              </Button>
              <span className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                {safeCurrentPage} / {totalPages}
              </span>
              <Button
                type="button"
                variant="secondary"
                disabled={safeCurrentPage >= totalPages}
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              >
                下一页
              </Button>
            </div>
          </div>
        ) : null}
      </Panel>

      {drawerOpen && selected ? (
        <div
          className="fixed inset-0 z-50 bg-slate-950/35 backdrop-blur-[1px]"
          onClick={() => setDrawerOpen(false)}
        >
          <aside
            className="ml-auto flex h-full w-full max-w-[980px] flex-col bg-white shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label={`${selected.name} 的员工档案详情`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-blue-600 text-white">
                    <UsersRound className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-semibold text-slate-950">{selected.name}</h2>
                      <Badge tone="blue">{selected.employeeNo}</Badge>
                      <Badge tone="slate">{selected.level || "未填写级别"}</Badge>
                      <Badge tone={selected.assessmentStatus === "已完成" ? "green" : "orange"}>
                        {selected.assessmentStatus}
                      </Badge>
                    </div>
                    <div className="mt-1 text-sm text-slate-600">
                      {selected.phone} · {selected.email || "未填写邮箱"}
                    </div>
                    <div className="mt-1 text-sm font-medium text-slate-800">
                      {selected.position || "未填写岗位"}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="rounded-md border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  aria-label="关闭档案详情"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              <div className="mb-5 grid gap-3 md:grid-cols-3">
                <DetailBlock label="AI 分数" value={selected.latestScore ?? "暂无"} />
                <DetailBlock label="档案完整度" value={`${selected.profileCompletion}%`} />
                <DetailBlock label="最新评估状态" value={selected.assessmentStatus} />
              </div>

              <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
                <section className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <BriefcaseBusiness className="h-4 w-4 text-blue-600" />
                    档案信息展示
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <DetailBlock label="工号" value={selected.employeeNo} />
                    <DetailBlock label="姓名" value={selected.name} />
                    <DetailBlock label="手机号" value={selected.phone} />
                    <DetailBlock label="邮箱" value={selected.email} />
                    <DetailBlock label="岗位" value={selected.position} />
                    <DetailBlock label="级别" value={selected.level} />
                  </div>
                  <DetailBlock label="岗位描述" value={selected.positionDescription} />
                  <DetailBlock label="产品能力" value={selected.productAbility} />
                  <DetailBlock label="技术栈能力" value={selected.technicalAbility} />
                  <DetailBlock label="项目经验" value={selected.projectExperience} />
                  <DetailBlock label="最新评估说明" value={selected.assessmentExplanation} />
                </section>

                <section className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <FileText className="h-4 w-4 text-blue-600" />
                    档案编辑
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white p-4">
                    <EmployeeProfileForm
                      key={selected.id}
                      employee={selected}
                      canChangeEmployeeNo={role === "admin"}
                    />
                  </div>
                </section>
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
