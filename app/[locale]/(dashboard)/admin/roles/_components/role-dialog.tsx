"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { CustomInput } from "@/components/ui/custom-input";
import { CustomTextarea } from "@/components/ui/custom-textarea";
import { createRole, updateRole } from "../actions";
import { Role } from "@/prisma/generated/prisma/browser";

interface RoleDialogProps {
  role?: Role;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

import { useTranslations } from "next-intl";

export function RoleDialog({ role, open, onOpenChange }: RoleDialogProps) {
  const t = useTranslations("Admin");
  const tCommon = useTranslations("Common");
  const [loading, setLoading] = useState(false);
  const isEditing = !!role;
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (role) {
      setIsActive(role.isActive);
    } else {
      setIsActive(true);
    }
  }, [role, open]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;

    try {
      if (isEditing) {
        await updateRole(role.id, {
          name,
          description,
          permissions: role.permissions, // Keep existing permissions
          isActive,
        });
      } else {
        await createRole({
          name,
          description,
          permissions: [], // Initialize with no permissions
          isActive,
        });
      }
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      // Ideally show toast here
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? t("edit_role") : t("add_role")}</DialogTitle>
          <DialogDescription>
            {isEditing ? t("role_details") : t("create_new_role")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <CustomInput
            label={tCommon("name")}
            id="name"
            name="name"
            defaultValue={role?.name}
            placeholder={t("role_name_placeholder")}
            required
            containerClassName="grid gap-2"
          />
          <CustomTextarea
            label={tCommon("description")}
            id="description"
            name="description"
            defaultValue={role?.description || ""}
            placeholder={t("role_description_placeholder")}
            containerClassName="grid gap-2"
          />

          <div className="flex items-center space-x-2">
            <Switch
              id="isActive"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
            <Label htmlFor="isActive">{tCommon("active")}</Label>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? tCommon("save_changes") : t("create_role")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
