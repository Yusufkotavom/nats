"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CustomInput } from "@/components/ui/custom-input";
import { CustomSelect } from "@/components/ui/custom-select";
import { SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Tag, Eye, EyeOff } from "lucide-react";
import { DiscountType } from "@/prisma/generated/prisma/client";
import { PricingProductWithDetails } from "../types";
import { createAndAssignDiscount, toggleDiscountStatus } from "../actions";
import { useFormatCurrency } from "@/hooks/use-format-currency";
import { useConfirm } from "@/hooks/use-confirm";
import { useAlert } from "@/hooks/use-alert";
import { useQueryClient } from "@tanstack/react-query";

type DiscountProps = PricingProductWithDetails["discounts"][number];

interface DiscountManagerProps {
  productId: string;
  productName: string;
  discounts: DiscountProps[];
}

export function DiscountManager({
  productId,
  productName,
  discounts,
}: DiscountManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const formatCurrency = useFormatCurrency();
  const confirm = useConfirm();
  const alert = useAlert();
  const queryClient = useQueryClient();

  // Form state
  const [code, setCode] = useState("");
  const [type, setType] = useState<DiscountType>("PERCENTAGE");
  const [value, setValue] = useState("");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [endDate, setEndDate] = useState("");
  const [minQuantity, setMinQuantity] = useState("");
  const [priority, setPriority] = useState("0");

  const resetForm = () => {
    setCode("");
    setType("PERCENTAGE");
    setValue("");
    setStartDate(new Date().toISOString().split("T")[0]);
    setEndDate("");
    setMinQuantity("");
    setPriority("0");
    setIsCreating(false);
  };

  const handleCreate = async () => {
    setIsLoading(true);
    try {
      const result = await createAndAssignDiscount({
        productId,
        code,
        type,
        value: Number(value),
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : undefined,
        minQuantity: minQuantity ? Number(minQuantity) : undefined,
        priority: Number(priority),
      });

      if (result.success) {
        resetForm();
        queryClient.invalidateQueries({ queryKey: ["pricing-products"] });
      } else {
        await alert({ title: "Error", description: result.error });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async (discountId: string, isActive: boolean) => {
    setIsLoading(true);
    try {
      await toggleDiscountStatus({ discountId, isActive: !isActive });
      queryClient.invalidateQueries({ queryKey: ["pricing-products"] });
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Tag className="h-4 w-4 mr-2" />
          {discounts.length > 0 && (
            <Badge variant="secondary" className="ml-1">
              {discounts.length}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage Discounts for {productName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* List of Discounts */}
          <div className="space-y-4">
            <h3 className="font-medium">Active Discounts</h3>
            {discounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No active discounts.
              </p>
            ) : (
              <div className="grid gap-4">
                {discounts.map((discount) => (
                  <div
                    key={discount.id}
                    className={`flex items-center justify-between p-4 border rounded-lg ${!discount.isActive ? "bg-muted/50 opacity-75" : ""
                      }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{discount.code}</span>
                        {!discount.isActive && (
                          <Badge
                            variant="secondary"
                            className="bg-gray-200 text-gray-600"
                          >
                            Inactive
                          </Badge>
                        )}
                        <Badge variant="outline">{discount.type}</Badge>
                        <Badge>
                          {discount.type === "PERCENTAGE"
                            ? `${discount.value}%`
                            : formatCurrency(Number(discount.value))}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Priority: {discount.priority} • Min Qty:{" "}
                        {discount.minQuantity || 0}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(discount.startDate).toLocaleDateString()} -{" "}
                        {discount.endDate
                          ? new Date(discount.endDate).toLocaleDateString()
                          : "No Expiry"}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        handleToggleStatus(discount.id, discount.isActive)
                      }
                      disabled={isLoading}
                      title={discount.isActive ? "Deactivate" : "Activate"}
                    >
                      {discount.isActive ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Create New Discount */}
          {isCreating ? (
            <div className="space-y-4 border-t pt-4">
              <h3 className="font-medium">Add New Discount</h3>
              <div className="grid grid-cols-2 gap-4">
                <CustomInput
                  label="Code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="SUMMER2024"
                  containerClassName="space-y-2"
                />
                <CustomSelect
                  label="Type"
                  value={type}
                  onValueChange={(v) => setType(v as DiscountType)}
                  containerClassName="space-y-2"
                >
                  <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                  <SelectItem value="FIXED_AMOUNT">Fixed Amount</SelectItem>
                </CustomSelect>
                <CustomInput
                  label="Value"
                  type="number"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="10"
                  containerClassName="space-y-2"
                />
                <CustomInput
                  label="Priority"
                  type="number"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  placeholder="0"
                  containerClassName="space-y-2"
                />
                <CustomInput
                  label="Min Quantity"
                  type="number"
                  value={minQuantity}
                  onChange={(e) => setMinQuantity(e.target.value)}
                  placeholder="Optional"
                  containerClassName="space-y-2"
                />
                <CustomInput
                  label="Start Date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  containerClassName="space-y-2"
                />
                <CustomInput
                  label="End Date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  placeholder="Optional"
                  containerClassName="space-y-2"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setIsCreating(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={isLoading}>
                  {isLoading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Save Discount
                </Button>
              </div>
            </div>
          ) : (
            <Button
              className="w-full"
              variant="outline"
              onClick={() => setIsCreating(true)}
            >
              <Plus className="mr-2 h-4 w-4" /> Add Discount
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
