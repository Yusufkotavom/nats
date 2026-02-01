"use client";

import { useState } from "react";
import { CashAccountWithBalance } from "../types";
import { CashAccountType } from "@/prisma/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, History, Wallet, Building2 } from "lucide-react";
import { CashAccountDialog } from "./cash-account-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  deleteCashAccount,
  getAvailableGLAccounts,
  getDashboardStats,
} from "../actions";
import { useToast, useConfirm, useFormatCurrency } from "@/hooks";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Account
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map((account) => (
          <Card key={account.id} className="relative group space-y-0">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <CardTitle className="text-lg font-medium flex items-center gap-2">
                    {account.type === CashAccountType.CASH ? (
                      <Wallet className="h-5 w-5 text-primary" />
                    ) : (
                      <Building2 className="h-5 w-5 text-primary" />
                    )}
                    {account.name}
                  </CardTitle>
                  <CardDescription>
                    {account.bankName ? `${account.bankName} - ` : ""}
                    {account.accountNumber || "No Account #"}
                  </CardDescription>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold">
                    {formatCurrency(account.balance)}
                  </div>
                  <Badge variant="secondary" className="capitalize mt-1">
                    {account.type.replace(/_/g, " ")}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground mb-4">
                Linked GL: {account.glAccount.code} - {account.glAccount.name}
              </div>
              <div className="text-sm line-clamp-2">
                {account.description || "No description"}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t bg-muted/20 p-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-primary"
                onClick={() =>
                  router.push(`/accounting/cash-bank/${account.id}`)
                }
              >
                <History className="mr-2 h-4 w-4" />
                History
              </Button>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleDelete(account.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardFooter>
          </Card>
        ))}
        {accounts.length === 0 && (
          <div className="col-span-full text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg">
            No accounts found. Create one to get started.
          </div>
        )}
      </div>

      <CashAccountDialog
        key={isCreateOpen ? editingAccount?.id || "create" : "closed"}
        open={isCreateOpen}
        onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) setEditingAccount(undefined);
        }}
        account={editingAccount}
        glAccounts={glAccounts}
        onSuccess={() => {
          queryClient.invalidateQueries({
            queryKey: ["cash-bank", "dashboard-stats"],
          });
        }}
      />
    </div>
  );
}
