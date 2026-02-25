"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateTenant } from "@/app/management/(admin)/tenants/actions";
import { CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function SubscriptionDialog({
    tenant,
    open,
    onOpenChange,
}: {
    tenant: any;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    const [subscription, setSubscription] = useState("FREE");
    const [subscriptionStart, setSubscriptionStart] = useState("");
    const [subscriptionEnd, setSubscriptionEnd] = useState("");

    useEffect(() => {
        if (open && tenant) {
            setSubscription(tenant.subscription || "FREE");
            setSubscriptionStart(tenant.subscriptionStart ? new Date(tenant.subscriptionStart).toISOString().split('T')[0] : "");
            setSubscriptionEnd(tenant.subscriptionEnd ? new Date(tenant.subscriptionEnd).toISOString().split('T')[0] : "");
        }
    }, [open, tenant]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const res = await updateTenant(tenant.id, {
            subscription: subscription as any,
            subscriptionStart: subscriptionStart ? new Date(subscriptionStart) : null,
            subscriptionEnd: subscriptionEnd ? new Date(subscriptionEnd) : null,
        });

        if (res.success) {
            toast({
                title: "Berhasil",
                description: "Langganan berhasil diperbarui",
            });
            onOpenChange(false);
        } else {
            toast({
                title: "Gagal",
                description: res.error || "Gagal memperbarui langganan",
                variant: "destructive"
            });
        }

        setLoading(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-primary" />
                        Pengaturan Langganan
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <Label>Nama Tenant</Label>
                        <Input value={tenant?.name || ""} disabled />
                    </div>

                    <div className="space-y-2">
                        <Label>Tipe Langganan</Label>
                        <Select value={subscription} onValueChange={setSubscription}>
                            <SelectTrigger>
                                <SelectValue placeholder="Pilih paket" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="FREE">Free</SelectItem>
                                <SelectItem value="BASIC">Basic</SelectItem>
                                <SelectItem value="PREMIUM">Premium</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Tanggal Mulai</Label>
                        <Input
                            type="date"
                            value={subscriptionStart}
                            onChange={(e) => setSubscriptionStart(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Tanggal Berakhir / Expired</Label>
                        <Input
                            type="date"
                            value={subscriptionEnd}
                            onChange={(e) => setSubscriptionEnd(e.target.value)}
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Batal
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Menyimpan..." : "Simpan"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
