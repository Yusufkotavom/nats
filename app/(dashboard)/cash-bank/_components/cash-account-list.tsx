"use client";

import { useState } from "react";
import { CashAccountWithBalance } from "../types";
import { CashAccountType } from "@/prisma/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Trash2,
  History,
  Wallet,
  Building2,
  Pencil,
  MoreHorizontal,
} from "lucide-react";
import { CashAccountDialog } from "./cash-account-dialog";
import { Badge } from "@/components/ui/badge";
import {
  deleteCashAccount,
  getAvailableGLAccounts,
  getDashboardStats,
} from "../actions";
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

interface CashAccountListProps {
  accounts: Awaited<ReturnType<typeof getDashboardStats>>["accounts"];
  glAccounts: Awaited<ReturnType<typeof getAvailableGLAccounts>>;
  title?: string;
}

export function CashAccountList({
  accounts,
  glAccounts,
  title = "Cash & Bank",
}: CashAccountListProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<
    CashAccountWithBalance | undefined
  >(undefined);
  const confirm = useConfirm();
  const { toast } = useToast();
  const router = useRouter();
  const formatCurrency = useFormatCurrency();
  const queryClient = useQueryClient();

  // Get list of currently used GL accounts to filter them out in the dialog
  const usedGlAccountIds = accounts.map((a) => a.glAccountId);

  const handleDelete = async (id: string) => {
    if (
      await confirm({
        title: "Delete Account",
        description:
          "Are you sure you want to delete this account? This action cannot be undone.",
      })
    ) {
      try {
        await deleteCashAccount(id);
        queryClient.invalidateQueries({
          queryKey: ["cash-bank", "dashboard-stats"],
        });
        toast({
          title: "Success",
          description: "Account deleted successfully",
        });
      } catch (error) {
        toast({
          title: "Error",
          description:
            error instanceof Error ? error.message : "Failed to delete",
          variant: "destructive",
        });
      }
    }
  };

  const columns: Column<CashAccountWithBalance>[] = [
    {
      header: "Name",
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
      header: "Type",
      cell: (account) => (
        <Badge variant="secondary" className="capitalize">
          {account.type.replace(/_/g, " ")}
        </Badge>
      ),
    },
    {
      header: "Bank / Account #",
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
      header: "GL Account",
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
      header: "Balance",
      className: "text-right",
      headerClassName: "text-right",
      cell: (account) => (
        <span className="font-bold">{formatCurrency(account.balance)}</span>
      ),
    },
    {
      header: "Actions",
      cell: (account) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => router.push(`/accounting/cash-bank/${account.id}`)}
            >
              <History className="mr-2 h-4 w-4" />
              History
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setEditingAccount(account);
                setIsCreateOpen(true);
              }}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => handleDelete(account.id)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <PageListLayout className="p-0 pt-0">
      <PageListHeader>
        <PageListTitle title={title} />
        <PageListActions>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Account
          </Button>
        </PageListActions>
      </PageListHeader>
      <PageListContent>
        <DataTable
          data={accounts}
          columns={columns}
          emptyMessage="No accounts found. Create one to get started."
        />
      </PageListContent>

      <CashAccountDialog
        key={isCreateOpen ? editingAccount?.id || "create" : "closed"}
        open={isCreateOpen}
        onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) setEditingAccount(undefined);
        }}
        account={editingAccount}
        glAccounts={glAccounts}
        usedGlAccountIds={usedGlAccountIds}
        onSuccess={() => {
          queryClient.invalidateQueries({
            queryKey: ["cash-bank", "dashboard-stats"],
          });
        }}
      />
    </PageListLayout>
  );
}
