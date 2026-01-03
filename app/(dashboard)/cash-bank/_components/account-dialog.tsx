"use client";

import { useState, useTransition, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CustomInput } from "@/components/ui/custom-input";
import { CustomSelect } from "@/components/ui/custom-select";
import { CustomTextarea } from "@/components/ui/custom-textarea";
import { createCashAccount, updateCashAccount } from "../actions";
import { CashAccount, CashAccountFormData } from "../types";
import { CashAccountType } from "@/prisma/generated/prisma/enums";
import { Account } from "@/prisma/generated/prisma/client";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CashAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: CashAccount; // If provided, we are editing
  glAccounts: Account[];
  onSuccess: () => void;
}

export function CashAccountDialog({
  open,
  onOpenChange,
  account,
  glAccounts,
  onSuccess,
}: CashAccountDialogProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<CashAccountFormData>(() => {
    if (account) {
      return {
        name: account.name,
        type: account.type,
        accountNumber: account.accountNumber || "",
        bankName: account.bankName || "",
        description: account.description || "",
        glAccountId: account.glAccountId,
      };
    }
    return {
      name: "",
      type: CashAccountType.CASH,
      accountNumber: "",
      bankName: "",
      description: "",
      glAccountId: "",
    };
  });
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    if (!formData.name || !formData.glAccountId) {
      toast({
        title: "Error",
        description: "Name and GL Account are required",
        variant: "destructive",
      });
      return;
    }

    startTransition(async () => {
      try {
        if (account) {
          await updateCashAccount(account.id, formData);
          toast({
            title: "Success",
            description: "Account updated successfully",
          });
        } else {
          await createCashAccount(formData);
          toast({
            title: "Success",
            description: "Account created successfully",
          });
        }
        onSuccess();
        onOpenChange(false);
      } catch (error) {
        toast({
          title: "Error",
          description:
            error instanceof Error ? error.message : "Something went wrong",
          variant: "destructive",
        });
      }
    });
  };

  const accountTypeOptions = Object.values(CashAccountType).map((type) => ({
    label: type.replace(/_/g, " "),
    value: type,
  }));

  const glAccountOptions = glAccounts.map((acc) => ({
    label: `${acc.code} - ${acc.name}`,
    value: acc.id,
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{account ? "Edit Account" : "Add Account"}</DialogTitle>
          <DialogDescription>
            {account
              ? "Edit cash or bank account details."
              : "Create a new cash or bank account."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <CustomInput
            label="Account Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Petty Cash, Main Bank"
            required
          />
          <CustomSelect
            label="Type"
            value={formData.type}
            onValueChange={(val) =>
              setFormData({ ...formData, type: val as CashAccountType })
            }
            options={accountTypeOptions}
          />
          <CustomSelect
            label="GL Account"
            value={formData.glAccountId}
            onValueChange={(val) =>
              setFormData({ ...formData, glAccountId: val })
            }
            options={glAccountOptions}
            placeholder="Select GL Account"
            disabled={!!account} // Usually changing GL account for existing cash account is tricky
          />
          {(formData.type === CashAccountType.BANK ||
            formData.type === CashAccountType.EWALLET) && (
            <>
              <CustomInput
                label="Bank/Provider Name"
                value={formData.bankName || ""}
                onChange={(e) =>
                  setFormData({ ...formData, bankName: e.target.value })
                }
                placeholder="e.g. Chase, PayPal"
              />
              <CustomInput
                label="Account Number"
                value={formData.accountNumber || ""}
                onChange={(e) =>
                  setFormData({ ...formData, accountNumber: e.target.value })
                }
                placeholder="e.g. 1234567890"
              />
            </>
          )}
          <CustomTextarea
            label="Description"
            value={formData.description || ""}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {account ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
