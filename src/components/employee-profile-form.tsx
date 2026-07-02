"use client";

import { useActionState } from "react";
import { Save, Sparkles, UserCog } from "lucide-react";
import type { EmployeeProfile } from "@/lib/types";
import { saveEmployeeAction, type SaveEmployeeState } from "@/app/actions/employees";

const initialState: SaveEmployeeState = {};

function Input({
  label,
  name,
  defaultValue,
  required,
  readOnly,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  required?: boolean;
  readOnly?: boolean;
}) {
  return (
    <label className="block">
      <span className="field-label mb-1 block">{label}</span>
      <input
        name={name}
        defaultValue={defaultValue ?? ""}
        required={required}
        readOnly={readOnly}
        className="min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 read-only:bg-slate-100"
      />
    </label>
  );
}

function TextArea({
  label,
  name,
  defaultValue,
  minRows = "min-h-28",
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  minRows?: string;
}) {
  return (
    <label className="block">
      <span className="field-label mb-1 block">{label}</span>
      <textarea
        name={name}
        defaultValue={defaultValue ?? ""}
        className={`${minRows} w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-sm leading-6 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100`}
      />
    </label>
  );
}

export function EmployeeProfileForm({ employee, canChangeEmployeeNo = false }: { employee: EmployeeProfile; canChangeEmployeeNo?: boolean }) {
  const [state, formAction, pending] = useActionState(saveEmployeeAction, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="employeeId" value={employee.id} />
      <section className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <UserCog className="h-4 w-4 text-blue-600" />
          基础信息
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Input label="工号" name="employeeNo" defaultValue={employee.employeeNo} required readOnly={!canChangeEmployeeNo} />
          <Input label="姓名" name="name" defaultValue={employee.name} required />
          <Input label="手机号" name="phone" defaultValue={employee.phone} required />
          <Input label="邮箱" name="email" defaultValue={employee.email} />
          <Input label="岗位" name="position" defaultValue={employee.position} />
          <Input label="级别" name="level" defaultValue={employee.level} />
        </div>
        <TextArea label="岗位描述" name="positionDescription" defaultValue={employee.positionDescription} />
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Sparkles className="h-4 w-4 text-blue-600" />
          AI 能力信息
        </div>
        <TextArea label="产品能力" name="productAbility" defaultValue={employee.productAbility} />
        <TextArea label="技术栈能力" name="technicalAbility" defaultValue={employee.technicalAbility} />
        <TextArea label="项目经验" name="projectExperience" defaultValue={employee.projectExperience} minRows="min-h-36" />
      </section>

      {state.error ? <div className="rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-700">{state.error}</div> : null}
      {state.success ? <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{state.success}</div> : null}

      <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-4">
        <div className="text-xs leading-5 text-slate-500">
          保存后系统会尝试重新生成该员工的 embedding，用于后续人才检索。
        </div>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex shrink-0 items-center gap-2 rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-slate-300"
        >
          <Save className="h-4 w-4" />
          {pending ? "保存中..." : "保存档案"}
        </button>
      </div>
    </form>
  );
}
