
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBudget, updateBudget } from "@/app/(dashboard)/budgeting/actions";
import { Department, Project, Account } from "@/prisma/generated/prisma/browser";
import { Button } from "@/components/ui/button";
import { CustomInput } from "@/components/ui/custom-input";
import { CustomTextarea } from "@/components/ui/custom-textarea";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  PageFormLayout,
  PageFormHeader,
  PageFormTitle,
  PageFormActions,
  PageFormContent,
} from "@/components/layout/page/form-layout";
import { Plus, Trash2, Save, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { generateId, formatCurrency } from "@/lib/utils";

interface BudgetItemData {
  id?: string;
  accountId: string;
  totalAmount: number;
  january: number;
  february: number;
  march: number;
  april: number;
  may: number;
  june: number;
  july: number;
  august: number;
  september: number;
  october: number;
  november: number;
  december: number;
}

interface BudgetFormData {
  id?: string;
  name: string;
  fiscalYear: number;
  description?: string;
  departmentId?: string | null;
  projectId?: string | null;
  items: BudgetItemData[];
}

interface BudgetFormProps {
  departments: Department[];
  projects: Project[];
  accounts: Account[];
  initialData?: any;
  isEdit?: boolean;
}

export function BudgetForm({ departments, projects, accounts, initialData, isEdit }: BudgetFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<BudgetFormData>(() => {
    if (initialData) {
      return {
        ...initialData,
        departmentId: initialData.departmentId || null,
        projectId: initialData.projectId || null,
        items: initialData.items?.map((item: any) => ({
          ...item,
          totalAmount: Number(item.totalAmount),
          january: Number(item.january),
          february: Number(item.february),
          march: Number(item.march),
          april: Number(item.april),
          may: Number(item.may),
          june: Number(item.june),
          july: Number(item.july),
          august: Number(item.august),
          september: Number(item.september),
          october: Number(item.october),
          november: Number(item.november),
          december: Number(item.december),
        })) || [],
      };
    }
    return {
      name: "",
      fiscalYear: new Date().getFullYear() + 1,
      description: "",
      departmentId: null,
      projectId: null,
      items: [],
    };
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!formData.name) {
      toast({ title: "Error", description: "Budget name is required", variant: "destructive" });
      setLoading(false);
      return;
    }

    const dataToSubmit = {
      ...formData,
      departmentId: formData.departmentId || undefined,
      projectId: formData.projectId || undefined,
    };

    try {
      if (isEdit && formData.id) {
        await updateBudget(formData.id, dataToSubmit);
        toast({ title: "Budget updated", description: "Your budget has been updated successfully." });
      } else {
        await createBudget(dataToSubmit);
        toast({ title: "Budget created", description: "Your budget has been created successfully." });
      }
      router.push("/budgeting");
      router.refresh();
    } catch (error: any) {
      console.error(error);
      toast({ title: "Error", description: error.message || "Something went wrong", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const updateItem = (index: number, field: keyof BudgetItemData, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };

    // Recalculate total if a month changed
    if (field !== "accountId" && field !== "totalAmount" && field !== "id") {
      const item = newItems[index];
      const total =
        (Number(item.january) || 0) +
        (Number(item.february) || 0) +
        (Number(item.march) || 0) +
        (Number(item.april) || 0) +
        (Number(item.may) || 0) +
        (Number(item.june) || 0) +
        (Number(item.july) || 0) +
        (Number(item.august) || 0) +
        (Number(item.september) || 0) +
        (Number(item.october) || 0) +
        (Number(item.november) || 0) +
        (Number(item.december) || 0);
      newItems[index].totalAmount = total;
    }

    setFormData({ ...formData, items: newItems });
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          id: generateId(),
          accountId: "",
          totalAmount: 0,
          january: 0, february: 0, march: 0, april: 0, may: 0, june: 0,
          july: 0, august: 0, september: 0, october: 0, november: 0, december: 0
        },
      ],
    });
  };

  const removeItem = (index: number) => {
    const newItems = [...formData.items];
    newItems.splice(index, 1);
    setFormData({ ...formData, items: newItems });
  };

  return (
    <PageFormLayout>
      <PageFormHeader>
        <PageFormTitle>
          {isEdit ? "Edit Budget" : "Create New Budget"}
        </PageFormTitle>
        <PageFormActions>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={loading}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={loading}
          >
            <Save className="mr-2 h-4 w-4" />
            {loading ? "Saving..." : "Save Budget"}
          </Button>
        </PageFormActions>
      </PageFormHeader>

      <PageFormContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CustomInput
              label="Budget Name"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. 2026 Marketing Budget"
              required
            />
            <CustomInput
              label="Fiscal Year"
              id="fiscalYear"
              type="number"
              value={formData.fiscalYear}
              onChange={(e) => setFormData({ ...formData, fiscalYear: parseInt(e.target.value) || 0 })}
              required
            />
            <div className="space-y-1">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Department (Optional)</label>
              <SearchableSelect
                value={formData.departmentId || ""}
                onValueChange={(val) => setFormData({ ...formData, departmentId: val })}
                options={departments.map(d => ({ value: d.id, label: d.name }))}
                placeholder="Select Department"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Project (Optional)</label>
              <SearchableSelect
                value={formData.projectId || ""}
                onValueChange={(val) => setFormData({ ...formData, projectId: val })}
                options={projects.map(p => ({ value: p.id, label: p.name }))}
                placeholder="Select Project"
              />
            </div>
            <div className="col-span-1 md:col-span-2">
              <CustomTextarea
                label="Description"
                id="description"
                value={formData.description || ""}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Budget description..."
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Budget Items</h3>
              <Button type="button" onClick={addItem} variant="outline" size="sm">
                <Plus className="mr-2 h-4 w-4" /> Add Item
              </Button>
            </div>

            <div className="space-y-4">
              {formData.items.length === 0 ? (
                <div className="text-center text-muted-foreground py-12 border rounded-md border-dashed">
                  No items added. Click "Add Item" to start planning.
                </div>
              ) : (
                formData.items.map((item, index) => (
                  <div key={item.id || index} className="border rounded-md p-4 space-y-4 relative bg-card text-card-foreground shadow-sm">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 text-destructive"
                      onClick={() => removeItem(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-sm font-medium">Account</label>
                        <SearchableSelect
                          value={item.accountId}
                          onValueChange={(val) => updateItem(index, "accountId", val || "")}
                          options={accounts.map(acc => ({ value: acc.id, label: `${acc.code} - ${acc.name}` }))}
                          placeholder="Select Account"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium">Total</label>
                        <div className="text-lg font-bold py-2">{formatCurrency(item.totalAmount)}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                      {['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'].map((month) => (
                        <div key={month} className="space-y-1">
                          <label className="text-xs font-medium capitalize">{month.substring(0, 3)}</label>
                          <CurrencyInput
                            value={item[month as keyof BudgetItemData] as number}
                            onChange={(val) => updateItem(index, month as keyof BudgetItemData, val)}
                            className="h-8 text-sm"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </form>
      </PageFormContent>
    </PageFormLayout>
  );
}
