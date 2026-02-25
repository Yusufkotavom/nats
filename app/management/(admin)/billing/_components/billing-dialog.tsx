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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { createTenantBilling } from "@/app/management/(admin)/tenants/actions";
import { Loader2 } from "lucide-react";

export function BillingDialog({
    open,
    onOpenChange,
    tenants,
    onSuccess,
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
    const [dueDate, setDueDate] = useState("");
    const [description, setDescription] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!tenantId || !amount || !dueDate) {
            toast({
                title: "Error",
                description: "Harap isi tenant, nominal, dan tanggal jatuh tempo",
                variant: "destructive",
            });
            return;
        }

        setLoading(true);
        try {
            const res = await createTenantBilling({
                tenantId,
                amount: parseFloat(amount),
                dueDate: new Date(dueDate),
                description,
            });

            if (res.success) {
                toast({
                    title: "Berhasil",
                    description: "Penagihan berhasil dibuat",
                });

                // Reset form
                setTenantId("");
                setAmount("");
                setDueDate("");
                setDescription("");

                onSuccess();
            } else {
                toast({
                    title: "Gagal",
                    description: res.error || "Gagal membuat penagihan",
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
                        <DialogTitle>Buat Penagihan Baru</DialogTitle>
                        <DialogDescription>
                            Buat tagihan untuk tenant. Status default adalah Belum Dibayar (UNPAID).
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="tenant" className="text-right">
                                Tenant
                            </Label>
                            <div className="col-span-3">
                                <Select value={tenantId} onValueChange={setTenantId}>
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
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="amount" className="text-right">
                                Nominal
                            </Label>
                            <div className="col-span-3">
                                <Input
                                    id="amount"
                                    type="number"
                                    min="0"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="Contoh: 500000"
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="dueDate" className="text-right">
                                Jatuh Tempo
                            </Label>
                            <div className="col-span-3">
                                <Input
                                    id="dueDate"
                                    type="date"
                                    value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-4 items-start gap-4">
                            <Label htmlFor="description" className="text-right mt-2">
                                Keterangan
                            </Label>
                            <div className="col-span-3">
                                <Textarea
                                    id="description"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Catatan tambahan..."
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
                            Simpan Penagihan
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
