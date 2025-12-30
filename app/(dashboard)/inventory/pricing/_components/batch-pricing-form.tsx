"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { SelectItem } from "@/components/ui/select";
import { CustomInput } from "@/components/ui/custom-input";
import { CustomSelect } from "@/components/ui/custom-select";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Category } from "@/prisma/generated/prisma/browser";
import { applyBatchPricing, previewPriceChanges } from "../actions";
import { Loader2, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useFormatCurrency } from "@/hooks/use-format-currency";
import { BatchPricingInput, PricingAction, PricingScope } from "../types";

interface BatchPricingFormProps {
  categories: Category[];
}

interface PreviewData {
  totalProducts: number;
  changes: {
    id: string;
    sku: string;
    name: string;
    currentPrice: number;
    newPrice: number;
    difference: number;
    cost: number;
    margin: number;
  }[];
}
export function BatchPricingForm({ categories }: BatchPricingFormProps) {
  const [scope, setScope] = useState<PricingScope>("ALL");
  const [action, setAction] = useState<PricingAction>("PERCENTAGE_INC");
  const [isLoading, setIsLoading] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [result, setResult] = useState<{
    success: boolean;
    count?: number;
    error?: string;
  } | null>(null);
  const formatCurrency = useFormatCurrency();

  // Simple form state
  const [categoryId, setCategoryId] = useState<string>("");
  const [value, setValue] = useState<string>("");

  const handlePreview = async () => {
    if (!value) return;
    setIsLoading(true);
    setResult(null);
    try {
      const data: BatchPricingInput = {
        scope,
        categoryId: scope === "CATEGORY" ? categoryId : undefined,
        action,
        value: Number(value),
      };
      const preview = await previewPriceChanges(data);
      setPreviewData(preview);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = async () => {
    if (!value) return;
    if (
      !confirm(
        "Are you sure you want to update these prices? This action cannot be undone."
      )
    )
      return;

    setIsLoading(true);
    try {
      const data: BatchPricingInput = {
        scope,
        categoryId: scope === "CATEGORY" ? categoryId : undefined,
        action,
        value: Number(value),
      };
      const res = await applyBatchPricing(data);
      if (res.success) {
        setResult(res);
        setPreviewData(null);
        setValue("");
      } else {
        alert(res.error);
      }
    } catch (error) {
      console.error(error);
      alert("Failed to apply changes");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
          <CardDescription>
            Select products and pricing rules to apply.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <CustomSelect
              label="Scope"
              value={scope}
              onValueChange={(v: string) => setScope(v as PricingScope)}
              containerClassName="space-y-2"
            >
              <SelectItem value="ALL">All Products</SelectItem>
              <SelectItem value="CATEGORY">Specific Category</SelectItem>
            </CustomSelect>

            {scope === "CATEGORY" && (
              <CustomSelect
                label="Category"
                value={categoryId}
                onValueChange={setCategoryId}
                placeholder="Select category"
                containerClassName="space-y-2"
              >
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </CustomSelect>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <CustomSelect
              label="Action"
              value={action}
              onValueChange={(v: string) => setAction(v as PricingAction)}
              containerClassName="space-y-2"
            >
              <SelectItem value="PERCENTAGE_INC">
                Increase by Percentage (%)
              </SelectItem>
              <SelectItem value="PERCENTAGE_DEC">
                Decrease by Percentage (%)
              </SelectItem>
              <SelectItem value="COST_MARGIN">
                Set based on Cost + Margin (%)
              </SelectItem>
              <SelectItem value="FIXED_AMOUNT_INC">
                Increase by Fixed Amount
              </SelectItem>
              <SelectItem value="FIXED_AMOUNT_DEC">
                Decrease by Fixed Amount
              </SelectItem>
            </CustomSelect>

            <CustomInput
              label="Value"
              type="number"
              placeholder={
                action.includes("PERCENTAGE") || action === "COST_MARGIN"
                  ? "Percentage (e.g. 10)"
                  : "Amount (e.g. 5.00)"
              }
              value={value}
              onChange={(e) => setValue(e.target.value)}
              min="0"
              step="0.01"
              containerClassName="space-y-2"
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-end space-x-2">
          <Button
            onClick={handlePreview}
            disabled={
              isLoading || !value || (scope === "CATEGORY" && !categoryId)
            }
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Preview Changes
          </Button>
        </CardFooter>
      </Card>

      {result && result.success && (
        <Alert className="bg-green-50 text-green-900 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>
            Successfully updated prices for {result.count} products.
          </AlertDescription>
        </Alert>
      )}

      {previewData && (
        <Card>
          <CardHeader>
            <CardTitle>Preview Changes</CardTitle>
            <CardDescription>
              {previewData.changes.length} products will be affected.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {previewData.changes.length > 0 ? (
              <div className="max-h-[400px] overflow-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Product Name</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                      <TableHead className="text-right">Margin</TableHead>
                      <TableHead className="text-right">
                        Current Price
                      </TableHead>
                      <TableHead className="text-right">New Price</TableHead>
                      <TableHead className="text-right">Change</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.changes.map((change) => (
                      <TableRow key={change.id}>
                        <TableCell className="font-mono text-xs">
                          {change.sku}
                        </TableCell>
                        <TableCell>{change.name}</TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatCurrency(change.cost)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {change.margin.toFixed(1)}%
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(change.currentPrice)}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {formatCurrency(change.newPrice)}
                        </TableCell>
                        <TableCell
                          className={`text-right ${
                            change.difference > 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {change.difference > 0 ? "+" : ""}
                          {formatCurrency(change.difference)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No price changes detected with current configuration.
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button
              onClick={handleApply}
              disabled={isLoading || previewData.changes.length === 0}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Apply Changes
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
