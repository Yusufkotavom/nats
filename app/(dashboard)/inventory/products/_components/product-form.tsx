"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { useState } from "react";
import { createProduct, updateProduct } from "../actions";
import { ProductFormData } from "../../types";
import { Category, Unit, TaxRate } from "@/prisma/generated/prisma/browser";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { PriceHistory } from "./price-history";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAlert } from "@/hooks/use-alert";
import { SuperJSON } from "@/lib/superjson";
import { ProductFormState } from "./form-types";
import { GeneralSection } from "./form-sections/general-section";
import { PricingSection } from "./form-sections/pricing-section";
import { ImageSection } from "./form-sections/image-section";

interface ProductFormProps {
  product?: ProductFormData | any;
  categories: Category[];
  units: Unit[];
  taxRates: TaxRate[];
  readonly?: boolean;
}

export function ProductForm({
  product: initialProduct,
  categories,
  units,
  taxRates,
  readonly = false,
}: ProductFormProps) {
  const product =
    initialProduct && (initialProduct as any).json
      ? (SuperJSON.deserialize(initialProduct) as ProductFormData)
      : (initialProduct as ProductFormData | undefined);

  const router = useRouter();
  const alert = useAlert();
  const [isLoading, setIsLoading] = useState(false);
  const isEditing = !!product;

  // Fully controlled form state
  const [formData, setFormData] = useState<ProductFormState>({
    sku: product?.sku || "",
    name: product?.name || "",
    description: product?.description || "",
    categoryId: product?.categoryId || "",
    price: product?.price?.toString() || "",
    cost: product?.cost?.toString() || "",
    minStock: product?.minStock || 0,
    isActive: product?.isActive ?? true,
    baseUnitId: product?.baseUnitId || "",
    purchaseUnitId: product?.purchaseUnitId || "",
    purchaseConversionFactor:
      product?.purchaseConversionFactor?.toString() || 1,
    salesUnitId: product?.salesUnitId || "",
    salesConversionFactor: product?.salesConversionFactor?.toString() || 1,
    image: product?.image || "",
    taxRateId: product?.taxRateId || "",
  });

  const handleInputChange = (
    field: string,
    value: string | number | boolean | null,
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);

    // Validation
    const purchaseFactor = formData.purchaseConversionFactor;
    const salesFactor = formData.salesConversionFactor;

    if (!formData.baseUnitId) {
      await alert({ title: "Error", description: "Base Unit is required" });
      setIsLoading(false);
      return;
    }

    if (Number(purchaseFactor) < 0) {
      await alert({
        title: "Error",
        description: "Purchase conversion factor must be positive",
      });
      setIsLoading(false);
      return;
    }

    if (Number(salesFactor) < 0) {
      await alert({
        title: "Error",
        description: "Sales conversion factor must be positive",
      });
      setIsLoading(false);
      return;
    }

    const priceValue = formData.price;
    const costValue = formData.cost;

    const data = {
      sku: formData.sku,
      name: formData.name,
      description: formData.description,
      image: formData.image,
      categoryId: formData.categoryId || null,
      price: priceValue.toString(),
      cost: costValue.toString(),
      minStock: Number(formData.minStock),
      isActive: formData.isActive,
      baseUnitId: formData.baseUnitId || null,
      purchaseUnitId: formData.purchaseUnitId || null,
      purchaseConversionFactor: purchaseFactor?.toString() || 1,
      salesUnitId: formData.salesUnitId || null,
      salesConversionFactor: salesFactor?.toString() || 1,
      taxRateId: formData.taxRateId || null,
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
    <div className="w-full mx-auto p-4">
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
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="pricing">Pricing & Inventory</TabsTrigger>
            <TabsTrigger value="image">Product Image</TabsTrigger>
          </TabsList>

          <Card>
            <CardContent className="pt-6">
              <TabsContent value="general" className="mt-0">
                <GeneralSection
                  formData={formData}
                  handleInputChange={handleInputChange}
                  categories={categories}
                  readonly={readonly}
                />
              </TabsContent>

              <TabsContent value="pricing" className="mt-0">
                <PricingSection
                  formData={formData}
                  handleInputChange={handleInputChange}
                  units={units}
                  taxRates={taxRates}
                  readonly={readonly}
                />
              </TabsContent>

              <TabsContent value="image" className="mt-0">
                <ImageSection
                  formData={formData}
                  handleInputChange={handleInputChange}
                  readonly={readonly}
                />
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
