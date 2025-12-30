"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CustomInput } from "@/components/ui/custom-input";
import { CustomTextarea } from "@/components/ui/custom-textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { createCustomer, updateCustomer } from "../actions";
import { Loader2 } from "lucide-react";
import { Customer } from "../../types";

interface CustomerDialogProps {
  customer?: Customer;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CustomerDialog({
  customer,
  open,
  onOpenChange,
}: CustomerDialogProps) {
  const [loading, setLoading] = useState(false);
  const isEditing = !!customer;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const phone = formData.get("phone") as string;
    const address = formData.get("address") as string;
    const isActive = formData.get("isActive") === "on";

    try {
      if (isEditing) {
        await updateCustomer(customer.id, {
          name,
          email: email || "",
          phone: phone || "",
          address: address || "",
          isActive,
        });
      } else {
        await createCustomer({
          name,
          email: email || "",
          phone: phone || "",
          address: address || "",
          isActive,
        });
      }
      onOpenChange(false);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Customer" : "Add Customer"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Make changes to the customer profile here."
              : "Add a new customer to the system."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <CustomInput
              label="Name"
              id="name"
              name="name"
              defaultValue={customer?.name}
              required
            />
            <CustomInput
              label="Email"
              id="email"
              name="email"
              type="email"
              defaultValue={customer?.email || ""}
            />
            <CustomInput
              label="Phone"
              id="phone"
              name="phone"
              defaultValue={customer?.phone || ""}
            />
            <CustomTextarea
              label="Address"
              id="address"
              name="address"
              defaultValue={customer?.address || ""}
            />
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="isActive" className="text-right">
                Active
              </Label>
              <Switch
                id="isActive"
                name="isActive"
                defaultChecked={customer?.isActive ?? true}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Save changes" : "Create Customer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
