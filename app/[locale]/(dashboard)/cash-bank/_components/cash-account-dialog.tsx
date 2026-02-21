"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
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
import {
  createCashAccount,
  getAvailableGLAccounts,
  updateCashAccount,
} from "../actions";
import { CashAccount, CashAccountFormData } from "../types";
import { CashAccountType } from "@/prisma/generated/prisma/enums";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks";

interface CashAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: CashAccount; // If provided, we are editing
  glAccounts: Awaited<ReturnType<typeof getAvailableGLAccounts>>;
  usedGlAccountIds?: string[];
  onSuccess: () => void;
}

export function CashAccountDialog({
  open,
  onOpenChange,
  account,
  glAccounts,
  usedGlAccountIds = [],
  onSuccess,
}: CashAccountDialogProps) {
  const { toast } = useToast();
  const t = useTranslations("CashBank");
  const tCommon = useTranslations("Common");
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
        title: tCommon("error"),
        description: t("name_gl_account_required"),
        variant: "destructive",
      });
      return;
    }

    startTransition(async () => {
      try {
        if (account) {
          await updateCashAccount(account.id, formData);
          toast({
            title: tCommon("success"),
            description: t("account_updated_success"),
          });
        } else {
          await createCashAccount(formData);
          toast({
            title: tCommon("success"),
            description: t("account_created_success"),
          });
        }
        onSuccess();
        onOpenChange(false);
      } catch (error) {
        toast({
          title: tCommon("error"),
          description:
            error instanceof Error ? error.message : t("something_went_wrong"),
          variant: "destructive",
        });
      }
    });
  };

  const accountTypeOptions = Object.values(CashAccountType).map((type) => ({
    label: type.replace(/_/g, " "),
    value: type,
  }));

  const glAccountOptions = glAccounts
    .filter(
      (acc) =>
        !usedGlAccountIds.includes(acc.id) || acc.id === account?.glAccountId
    )
    .map((acc) => ({
      label: `${acc.code} - ${acc.name}`,
      value: acc.id,
    }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{account ? t("edit_account") : t("add_account")}</DialogTitle>
          <DialogDescription>
            {account
              ? t("edit_cash_bank_account")
              : t("create_cash_bank_account")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <CustomInput
            label={t("account_name")}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Petty Cash, Main Bank"
            required
          />
          <CustomSelect
            label={t("type")}
            value={formData.type}
            onValueChange={(val) =>
              setFormData({ ...formData, type: val as CashAccountType })
            }
            options={accountTypeOptions}
          />
          <CustomSelect
            label={t("gl_account")}
            value={formData.glAccountId}
            onValueChange={(val) =>
              setFormData({ ...formData, glAccountId: val })
            }
            options={glAccountOptions}
            placeholder={t("select_gl_account")}
            disabled={!!account} // Usually changing GL account for existing cash account is tricky
          />
          {(formData.type === CashAccountType.BANK ||
            formData.type === CashAccountType.EWALLET) && (
              <>
                <CustomInput
                  label={t("bank_provider_name")}
                  value={formData.bankName || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, bankName: e.target.value })
                  }
                  placeholder="e.g. Chase, PayPal"
                />
                <CustomInput
                  label={t("account_number")}
                  value={formData.accountNumber || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, accountNumber: e.target.value })
                  }
                  placeholder="e.g. 1234567890"
                />
              </>
            )}
          <CustomTextarea
            label={t("description")}
            value={formData.description || ""}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tCommon("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {account ? t("update_account") : t("create_account")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
