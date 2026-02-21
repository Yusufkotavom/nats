"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createDepartment } from "@/app/[locale]/(dashboard)/general/actions";
import { Button } from "@/components/ui/button";
import { CustomInput } from "@/components/ui/custom-input";
import { CustomTextarea } from "@/components/ui/custom-textarea";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";

export function CreateDepartmentForm() {
  const t = useTranslations("General.Departments");
  const tCommon = useTranslations("Common");
  const { toast } = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    isActive: true,
    description: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    if (!formData.name || !formData.code) {
      toast({ title: tCommon("error"), description: t("create_error_required"), variant: "destructive" });
      setLoading(false);
      return;
    }

    try {
      const result = await createDepartment(formData);
      if (result.success) {
        toast({ title: t("department_created") });
        setOpen(false);
        setFormData({ name: "", code: "", isActive: true, description: "" });
        router.refresh();
      } else {
        toast({ title: tCommon("error"), description: result.error || t("create_error"), variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: tCommon("error"), description: t("create_error"), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="mr-2 h-4 w-4" /> {t("new_department")}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("create_department")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <CustomInput
            label={t("name")}
            id="dept-name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <CustomInput
            label={t("code")}
            id="dept-code"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
            required
          />
          <CustomTextarea
            label={t("description")}
            id="dept-desc"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? tCommon("loading") : tCommon("create")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
