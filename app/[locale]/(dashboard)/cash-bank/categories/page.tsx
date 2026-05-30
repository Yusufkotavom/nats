"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery, keepPreviousData, useQueryClient } from "@tanstack/react-query";
import { MoreHorizontal, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CustomInput } from "@/components/ui/custom-input";
import { DataTable, Column } from "@/components/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { PageListActions, PageListContent, PageListFilter, PageListHeader, PageListLayout, PageListTitle } from "@/components/layout/page/list-layout";
import { useConfirm } from "@/hooks/use-confirm";
import { useToast } from "@/hooks/use-toast";
import {
  createCashTransactionCategory,
  deleteCashTransactionCategory,
  getCashTransactionCategories,
  updateCashTransactionCategory,
} from "./actions";

type CategoryRow = {
  id: string;
  code: string;
  name: string;
  categoryType: "EXPENSE" | "INCOME";
  parent?: { id: string; name: string } | null;
  _count: { cashTransactionAllocations: number };
};

type FormState = {
  open: boolean;
  mode: "create" | "edit";
  id?: string;
  name: string;
  type: "EXPENSE" | "INCOME";
};

export default function CashTransactionCategoriesPage() {
  const t = useTranslations("CashBank");
  const tCommon = useTranslations("Common");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const confirm = useConfirm();

  const search = searchParams.get("search") || "";
  const type = (searchParams.get("type") as "EXPENSE" | "INCOME" | null) || null;

  const [form, setForm] = useState<FormState>({
    open: false,
    mode: "create",
    name: "",
    type: "EXPENSE",
  });
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["cash-bank-categories", { search, type }],
    queryFn: () => getCashTransactionCategories(type || undefined, search || undefined),
    placeholderData: keepPreviousData,
  });

  const updateParams = (next: { search?: string; type?: "EXPENSE" | "INCOME" | "ALL" }) => {
    const params = new URLSearchParams(searchParams.toString());

    if (next.search !== undefined) {
      if (next.search) params.set("search", next.search);
      else params.delete("search");
    }

    if (next.type !== undefined) {
      if (!next.type || next.type === "ALL") params.delete("type");
      else params.set("type", next.type);
    }

    router.push(`${pathname}${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const openCreate = () => {
    setForm({
      open: true,
      mode: "create",
      name: "",
      type: type || "EXPENSE",
    });
  };

  const openEdit = (row: CategoryRow) => {
    setForm({
      open: true,
      mode: "edit",
      id: row.id,
      name: row.name,
      type: row.categoryType,
    });
  };

  const submit = async () => {
    if (!form.name.trim()) {
      toast({
        title: t("validation_error"),
        description: t("category_name_required"),
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const result =
        form.mode === "create"
          ? await createCashTransactionCategory({ name: form.name, type: form.type })
          : await updateCashTransactionCategory(form.id || "", { name: form.name });

      if (!result.success) {
        toast({
          title: tCommon("error"),
          description: result.error || t("something_went_wrong"),
          variant: "destructive",
        });
        return;
      }

      toast({
        title: tCommon("success"),
        description: form.mode === "create" ? t("category_created") : t("category_updated"),
      });
      setForm((prev) => ({ ...prev, open: false }));
      queryClient.invalidateQueries({ queryKey: ["cash-bank-categories"] });
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (row: CategoryRow) => {
    if (
      await confirm({
        title: t("delete_category"),
        description: t("delete_category_desc"),
      })
    ) {
      const result = await deleteCashTransactionCategory(row.id);
      if (!result.success) {
        toast({
          title: tCommon("error"),
          description: result.error || t("failed_to_delete"),
          variant: "destructive",
        });
        return;
      }

      toast({ title: tCommon("success"), description: t("category_deleted") });
      queryClient.invalidateQueries({ queryKey: ["cash-bank-categories"] });
    }
  };

  const columns: Column<CategoryRow>[] = [
    {
      header: tCommon("name"),
      cell: (item) => (
        <div className="flex flex-col">
          <span className="font-medium">{item.name}</span>
          <span className="text-xs text-muted-foreground">{item.code}</span>
        </div>
      ),
    },
    {
      header: t("type"),
      cell: (item) => (
        <Badge variant="secondary">
          {item.categoryType === "INCOME" ? t("revenue_in") : t("expense_out")}
        </Badge>
      ),
    },
    {
      header: t("transactions"),
      cell: (item) => item._count.cashTransactionAllocations,
    },
    {
      header: tCommon("actions"),
      className: "w-[100px]",
      cell: (item) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{tCommon("actions")}</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => openEdit(item)}>
              <Pencil className="mr-2 h-4 w-4" /> {tCommon("edit")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => onDelete(item)}
            >
              <Trash2 className="mr-2 h-4 w-4" /> {tCommon("delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <PageListLayout>
      <PageListHeader>
        <PageListTitle title={t("transaction_categories")} />
        <PageListActions>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> {t("add_category")}
          </Button>
        </PageListActions>
      </PageListHeader>

      <PageListFilter>
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <CustomInput
            defaultValue={search}
            className="pl-8"
            placeholder={t("search_categories")}
            onChange={(event) => updateParams({ search: event.target.value })}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant={!type ? "default" : "outline"} size="sm" onClick={() => updateParams({ type: "ALL" })}>
            {tCommon("all")}
          </Button>
          <Button variant={type === "EXPENSE" ? "default" : "outline"} size="sm" onClick={() => updateParams({ type: "EXPENSE" })}>
            {t("expense_out")}
          </Button>
          <Button variant={type === "INCOME" ? "default" : "outline"} size="sm" onClick={() => updateParams({ type: "INCOME" })}>
            {t("revenue_in")}
          </Button>
        </div>
      </PageListFilter>

      <PageListContent>
        <DataTable
          data={(data || []) as CategoryRow[]}
          columns={columns}
          isLoading={isLoading}
          emptyMessage={t("no_categories_found")}
        />
      </PageListContent>

      <Dialog open={form.open} onOpenChange={(open) => setForm((prev) => ({ ...prev, open }))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {form.mode === "create" ? t("add_category") : t("edit_category")}
            </DialogTitle>
            <DialogDescription>
              {form.mode === "create" ? t("create_category_desc") : t("edit_category_desc")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-1">
            {form.mode === "create" ? (
              <div className="space-y-1">
                <Label>{t("type")}</Label>
                <div className="flex gap-2">
                  <Button type="button" variant={form.type === "EXPENSE" ? "default" : "outline"} size="sm" onClick={() => setForm((prev) => ({ ...prev, type: "EXPENSE" }))}>
                    {t("expense_out")}
                  </Button>
                  <Button type="button" variant={form.type === "INCOME" ? "default" : "outline"} size="sm" onClick={() => setForm((prev) => ({ ...prev, type: "INCOME" }))}>
                    {t("revenue_in")}
                  </Button>
                </div>
              </div>
            ) : null}
            <div className="space-y-1">
              <Label>{tCommon("name")}</Label>
              <CustomInput
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder={t("category_name_placeholder")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setForm((prev) => ({ ...prev, open: false }))}>
              {tCommon("cancel")}
            </Button>
            <Button type="button" onClick={submit} disabled={saving}>
              {saving ? tCommon("saving") : tCommon("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageListLayout>
  );
}
