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
import { useTranslations } from "next-intl";
import { useToast } from "@/hooks/use-toast";

export function ContactDialog({
  contact,
  open,
  onOpenChange,
}: {
  contact?: Contact;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [loading, setLoading] = useState(false);
  const isEditing = !!contact;
  const t = useTranslations("General.Contacts");
  const tCommon = useTranslations("Common");
  const { toast } = useToast();

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
      let result;
      if (isEditing) {
        result = await updateContact(contact.id, {
          name,
          email: email || "",
          phone: phone || "",
          address: address || "",
          type,
          isActive,
        });
      } else {
        result = await createContact({
          name,
          email: email || "",
          phone: phone || "",
          address: address || "",
          type,
          isActive,
          taxId: "",
          taxExempt: false,
        });
      }

      if (result.success) {
        toast({
          title: tCommon("success"),
          description: isEditing ? t("save_changes") : t("add_contact"),
        });
        onOpenChange(false);
      } else {
        toast({
          title: tCommon("error"),
          description: result.error || (isEditing ? t("update_error") : t("create_error")),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error(error);
      toast({
        title: tCommon("error"),
        description: isEditing ? t("update_error") : t("create_error"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t("edit_contact") : t("add_contact")}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? t("edit_desc")
              : t("add_desc")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <CustomSelect
              name="type"
              label={t("type")}
              placeholder={t("select_type")}
              defaultValue={contact?.type || ContactType.CUSTOMER}
              options={[
                { label: t("customer"), value: ContactType.CUSTOMER },
                { label: t("vendor"), value: ContactType.VENDOR },
                { label: t("employee"), value: ContactType.EMPLOYEE },
              ]}
            />
            <CustomInput
              label={t("name")}
              id="name"
              name="name"
              defaultValue={contact?.name}
              required
            />
            <CustomInput
              label={t("email")}
              id="email"
              name="email"
              type="email"
              defaultValue={contact?.email || ""}
            />
            <CustomInput
              label={t("phone")}
              id="phone"
              name="phone"
              defaultValue={contact?.phone || ""}
            />
            <CustomTextarea
              label={t("address")}
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
              <Label htmlFor="isActive">{t("active_status")}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("save_changes")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
