"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter, Save, Loader2, Check } from "lucide-react";
import { useFormatCurrency } from "@/hooks/use-format-currency";
import { Category } from "@/prisma/generated/prisma/browser";
import { Discount } from "@/prisma/generated/prisma/client";
import { updateSinglePrice } from "../actions";
import { CurrencyInput } from "@/components/ui/currency-input";
import { DiscountManager } from "./discount-manager";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { generatePagination } from "@/lib/utils";

interface PricingProduct {
  id: string;
  name: string;
  sku: string;
  price: number;
  cost: number;
  category: {
    name: string;
  } | null;
  discounts: (Omit<Discount, "value"> & { value: number })[];
}

interface IndividualPricingTableProps {
  initialProducts: PricingProduct[];
  categories: Category[];
  totalPages: number;
}

export function IndividualPricingTable({
  initialProducts,
  categories,
  totalPages,
}: IndividualPricingTableProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace, refresh } = useRouter();
  const formatCurrency = useFormatCurrency();

  const [products, setProducts] = useState(initialProducts);
  const [searchTerm, setSearchTerm] = useState(
    searchParams.get("search") || ""
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string | number>("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setProducts(initialProducts);
  }, [initialProducts]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams);
      if (searchTerm) {
        params.set("search", searchTerm);
      } else {
        params.delete("search");
      }
      params.set("page", "1");

      if (params.get("search") !== (searchParams.get("search") || null)) {
        replace(`${pathname}?${params.toString()}`);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, searchParams, pathname, replace]);

  const categoryFilter = searchParams.get("categoryId") || "ALL";
  const currentPage = Number(searchParams.get("page")) || 1;
  const paginationPages = generatePagination(currentPage, totalPages);

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

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", page.toString());
    replace(`${pathname}?${params.toString()}`);
  };

  const startEditing = (product: PricingProduct) => {
    setEditingId(product.id);
    setEditValue(product.price);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditValue("");
  };

  const savePrice = async (id: string) => {
    setIsSaving(true);
    try {
      const result = await updateSinglePrice({ id, price: Number(editValue) });
      if (result.success) {
        setEditingId(null);
        refresh(); // Refresh to get latest data and update server state
      } else {
        alert(result.error || "Failed to update price");
      }
    } catch (error) {
      console.error(error);
      alert("Failed to update price");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={categoryFilter} onValueChange={handleCategoryChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Cost</TableHead>
              <TableHead className="text-right">Current Price</TableHead>
              <TableHead className="text-center">Discounts</TableHead>
              <TableHead className="w-[150px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No products found.
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>{product.sku}</TableCell>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>{product.category?.name || "-"}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(product.cost)}
                  </TableCell>
                  <TableCell className="text-right">
                    {editingId === product.id ? (
                      <div className="flex justify-end">
                        <CurrencyInput
                          value={editValue}
                          onChange={setEditValue}
                          className="h-8 w-24 text-right"
                        />
                      </div>
                    ) : (
                      formatCurrency(product.price)
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <DiscountManager
                      productId={product.id}
                      productName={product.name}
                      discounts={product.discounts}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    {editingId === product.id ? (
                      <div className="flex justify-end gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-green-600"
                          onClick={() => savePrice(product.id)}
                          disabled={isSaving}
                        >
                          {isSaving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-red-600"
                          onClick={cancelEditing}
                          disabled={isSaving}
                        >
                          <span className="sr-only">Cancel</span>
                          <span aria-hidden>×</span>
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startEditing(product)}
                      >
                        Edit
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-4 py-4">
        <div className="text-sm text-muted-foreground text-center">
          {products.length > 0
            ? `Page ${currentPage} of ${totalPages}`
            : "No products found"}
        </div>
        {totalPages > 1 && (
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (currentPage > 1) handlePageChange(currentPage - 1);
                  }}
                  className={
                    currentPage === 1 ? "pointer-events-none opacity-50" : ""
                  }
                />
              </PaginationItem>
              {paginationPages.map((pageNum, i) => (
                <PaginationItem key={i}>
                  {pageNum === "..." ? (
                    <PaginationEllipsis />
                  ) : (
                    <PaginationLink
                      href="#"
                      isActive={currentPage === pageNum}
                      onClick={(e) => {
                        e.preventDefault();
                        handlePageChange(Number(pageNum));
                      }}
                    >
                      {pageNum}
                    </PaginationLink>
                  )}
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (currentPage < totalPages)
                      handlePageChange(currentPage + 1);
                  }}
                  className={
                    currentPage === totalPages
                      ? "pointer-events-none opacity-50"
                      : ""
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>
    </div>
  );
}
