"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createProject, updateProject } from "@/app/[locale]/(dashboard)/general/actions";
import { Button } from "@/components/ui/button";
import { CustomInput } from "@/components/ui/custom-input";
import { CustomTextarea } from "@/components/ui/custom-textarea";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Project } from "@/prisma/generated/prisma/browser";
import { useQueryClient } from "@tanstack/react-query";

interface ProjectFormProps {
  project?: Project;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export function ProjectForm({ project, open: externalOpen, onOpenChange: externalOnOpenChange, trigger }: ProjectFormProps) {
  const t = useTranslations("General.Projects");
  const tCommon = useTranslations("Common");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [internalOpen, setInternalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: project?.name || "",
    code: project?.code || "",
    description: project?.description || "",
    status: (project?.status as any) || "ACTIVE",
  });

  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = externalOnOpenChange !== undefined ? externalOnOpenChange : setInternalOpen;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    if (!formData.name || !formData.code) {
      toast({ title: tCommon("error"), description: t("create_error_required"), variant: "destructive" });
      setLoading(false);
      return;
    }

    try {
      const result = project 
        ? await updateProject(project.id, formData)
        : await createProject(formData);

      if (result.success) {
        toast({ title: project ? t("project_updated") : t("project_created") });
        setOpen(false);
        if (!project) {
          setFormData({ name: "", code: "", description: "", status: "ACTIVE" });
        }
        queryClient.invalidateQueries({ queryKey: ["projects"] });
      } else {
        toast({ title: tCommon("error"), description: result.error || (project ? t("update_error") : t("create_error")), variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: tCommon("error"), description: project ? t("update_error") : t("create_error"), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      {!trigger && !project && (
        <DialogTrigger asChild>
          <Button><Plus className="mr-2 h-4 w-4" /> {t("new_project")}</Button>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{project ? t("edit_project") : t("create_project")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <CustomInput
            label={t("name")}
            id="proj-name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <CustomInput
            label={t("code")}
            id="proj-code"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
            required
          />
          <CustomTextarea
            label={t("description")}
            id="proj-desc"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? tCommon("loading") : (project ? tCommon("save") : tCommon("create"))}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Keep the old name for backward compatibility or export as default
export { ProjectForm as CreateProjectForm };
