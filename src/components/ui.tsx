import type { LucideIcon } from "lucide-react";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex min-h-[120px] flex-col justify-between gap-4 rounded-lg border border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f7f9fe_52%,#eef4ff_100%)] px-5 py-5 md:flex-row md:items-end md:px-6">
      <div>
        {eyebrow ? (
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-700">
            {eyebrow}
          </div>
        ) : null}
        <h1 className="text-[26px] font-semibold leading-8 text-slate-950">{title}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function Button({
  children,
  variant = "primary",
  ...props
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "plain";
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const styles = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
    plain: "bg-blue-50 text-blue-700 hover:bg-blue-100",
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${styles[variant]} disabled:cursor-not-allowed disabled:opacity-60`}
      {...props}
    >
      {children}
    </button>
  );
}

export function MetricCard({
  label,
  value,
  trend,
  icon: Icon,
}: {
  label: string;
  value: string;
  trend: string;
  icon: LucideIcon;
}) {
  return (
    <div className="surface rounded-lg p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-500">{label}</span>
        <span className="rounded-md bg-blue-50 p-2 text-blue-700">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-3 text-2xl font-semibold text-slate-950 mono">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{trend}</div>
    </div>
  );
}

export function Panel({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="surface rounded-lg p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="panel-title">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Badge({
  children,
  tone = "blue",
}: {
  children: React.ReactNode;
  tone?: "blue" | "green" | "orange" | "slate" | "cyan";
}) {
  const styles = {
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    green: "bg-emerald-50 text-emerald-700 border-emerald-200",
    orange: "bg-orange-50 text-orange-700 border-orange-200",
    slate: "bg-slate-50 text-slate-600 border-slate-200",
    cyan: "bg-cyan-50 text-cyan-700 border-cyan-200",
  };
  return (
    <span className={`inline-flex rounded border px-2 py-1 text-xs font-medium ${styles[tone]}`}>
      {children}
    </span>
  );
}

export function ProgressBar({ value, tone = "blue" }: { value: number; tone?: "blue" | "green" | "orange" | "cyan" }) {
  const colors = {
    blue: "bg-blue-600",
    green: "bg-emerald-500",
    orange: "bg-orange-500",
    cyan: "bg-cyan-500",
  };
  return (
    <div className="h-2 overflow-hidden rounded bg-slate-100">
      <div className={`h-full rounded ${colors[tone]}`} style={{ width: `${value}%` }} />
    </div>
  );
}

export function FieldBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="field-label mb-1">{label}</div>
      <div className="text-sm leading-6 text-slate-800">{children}</div>
    </div>
  );
}
