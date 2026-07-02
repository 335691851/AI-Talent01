import { redirect } from "next/navigation";
import { EmployeeManagementClient } from "@/components/employee-management-client";
import { PageHeader } from "@/components/ui";
import { getSessionUser } from "@/lib/auth/session";
import { listEmployeeProfiles } from "@/lib/db/queries";

export default async function EmployeesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const allEmployees = await listEmployeeProfiles();
  const employees = user.role === "admin"
    ? allEmployees
    : allEmployees.filter((item) => item.id === user.employeeId);

  return (
    <>
      <PageHeader
        eyebrow="员工档案"
        title="员工 AI 档案管理"
        description="管理员可导入、查询和编辑员工档案；员工登录后维护自己的岗位信息、AI 产品能力、技术栈能力和项目经验。"
      />
      <EmployeeManagementClient employees={employees} role={user.role} />
    </>
  );
}
