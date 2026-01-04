"use client";

import { useState, useMemo, useTransition } from "react";
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
import { createAccount } from "../actions";
import { Account } from "../../types";
import { AccountType } from "@/prisma/generated/prisma/enums";
import { Loader2 } from "lucide-react";

export function AccountDialog({
  open,
  onOpenChange,
  accounts,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: Account[];
  onSuccess: () => void;
}) {
  const [addForm, setAddForm] = useState<{
    name: string;
    code: string;
    type: AccountType | "";
    parentId: string | null;
  }>({ name: "", code: "", type: "", parentId: null });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const sortedAccounts = useMemo(() => {
    return [...accounts].sort((x, y) => x.code.localeCompare(y.code));
  }, [accounts]);

  const resetForm = () => {
    setAddForm({ name: "", code: "", type: "", parentId: null });
    setError(null);
  };

  const handleCancel = () => {
    if (isPending) return;
    onOpenChange(false);
    resetForm();
  };

  const handleSubmit = () => {
    setError(null);
    if (!addForm.name || !addForm.code || !addForm.type || !addForm.parentId) {
      setError("Please fill name, code, type, and select a parent");
      return;
    }

    // Code validation
    const parent = accounts.find((a) => a.id === addForm.parentId);
    if (!parent) {
      setError("Invalid parent account");
      return;
    }

    if (addForm.code.length !== 6) {
      setError("Account code must be exactly 6 digits");
      return;
    }

    if (!addForm.code.startsWith(parent.code)) {
      setError(
        `Account code must start with parent code prefix (${parent.code})`
      );
      return;
    }

    const isDuplicate = accounts.some((a) => a.code === addForm.code);
    if (isDuplicate) {
      setError("Account code already exists");
      return;
    }

    startTransition(async () => {
      const res = await createAccount({
        name: addForm.name,
        code: addForm.code,
        type: addForm.type as AccountType,
        parentId: addForm.parentId!,
      });

      if (!res?.success) {
        setError(res?.error || "Failed to create account");
        return;
      }

      onSuccess();
      handleCancel();
    });
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && handleCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Account</DialogTitle>
          <DialogDescription>
            Enter details for the new account. Type defines category; parent
            creates hierarchy.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 items-center">
            <CustomSelect
              label="Parent/Group"
              value={addForm.parentId || ""}
              disabled={isPending}
              onValueChange={(val) => {
                const p = accounts.find((a) => a.id === val);
                if (p) {
                  setAddForm((f) => ({
                    ...f,
                    parentId: val,
                    code: p.code,
                    type: p.type,
                  }));
                }
              }}
              placeholder="Select parent"
              triggerClassName="w-full"
              options={sortedAccounts.map((a) => ({
                value: a.id,
                label: `${a.code} — ${a.name}`,
              }))}
            />
            <CustomInput
              label="Code"
              id="acc-code"
              value={addForm.code}
              onChange={(e) =>
                setAddForm((f) => ({ ...f, code: e.target.value }))
              }
              placeholder="e.g. 1-1-3"
              disabled={isPending}
            />
            <CustomInput
              label="Name"
              id="acc-name"
              value={addForm.name}
              onChange={(e) =>
                setAddForm((f) => ({ ...f, name: e.target.value }))
              }
              placeholder="e.g. Cash"
              disabled={isPending}
            />

            <CustomSelect
              label="Type"
              value={addForm.type || ""}
              disabled
              onValueChange={(val) =>
                setAddForm((f) => ({
                  ...f,
                  type: (val as AccountType) || "",
                }))
              }
              placeholder="Select type"
              containerClassName="w-full"
              options={[
                { value: "asset", label: "Asset" },
                { value: "liability", label: "Liability" },
                { value: "equity", label: "Equity" },
                { value: "revenue", label: "Revenue" },
                { value: "expense", label: "Expense" },
              ]}
            />
          </div>
          {error && <div className="text-destructive text-sm">{error}</div>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
