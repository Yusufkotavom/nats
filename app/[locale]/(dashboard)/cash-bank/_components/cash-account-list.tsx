"use client";

import { useState } from "react";
import { CashAccountWithBalance } from "../types";
import { CashAccountType } from "@/prisma/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import {
  History,
  Wallet,
  Building2,
  Pencil,
  MoreHorizontal,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getDashboardStats, syncCashAccounts } from "../actions";
import { useToast, useConfirm, useFormatCurrency } from "@/hooks";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  PageListActions,
  PageListContent,
  PageListHeader,
  PageListLayout,
  PageListTitle,
} from "@/components/layout/page/list-layout";
import { DataTable, Column } from "@/components/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { EditCashAccountDialog } from "./edit-cash-account-dialog";

interface CashAccountListProps {
  accounts: Awaited<ReturnType<typeof getDashboardStats>>["accounts"];
  title?: string;
}

import { useTranslations } from "next-intl";

export function CashAccountList({
  accounts,
  title = "Cash & Bank",
}: CashAccountListProps) {
  const t = useTranslations("CashBank");
  const tCommon = useTranslations("Common");
  const confirm = useConfirm();
  const { toast } = useToast();
  const router = useRouter();
  const formatCurrency = useFormatCurrency();
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] =
    useState<CashAccountWithBalance | null>(null);

  const handleEdit = (account: CashAccountWithBalance) => {
    setEditingAccount(account);
    setIsEditDialogOpen(true);
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const result = await syncCashAccounts();
      queryClient.invalidateQueries({
        queryKey: ["cash-bank"],
      });
      toast({
        title: tCommon("success"),
        description: t("accounts_synced_successfully", {
          count: result.syncedCount,
        }),
      });
    } catch (error) {
      toast({
        title: tCommon("error"),
        description:
          error instanceof Error ? error.message : t("failed_to_sync"),
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const columns: Column<CashAccountWithBalance>[] = [
    {
      header: tCommon("name"),
      cell: (account) => (
        <div className="flex items-center gap-2">
          {account.type === CashAccountType.CASH ? (
            <Wallet className="h-4 w-4 text-primary" />
          ) : (
            <Building2 className="h-4 w-4 text-primary" />
          )}
          <span className="font-medium">{account.name}</span>
        </div>
      ),
    },
    {
      header: tCommon("status"),
      cell: (account) => (
        <Badge variant="secondary" className="capitalize">
          {account.type.replace(/_/g, " ")}
        </Badge>
      ),
    },
    {
      header: t("bank_account_number"),
      cell: (account) =>
        account.bankName ? (
          <div className="flex flex-col">
            <span>{account.bankName}</span>
            <span className="text-xs text-muted-foreground">
              {account.accountNumber}
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    {
      header: t("gl_account"),
      cell: (account) => (
        <div className="flex flex-col">
          <span>{account.glAccount.code}</span>
          <span className="text-xs text-muted-foreground">
            {account.glAccount.name}
          </span>
        </div>
      ),
    },
    {
      header: t("balance"),
      className: "text-right",
      headerClassName: "text-right",
      cell: (account) => (
        <span className="font-bold">{formatCurrency(account.balance)}</span>
      ),
    },
    {
      header: tCommon("actions"),
      cell: (account) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{tCommon("actions")}</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => handleEdit(account)}>
              <Pencil className="mr-2 h-4 w-4" />
              {tCommon("edit")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => router.push(`/accounting/cash-bank/${account.id}`)}
            >
              <History className="mr-2 h-4 w-4" />
              {t("history")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <>
      <PageListLayout className="p-0 pt-0">
        <PageListHeader>
          <PageListTitle title={title} />
          <PageListActions>
            <Button onClick={handleSync} disabled={isSyncing}>
              <RefreshCw
                className={`mr-2 h-4 w-4 ${isSyncing ? "animate-spin" : ""}`}
              />
              {t("sync_accounts")}
            </Button>
          </PageListActions>
        </PageListHeader>
        <PageListContent>
          <DataTable
            data={accounts}
            columns={columns}
            emptyMessage={t("create_account_started")}
          />
        </PageListContent>
      </PageListLayout>
      {editingAccount && (
        <EditCashAccountDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          account={editingAccount}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["cash-bank"] });
          }}
        />
      )}
    </>
  );
}
