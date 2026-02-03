import { CustomSelect } from "@/components/ui/custom-select";
import { SelectItem } from "@/components/ui/select";
import { Account } from "@/prisma/generated/prisma/browser";
import { ProductFormState } from "../form-types";

interface AccountSectionProps {
  formData: ProductFormState;
  handleInputChange: (
    field: string,
    value: string | number | boolean | null
  ) => void;
  accounts: Account[];
  readonly?: boolean;
}

export function AccountSection({
  formData,
  handleInputChange,
  accounts,
  readonly = false,
}: AccountSectionProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-2">
        <CustomSelect
          label="Inventory Asset Account"
          name="inventoryAccountId"
          value={formData.inventoryAccountId}
          onValueChange={(val) => handleInputChange("inventoryAccountId", val)}
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
          Asset account used to track the value of this product in stock.
        </p>
      </div>

      <div className="grid gap-2">
        <CustomSelect
          label="Expense / COGS Account"
          name="cogsAccountId"
          value={formData.cogsAccountId}
          onValueChange={(val) => handleInputChange("cogsAccountId", val)}
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
          Expense account used when this product is sold (Cost of Goods Sold).
        </p>
      </div>

      <div className="grid gap-2">
        <CustomSelect
          label="Income / Sales Account"
          name="salesAccountId"
          value={formData.salesAccountId}
          onValueChange={(val) => handleInputChange("salesAccountId", val)}
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
          onValueChange={(val) => handleInputChange("payableAccountId", val)}
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
          Liability account for purchases (overrides vendor default).
        </p>
      </div>

      <div className="grid gap-2">
        <CustomSelect
          label="Receivable Account"
          name="receivableAccountId"
          value={formData.receivableAccountId}
          onValueChange={(val) => handleInputChange("receivableAccountId", val)}
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
  );
}
