"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil } from "lucide-react";
import { useState } from "react";
import { createProduct, updateProduct } from "../actions";
import { Switch } from "@/components/ui/switch";
import { ProductFormData } from "../../types";
import { Category, Unit } from "@/prisma/generated/prisma/browser";

interface ProductDialogProps {
  product?: ProductFormData;
  categories: Category[];
  units: Unit[];
  trigger?: React.ReactNode;
}

export function ProductDialog({
  product,
  categories,
  units,
  trigger,
}: ProductDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const isEditing = !!product;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);

    // Validation
    const purchaseFactor = Number(formData.get("purchaseConversionFactor"));
    const salesFactor = Number(formData.get("salesConversionFactor"));
    const baseUnitId = formData.get("baseUnitId");

    if (!baseUnitId) {
      alert("Base Unit is required");
      setIsLoading(false);
      return;
    }

    if (purchaseFactor < 0) {
      alert("Purchase conversion factor must be positive");
      setIsLoading(false);
      return;
    }

    if (salesFactor < 0) {
      alert("Sales conversion factor must be positive");
      setIsLoading(false);
      return;
    }

    const data = {
      sku: formData.get("sku") as string,
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      categoryId: (formData.get("categoryId") as string) || null,
      price: Number(formData.get("price")),
      cost: Number(formData.get("cost")),
      minStock: Number(formData.get("minStock")),
      isActive: formData.get("isActive") === "on",
      baseUnitId: (formData.get("baseUnitId") as string) || null,
      purchaseUnitId: (formData.get("purchaseUnitId") as string) || null,
      purchaseConversionFactor: purchaseFactor || 1,
      salesUnitId: (formData.get("salesUnitId") as string) || null,
      salesConversionFactor: salesFactor || 1,
    };

    try {
      if (isEditing) {
        await updateProduct(product.id, data);
      } else {
        await createProduct(data);
      }
      setOpen(false);
    } catch (error) {
      console.error(error);
      alert("Failed to save product");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Add Product
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Product" : "Add Product"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Make changes to the product here."
              : "Add a new product to your catalog."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="sku" className="text-right">
              SKU
            </Label>
            <Input
              id="sku"
              name="sku"
              defaultValue={product?.sku}
              className="col-span-3"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              name="name"
              defaultValue={product?.name}
              className="col-span-3"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="category" className="text-right">
              Category
            </Label>
            <div className="col-span-3 flex gap-2">
              <Select
                name="categoryId"
                defaultValue={product?.categoryId || undefined}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="baseUnitId" className="text-right">
              Base Unit
            </Label>
            <div className="col-span-3">
              <Select
                name="baseUnitId"
                defaultValue={product?.baseUnitId || undefined}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select base unit (e.g. Pcs)" />
                </SelectTrigger>
                <SelectContent>
                  {units.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} ({u.symbol})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="col-span-4 border-t my-2 pt-2">
            <h4 className="mb-2 font-medium text-sm">
              Purchase Unit Conversion
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-2 block text-xs">Purchase Unit</Label>
                <Select
                  name="purchaseUnitId"
                  defaultValue={product?.purchaseUnitId || undefined}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select unit (e.g. Box)" />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name} ({u.symbol})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-2 block text-xs">
                  Conversion Factor (1 Pur = ? Base)
                </Label>
                <Input
                  name="purchaseConversionFactor"
                  type="number"
                  step="0.0001"
                  defaultValue={
                    product?.purchaseConversionFactor
                      ? Number(product.purchaseConversionFactor)
                      : 1
                  }
                />
              </div>
            </div>
          </div>

          <div className="col-span-4 border-t my-2 pt-2">
            <h4 className="mb-2 font-medium text-sm">Sales Unit Conversion</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-2 block text-xs">Sales Unit</Label>
                <Select
                  name="salesUnitId"
                  defaultValue={product?.salesUnitId || undefined}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select unit (e.g. Pcs)" />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name} ({u.symbol})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-2 block text-xs">
                  Conversion Factor (1 Sale = ? Base)
                </Label>
                <Input
                  name="salesConversionFactor"
                  type="number"
                  step="0.0001"
                  defaultValue={
                    product?.salesConversionFactor
                      ? Number(product.salesConversionFactor)
                      : 1
                  }
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4 border-t pt-4">
            <Label htmlFor="price" className="text-right">
              Price
            </Label>
            <Input
              id="price"
              name="price"
              type="number"
              step="0.01"
              defaultValue={product?.price ? Number(product.price) : 0}
              className="col-span-3"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="cost" className="text-right">
              Cost
            </Label>
            <Input
              id="cost"
              name="cost"
              type="number"
              step="0.01"
              defaultValue={product?.cost ? Number(product.cost) : 0}
              className="col-span-3"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="price" className="text-right">
              Min. Stock
            </Label>
            <Input
              id="minStock"
              name="minStock"
              type="number"
              step="0.01"
              defaultValue={product?.minStock ? Number(product.minStock) : 0}
              className="col-span-3"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">
              Desc
            </Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={product?.description || ""}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="isActive" className="text-right">
              Active
            </Label>
            <Switch
              id="isActive"
              name="isActive"
              defaultChecked={product?.isActive ?? true}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
