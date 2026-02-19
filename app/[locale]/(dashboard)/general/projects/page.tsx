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

export default async function ProjectsPage() {
  const projects = await getProjects();

  return (
    <PageListLayout>
      <PageListHeader>
        <PageListTitle title="Projects" />
      </PageListHeader>

      <div className="space-y-4">
        <div className="flex justify-end">
          <CreateProjectForm />
        </div>
        <PageListContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Manager</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">No projects found</TableCell>
                </TableRow>
              ) : (
                projects.map((proj) => (
                  <TableRow key={proj.id}>
                    <TableCell>{proj.code}</TableCell>
                    <TableCell className="font-medium">{proj.name}</TableCell>
                    <TableCell>{proj.description}</TableCell>
                    <TableCell>{proj.status}</TableCell>
                    <TableCell>{proj.manager?.name || "-"}</TableCell>
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
