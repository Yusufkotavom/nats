"use client";

import { Button } from "@/components/ui/button";
import { CustomInput } from "@/components/ui/custom-input";
import { CustomSelect } from "@/components/ui/custom-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SelectItem } from "@/components/ui/select";
import { Pencil, Trash2, Search, Eye, MoreHorizontal } from "lucide-react";
import { deleteProduct } from "../actions";
import { useState, useEffect } from "react";
import { ProductFormData } from "../../types";
import { Category, Unit } from "@/prisma/generated/prisma/browser";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Protect } from "@/components/ui/protect";
import Link from "next/link";

import { CustomPagination } from "@/components/ui/custom-pagination";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useFormatCurrency } from "@/hooks/use-format-currency";

interface ProductTableProps {
  products: ProductFormData[];
  categories: Category[];
  units: Unit[];
  totalPages: number;
  totalEntries: number;
}

export function ProductTable({
  products,
  categories,
  totalEntries,
}: ProductTableProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();
  const formatCurrency = useFormatCurrency();

  const [searchTerm, setSearchTerm] = useState(
    searchParams.get("search") || ""
  );

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | undefined>(
    undefined
  );

  const categoryFilter = searchParams.get("categoryId") || "ALL";
  const currentPage = Number(searchParams.get("page")) || 1;

  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams);
      if (searchTerm) {
        params.set("search", searchTerm);
      } else {
        params.delete("search");
      }
      params.set("page", "1");

      // Only update if actually changed
      if (params.get("search") !== (searchParams.get("search") || null)) {
        replace(`${pathname}?${params.toString()}`);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, searchParams, pathname, replace]);

  const handleCategoryChange = (val: string) => {
    const params = new URLSearchParams(searchParams);
    if (val && val !== "ALL") {
      params.set("categoryId", val);
    } else {
      params.delete("categoryId");
    }
    params.set("page", "1");
    replace(`${pathname}?${params.toString()}`);
  };

  const handleDeleteClick = (id: string) => {
    setProductToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (productToDelete) {
      await deleteProduct(productToDelete);
      setIsDeleteDialogOpen(false);
      setProductToDelete(undefined);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-sm">
          <CustomInput
            placeholder="Search by name or SKU..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            containerClassName="w-full"
          />
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
        </div>
        <CustomSelect
          value={categoryFilter}
          onValueChange={handleCategoryChange}
          containerClassName="w-[180px]"
          placeholder="Category"
        >
          <SelectItem value="ALL">All Categories</SelectItem>
          {categories.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </CustomSelect>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU/Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Cost</TableHead>
              <TableHead>Min Stock</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center">
                  No products found.
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => {
                const totalStock = product?.inventory?.reduce(
                  (acc, inv) => acc + inv.quantity,
                  0
                );
                return (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="text-xs text-muted-foreground">
                        {product.sku}
                      </div>
                      <div className="font-medium">{product.name}</div>
                    </TableCell>
                    <TableCell>{product.category?.name || "-"}</TableCell>
                    <TableCell>{formatCurrency(product.price)}</TableCell>
                    <TableCell>{formatCurrency(product.cost)}</TableCell>
                    <TableCell>{product.minStock}</TableCell>
                    <TableCell>
                      {totalStock} {product.baseUnit?.symbol}
                    </TableCell>
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
                          <Protect permission="products.view">
                            <DropdownMenuItem asChild>
                              <Link
                                href={`/inventory/products/${product.id}`}
                                className="flex items-center"
                              >
                                <Eye className="mr-2 h-4 w-4" /> Details
                              </Link>
                            </DropdownMenuItem>
                          </Protect>
                          <Protect permission="products.edit">
                            <DropdownMenuItem asChild>
                              <Link
                                href={`/inventory/products/${product.id}/edit`}
                                className="flex items-center"
                              >
                                <Pencil className="mr-2 h-4 w-4" /> Edit
                              </Link>
                            </DropdownMenuItem>
                          </Protect>
                          <DropdownMenuSeparator />
                          <Protect permission="products.delete">
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => handleDeleteClick(product.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </Protect>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="py-4">
        <CustomPagination
          totalEntries={totalEntries}
          pageSize={10}
          currentPage={currentPage}
        />
      </div>

      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Are you sure you want to delete this product?"
        description="This action cannot be undone. This will permanently delete the product."
        onConfirm={handleConfirmDelete}
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
}
