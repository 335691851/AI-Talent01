"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BotMessageSquare,
  FileUp,
  Search,
  Settings,
  UsersRound,
} from "lucide-react";
import type { UserRole } from "@/lib/types";

const adminNavItems = [
  { href: "/", label: "首页", icon: BarChart3 },
  { href: "/employees", label: "员工档案", icon: UsersRound },
  { href: "/assessment", label: "AI 自评估", icon: BotMessageSquare },
  { href: "/search", label: "人才检索", icon: Search },
  { href: "/imports", label: "Excel 导入", icon: FileUp },
  { href: "/settings", label: "系统设置", icon: Settings },
];

const employeeNavItems = [
  { href: "/assessment", label: "AI 自评估", icon: BotMessageSquare },
  { href: "/employees", label: "我的档案", icon: UsersRound },
];

export function TopNav({ role }: { role: UserRole | null }) {
  const pathname = usePathname();
  const navItems = role === "employee" ? employeeNavItems : adminNavItems;

  return (
    <nav className="mx-auto flex max-w-[1500px] gap-1 overflow-x-auto px-4 py-3.5 md:px-6">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={[
              "flex h-10 shrink-0 items-center gap-2 rounded-md border px-3.5 text-sm font-medium transition",
              active
                ? "border-blue-200 bg-blue-50 text-blue-700"
                : "border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-950",
            ].join(" ")}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
