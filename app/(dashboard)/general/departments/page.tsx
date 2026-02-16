export const dynamic = "force-dynamic";

import { getDepartments } from "../actions";
import { CreateDepartmentForm } from "@/components/general/department-form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  PageListContent,
  PageListHeader,
  PageListLayout,
  PageListTitle,
} from "@/components/layout/page/list-layout";

export default async function DepartmentsPage() {
  const departments = await getDepartments();

  return (
    <PageListLayout>
      <PageListHeader>
        <PageListTitle title="Departments" />
      </PageListHeader>

      <div className="space-y-4">
        <div className="flex justify-end">
          <CreateDepartmentForm />
        </div>
        <PageListContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Manager</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {departments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">No departments found</TableCell>
                </TableRow>
              ) : (
                departments.map((dept) => (
                  <TableRow key={dept.id}>
                    <TableCell>{dept.code}</TableCell>
                    <TableCell className="font-medium">{dept.name}</TableCell>
                    <TableCell>{dept.description}</TableCell>
                    <TableCell>{dept.manager?.name || "-"}</TableCell>
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
