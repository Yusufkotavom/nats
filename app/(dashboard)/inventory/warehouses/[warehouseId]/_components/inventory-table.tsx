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
import { Search, Eye } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { CustomPagination } from "@/components/ui/custom-pagination";
import { useFormatCurrency } from "@/hooks/use-format-currency";
import { Category, Inventory, Product, Unit } from "@/prisma/generated/prisma/browser";

type InventoryWithProduct = Omit<Inventory, "unitCost"> & {
  unitCost: number;
  product: Omit<
    Product,
    | "price"
    | "cost"
    | "averageCost"
    | "purchaseConversionFactor"
    | "salesConversionFactor"
  > & {
    price: number;
    cost: number;
    averageCost: number;
    purchaseConversionFactor: number;
    salesConversionFactor: number;
    category: Category | null;
    baseUnit: Unit | null;
  };
};

interface InventoryTableProps {
  inventory: InventoryWithProduct[];
  categories: Category[];
  totalEntries: number;
}

export function InventoryTable({
  inventory,
  categories,
  totalEntries,
}: InventoryTableProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();
  const formatCurrency = useFormatCurrency();

  const [searchTerm, setSearchTerm] = useState(
    searchParams.get("search") || ""
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
              <TableHead>Cost</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Value</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {inventory.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  No inventory found.
                </TableCell>
              </TableRow>
            ) : (
              inventory.map((inv) => {
                const totalValue = inv.quantity * inv.product.cost;
                return (
                  <TableRow key={inv.id}>
                    <TableCell>
                      <div className="text-xs text-muted-foreground">
                        {inv.product.sku}
                      </div>
                      <div className="font-medium">{inv.product.name}</div>
                    </TableCell>
                    <TableCell>{inv.product.category?.name || "-"}</TableCell>
                    <TableCell>{formatCurrency(inv.product.cost)}</TableCell>
                    <TableCell>
                      {inv.quantity} {inv.product.baseUnit?.symbol}
                    </TableCell>
                    <TableCell>{formatCurrency(totalValue)}</TableCell>
                    <TableCell>
                       <Button
                        variant="ghost"
                        size="icon"
                        asChild
                        title="View Product"
                      >
                        <Link href={`/inventory/products/${inv.product.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <CustomPagination
        totalEntries={totalEntries}
        pageSize={10}
        currentPage={currentPage}
      />
    </div>
  );
}
