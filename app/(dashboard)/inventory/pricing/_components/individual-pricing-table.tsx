"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { CustomInput } from "@/components/ui/custom-input";
import { CustomSelect } from "@/components/ui/custom-select";
import { Button } from "@/components/ui/button";
import { SelectItem } from "@/components/ui/select";
import { Search, Save, Loader2, Check, X } from "lucide-react";
import { useFormatCurrency } from "@/hooks/use-format-currency";
import { Category } from "@/prisma/generated/prisma/browser";
import { updateSinglePrice } from "../actions";
import { CurrencyInput } from "@/components/ui/currency-input";
import { DiscountManager } from "./discount-manager";
import { useAlert } from "@/hooks/use-alert";
import { PricingProductWithDetails } from "../types";
import { DataTable, Column } from "@/components/ui/data-table";

interface IndividualPricingTableProps {
  initialProducts: PricingProductWithDetails[];
  categories: Category[];
  totalPages: number;
  totalEntries: number;
}

export function IndividualPricingTable({
  initialProducts,
  categories,
  totalEntries,
}: IndividualPricingTableProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace, refresh } = useRouter();
  const formatCurrency = useFormatCurrency();
  const alert = useAlert();

  const [products, setProducts] = useState(initialProducts);
  const [searchTerm, setSearchTerm] = useState(
    searchParams.get("search") || "",
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
      await alert({ title: "Error", description: "Failed to update price" });
    }
  }

  function startEditing(product: PricingProductWithDetails) {
    setEditingId(product.id);
    setEditValue(Number(product.price));
  }

  function cancelEditing() {
    setEditingId(null);
    setEditValue("");
  }

  const columns: Column<PricingProductWithDetails>[] = [
    {
      header: "Product",
      cell: (product) => (
        <>
          <div className="text-xs text-muted-foreground">{product.sku}</div>
          <div className="font-medium">{product.name}</div>
        </>
      ),
    },
    {
      header: "Category",
      cell: (product) => product.category?.name || "-",
    },
    {
      header: "Cost",
      cell: (product) => formatCurrency(Number(product.cost)),
    },
    {
      header: "Price",
      cell: (product) => {
        if (editingId === product.id) {
          return (
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
                onClick={() => updatePrice(product.id, Number(editValue))}
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
                <X className="h-4 w-4" />
              </Button>
            </div>
          );
        }
        return formatCurrency(Number(product.price));
      },
    },
    {
      header: "Discounts",
      cell: (product) => (
        <DiscountManager
          productId={product.id}
          productName={product.name}
          discounts={product.discounts}
        />
      ),
    },
    {
      header: "",
      className: "w-[100px]",
      cell: (product) => {
        if (editingId !== product.id) {
          return (
            <Button
              size="sm"
              variant="outline"
              onClick={() => startEditing(product)}
            >
              Edit
            </Button>
          );
        }
        return null;
      },
    },
  ];

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
        <DataTable
          data={products}
          columns={columns}
          emptyMessage="No products found."
          pagination={{
            totalEntries,
            pageSize: 10,
            currentPage,
          }}
        />
      </div>
    </div>
  );
}
