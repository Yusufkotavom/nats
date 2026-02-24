export const dynamic = "force-dynamic";

import { getDepartments } from "../actions";
import { CreateDepartmentForm } from "@/app/[locale]/(dashboard)/general/_components/department-form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  PageListContent,
  PageListHeader,
  PageListLayout,
  PageListTitle,
} from "@/components/layout/page/list-layout";
import { getTranslations } from "next-intl/server";

export default async function DepartmentsPage() {
  const departments = await getDepartments();
  const t = await getTranslations("General.Departments");

  return (
    <PageListLayout>
      <PageListHeader>
        <PageListTitle title={t("title")} />
      </PageListHeader>

      <div className="space-y-4">
        <div className="flex justify-end">
          <CreateDepartmentForm />
        </div>
        <PageListContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("code")}</TableHead>
                <TableHead>{t("name")}</TableHead>
                <TableHead>{t("description")}</TableHead>
                <TableHead>{t("manager")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {departments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">{t("no_departments_found")}</TableCell>
                </TableRow>
              ) : (
                departments.map((dept) => (
                  <TableRow key={dept.id}>
                    <TableCell>{dept.code}</TableCell>
                    <TableCell className="font-medium">{dept.name}</TableCell>
                    <TableCell>{dept.description}</TableCell>
                    <TableCell>{dept.managerId || "-"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </PageListContent>
      </div>
    </PageListLayout>
  );
}
