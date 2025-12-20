"use client";

import { useState } from "react";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { createAccount } from "../actions";
import { Account } from "../../types";
import { AccountType } from "@/prisma/generated/prisma/enums";

interface AccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: Account[];
  onSuccess: () => void;
}

export function AccountDialog({
  open,
  onOpenChange,
  accounts,
  onSuccess,
}: AccountDialogProps) {
  const [addForm, setAddForm] = useState<{
    name: string;
    code: string;
    type: AccountType | "";
    parentId: string | null;
  }>({ name: "", code: "", type: "", parentId: null });
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setAddForm({ name: "", code: "", type: "", parentId: null });
    setError(null);
  };

  const handleCancel = () => {
    onOpenChange(false);
    resetForm();
  };

  const handleSubmit = async () => {
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

    const res = await createAccount({
      name: addForm.name,
      code: addForm.code,
      type: addForm.type as AccountType,
      parentId: addForm.parentId,
    });
    if (!res?.success) {
      setError(res?.error || "Failed to create account");
      return;
    }

    onSuccess();
    handleCancel();
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
            <div className="space-y-1">
              <Label htmlFor="acc-name">Name</Label>
              <Input
                id="acc-name"
                value={addForm.name}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="e.g. Cash"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="acc-code">Code</Label>
              <Input
                id="acc-code"
                value={addForm.code}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, code: e.target.value }))
                }
                placeholder="e.g. 1-1-3"
              />
            </div>
            <div className="space-y-1">
              <Label>Parent</Label>
              <Select
                value={addForm.parentId || ""}
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
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select parent" />
                </SelectTrigger>
                <SelectContent>
                  {accounts
                    .sort((x, y) => x.code.localeCompare(y.code))
                    .map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.code} — {a.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 w-full">
              <Label>Type</Label>
              <Select
                value={addForm.type || ""}
                disabled
                onValueChange={(val) =>
                  setAddForm((f) => ({
                    ...f,
                    type: (val as AccountType) || "",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asset">Asset</SelectItem>
                  <SelectItem value="liability">Liability</SelectItem>
                  <SelectItem value="equity">Equity</SelectItem>
                  <SelectItem value="revenue">Revenue</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {error && <div className="text-destructive text-sm">{error}</div>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
