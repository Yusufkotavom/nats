"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DataTable, Column } from "@/components/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Pencil,
  Trash2,
  Search,
  Eye,
  MoreHorizontal,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { deleteProduct, getCategories, getProducts } from "./actions";
import { getUnits } from "../uom/actions";
import { Protect } from "@/components/ui/protect";
import { useConfirm } from "@/hooks/use-confirm";
import { useFormatCurrency } from "@/hooks/use-format-currency";
import {
  PageListActions,
  PageListContent,
  PageListFilter,
  PageListHeader,
  PageListLayout,
  PageListTitle,
} from "@/components/layout/page/list-layout";
import { CustomInput } from "@/components/ui/custom-input";
import { CustomSelect } from "@/components/ui/custom-select";
import { SelectItem } from "@/components/ui/select";
import {
  useQuery,
  keepPreviousData,
  useQueryClient,
} from "@tanstack/react-query";
import { ProductFormData } from "../types";
import { SuperJSON } from "@/lib/superjson";

export default function ProductsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [categoryId, setCategoryId] = useState("ALL");
  const pageSize = 10;

  const formatCurrency = useFormatCurrency();
  const confirm = useConfirm();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["products", { page, search, categoryId }],
    queryFn: async () => {
      const [productsData, categories, units] = await Promise.all([
        getProducts(page, pageSize, search, categoryId),
        getCategories(),
        getUnits(),
      ]);
      const productsDataDeserialized = SuperJSON.deserialize(productsData) as {
        products: ProductFormData[];
        total: number;
        totalPages: number;
      };
      return {
        productsData: productsDataDeserialized,
        categories,
        units: units.data,
      };
    },
    placeholderData: keepPreviousData,
  });

  async function handleDelete(id: string) {
    if (
      await confirm({
        title: "Delete Product",
        description:
          "Are you sure you want to delete this product? This action cannot be undone.",
      })
    ) {
      await deleteProduct(id);
      queryClient.invalidateQueries({ queryKey: ["products"] });
    }
  }

  const columns: Column<ProductFormData>[] = [
    {
      header: "SKU/Name",
      cell: (product) => (
        <div>
          <div className="text-xs text-muted-foreground">{product.sku}</div>
          <div className="font-medium">{product.name}</div>
        </div>
      ),
    },
    {
      header: "Category",
      cell: (product) => product.category?.name || "-",
    },
    {
      header: "Price",
      cell: (product) => formatCurrency(product.price),
    },
    {
      header: "Cost",
      cell: (product) => formatCurrency(product.cost),
    },
    {
      header: "Min Stock",
      accessorKey: "minStock",
    },
    {
      header: "Stock",
      cell: (product) => {
        const totalStock = product?.inventory?.reduce(
          (acc: number, inv: { quantity: number }) =>
            acc + Number(inv.quantity),
          0,
        );
        return `${totalStock} ${product.baseUnit?.symbol}`;
      },
    },
    {
      header: "Actions",
      className: "w-[100px]",
      cell: (product) => (
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
            <Protect permission="products.delete">
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => handleDelete(product.id as string)}
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
        <PageListTitle title="Products" />
        <PageListActions>
          <Protect permission="products.create">
            <Button asChild>
              <Link href="/inventory/products/create">
                <Plus className="mr-2 h-4 w-4" /> Create Product
              </Link>
            </Button>
          </Protect>
        </PageListActions>
      </PageListHeader>

      <PageListFilter>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          <CustomInput
            placeholder="Search by name or SKU..."
            className="pl-8"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <CustomSelect
          value={categoryId}
          onValueChange={(val) => {
            setCategoryId(val);
            setPage(1);
          }}
          containerClassName="w-[180px]"
          placeholder="Category"
        >
          <SelectItem value="ALL">All Categories</SelectItem>
          {data?.categories.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </CustomSelect>
      </PageListFilter>

      <PageListContent>
        <DataTable
          data={data?.productsData.products || []}
          columns={columns}
          isLoading={isLoading}
          emptyMessage="No products found."
          pagination={{
            totalEntries: data?.productsData.total || 0,
            pageSize,
            currentPage: page,
            onPageChange: setPage,
          }}
        />
      </PageListContent>
    </PageListLayout>
  );
}
