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
import { Pencil, Trash2 } from "lucide-react";
import { deleteCategory } from "../actions";
import { CategoryDialog } from "./category-dialog";
import { Category } from "@/prisma/generated/prisma/browser";
import { Protect } from "@/components/ui/protect";
import { CustomPagination } from "@/components/ui/custom-pagination";

type CategoryWithCount = Category & {
  _count: { products: number };
};

interface CategoryTableProps {
  categories: CategoryWithCount[];
  totalEntries: number;
}

export function CategoryTable({ categories, totalEntries }: CategoryTableProps) {
  async function handleDelete(id: string) {
    if (confirm("Are you sure you want to delete this category?")) {
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
                  <TableCell className="flex gap-2">
                    <Protect permission="categories.edit">
                      <CategoryDialog
                        category={category}
                        trigger={
                          <Button variant="ghost" size="icon">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        }
                      />
                    </Protect>
                    <Protect permission="categories.delete">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(category.id)}
                        disabled={category._count.products > 0}
                        title={
                          category._count.products > 0
                            ? "Cannot delete category with products"
                            : "Delete category"
                        }
                      >
                        <Trash2
                          className={`h-4 w-4 ${
                            category._count.products > 0
                              ? "text-muted-foreground"
                              : "text-red-500"
                          }`}
                        />
                      </Button>
                    </Protect>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <CustomPagination totalEntries={totalEntries} pageSize={10} />
    </div>
  );
}
