import { CustomInput } from "@/components/ui/custom-input";
import { CustomSelect } from "@/components/ui/custom-select";
import { CustomTextarea } from "@/components/ui/custom-textarea";
import { SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Category } from "@/prisma/generated/prisma/browser";
import { ProductFormState } from "../form-types";
import { CategoryDialog } from "@/app/[locale]/(dashboard)/inventory/categories/_components/category-dialog";

interface GeneralSectionProps {
  formData: ProductFormState;
  handleInputChange: (
    field: string,
    value: string | number | boolean | null
  ) => void;
  categories: Category[];
  onCategoryCreated?: (category: Category) => void;
  readonly?: boolean;
}

export function GeneralSection({
  formData,
  handleInputChange,
  categories,
  onCategoryCreated,
  readonly = false,
}: GeneralSectionProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <CustomInput
          label="SKU"
          id="sku"
          name="sku"
          value={formData.sku}
          onChange={(e) => handleInputChange("sku", e.target.value)}
          required
          disabled={readonly}
          containerClassName="grid gap-2"
        />
        <CustomInput
          label="Name"
          id="name"
          name="name"
          value={formData.name}
          onChange={(e) => handleInputChange("name", e.target.value)}
          required
          disabled={readonly}
          containerClassName="grid gap-2"
        />
      </div>

      <CustomTextarea
        label="Description"
        id="description"
        name="description"
        value={formData.description}
        onChange={(e) => handleInputChange("description", e.target.value)}
        disabled={readonly}
        containerClassName="grid gap-2"
      />

      <div className="grid grid-cols-1 gap-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-end">
          <CustomSelect
            label="Category"
            name="categoryId"
            value={formData.categoryId}
            onValueChange={(val) => handleInputChange("categoryId", val)}
            disabled={readonly}
            placeholder="Select category"
            containerClassName="grid gap-2 w-full"
          >
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </CustomSelect>
          {!readonly && (
            <CategoryDialog
              onSuccess={(category) => {
                if (category && onCategoryCreated) {
                  onCategoryCreated(category);
                }
              }}
              trigger={
                <Button type="button" variant="outline" className="md:mb-0">
                  <Plus className="mr-2 h-4 w-4" /> Add Category
                </Button>
              }
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 rounded-md border p-3 md:grid-cols-4">
        <div className="flex items-center space-x-2">
          <Switch
            id="isActive"
            name="isActive"
            checked={formData.isActive}
            onCheckedChange={(val) => handleInputChange("isActive", val)}
            disabled={readonly}
          />
          <Label htmlFor="isActive">Active Status</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="showInPos"
            name="showInPos"
            checked={formData.showInPos}
            onCheckedChange={(val) => handleInputChange("showInPos", val)}
            disabled={readonly}
          />
          <Label htmlFor="showInPos">Show In POS</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="isService"
            name="isService"
            checked={formData.isService}
            onCheckedChange={(val) => handleInputChange("isService", val)}
            disabled={readonly}
          />
          <Label htmlFor="isService">Service Item</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="manageStock"
            name="manageStock"
            checked={formData.manageStock}
            onCheckedChange={(val) => handleInputChange("manageStock", val)}
            disabled={readonly}
          />
          <Label htmlFor="manageStock">Manage Stock</Label>
        </div>
      </div>
    </div>
  );
}
