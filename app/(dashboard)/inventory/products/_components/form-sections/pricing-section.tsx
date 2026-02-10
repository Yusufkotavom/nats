import { CurrencyInput } from "@/components/ui/currency-input";
import { CustomInput } from "@/components/ui/custom-input";
import { CustomSelect } from "@/components/ui/custom-select";
import { SelectItem } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Unit, TaxRate } from "@/prisma/generated/prisma/browser";
import { ProductFormState } from "../form-types";

interface PricingSectionProps {
  formData: ProductFormState;
  handleInputChange: (
    field: string,
    value: string | number | boolean | null
  ) => void;
  units: Unit[];
  taxRates: TaxRate[];
  readonly?: boolean;
}

export function PricingSection({
  formData,
  handleInputChange,
  units,
  taxRates,
  readonly = false,
}: PricingSectionProps) {
  return (
    <div className="space-y-8">
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
            onChange={(e) => handleInputChange("minStock", e.target.value)}
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
          onValueChange={(val) => handleInputChange("baseUnitId", val)}
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
          onValueChange={(val) => handleInputChange("purchaseUnitId", val)}
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
            handleInputChange("purchaseConversionFactor", e.target.value)
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
          onValueChange={(val) => handleInputChange("salesUnitId", val)}
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

      <div className="grid grid-cols-2 gap-4">
        <CustomSelect
          label="Default Tax Rate"
          name="taxRateId"
          value={formData.taxRateId || "none"}
          onValueChange={(val) => handleInputChange("taxRateId", val === "none" ? null : val)}
          disabled={readonly}
          placeholder="Select tax rate"
          containerClassName="grid gap-2"
        >
          <SelectItem value="none">None</SelectItem>
          {taxRates?.map((r) => (
            <SelectItem key={r.id} value={r.id}>
              {r.name} ({Number(r.rate)}%)
            </SelectItem>
          ))}
        </CustomSelect>
      </div>
    </div>
  );
}
