"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { SuperJSON } from "@/lib/superjson";
import { createPOSQuickContact, createPOSServiceOrder } from "../../../../pos/actions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trash2 } from "lucide-react";

type ServiceLine = {
  id: string;
  productId: string;
  quantity: number;
  price: number;
  notes: string;
};

export function ServiceOrderCreateForm({
  sessionId,
  products,
  contacts,
  compact = false,
  onSuccess,
}: {
  sessionId: string;
  products: Array<{ id: string; name: string; price: number; isService?: boolean }>;
  contacts: Array<{ id: string; name: string }>;
  compact?: boolean;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [customerId, setCustomerId] = useState("walk-in");
  const [downPayment, setDownPayment] = useState(0);
  const [targetDate, setTargetDate] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<ServiceLine[]>([
    { id: crypto.randomUUID(), productId: "", quantity: 1, price: 0, notes: "" },
  ]);

  const [quickOpen, setQuickOpen] = useState(false);
  const [quickName, setQuickName] = useState("");
  const [quickPhone, setQuickPhone] = useState("");
  const [quickEmail, setQuickEmail] = useState("");

  const grandTotal = useMemo(
    () => lines.reduce((sum, line) => sum + (line.quantity || 0) * (line.price || 0), 0),
    [lines],
  );

  const handleAddItem = () => {
    setLines((prev) => [
      ...prev,
      { id: crypto.randomUUID(), productId: "", quantity: 1, price: 0, notes: "" },
    ]);
  };

  const handleRemoveItem = (lineId: string) => {
    setLines((prev) => prev.filter((line) => line.id !== lineId));
  };

  const handleLineChange = (lineId: string, patch: Partial<ServiceLine>) => {
    setLines((prev) =>
      prev.map((line) => {
        if (line.id !== lineId) return line;
        const next = { ...line, ...patch };
        if (patch.productId !== undefined) {
          const selected = products.find((product) => product.id === patch.productId);
          if (selected) next.price = selected.price;
        }
        return next;
      }),
    );
  };

  const handleCreate = async () => {
    if (lines.length === 0) {
      toast({ title: "Minimal 1 item wajib diisi", variant: "destructive" });
      return;
    }

    for (const line of lines) {
      if (!line.productId || line.quantity <= 0) {
        toast({ title: "Produk dan qty tiap baris wajib diisi", variant: "destructive" });
        return;
      }
    }

    setSaving(true);
    try {
      await createPOSServiceOrder({
        sessionId,
        customerId: customerId === "walk-in" ? undefined : customerId,
        notes: notes.trim() || undefined,
        targetDate: targetDate ? new Date(`${targetDate}T00:00:00`) : undefined,
        downPaymentAmount: downPayment > 0 ? downPayment : undefined,
        paymentMethod: downPayment > 0 ? "CASH" : undefined,
        items: lines.map((line) => ({
          productId: line.productId,
          quantity: line.quantity,
          price: line.price,
          notes: line.notes.trim() || undefined,
        })),
      });

      toast({ title: "Service order berhasil dibuat" });
      onSuccess?.();
      if (!compact) {
        router.push("/services/orders");
        router.refresh();
      }
    } catch (error) {
      toast({
        title: "Gagal membuat service order",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleQuickAdd = async () => {
    if (!quickName.trim()) {
      toast({ title: "Nama kontak wajib diisi", variant: "destructive" });
      return;
    }
    try {
      const raw = await createPOSQuickContact({
        name: quickName.trim(),
        phone: quickPhone.trim() || undefined,
        email: quickEmail.trim() || undefined,
      });
      const contact = SuperJSON.deserialize<{ id: string; name: string }>(raw);
      setCustomerId(contact.id);
      setQuickName("");
      setQuickPhone("");
      setQuickEmail("");
      setQuickOpen(false);
      toast({ title: "Kontak berhasil dibuat" });
    } catch (error) {
      toast({
        title: "Gagal membuat kontak",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label>Customer</Label>
        <div className="flex gap-2">
          <Select value={customerId} onValueChange={setCustomerId}>
            <SelectTrigger>
              <SelectValue placeholder="Pilih customer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="walk-in">Walk-in Customer</SelectItem>
              {contacts.map((contact) => (
                <SelectItem key={contact.id} value={contact.id}>{contact.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={quickOpen} onOpenChange={setQuickOpen}>
            <DialogTrigger asChild>
              <Button type="button" variant="outline">Quick Add</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Quick Add Customer</DialogTitle>
              </DialogHeader>
              <div className="space-y-2">
                <Label>Nama</Label>
                <Input value={quickName} onChange={(event) => setQuickName(event.target.value)} />
                <Label>No. HP</Label>
                <Input value={quickPhone} onChange={(event) => setQuickPhone(event.target.value)} />
                <Label>Email</Label>
                <Input value={quickEmail} onChange={(event) => setQuickEmail(event.target.value)} />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setQuickOpen(false)}>Batal</Button>
                  <Button onClick={handleQuickAdd}>Simpan</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Label>Ordered Items</Label>
          <Button type="button" variant="outline" onClick={handleAddItem}>Tambah Item</Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead className="w-[110px] text-right">Quantity</TableHead>
              <TableHead className="w-[160px] text-right">Price</TableHead>
              <TableHead className="w-[170px] text-right">Total</TableHead>
              <TableHead className="w-[56px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground">No items added.</TableCell>
              </TableRow>
            ) : (
              lines.map((line) => {
                const rowTotal = (line.quantity || 0) * (line.price || 0);
                const selected = products.find((p) => p.id === line.productId);
                return (
                  <TableRow key={line.id}>
                    <TableCell>
                      <Select
                        value={line.productId}
                        onValueChange={(value) => handleLineChange(line.id, { productId: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih produk/service" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name}{product.isService ? " (Service)" : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        className="mt-2"
                        placeholder="Catatan item (opsional)"
                        value={line.notes}
                        onChange={(event) => handleLineChange(line.id, { notes: event.target.value })}
                      />
                      {selected?.isService ? null : (
                        <p className="mt-1 text-xs text-muted-foreground">Item tambahan non-service</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={1}
                        className="text-right"
                        value={line.quantity}
                        onChange={(event) => handleLineChange(line.id, { quantity: Number(event.target.value) || 1 })}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        className="text-right"
                        value={line.price}
                        onChange={(event) => handleLineChange(line.id, { price: Number(event.target.value) || 0 })}
                      />
                    </TableCell>
                    <TableCell className="text-right font-medium">{rowTotal.toLocaleString()}</TableCell>
                    <TableCell>
                      <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveItem(line.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        <div className="text-right text-sm font-semibold">Grand Total: {grandTotal.toLocaleString()}</div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label>Down Payment</Label>
          <Input type="number" min={0} value={downPayment} onChange={(event) => setDownPayment(Number(event.target.value) || 0)} />
        </div>
        <div className="grid gap-2">
          <Label>Target Date</Label>
          <Input type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} />
        </div>
      </div>

      <div className="grid gap-2">
        <Label>Catatan</Label>
        <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
      </div>

      <div className="flex justify-end gap-2">
        {!compact ? (
          <Button variant="outline" onClick={() => router.push("/services/orders")}>Batal</Button>
        ) : null}
        <Button onClick={handleCreate} disabled={saving}>{saving ? "Menyimpan..." : "Simpan"}</Button>
      </div>
    </div>
  );
}
