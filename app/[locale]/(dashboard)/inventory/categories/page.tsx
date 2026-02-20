"use client";
export const dynamic = "force-dynamic";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DataTable, Column } from "@/components/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Pencil, Trash2, MoreHorizontal, Plus, Search } from "lucide-react";
import { deleteCategory, getCategories } from "./actions";
import { CategoryDialog } from "./_components/category-dialog";
import { Category } from "@/prisma/generated/prisma/browser";
import { Protect } from "@/components/ui/protect";
import { useConfirm } from "@/hooks/use-confirm";
import {
  PageListActions,
  PageListContent,
  PageListFilter,
  PageListHeader,
  PageListLayout,
  PageListTitle,
} from "@/components/layout/page/list-layout";
import { CustomInput } from "@/components/ui/custom-input";
import {
  useQuery,
  keepPreviousData,
  useQueryClient,
} from "@tanstack/react-query";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

type CategoryWithCount = Category & {
  _count: { products: number };
};

import { useTranslations } from "next-intl";

export default function CategoriesPage() {
  const t = useTranslations("Inventory");
  const tCommon = useTranslations("Common");
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const page = Number(searchParams.get("page")) || 1;
  const search = searchParams.get("search") || "";
  const pageSize = 10;

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<
    CategoryWithCount | undefined
  >(undefined);

  const confirm = useConfirm();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["categories", { page, search }],
    queryFn: async () => {
      return await getCategories(page, pageSize, search || undefined);
    },
    placeholderData: keepPreviousData,
  });

  const handleSearch = (term: string) => {
    const params = new URLSearchParams(searchParams);
    if (term) {
      params.set("search", term);
    } else {
      params.delete("search");
    }
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", newPage.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleEdit = (category: CategoryWithCount) => {
    setSelectedCategory(category);
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setSelectedCategory(undefined);
    setIsDialogOpen(true);
  };

  async function handleDelete(id: string) {
    if (
      await confirm({
        title: t("delete_category"),
        description: t("delete_category_desc"),
      })
    ) {
      await deleteCategory(id);
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    }
  }

  const columns: Column<CategoryWithCount>[] = [
    {
      header: tCommon("name"),
      accessorKey: "name",
      className: "font-medium",
    },
    {
      header: tCommon("description"),
      cell: (item) => item.description || "-",
    },
    {
      header: t("products"),
      cell: (item) => item._count.products,
    },
    {
      header: tCommon("actions"),
      className: "w-[100px]",
      cell: (category) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{tCommon("actions")}</DropdownMenuLabel>
            <Protect permission="categories.edit">
              <DropdownMenuItem onClick={() => handleEdit(category)}>
                <Pencil className="mr-2 h-4 w-4" /> {tCommon("edit")}
              </DropdownMenuItem>
            </Protect>
            <DropdownMenuSeparator />
            <Protect permission="categories.delete">
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => handleDelete(category.id)}
              >
                <Trash2 className="mr-2 h-4 w-4" /> {tCommon("delete")}
              </DropdownMenuItem>
            </Protect>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <PageListLayout>
      <PageListHeader>
        <PageListTitle title={t("categories")} />
        <PageListActions>
          <Protect permission="categories.create">
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" /> {t("create_category")}
            </Button>
          </Protect>
        </PageListActions>
      </PageListHeader>

      <PageListFilter>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          <CustomInput
            placeholder={t("search_categories")}
            className="pl-8"
            defaultValue={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
      </PageListFilter>

      <PageListContent>
        <DataTable
          data={data?.categories || []}
          columns={columns}
          isLoading={isLoading}
          emptyMessage={t("no_categories_found")}
          pagination={{
            totalEntries: data?.total || 0,
            pageSize,
            currentPage: page,
            onPageChange: handlePageChange,
          }}
        />
      </PageListContent>

      <CategoryDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        category={selectedCategory}
      />
    </PageListLayout>
  );
}
