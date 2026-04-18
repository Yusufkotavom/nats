"use client";
export const dynamic = "force-dynamic";

import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getDepartments, deleteDepartment } from "../actions";
import { DepartmentFormDialog } from "@/app/[locale]/(dashboard)/general/_components/department-form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Plus, Pencil, Trash2 } from "lucide-react";
import { useConfirm } from "@/hooks/use-confirm";
import { Protect } from "@/components/ui/protect";
import {
  PageListActions,
  PageListContent,
  PageListHeader,
  PageListLayout,
  PageListTitle,
} from "@/components/layout/page/list-layout";
import { useTranslations } from "next-intl";
import { useToast } from "@/hooks/use-toast";
import type { Department } from "@/prisma/generated/prisma/client";

export default function DepartmentsPage() {
  const t = useTranslations("General.Departments");
  const tCommon = useTranslations("Common");
  const confirm = useConfirm();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<
    Department | undefined
  >(undefined);

  const { data: departments = [], isLoading } = useQuery({
    queryKey: ["departments"],
    queryFn: () => getDepartments(),
  });

  const handleAdd = () => {
    setSelectedDepartment(undefined);
    setIsDialogOpen(true);
  };

  const handleEdit = (dept: Department) => {
    setSelectedDepartment(dept);
    setIsDialogOpen(true);
  };

  const handleDelete = async (dept: Department) => {
    const confirmed = await confirm({
      title: t("delete_department"),
      description: t("delete_confirm_desc", { name: dept.name }),
    });
    if (!confirmed) return;

    const result = await deleteDepartment(dept.id);
    if (result.success) {
      toast({ title: t("department_deleted") });
      queryClient.invalidateQueries({ queryKey: ["departments"] });
    } else {
      toast({
        title: tCommon("error"),
        description: result.error || t("delete_error"),
        variant: "destructive",
      });
    }
  };

  const handleDialogClose = useCallback(() => {
    setIsDialogOpen(false);
  }, []);

  const handleFormSuccess = useCallback(() => {
    setIsDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ["departments"] });
  }, [queryClient]);

  const TABLE_COLUMN_COUNT = 4;

  return (
    <PageListLayout>
      <PageListHeader>
        <PageListTitle title={t("title")} />
        <PageListActions>
          <Protect permission="departments.create">
            <Button onClick={handleAdd}>
              <Plus className="mr-2 h-4 w-4" />
              {t("new_department")}
            </Button>
          </Protect>
        </PageListActions>
      </PageListHeader>

      <PageListContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("code")}</TableHead>
              <TableHead>{t("name")}</TableHead>
              <TableHead>{t("description")}</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={TABLE_COLUMN_COUNT} className="text-center">
                  {tCommon("loading")}
                </TableCell>
              </TableRow>
            ) : departments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={TABLE_COLUMN_COUNT} className="text-center">
                  {t("no_departments_found")}
                </TableCell>
              </TableRow>
            ) : (
              departments.map((dept) => (
                <TableRow key={dept.id}>
                  <TableCell>{dept.code}</TableCell>
                  <TableCell className="font-medium">{dept.name}</TableCell>
                  <TableCell className="text-wrap whitespace-normal">
                    {dept.description || "—"}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">
                            {tCommon("open_menu")}
                          </span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>
                          {tCommon("actions")}
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <Protect permission="departments.edit">
                          <DropdownMenuItem onClick={() => handleEdit(dept)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            {tCommon("edit")}
                          </DropdownMenuItem>
                        </Protect>
                        <Protect permission="departments.delete">
                          <DropdownMenuItem
                            onClick={() => handleDelete(dept)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {tCommon("delete")}
                          </DropdownMenuItem>
                        </Protect>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </PageListContent>

      <DepartmentFormDialog
        open={isDialogOpen}
        onOpenChange={handleDialogClose}
        onSuccess={handleFormSuccess}
        department={selectedDepartment}
      />
    </PageListLayout>
  );
}
