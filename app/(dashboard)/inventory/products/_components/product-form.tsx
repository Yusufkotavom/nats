"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { CurrencyInput } from "@/components/ui/currency-input";
import { CustomInput } from "@/components/ui/custom-input";
import { CustomSelect } from "@/components/ui/custom-select";
import { CustomTextarea } from "@/components/ui/custom-textarea";
import { SelectItem } from "@/components/ui/select";
import { useState } from "react";
import { createProduct, updateProduct } from "../actions";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ProductFormData } from "../../types";
import { Category, Unit, Account } from "@/prisma/generated/prisma/browser";
import { useRouter } from "next/navigation";
import { Loader2, Upload, ImageIcon } from "lucide-react";
import { PriceHistory } from "./price-history";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { uploadFile } from "@/app/(dashboard)/general/files/actions";
import Image from "next/image";

import { useAlert } from "@/hooks/use-alert";

interface ProductFormProps {
  product?: ProductFormData;
  categories: Category[];
  units: Unit[];
  accounts?: Account[];
  readonly?: boolean;
}

export function ProductForm({
  product,
  categories,
  units,
  accounts = [],
  readonly = false,
}: ProductFormProps) {
  const router = useRouter();
  const alert = useAlert();
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const isEditing = !!product;

  // Fully controlled form state
  const [formData, setFormData] = useState({
    sku: product?.sku || "",
    name: product?.name || "",
    description: product?.description || "",
    categoryId: product?.categoryId || "",
    price: product?.price || "",
    cost: product?.cost || "",
    minStock: product?.minStock || 0,
    isActive: product?.isActive ?? true,
    baseUnitId: product?.baseUnitId || "",
    purchaseUnitId: product?.purchaseUnitId || "",
    purchaseConversionFactor: product?.purchaseConversionFactor || 1,
    salesUnitId: product?.salesUnitId || "",
    salesConversionFactor: product?.salesConversionFactor || 1,
    image: product?.image || "",
    inventoryAccountId: product?.inventoryAccountId || "",
    cogsAccountId: product?.cogsAccountId || "",
    salesAccountId: product?.salesAccountId || "",
    payableAccountId: product?.payableAccountId || "",
    receivableAccountId: product?.receivableAccountId || "",
  });

  const handleInputChange = (
    field: string,
    value: string | number | boolean | null
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const uploadData = new FormData();
    uploadData.append("file", file);

    try {
      const result = await uploadFile(uploadData);
      if (result.success && result.file) {
        handleInputChange("image", result.file.url);
      } else {
        await alert({
          title: "Error",
          description: result.error || "Failed to upload file",
        });
      }
    } catch (error) {
      console.error("Upload error:", error);
      await alert({
        title: "Error",
        description: "Failed to upload file",
      });
    } finally {
      setIsUploading(false);
      // Reset input
      e.target.value = "";
    }
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);

    // Validation
    const purchaseFactor = Number(formData.purchaseConversionFactor);
    const salesFactor = Number(formData.salesConversionFactor);

    if (!formData.baseUnitId) {
      await alert({ title: "Error", description: "Base Unit is required" });
      setIsLoading(false);
      return;
    }

    if (purchaseFactor < 0) {
      await alert({
        title: "Error",
        description: "Purchase conversion factor must be positive",
      });
      setIsLoading(false);
      return;
    }

    if (salesFactor < 0) {
      await alert({
        title: "Error",
        description: "Sales conversion factor must be positive",
      });
      setIsLoading(false);
      return;
    }

    const priceValue = Number(formData.price);
    const costValue = Number(formData.cost);

    const data = {
      sku: formData.sku,
      name: formData.name,
      description: formData.description,
      image: formData.image,
      categoryId: formData.categoryId || null,
      price: priceValue,
      cost: costValue,
      minStock: Number(formData.minStock),
      isActive: formData.isActive,
      baseUnitId: formData.baseUnitId || null,
      purchaseUnitId: formData.purchaseUnitId || null,
      purchaseConversionFactor: purchaseFactor || 1,
      salesUnitId: formData.salesUnitId || null,
      salesConversionFactor: salesFactor || 1,
      inventoryAccountId: formData.inventoryAccountId || null,
      cogsAccountId: formData.cogsAccountId || null,
      salesAccountId: formData.salesAccountId || null,
      payableAccountId: formData.payableAccountId || null,
      receivableAccountId: formData.receivableAccountId || null,
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
        await alert({
          title: "Error",
          description: result.error || "Something went wrong",
        });
      }
    } catch (error) {
      console.error(error);
      await alert({
        title: "Error",
        description: "An unexpected error occurred",
      });
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

      <form onSubmit={handleSubmit}>
        <Tabs defaultValue="metadata" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="pricing">Pricing & Inventory</TabsTrigger>
            <TabsTrigger value="account">Accounts</TabsTrigger>
            <TabsTrigger value="image">Product Image</TabsTrigger>
          </TabsList>

          <Card>
            <CardContent className="pt-6">
              <TabsContent value="general" className="mt-0 space-y-8">
                {/* General Section */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
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
                      onChange={(e) =>
                        handleInputChange("name", e.target.value)
                      }
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
                    onChange={(e) =>
                      handleInputChange("description", e.target.value)
                    }
                    disabled={readonly}
                    containerClassName="grid gap-2"
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <CustomSelect
                      label="Category"
                      name="categoryId"
                      value={formData.categoryId}
                      onValueChange={(val) =>
                        handleInputChange("categoryId", val)
                      }
                      disabled={readonly}
                      placeholder="Select category"
                      containerClassName="grid gap-2"
                    >
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </CustomSelect>
                    <div className="flex items-center space-x-2 pt-8">
                      <Switch
                        id="isActive"
                        name="isActive"
                        checked={formData.isActive}
                        onCheckedChange={(val) =>
                          handleInputChange("isActive", val)
                        }
                        disabled={readonly}
                      />
                      <Label htmlFor="isActive">Active Status</Label>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="pricing" className="mt-0 space-y-8">
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="price">Selling Price</Label>
                      <CurrencyInput
                        id="price"
                        name="price"
                        value={formData.price}
                        onChange={(val) => handleInputChange("price", val)}
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
                        value={formData.cost}
                        onChange={(val) => handleInputChange("cost", val)}
                        placeholder="0.00"
                        required
                        disabled={readonly}
                      />
                    </div>
                    <CustomInput
                      label="Min Stock Level"
                      id="minStock"
                      name="minStock"
                      type="number"
                      min="0"
                      value={formData.minStock}
                      onChange={(e) =>
                        handleInputChange("minStock", e.target.value)
                      }
                      required
                      disabled={readonly}
                      containerClassName="grid gap-2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <CustomSelect
                    label="Base Unit"
                    name="baseUnitId"
                    value={formData.baseUnitId}
                    onValueChange={(val) =>
                      handleInputChange("baseUnitId", val)
                    }
                    disabled={readonly}
                    placeholder="Select base unit"
                    containerClassName="grid gap-2"
                  >
                    {units?.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name} ({u.symbol})
                      </SelectItem>
                    ))}
                  </CustomSelect>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <CustomSelect
                    label="Purchase Unit"
                    name="purchaseUnitId"
                    value={formData.purchaseUnitId}
                    onValueChange={(val) =>
                      handleInputChange("purchaseUnitId", val)
                    }
                    disabled={readonly}
                    placeholder="Same as Base Unit"
                    containerClassName="grid gap-2"
                  >
                    {units?.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name} ({u.symbol})
                      </SelectItem>
                    ))}
                  </CustomSelect>
                  <CustomInput
                    label={
                      <>
                        Purchase Conversion Factor
                        <span className="text-xs text-muted-foreground ml-1">
                          (1 Purchase Unit = X Base Units)
                        </span>
                      </>
                    }
                    id="purchaseConversionFactor"
                    name="purchaseConversionFactor"
                    type="number"
                    step="0.0001"
                    min="0"
                    value={formData.purchaseConversionFactor}
                    onChange={(e) =>
                      handleInputChange(
                        "purchaseConversionFactor",
                        e.target.value
                      )
                    }
                    disabled={readonly}
                    containerClassName="grid gap-2"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <CustomSelect
                    label="Sales Unit"
                    name="salesUnitId"
                    value={formData.salesUnitId}
                    onValueChange={(val) =>
                      handleInputChange("salesUnitId", val)
                    }
                    disabled={readonly}
                    placeholder="Same as Base Unit"
                    containerClassName="grid gap-2"
                  >
                    {units?.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name} ({u.symbol})
                      </SelectItem>
                    ))}
                  </CustomSelect>
                  <CustomInput
                    label={
                      <>
                        Sales Conversion Factor
                        <span className="text-xs text-muted-foreground ml-1">
                          (1 Sales Unit = X Base Units)
                        </span>
                      </>
                    }
                    id="salesConversionFactor"
                    name="salesConversionFactor"
                    type="number"
                    step="0.0001"
                    min="0"
                    value={formData.salesConversionFactor}
                    onChange={(e) =>
                      handleInputChange("salesConversionFactor", e.target.value)
                    }
                    disabled={readonly}
                    containerClassName="grid gap-2"
                  />
                </div>
              </TabsContent>

              <TabsContent value="account" className="mt-0 space-y-8">
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <CustomSelect
                      label="Inventory Asset Account"
                      name="inventoryAccountId"
                      value={formData.inventoryAccountId}
                      onValueChange={(val) =>
                        handleInputChange("inventoryAccountId", val)
                      }
                      disabled={readonly}
                      placeholder="Select asset account"
                      containerClassName="grid gap-2"
                    >
                      {accounts
                        .filter((a) => a.type === "asset")
                        .map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.code} - {a.name}
                          </SelectItem>
                        ))}
                    </CustomSelect>
                    <p className="text-xs text-muted-foreground">
                      Asset account used to track the value of this product in
                      stock.
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <CustomSelect
                      label="Expense / COGS Account"
                      name="cogsAccountId"
                      value={formData.cogsAccountId}
                      onValueChange={(val) =>
                        handleInputChange("cogsAccountId", val)
                      }
                      disabled={readonly}
                      placeholder="Select expense account"
                      containerClassName="grid gap-2"
                    >
                      {accounts
                        .filter((a) => a.type === "expense")
                        .map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.code} - {a.name}
                          </SelectItem>
                        ))}
                    </CustomSelect>
                    <p className="text-xs text-muted-foreground">
                      Expense account used when this product is sold (Cost of
                      Goods Sold).
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <CustomSelect
                      label="Income / Sales Account"
                      name="salesAccountId"
                      value={formData.salesAccountId}
                      onValueChange={(val) =>
                        handleInputChange("salesAccountId", val)
                      }
                      disabled={readonly}
                      placeholder="Select revenue account"
                      containerClassName="grid gap-2"
                    >
                      {accounts
                        .filter((a) => a.type === "revenue")
                        .map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.code} - {a.name}
                          </SelectItem>
                        ))}
                    </CustomSelect>
                    <p className="text-xs text-muted-foreground">
                      Revenue account used when this product is sold.
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <CustomSelect
                      label="Payable Account"
                      name="payableAccountId"
                      value={formData.payableAccountId}
                      onValueChange={(val) =>
                        handleInputChange("payableAccountId", val)
                      }
                      disabled={readonly}
                      placeholder="Select payable account"
                      containerClassName="grid gap-2"
                    >
                      {accounts
                        .filter((a) => a.type === "liability")
                        .map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.code} - {a.name}
                          </SelectItem>
                        ))}
                    </CustomSelect>
                    <p className="text-xs text-muted-foreground">
                      Liability account for purchases (overrides vendor
                      default).
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <CustomSelect
                      label="Receivable Account"
                      name="receivableAccountId"
                      value={formData.receivableAccountId}
                      onValueChange={(val) =>
                        handleInputChange("receivableAccountId", val)
                      }
                      disabled={readonly}
                      placeholder="Select receivable account"
                      containerClassName="grid gap-2"
                    >
                      {accounts
                        .filter((a) => a.type === "asset")
                        .map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.code} - {a.name}
                          </SelectItem>
                        ))}
                    </CustomSelect>
                    <p className="text-xs text-muted-foreground">
                      Asset account for sales (overrides customer default).
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="image" className="mt-0 space-y-4">
                <div className="grid gap-4">
                  <div className="flex items-center gap-4">
                    <div className="relative h-40 w-40 overflow-hidden rounded-lg border bg-muted flex items-center justify-center">
                      {formData.image ? (
                        <Image
                          src={formData.image}
                          alt="Product image"
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <ImageIcon className="h-10 w-10 text-muted-foreground" />
                      )}
                    </div>
                    <div className="space-y-4 flex-1">
                      <CustomInput
                        label="Image URL"
                        id="image"
                        name="image"
                        value={formData.image}
                        onChange={(e) =>
                          handleInputChange("image", e.target.value)
                        }
                        disabled={readonly}
                        containerClassName="grid gap-2"
                        placeholder="https://example.com/image.jpg"
                      />
                      {!readonly && (
                        <div>
                          <Label htmlFor="file-upload" className="mb-2 block">
                            Or Upload Image
                          </Label>
                          <div className="flex items-center gap-2">
                            <input
                              type="file"
                              id="file-upload"
                              className="hidden"
                              accept="image/*"
                              onChange={handleFileUpload}
                              disabled={isUploading}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() =>
                                document.getElementById("file-upload")?.click()
                              }
                              disabled={isUploading}
                            >
                              {isUploading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <Upload className="mr-2 h-4 w-4" />
                              )}
                              {isUploading ? "Uploading..." : "Select File"}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>
            </CardContent>

            <CardFooter className="flex justify-end space-x-2 border-t p-6">
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
          </Card>
        </Tabs>
      </form>

      {isEditing && product?.priceHistory && (
        <div className="mt-6">
          <PriceHistory history={product.priceHistory} />
        </div>
      )}
    </div>
  );
}
