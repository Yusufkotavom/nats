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
import { CustomSelect } from "@/components/ui/custom-select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { createContact, updateContact } from "../actions";
import { Loader2 } from "lucide-react";
import { Contact } from "../../types";
import { ContactType } from "@/prisma/generated/prisma/browser";

interface ContactDialogProps {
  contact?: Contact;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContactDialog({
  contact,
  open,
  onOpenChange,
}: ContactDialogProps) {
  const [loading, setLoading] = useState(false);
  const isEditing = !!contact;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const phone = formData.get("phone") as string;
    const address = formData.get("address") as string;
    const type = formData.get("type") as ContactType;
    const isActive = formData.get("isActive") === "on";

    try {
      if (isEditing) {
        await updateContact(contact.id, {
          name,
          email: email || "",
          phone: phone || "",
          address: address || "",
          type,
          isActive,
        });
      } else {
        await createContact({
          name,
          email: email || "",
          phone: phone || "",
          address: address || "",
          type,
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
          <DialogTitle>{isEditing ? "Edit Contact" : "Add Contact"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Make changes to the contact profile here."
              : "Add a new contact to the system."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <CustomSelect
                name="type"
                label="Type"
                placeholder="Select Type"
                defaultValue={contact?.type || ContactType.CUSTOMER}
                options={[
                    { label: "Customer", value: ContactType.CUSTOMER },
                    { label: "Vendor", value: ContactType.VENDOR },
                    { label: "Employee", value: ContactType.EMPLOYEE },
                ]}
            />
            <CustomInput
              label="Name"
              id="name"
              name="name"
              defaultValue={contact?.name}
              required
            />
            <CustomInput
              label="Email"
              id="email"
              name="email"
              type="email"
              defaultValue={contact?.email || ""}
            />
            <CustomInput
              label="Phone"
              id="phone"
              name="phone"
              defaultValue={contact?.phone || ""}
            />
            <CustomTextarea
              label="Address"
              id="address"
              name="address"
              defaultValue={contact?.address || ""}
            />
            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                name="isActive"
                defaultChecked={contact?.isActive ?? true}
              />
              <Label htmlFor="isActive">Active Status</Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
