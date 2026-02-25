"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createTenantPayment } from "@/app/management/(admin)/tenants/actions";
import { Receipt } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function PaymentDialog({
    open,
    onOpenChange,
    tenants,
    onSuccess
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    tenants: any[];
    onSuccess: () => void;
}) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    // Form state
    const [tenantId, setTenantId] = useState("");
    const [amount, setAmount] = useState("");
    const [status, setStatus] = useState("SUCCESS");
    const [reference, setReference] = useState("");
    const [description, setDescription] = useState("");

    const resetForm = () => {
        setTenantId("");
        setAmount("");
        setStatus("SUCCESS");
        setReference("");
        setDescription("");
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!tenantId || !amount || isNaN(Number(amount))) return;

        setLoading(true);

        const res = await createTenantPayment({
            tenantId,
            amount: Number(amount),
            status,
            reference,
            description,
        });

        if (res.success) {
            toast({
                title: "Berhasil",
                description: "Pembayaran berhasil dicatat",
            });
            resetForm();
            onSuccess();
        } else {
            toast({
                title: "Gagal",
                description: res.error || "Gagal mencatat pembayaran",
                variant: "destructive"
            });
        }

        setLoading(false);
    };

    return (
        <Dialog open={open} onOpenChange={(val) => {
            if (!val) resetForm();
            onOpenChange(val);
        }}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Receipt className="h-5 w-5 text-primary" />
                        Catat Pembayaran
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <Label>Pilih Tenant</Label>
                        <Select value={tenantId} onValueChange={setTenantId} required>
                            <SelectTrigger>
                                <SelectValue placeholder="Pilih tenant..." />
                            </SelectTrigger>
                            <SelectContent>
                                {tenants.map(t => (
                                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Nominal</Label>
                            <Input
                                type="number"
                                min="0"
                                required
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="Contoh: 500000"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Status</Label>
                            <Select value={status} onValueChange={setStatus}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="SUCCESS">Berhasil</SelectItem>
                                    <SelectItem value="PENDING">Menunggu</SelectItem>
                                    <SelectItem value="FAILED">Gagal</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Nomor Referensi (Opsional)</Label>
                        <Input
                            value={reference}
                            onChange={(e) => setReference(e.target.value)}
                            placeholder="Contoh: INV-001, Bank Transfer ID"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Keterangan (Opsional)</Label>
                        <Textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Catatan tambahan..."
                            rows={3}
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Batal
                        </Button>
                        <Button type="submit" disabled={loading || !tenantId || !amount}>
                            {loading ? "Menyimpan..." : "Simpan"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
