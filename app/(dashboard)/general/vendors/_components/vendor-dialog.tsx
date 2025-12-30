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
import { createVendor, updateVendor } from "../actions";
import { Loader2 } from "lucide-react";
import { Vendor } from "../../types";

interface VendorDialogProps {
  vendor?: Vendor;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VendorDialog({
  vendor,
  open,
  onOpenChange,
}: VendorDialogProps) {
  const [loading, setLoading] = useState(false);
  const isEditing = !!vendor;

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
        await updateVendor(vendor.id, {
          name,
          email: email || "",
          phone: phone || "",
          address: address || "",
          isActive,
        });
      } else {
        await createVendor({
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
          <DialogTitle>{isEditing ? "Edit Vendor" : "Add Vendor"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Make changes to the vendor profile here."
              : "Add a new vendor to the system."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <CustomInput
              label="Name"
              id="name"
              name="name"
              defaultValue={vendor?.name}
              required
            />
            <CustomInput
              label="Email"
              id="email"
              name="email"
              type="email"
              defaultValue={vendor?.email || ""}
            />
            <CustomInput
              label="Phone"
              id="phone"
              name="phone"
              defaultValue={vendor?.phone || ""}
            />
            <CustomTextarea
              label="Address"
              id="address"
              name="address"
              defaultValue={vendor?.address || ""}
            />
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="isActive" className="text-right">
                Active
              </Label>
              <Switch
                id="isActive"
                name="isActive"
                defaultChecked={vendor?.isActive ?? true}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Save changes" : "Create Vendor"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
