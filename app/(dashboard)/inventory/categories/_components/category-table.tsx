"use client";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Pencil, Trash2, MoreHorizontal } from "lucide-react";
import { deleteCategory } from "../actions";
import { CategoryDialog } from "./category-dialog";
import { Category } from "@/prisma/generated/prisma/browser";
import { Protect } from "@/components/ui/protect";
import { CustomPagination } from "@/components/ui/custom-pagination";
import { useState } from "react";
import { useConfirm } from "@/hooks/use-confirm";

type CategoryWithCount = Category & {
  _count: { products: number };
};

interface CategoryTableProps {
  categories: CategoryWithCount[];
  totalEntries: number;
}

export function CategoryTable({
  categories,
  totalEntries,
}: CategoryTableProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<
    CategoryWithCount | undefined
  >(undefined);
  const confirm = useConfirm();

  const handleEdit = (category: CategoryWithCount) => {
    setSelectedCategory(category);
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
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Products</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center">
                  No categories found.
                </TableCell>
              </TableRow>
            ) : (
              categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell>{category.description || "-"}</TableCell>
                  <TableCell>{category._count.products}</TableCell>
                  <TableCell>
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
                          <DropdownMenuItem
                            onClick={() => handleEdit(category)}
                          >
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
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <CustomPagination totalEntries={totalEntries} pageSize={10} />

      <CategoryDialog
        key={selectedCategory?.id}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        category={selectedCategory}
      />
    </div>
  );
}
