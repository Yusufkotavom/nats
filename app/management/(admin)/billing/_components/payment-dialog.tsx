"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { createTenantPayment } from "@/app/management/(admin)/tenants/actions";
import { Loader2 } from "lucide-react";

export function PaymentDialog({
    open,
    onOpenChange,
    billing,
    onSuccess,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    billing: any;
    onSuccess: () => void;
}) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    // Form state
    const [amount, setAmount] = useState(billing?.amount?.toString() || "");
    const [paymentDate, setPaymentDate] = useState(
        new Date().toISOString().slice(0, 16)
    );
    const [reference, setReference] = useState("");
    const [description, setDescription] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!amount || !paymentDate) {
            toast({
                title: "Error",
                description: "Harap isi nominal dan tanggal pembayaran",
                variant: "destructive",
            });
            return;
        }

        setLoading(true);
        try {
            const res = await createTenantPayment({
                tenantId: billing.tenantId,
                billingId: billing.id,
                amount: parseFloat(amount),
                paymentDate: new Date(paymentDate),
                status: "SUCCESS", // By default we assume it's a confirmed payment that extends sub
                reference,
                description,
            });

            if (res.success) {
                toast({
                    title: "Berhasil",
                    description: "Pembayaran berhasil dikonfirmasi dan langganan telah diperpanjang",
                });

                // Reset form
                setReference("");
                setDescription("");

                onSuccess();
            } else {
                toast({
                    title: "Gagal",
                    description: res.error || "Gagal mengkonfirmasi pembayaran",
                    variant: "destructive",
                });
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Terjadi kesalahan yang tidak terduga",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Tindak Lanjut Pembayaran</DialogTitle>
                        <DialogDescription>
                            Konfirmasi pembayaran untuk tagihan tenant <strong>{billing?.tenant?.name}</strong>.
                            Pembayaran sukses akan otomatis memperpanjang status langganan tenant selama 1 bulan.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="bg-muted p-3 rounded-md mb-2 text-sm">
                            <div className="flex justify-between mb-1">
                                <span className="text-muted-foreground">Total Tagihan:</span>
                                <span className="font-medium text-foreground">
                                    {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(billing?.amount || 0)}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="payAmount" className="text-right">
                                Nominal
                            </Label>
                            <div className="col-span-3">
                                <Input
                                    id="payAmount"
                                    type="number"
                                    min="0"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="Nominal yang dibayar"
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="paymentDate" className="text-right">
                                Tgl Bayar
                            </Label>
                            <div className="col-span-3">
                                <Input
                                    id="paymentDate"
                                    type="datetime-local"
                                    value={paymentDate}
                                    onChange={(e) => setPaymentDate(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="reference" className="text-right">
                                Referensi
                            </Label>
                            <div className="col-span-3">
                                <Input
                                    id="reference"
                                    value={reference}
                                    onChange={(e) => setReference(e.target.value)}
                                    placeholder="Contoh: INV-001, TRF BCA..."
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-4 items-start gap-4">
                            <Label htmlFor="payDescription" className="text-right mt-2">
                                Catatan
                            </Label>
                            <div className="col-span-3">
                                <Textarea
                                    id="payDescription"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Opsional..."
                                    className="resize-none"
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                            Batal
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Konfirmasi Pembayaran
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
