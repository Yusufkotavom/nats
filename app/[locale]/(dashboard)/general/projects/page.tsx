export const dynamic = "force-dynamic";

import { getProjects } from "../actions";
import { CreateProjectForm } from "@/app/[locale]/(dashboard)/general/_components/project-form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  PageListContent,
  PageListHeader,
  PageListLayout,
  PageListTitle,
} from "@/components/layout/page/list-layout";
import { getTranslations } from "next-intl/server";

export default async function ProjectsPage() {
  const projects = await getProjects();
  const t = await getTranslations("General.Projects");

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "ACTIVE": return t("active");
      case "COMPLETED": return t("completed");
      case "ON_HOLD": return t("on_hold");
      case "CANCELLED": return t("cancelled");
      default: return status;
    }
  };

  return (
    <PageListLayout>
      <PageListHeader>
        <PageListTitle title={t("title")} />
      </PageListHeader>

      <div className="space-y-4">
        <div className="flex justify-end">
          <CreateProjectForm />
        </div>
        <PageListContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("code")}</TableHead>
                <TableHead>{t("name")}</TableHead>
                <TableHead>{t("description")}</TableHead>
                <TableHead>{t("status")}</TableHead>
                <TableHead>{t("manager")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">{t("no_projects_found")}</TableCell>
                </TableRow>
              ) : (
                projects.map((proj) => (
                  <TableRow key={proj.id}>
                    <TableCell>{proj.code}</TableCell>
                    <TableCell className="font-medium">{proj.name}</TableCell>
                    <TableCell>{proj.description}</TableCell>
                    <TableCell>{getStatusLabel(proj.status)}</TableCell>
                    <TableCell>{proj.managerId || "-"}</TableCell>
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
