"use client";

import { useState } from "react";
import { CashAccount } from "../types";
import { Account } from "@/prisma/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { Plus, ArrowRightLeft, Edit, Trash2, History } from "lucide-react";
import { CashAccountDialog } from "./account-dialog";
import { CashTransferDialog } from "./transfer-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { deleteCashAccount } from "../actions";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useRouter } from "next/navigation";

interface CashAccountListProps {
  accounts: CashAccount[];
  glAccounts: Account[];
}

export function CashAccountList({
  accounts,
  glAccounts,
}: CashAccountListProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<CashAccount | undefined>(
    undefined
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteCashAccount(deletingId);
      toast({ title: "Success", description: "Account deleted successfully" });
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to delete",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Cash & Bank</h2>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsTransferOpen(true)}>
            <ArrowRightLeft className="mr-2 h-4 w-4" />
            Transfer
          </Button>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Account
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map((account) => (
          <Card key={account.id} className="relative group">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg font-medium">
                  {account.name}
                </CardTitle>
                <Badge variant="secondary" className="capitalize">
                  {account.type.replace(/_/g, " ")}
                </Badge>
              </div>
              <CardDescription>
                {account.bankName ? `${account.bankName} - ` : ""}
                {account.accountNumber || "No Account #"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground mb-4">
                Linked GL: {account.glAccount.code} - {account.glAccount.name}
              </div>
              <div className="text-sm line-clamp-2">
                {account.description || "No description"}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t p-4 bg-muted/20">
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
                  onClick={() => {
                    setEditingAccount(account);
                    setIsCreateOpen(true);
                  }}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setDeletingId(account.id)}
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
        onSuccess={() => {}}
      />

      <CashTransferDialog
        open={isTransferOpen}
        onOpenChange={setIsTransferOpen}
        cashAccounts={accounts}
        onSuccess={() => {}}
      />

      <ConfirmDialog
        open={!!deletingId}
        onOpenChange={(open) => !open && setDeletingId(null)}
        onConfirm={handleDelete}
        title="Delete Account"
        description="Are you sure you want to delete this account? This action cannot be undone."
      />
    </div>
  );
}
