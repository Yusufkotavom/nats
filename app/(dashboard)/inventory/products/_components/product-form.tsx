"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { createProduct, updateProduct } from "../actions";
import { Switch } from "@/components/ui/switch";
import { ProductFormData } from "../../types";
import { Category, Unit } from "@/prisma/generated/prisma/browser";
import { useRouter } from "next/navigation";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { PriceHistory } from "./price-history";

interface ProductFormProps {
  product?: ProductFormData;
  categories: Category[];
  units: Unit[];
  readonly?: boolean;
}

export function ProductForm({
  product,
  categories,
  units,
  readonly = false,
}: ProductFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const isEditing = !!product;

  // State for controlled CurrencyInputs
  const [price, setPrice] = useState<string | number>(product?.price || "");
  const [cost, setCost] = useState<string | number>(product?.cost || "");

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

    const priceValue = Number(price);
    const costValue = Number(cost);

    const data = {
      sku: formData.get("sku") as string,
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      categoryId: (formData.get("categoryId") as string) || null,
      price: priceValue,
      cost: costValue,
      minStock: Number(formData.get("minStock")),
      isActive: formData.get("isActive") === "on",
      baseUnitId: (formData.get("baseUnitId") as string) || null,
      purchaseUnitId: (formData.get("purchaseUnitId") as string) || null,
      purchaseConversionFactor: purchaseFactor || 1,
      salesUnitId: (formData.get("salesUnitId") as string) || null,
      salesConversionFactor: salesFactor || 1,
    };

    try {
      let result;
      if (isEditing && product) {
        result = await updateProduct(product.id, data);
      } else {
        result = await createProduct(data);
      }

      if (result.success) {
        router.push("/inventory/products");
        router.refresh();
      } else {
        alert(result.error || "Something went wrong");
      }
    } catch (error) {
      console.error(error);
      alert("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full mx-auto">
      <div className="mb-4">
        <h2 className="text-lg font-bold tracking-tight">
          {readonly
            ? "Product Details"
            : isEditing
            ? "Edit Product"
            : "Create Product"}
        </h2>
      </div>

      <Card>
        <form onSubmit={handleSubmit}>
          <fieldset className="group">
            <CardContent className="grid gap-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="sku">SKU</Label>
                  <Input
                    id="sku"
                    name="sku"
                    defaultValue={product?.sku}
                    required
                    disabled={readonly}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={product?.name}
                    required
                    disabled={readonly}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  defaultValue={product?.description || ""}
                  disabled={readonly}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="categoryId">Category</Label>
                  <Select
                    name="categoryId"
                    defaultValue={product?.categoryId || undefined}
                    disabled={readonly}
                  >
                    <SelectTrigger className="w-full">
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
                <div className="flex items-center space-x-2 pt-8">
                  <Switch
                    id="isActive"
                    name="isActive"
                    defaultChecked={product?.isActive ?? true}
                    disabled={readonly}
                  />
                  <Label htmlFor="isActive">Active Status</Label>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="price">Selling Price</Label>
                  <CurrencyInput
                    id="price"
                    name="price"
                    value={price}
                    onChange={(val) => setPrice(val)}
                    placeholder="0.00"
                    required
                    disabled={readonly}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="cost">Cost Price</Label>
                  <CurrencyInput
                    id="cost"
                    name="cost"
                    value={cost}
                    onChange={(val) => setCost(val)}
                    placeholder="0.00"
                    required
                    disabled={readonly}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="minStock">Min Stock Level</Label>
                  <Input
                    id="minStock"
                    name="minStock"
                    type="number"
                    min="0"
                    defaultValue={product?.minStock}
                    required
                    disabled={readonly}
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="mb-4 text-lg font-medium">Unit Configuration</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="baseUnitId">Base Unit</Label>
                    <Select
                      name="baseUnitId"
                      defaultValue={product?.baseUnitId || undefined}
                      disabled={readonly}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select base unit" />
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

                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="purchaseUnitId">Purchase Unit</Label>
                    <Select
                      name="purchaseUnitId"
                      defaultValue={product?.purchaseUnitId || undefined}
                      disabled={readonly}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Same as Base Unit" />
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
                  <div className="grid gap-2">
                    <Label htmlFor="purchaseConversionFactor">
                      Purchase Conversion Factor
                      <span className="text-xs text-muted-foreground">
                        (1 Purchase Unit = X Base Units)
                      </span>
                    </Label>
                    <Input
                      id="purchaseConversionFactor"
                      name="purchaseConversionFactor"
                      type="number"
                      step="0.0001"
                      min="0"
                      defaultValue={
                        product?.purchaseConversionFactor?.toString() || "1"
                      }
                      disabled={readonly}
                    />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="salesUnitId">Sales Unit</Label>
                    <Select
                      name="salesUnitId"
                      defaultValue={product?.salesUnitId || undefined}
                      disabled={readonly}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Same as Base Unit" />
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
                  <div className="grid gap-2">
                    <Label htmlFor="salesConversionFactor">
                      Sales Conversion Factor
                      <span className="text-xs text-muted-foreground">
                        (1 Sales Unit = X Base Units)
                      </span>
                    </Label>
                    <Input
                      id="salesConversionFactor"
                      name="salesConversionFactor"
                      type="number"
                      step="0.0001"
                      min="0"
                      defaultValue={
                        product?.salesConversionFactor?.toString() || "1"
                      }
                      disabled={readonly}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end space-x-2 mt-3">
              <Button
                variant="outline"
                type="button"
                disabled={isLoading}
                onClick={() => router.back()}
              >
                {readonly ? "Back" : "Cancel"}
              </Button>
              {!readonly && (
                <Button type="submit" disabled={isLoading}>
                  {isLoading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {isEditing ? "Save Changes" : "Create Product"}
                </Button>
              )}
            </CardFooter>
          </fieldset>
        </form>
      </Card>

      {isEditing && product?.priceHistory && (
        <div className="mt-6">
          <PriceHistory history={product.priceHistory} />
        </div>
      )}
    </div>
  );
}
