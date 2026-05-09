"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { CustomInput } from "@/components/ui/custom-input";
import { CustomSelect } from "@/components/ui/custom-select";
import { CustomTextarea } from "@/components/ui/custom-textarea";
import { SelectItem } from "@/components/ui/select";
import { CurrencyInput } from "@/components/ui/currency-input";
import { SuperJSON } from "@/lib/superjson";
import { createQuickPurchase } from "../actions";
import { QuickPurchaseMode, QuickPurchaseResult } from "../types";

type FormDataSource = {
  vendors: { id: string; name: string }[];
  products: { id: string; name: string; sku: string; cost: number }[];
  cashAccounts: { id: string; name: string }[];
};

type ItemRow = {
  id: string;
  productId: string;
  quantity: number;
  unitCost: number;
};

export function QuickPurchaseForm({ data }: { data: FormDataSource }) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [mode, setMode] = useState<QuickPurchaseMode>("CASH_DAILY");
  const [contactId, setContactId] = useState("");
  const [cashAccountId, setCashAccountId] = useState("");
  const [transactionDate, setTransactionDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ItemRow[]>([
    { id: crypto.randomUUID(), productId: "", quantity: 1, unitCost: 0 },
  ]);

  const productMap = useMemo(
    () => new Map(data.products.map((p) => [p.id, p])),
    [data.products],
  );

  const updateItem = (id: string, patch: Partial<ItemRow>) => {
    setItems((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), productId: "", quantity: 1, unitCost: 0 },
    ]);
  };

  const removeItem = (id: string) => {
    setItems((prev) => (prev.length > 1 ? prev.filter((row) => row.id !== id) : prev));
  };

  const total = items.reduce((sum, row) => sum + row.quantity * row.unitCost, 0);

  const handleSubmit = async () => {
    try {
      if (!contactId) {
        toast({ title: "Validation", description: "Vendor wajib dipilih", variant: "destructive" });
        return;
      }
      if (mode === "CASH_DAILY" && !cashAccountId) {
        toast({ title: "Validation", description: "Kas/Bank wajib dipilih", variant: "destructive" });
        return;
      }
      const validItems = items.filter(
        (row) => row.productId && row.quantity > 0 && row.unitCost > 0,
      );
      if (validItems.length === 0) {
        toast({ title: "Validation", description: "Isi minimal 1 item valid", variant: "destructive" });
        return;
      }

      setIsSubmitting(true);
      const result = await createQuickPurchase({
        mode,
        contactId,
        cashAccountId: mode === "CASH_DAILY" ? cashAccountId : undefined,
        transactionDate: new Date(transactionDate),
        dueDate: mode === "MONTHLY_CREDIT" && dueDate ? new Date(dueDate) : undefined,
        notes: notes || undefined,
        items: validItems.map((row) => ({
          productId: row.productId,
          quantity: row.quantity,
          unitCost: row.unitCost,
        })),
      });

      if (!result.success || !result.data) {
        throw new Error(result.error || "Quick purchase gagal");
      }

      const parsed = SuperJSON.deserialize<QuickPurchaseResult>(result.data);
      toast({
        title: "Sukses",
        description: `Quick purchase selesai. Invoice: ${parsed.invoiceId}`,
      });
      router.push(`/purchase/invoices/${parsed.invoiceId}`);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Quick purchase gagal",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 space-y-4 px-4">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-xl font-bold tracking-tight">Quick Purchase</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/purchase/dashboard")}>
            Batal
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Proses Quick Purchase
          </Button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Satu form untuk alur beli cepat: Receive + Invoice + Payment (cash) atau Receive + Invoice (credit).
      </p>

      <Card>
        <CardContent className="grid grid-cols-1 gap-4 pt-6 md:grid-cols-2">
          <CustomSelect label="Mode" value={mode} onValueChange={(v) => setMode(v as QuickPurchaseMode)}>
            <SelectItem value="CASH_DAILY">Cash Daily</SelectItem>
            <SelectItem value="MONTHLY_CREDIT">Monthly Credit</SelectItem>
          </CustomSelect>

          <CustomSelect label="Vendor" value={contactId} onValueChange={setContactId} placeholder="Pilih vendor">
            {data.vendors.map((vendor) => (
              <SelectItem key={vendor.id} value={vendor.id}>
                {vendor.name}
              </SelectItem>
            ))}
          </CustomSelect>

          <CustomInput
            label="Tanggal Transaksi"
            type="date"
            value={transactionDate}
            onChange={(e) => setTransactionDate(e.target.value)}
          />

          {mode === "MONTHLY_CREDIT" ? (
            <CustomInput
              label="Jatuh Tempo"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          ) : (
            <CustomSelect
              label="Kas/Bank"
              value={cashAccountId}
              onValueChange={setCashAccountId}
              placeholder="Pilih kas/bank"
            >
              {data.cashAccounts.map((cash) => (
                <SelectItem key={cash.id} value={cash.id}>
                  {cash.name}
                </SelectItem>
              ))}
            </CustomSelect>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Items</CardTitle>
          <Button variant="outline" size="sm" onClick={addItem}>
            <Plus className="mr-2 h-4 w-4" />
            Tambah Item
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">

          {items.map((row) => {
            const selected = productMap.get(row.productId);
            return (
              <div key={row.id} className="grid grid-cols-1 gap-3 rounded-md border p-3 md:grid-cols-12">
                <div className="md:col-span-5">
                  <CustomSelect
                    label="Produk"
                    value={row.productId}
                    onValueChange={(value) => {
                      const product = productMap.get(value);
                      updateItem(row.id, {
                        productId: value,
                        unitCost: product ? Number(product.cost) : 0,
                      });
                    }}
                    placeholder="Pilih produk"
                  >
                    {data.products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} ({product.sku})
                      </SelectItem>
                    ))}
                  </CustomSelect>
                </div>
                <div className="md:col-span-2">
                  <CustomInput
                    label="Qty"
                    type="number"
                    min={0}
                    value={String(row.quantity)}
                    onChange={(e) => updateItem(row.id, { quantity: Number(e.target.value) || 0 })}
                  />
                </div>
                <div className="md:col-span-4">
                  <CurrencyInput
                    label="Unit Cost"
                    value={row.unitCost}
                    onChange={(value) => updateItem(row.id, { unitCost: Number(value) || 0 })}
                  />
                </div>
                <div className="md:col-span-1 flex items-end">
                  <Button variant="ghost" size="icon" onClick={() => removeItem(row.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                {selected ? (
                  <p className="text-xs text-muted-foreground md:col-span-12">
                    Default cost produk: {selected.cost.toLocaleString("id-ID")}
                  </p>
                ) : null}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-6 pt-6">
        <CustomTextarea
          label="Catatan"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Opsional"
        />

        <div className="flex items-center justify-between rounded-md border p-4">
          <div className="text-sm text-muted-foreground">Total Estimasi</div>
          <div className="text-lg font-semibold">{total.toLocaleString("id-ID")}</div>
        </div>
      </CardContent>
      </Card>
    </div>
  );
}
