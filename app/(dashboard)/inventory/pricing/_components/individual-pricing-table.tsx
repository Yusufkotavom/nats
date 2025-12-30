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
import { CustomInput } from "@/components/ui/custom-input";
import { CustomSelect } from "@/components/ui/custom-select";
import { Button } from "@/components/ui/button";
import { SelectItem } from "@/components/ui/select";
import { Search, Filter, Save, Loader2, Check } from "lucide-react";
import { useFormatCurrency } from "@/hooks/use-format-currency";
import { Category } from "@/prisma/generated/prisma/browser";
import { Discount } from "@/prisma/generated/prisma/client";
import { updateSinglePrice } from "../actions";
import { CurrencyInput } from "@/components/ui/currency-input";
import { DiscountManager } from "./discount-manager";
import { CustomPagination } from "@/components/ui/custom-pagination";

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
  totalEntries: number;
}

export function IndividualPricingTable({
  initialProducts,
  categories,
  totalPages,
  totalEntries,
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

  async function updatePrice(id: string, newPrice: number) {
    if (isNaN(newPrice) || newPrice < 0) return;

    setIsSaving(true);
    const result = await updateSinglePrice({ id, price: newPrice });
    setIsSaving(false);

    if (result.success) {
      setEditingId(null);
      refresh();
    } else {
      alert("Failed to update price");
    }
  }

  function startEditing(product: PricingProduct) {
    setEditingId(product.id);
    setEditValue(product.price);
  }

  function cancelEditing() {
    setEditingId(null);
    setEditValue("");
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-sm">
          <CustomInput
            placeholder="Search products..."
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
              <TableHead>Product</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Cost</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Discounts</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  No products found.
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="font-medium">{product.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {product.sku}
                    </div>
                  </TableCell>
                  <TableCell>{product.category?.name || "-"}</TableCell>
                  <TableCell>{formatCurrency(product.cost)}</TableCell>
                  <TableCell>
                    {editingId === product.id ? (
                      <div className="flex items-center gap-2">
                        <CurrencyInput
                          value={editValue}
                          onChange={setEditValue}
                          className="h-8 w-24 text-right"
                          autoFocus
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-green-600"
                          onClick={() =>
                            updatePrice(product.id, Number(editValue))
                          }
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
                          className="h-8 w-8 text-red-500"
                          onClick={cancelEditing}
                          disabled={isSaving}
                        >
                          <Filter className="h-4 w-4 rotate-45" />{" "}
                        </Button>
                      </div>
                    ) : (
                      formatCurrency(product.price)
                    )}
                  </TableCell>
                  <TableCell>
                    <DiscountManager
                      productId={product.id}
                      productName={product.name}
                      discounts={product.discounts}
                    />
                  </TableCell>
                  <TableCell>
                    {editingId !== product.id && (
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

      <div className="py-4">
        <CustomPagination
          totalEntries={totalEntries}
          pageSize={10}
          currentPage={currentPage}
        />
      </div>
    </div>
  );
}
