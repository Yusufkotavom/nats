
import { getDepartments, getProjects } from "@/app/(dashboard)/budgeting/actions";
import { CreateDepartmentForm, CreateProjectForm } from "@/components/budgeting/config-forms";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  PageListContent,
  PageListHeader,
  PageListLayout,
  PageListTitle,
} from "@/components/layout/page/list-layout";

export default async function ConfigurationPage() {
  const [departments, projects] = await Promise.all([
    getDepartments(),
    getProjects(),
  ]);

  return (
    <PageListLayout>
      <PageListHeader>
        <PageListTitle title="Configuration" />
      </PageListHeader>

      <Tabs defaultValue="departments" className="space-y-4">
        <TabsList>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
        </TabsList>
        <TabsContent value="departments" className="space-y-4">
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
        </TabsContent>
        <TabsContent value="projects" className="space-y-4">
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
        </TabsContent>
      </Tabs>
    </PageListLayout>
  );
}
