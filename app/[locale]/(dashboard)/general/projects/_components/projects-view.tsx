"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { getProjects, deleteProject } from "../../actions";
import { DataTable, Column } from "@/components/ui/data-table";
import { CustomInput } from "@/components/ui/custom-input";
import { Search, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { Badge } from "@/components/ui/badge";
import { Project } from "@/prisma/generated/prisma/browser";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/hooks/use-confirm";
import { useQueryClient } from "@tanstack/react-query";

import { ProjectForm } from "@/app/[locale]/(dashboard)/general/_components/project-form";
import {
  PageListFilter,
  PageListContent,
} from "@/components/layout/page/list-layout";

export function ProjectsView() {
  const t = useTranslations("General.Projects");
  const tCommon = useTranslations("Common");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [editingProject, setEditingProject] = useState<Project | undefined>(
    undefined,
  );
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const debouncedSearch = useDebounce(search, 500);
  const confirm = useConfirm();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["projects", page, debouncedSearch],
    queryFn: () => getProjects({ page, search: debouncedSearch }),
  });

  const handleDelete = async (project: Project) => {
    if (
      await confirm({
        title: t("delete_project"),
        description: t("delete_confirm_desc", { name: project.name }),
      })
    ) {
      await deleteProject(project.id);
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    }
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setIsEditDialogOpen(true);
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "default";
      case "COMPLETED":
        return "outline";
      case "ON_HOLD":
        return "secondary";
      case "CANCELLED":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const columns: Column<Project>[] = [
    {
      header: t("code"),
      accessorKey: "code",
      className: "font-medium",
    },
    {
      header: t("name"),
      accessorKey: "name",
    },
    {
      header: t("description"),
      accessorKey: "description",
    },
    {
      header: t("status"),
      cell: (item) => (
        <Badge variant={getStatusVariant(item.status)}>
          {t(item.status.toLowerCase() as any)}
        </Badge>
      ),
    },
    {
      header: t("manager"),
      cell: (item) => item.managerId || "-",
    },
    {
      header: "",
      cell: (item) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{tCommon("actions")}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleEdit(item)}>
              <Pencil className="mr-2 h-4 w-4" /> {tCommon("edit")}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => handleDelete(item)}
            >
              <Trash2 className="mr-2 h-4 w-4" /> {tCommon("delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <>
      <PageListFilter>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          <CustomInput
            placeholder={tCommon("search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
      </PageListFilter>

      <PageListContent>
        <DataTable
          data={data?.projects || []}
          columns={columns}
          isLoading={isLoading}
          pagination={{
            totalEntries: data?.total || 0,
            pageSize: 10,
            currentPage: page,
            onPageChange: setPage,
          }}
          emptyMessage={t("no_projects_found")}
        />
      </PageListContent>

      {editingProject && (
        <ProjectForm
          project={editingProject}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
        />
      )}
    </>
  );
}
