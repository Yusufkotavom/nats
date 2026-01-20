"use client";

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

type CategoryWithCount = Category & {
  _count: { products: number };
};

export default function CategoriesPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
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
      return await getCategories(page, pageSize, search);
    },
    placeholderData: keepPreviousData,
  });

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
        title: "Delete Category",
        description: "Are you sure you want to delete this category?",
      })
    ) {
      await deleteCategory(id);
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    }
  }

  const columns: Column<CategoryWithCount>[] = [
    {
      header: "Name",
      accessorKey: "name",
      className: "font-medium",
    },
    {
      header: "Description",
      cell: (item) => item.description || "-",
    },
    {
      header: "Products",
      cell: (item) => item._count.products,
    },
    {
      header: "Actions",
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
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <Protect permission="categories.edit">
              <DropdownMenuItem onClick={() => handleEdit(category)}>
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
            </Protect>
            <DropdownMenuSeparator />
            <Protect permission="categories.delete">
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => handleDelete(category.id)}
                disabled={category._count.products > 0}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete
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
        <PageListTitle title="Product Categories" />
        <PageListActions>
          <Protect permission="categories.create">
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" /> Add Category
            </Button>
          </Protect>
        </PageListActions>
      </PageListHeader>

      <PageListFilter>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <CustomInput
            placeholder="Search categories..."
            className="pl-8"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </PageListFilter>

      <PageListContent>
        <DataTable
          data={data?.categories || []}
          columns={columns}
          isLoading={isLoading}
          emptyMessage="No categories found."
          pagination={{
            totalEntries: data?.total || 0,
            pageSize,
            currentPage: page,
            onPageChange: setPage,
          }}
        />
      </PageListContent>

      <CategoryDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        category={selectedCategory}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["categories"] });
        }}
      />
    </PageListLayout>
  );
}
