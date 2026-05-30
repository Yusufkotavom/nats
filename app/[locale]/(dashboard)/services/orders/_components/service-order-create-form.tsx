"use client";

import { Fragment, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { SuperJSON } from "@/lib/superjson";
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
import { buildCompanyCommunicationPreview, createContactCommunicationLog } from "@/app/[locale]/communications/actions";
import { normalizePhoneForWhatsApp } from "@/lib/communication/company-communication";

type ServiceLine = {
  id: string;
  productId: string;
  quantity: number;
  price: number;
  notes: string;
};

type ServicePaymentMethodOption = {
  id: string;
  name: string;
  method: "CASH" | "BANK";
  accountType: "CASH" | "PETTY_CASH" | "BANK" | "EWALLET";
  bankName: string | null;
  accountNumber: string | null;
};

type CreatedServiceOrderPayload = {
  id: string;
  orderNumber: string;
  status: string;
  customerId: string | null;
  customerName: string;
  customerPhone: string | null;
  invoiceNumber: string | null;
  totalAmount: number;
  remainingAmount: number;
  createdAt: Date;
};

export function ServiceOrderCreateForm({
  products,
  contacts,
  createOrderAction,
  createQuickContactAction,
  paymentMethodOptions = [],
  compact = false,
  onSuccess,
}: {
  products: Array<{ id: string; name: string; price: number; isService?: boolean }>;
  contacts: Array<{ id: string; name: string }>;
  createOrderAction: (input: {
    customerId?: string;
    notes?: string;
    targetDate?: Date;
    downPaymentAmount?: number;
    paymentMethod?: "CASH" | "BANK";
    downPaymentCashAccountId?: string;
    items: Array<{
      productId: string;
      quantity: number;
      price?: number;
      discount?: number;
      notes?: string;
    }>;
  }) => Promise<unknown>;
  createQuickContactAction: (input: {
    name: string;
    phone?: string;
    email?: string;
  }) => Promise<unknown>;
  paymentMethodOptions?: ServicePaymentMethodOption[];
  compact?: boolean;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [customerId, setCustomerId] = useState("walk-in");
  const [downPayment, setDownPayment] = useState(0);
  const [downPaymentMethod, setDownPaymentMethod] = useState<"CASH" | "BANK">("CASH");
  const [downPaymentAccountId, setDownPaymentAccountId] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<ServiceLine[]>([
    { id: crypto.randomUUID(), productId: "", quantity: 1, price: 0, notes: "" },
  ]);

  const [quickOpen, setQuickOpen] = useState(false);
  const [quickName, setQuickName] = useState("");
  const [quickPhone, setQuickPhone] = useState("");
  const [quickEmail, setQuickEmail] = useState("");
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [notifyPreview, setNotifyPreview] = useState("");
  const [notifyPhone, setNotifyPhone] = useState("");
  const [notifyMeta, setNotifyMeta] = useState<{ contactId: string; orderId: string }>({ contactId: "", orderId: "" });

  const dpAccountOptions = useMemo(
    () => paymentMethodOptions.filter((item) => item.method === downPaymentMethod),
    [paymentMethodOptions, downPaymentMethod],
  );

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
      if (!line.productId || line.quantity <= 0 || line.price <= 0 || !line.notes.trim()) {
        toast({ title: "Produk, qty, harga, dan catatan tiap baris wajib diisi", variant: "destructive" });
        return;
      }
    }

    setSaving(true);
    try {
      const selectedDpAccountId = downPayment > 0 ? (downPaymentAccountId || dpAccountOptions[0]?.id) : undefined;
      if (downPayment > 0 && !selectedDpAccountId) {
        toast({ title: "Pilih akun DP terlebih dahulu", variant: "destructive" });
        return;
      }

      const raw = await createOrderAction({
        customerId: customerId === "walk-in" ? undefined : customerId,
        notes: notes.trim() || undefined,
        targetDate: targetDate ? new Date(`${targetDate}T00:00:00`) : undefined,
        downPaymentAmount: downPayment > 0 ? downPayment : undefined,
        paymentMethod: downPayment > 0 ? downPaymentMethod : undefined,
        downPaymentCashAccountId: selectedDpAccountId,
        items: lines.map((line) => ({
          productId: line.productId,
          quantity: line.quantity,
          price: line.price,
          notes: line.notes.trim() || undefined,
        })),
      });

      const created = SuperJSON.deserialize<CreatedServiceOrderPayload>(raw as any);

      toast({ title: "Service order berhasil dibuat" });

      const normalized = normalizePhoneForWhatsApp(created.customerPhone);
      if (created.customerId && normalized) {
        const preview = await buildCompanyCommunicationPreview({
          eventKey: "SERVICE_CREATED",
          vars: {
            customer_name: created.customerName,
            doc_number: created.orderNumber,
            amount: Number(created.totalAmount || 0).toLocaleString("id-ID"),
            remaining_amount: Number(created.remainingAmount || 0).toLocaleString("id-ID"),
            date: new Date(created.createdAt).toLocaleDateString("id-ID"),
            status: created.status,
          },
        });
        if (preview.isEnabled) {
          setNotifyPreview(preview.message);
          setNotifyPhone(normalized);
          setNotifyMeta({ contactId: created.customerId, orderId: created.id });
          setNotifyOpen(true);
        }
      }

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
      const raw = await createQuickContactAction({
        name: quickName.trim(),
        phone: quickPhone.trim() || undefined,
        email: quickEmail.trim() || undefined,
      });
      const contact = SuperJSON.deserialize<{ id: string; name: string }>(
        raw as any,
      );
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
        <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead className="w-[110px] text-right">Quantity</TableHead>
              <TableHead className="w-[240px] text-right">Price</TableHead>
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
                  <Fragment key={line.id}>
                    <TableRow>
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
                          className="min-w-[200px] text-right"
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
                    <TableRow>
                      <TableCell colSpan={5}>
                        <Input
                          placeholder="Catatan item (wajib)"
                          value={line.notes}
                          onChange={(event) => handleLineChange(line.id, { notes: event.target.value })}
                        />
                      </TableCell>
                    </TableRow>
                  </Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
        </div>
        <div className="text-right text-sm font-semibold">Grand Total: {grandTotal.toLocaleString()}</div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label>Down Payment</Label>
          <Input type="number" min={0} value={downPayment} onChange={(event) => setDownPayment(Number(event.target.value) || 0)} />
        </div>
        {downPayment > 0 ? (
          <>
            <div className="grid gap-2">
              <Label>Metode DP</Label>
              <Select value={downPaymentMethod} onValueChange={(value) => setDownPaymentMethod(value as "CASH" | "BANK")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="BANK">Bank</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label>Akun DP (Kas/Bank)</Label>
              <Select value={downPaymentAccountId} onValueChange={setDownPaymentAccountId}>
                <SelectTrigger><SelectValue placeholder="Pilih akun DP" /></SelectTrigger>
                <SelectContent>
                  {dpAccountOptions.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                      {item.accountNumber ? ` • ${item.accountNumber}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        ) : null}
        <div className="grid gap-2">
          <Label>Target Date</Label>
          <Input type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} />
        </div>
      </div>

      <div className="grid gap-2 rounded-md border p-3">
        <Label>Catatan</Label>
        <Textarea
          className="min-h-[96px]"
          placeholder="Catatan order (opsional)"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </div>

      <div className="flex justify-end gap-2">
        {!compact ? (
          <Button variant="outline" onClick={() => router.push("/services/orders")}>Batal</Button>
        ) : null}
        <Button onClick={handleCreate} disabled={saving}>{saving ? "Menyimpan..." : "Simpan"}</Button>
      </div>

      <Dialog open={notifyOpen} onOpenChange={setNotifyOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Kirim notifikasi customer</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="text-sm text-muted-foreground">Preview pesan (sumber template: Admin &gt; Settings &gt; Communication)</div>
            <Textarea value={notifyPreview} onChange={(event) => setNotifyPreview(event.target.value)} className="min-h-[140px]" />
            <div className="text-xs text-muted-foreground">Tujuan: +{notifyPhone}</div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setNotifyOpen(false)}>Nanti</Button>
              <Button
                onClick={async () => {
                  await createContactCommunicationLog({
                    contactId: notifyMeta.contactId,
                    eventType: "SERVICE_CREATED",
                    sourceType: "SERVICE_ORDER",
                    sourceId: notifyMeta.orderId,
                    target: notifyPhone,
                    message: notifyPreview,
                    status: "SENT",
                  });
                  window.open(`https://wa.me/${notifyPhone}?text=${encodeURIComponent(notifyPreview)}`, "_blank", "noopener,noreferrer");
                  setNotifyOpen(false);
                }}
              >
                Kirim WhatsApp
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
