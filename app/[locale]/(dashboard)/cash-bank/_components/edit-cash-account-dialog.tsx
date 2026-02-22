"use client";

import { useEffect, useTransition } from "react";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { updateCashAccount } from "../actions";
import { CashAccountWithBalance, UpdateCashAccountFormData } from "../types";
import { CashAccountType } from "@/prisma/generated/prisma/enums";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Label } from "@/components/ui/label";

const formSchema = z.object({
  type: z.nativeEnum(CashAccountType),
  accountNumber: z.string().optional(),
  bankName: z.string().optional(),
  description: z.string().optional(),
});

interface EditCashAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: CashAccountWithBalance;
  onSuccess: () => void;
}

export function EditCashAccountDialog({
  open,
  onOpenChange,
  account,
  onSuccess,
}: EditCashAccountDialogProps) {
  const { toast } = useToast();
  const t = useTranslations("CashBank");
  const tCommon = useTranslations("Common");
  const [isPending, startTransition] = useTransition();

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<UpdateCashAccountFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: account.type,
      accountNumber: account.accountNumber ?? "",
      bankName: account.bankName ?? "",
      description: account.description ?? "",
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        type: account.type,
        accountNumber: account.accountNumber ?? "",
        bankName: account.bankName ?? "",
        description: account.description ?? "",
      });
    }
  }, [open, account, reset]);

  const accountType = watch("type");

  const onSubmit = (data: UpdateCashAccountFormData) => {
    startTransition(async () => {
      const response = await updateCashAccount(account.id, data);
      if (response.success) {
        toast({
          title: tCommon("success"),
          description: t("account_updated_successfully"),
        });
        onSuccess();
        onOpenChange(false);
      } else {
        toast({
          title: "Error",
          description: response.error || tCommon("failed_to_update"),
          variant: "destructive",
        });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("edit_cash_account")}</DialogTitle>
          <DialogDescription>
            {t("edit_cash_account_description")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label>{t("account_name")}</Label>
            <p className="text-sm text-muted-foreground">{account.name}</p>
          </div>
          <div>
            <Label>{t("linked_gl_account")}</Label>
            <p className="text-sm text-muted-foreground">
              {account.glAccount.code} - {account.glAccount.name}
            </p>
          </div>

          <Controller
            name="type"
            control={control}
            render={({ field }) => (
              <div className="space-y-2">
                <Label>{t("account_type")}</Label>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("select_account_type")} />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(CashAccountType).map((type) => (
                      <SelectItem key={type} value={type}>
                        {t(type.toLowerCase())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.type && (
                  <p className="text-sm text-red-500">{errors.type.message}</p>
                )}
              </div>
            )}
          />

          {accountType === "BANK" && (
            <>
              <Controller
                name="bankName"
                control={control}
                render={({ field }) => (
                  <div className="space-y-2">
                    <Label>{t("bank_name")}</Label>
                    <Input {...field} value={field.value ?? ""} />
                    {errors.bankName && (
                      <p className="text-sm text-red-500">
                        {errors.bankName.message}
                      </p>
                    )}
                  </div>
                )}
              />
              <Controller
                name="accountNumber"
                control={control}
                render={({ field }) => (
                  <div className="space-y-2">
                    <Label>{t("account_number")}</Label>
                    <Input {...field} value={field.value ?? ""} />
                    {errors.accountNumber && (
                      <p className="text-sm text-red-500">
                        {errors.accountNumber.message}
                      </p>
                    )}
                  </div>
                )}
              />
            </>
          )}

          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <div className="space-y-2">
                <Label>{tCommon("description")}</Label>
                <Textarea {...field} value={field.value ?? ""} />
                {errors.description && (
                  <p className="text-sm text-red-500">
                    {errors.description.message}
                  </p>
                )}
              </div>
            )}
          />

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {tCommon("save_changes")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
