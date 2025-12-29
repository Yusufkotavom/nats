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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
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
import {
  applyBatchPricing,
  previewPriceChanges,
  BatchPricingInput,
  PricingAction,
  PricingScope,
} from "../actions";
import { Loader2, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useFormatCurrency } from "@/hooks/use-format-currency";

interface BatchPricingFormProps {
  categories: Category[];
}

export function BatchPricingForm({ categories }: BatchPricingFormProps) {
  const [scope, setScope] = useState<PricingScope>("ALL");
  const [action, setAction] = useState<PricingAction>("PERCENTAGE_INC");
  const [isLoading, setIsLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
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
            <div className="space-y-2">
              <Label>Scope</Label>
              <Select
                value={scope}
                onValueChange={(v: PricingScope) => setScope(v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Products</SelectItem>
                  <SelectItem value="CATEGORY">Specific Category</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {scope === "CATEGORY" && (
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
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
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Action</Label>
              <Select
                value={action}
                onValueChange={(v: PricingAction) => setAction(v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
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
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Value</Label>
              <Input
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
              />
            </div>
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
                      <TableHead className="text-right">
                        Current Price
                      </TableHead>
                      <TableHead className="text-right">New Price</TableHead>
                      <TableHead className="text-right">Change</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.changes.map((change: any) => (
                      <TableRow key={change.id}>
                        <TableCell className="font-mono text-xs">
                          {change.sku}
                        </TableCell>
                        <TableCell>{change.name}</TableCell>
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
