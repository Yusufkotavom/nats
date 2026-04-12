"use client";

import { useState, useEffect, useCallback } from "react";
import { createDepartment, updateDepartment } from "@/app/[locale]/(dashboard)/general/actions";
import { Button } from "@/components/ui/button";
import { CustomInput } from "@/components/ui/custom-input";
import { CustomTextarea } from "@/components/ui/custom-textarea";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTranslations } from "next-intl";
import type { Department } from "@/prisma/generated/prisma/client";

interface DepartmentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  department?: Department;
}

const createEmptyFormData = () => ({
  name: "",
  code: "",
  isActive: true,
  description: "",
});

export function DepartmentFormDialog({
  open,
  onOpenChange,
  onSuccess,
  department,
}: DepartmentFormProps) {
  const t = useTranslations("General.Departments");
  const tCommon = useTranslations("Common");
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(createEmptyFormData());

  const isEditing = !!department;

  useEffect(() => {
    if (!open) return;

    if (department) {
      setFormData({
        name: department.name,
        code: department.code,
        isActive: department.isActive,
        description: department.description ?? "",
      });
    } else {
      setFormData(createEmptyFormData());
    }
  }, [department, open]);

  const handleFieldChange = useCallback(
    (field: string, value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    if (!formData.name || !formData.code) {
      toast({
        title: tCommon("error"),
        description: t("create_error_required"),
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    try {
      const result = isEditing
        ? await updateDepartment(department.id, formData)
        : await createDepartment(formData);

      if (result.success) {
        toast({ title: isEditing ? t("department_updated") : t("department_created") });
        setFormData(createEmptyFormData());
        onSuccess();
      } else {
        toast({
          title: tCommon("error"),
          description: result.error || t("create_error"),
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: tCommon("error"),
        description: t("create_error"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t("edit_department") : t("create_department")}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <CustomInput
            label={t("name")}
            id="dept-name"
            value={formData.name}
            onChange={(e) => handleFieldChange("name", e.target.value)}
            required
          />
          <CustomInput
            label={t("code")}
            id="dept-code"
            value={formData.code}
            onChange={(e) => handleFieldChange("code", e.target.value)}
            required
          />
          <CustomTextarea
            label={t("description")}
            id="dept-desc"
            value={formData.description}
            onChange={(e) => handleFieldChange("description", e.target.value)}
          />
          <Button type="submit" disabled={loading} className="w-full">
            {loading
              ? tCommon("loading")
              : isEditing
                ? tCommon("save_changes")
                : tCommon("create")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
