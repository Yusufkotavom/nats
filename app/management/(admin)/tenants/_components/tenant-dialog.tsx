"use client";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { CustomInput } from "@/components/ui/custom-input";
import { CustomSelect } from "@/components/ui/custom-select";
import { createTenant, updateTenant, getTenants } from "../actions";
import { SubscriptionType } from "@/prisma/generated/management-client";

import { useAlert } from "@/hooks/use-alert";

type Tenant = Awaited<ReturnType<typeof getTenants>>[0];

interface TenantDialogProps {
    tenant?: Tenant;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function TenantDialog({ tenant, open, onOpenChange }: TenantDialogProps) {
    const [loading, setLoading] = useState(false);
    const isEditing = !!tenant;
    const [isActive, setIsActive] = useState(true);
    const alert = useAlert();

    useEffect(() => {
        if (tenant) {
            setIsActive(tenant.isActive);
        } else {
            setIsActive(true);
        }
    }, [tenant, open]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        const formData = new FormData(e.currentTarget);
        const name = formData.get("name") as string;
        const slug = formData.get("slug") as string;
        const dbUrl = formData.get("dbUrl") as string;
        const email = formData.get("email") as string;
        const phone = formData.get("phone") as string;
        const companyName = formData.get("companyName") as string;
        const subscription = formData.get("subscription") as SubscriptionType;
        const billingEmail = formData.get("billingEmail") as string;
        const billingAddress = formData.get("billingAddress") as string;
        const superadminPassword = formData.get("superadminPassword") as string;

        try {
            let res;
            if (isEditing) {
                res = await updateTenant(tenant.id, {
                    name,
                    slug,
                    dbUrl,
                    isActive,
                    email,
                    phone,
                    companyName,
                    subscription,
                    billingEmail,
                    billingAddress,
                });
            } else {
                res = await createTenant({
                    name,
                    slug,
                    dbUrl,
                    isActive,
                    email,
                    phone,
                    companyName,
                    subscription,
                    billingEmail,
                    billingAddress,
                    superadminPassword,
                });
            }

            if (res && !res.success) {
                alert({ title: "Galat", description: res.error || "Terjadi kesalahan yang tidak diketahui" });
            } else {
                onOpenChange(false);
            }
        } catch (error: any) {
            console.error(error);
            alert({ title: "Galat", description: error.message || "Terjadi kesalahan yang tidak diketahui" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[525px]">
                <DialogHeader>
                    <DialogTitle>{isEditing ? "Ubah Tenant" : "Tambah Tenant"}</DialogTitle>
                    <DialogDescription>
                        {isEditing ? "Ubah detail tenant di sini." : "Tambah tenant baru ke sistem."}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto px-1 pb-1">
                    <div className="text-sm font-medium text-muted-foreground mt-2">Informasi Dasar</div>
                    <CustomInput
                        label="Nama"
                        id="name"
                        name="name"
                        defaultValue={tenant?.name}
                        placeholder="misal: Acme Corp"
                        required
                        containerClassName="grid gap-2"
                    />
                    <CustomInput
                        label="Slug"
                        id="slug"
                        name="slug"
                        defaultValue={tenant?.slug}
                        placeholder="misal: acme-corp"
                        required
                        containerClassName="grid gap-2"
                        disabled={tenant?.slug === "default"}
                    />
                    <CustomInput
                        label="URL Database (Opsional)"
                        id="dbUrl"
                        name="dbUrl"
                        defaultValue={tenant?.dbUrl || ""}
                        placeholder="postgresql://user:pass@host:5432/db?schema=..."
                        containerClassName="grid gap-2"
                    />

                    <div className="flex items-center space-x-2 pb-2">
                        <Switch
                            id="isActive"
                            checked={isActive}
                            onCheckedChange={setIsActive}
                            disabled={tenant?.slug === "default"}
                        />
                        <Label htmlFor="isActive">Aktif</Label>
                    </div>

                    <div className="text-sm font-medium text-muted-foreground pt-2 border-t mt-4">Profil & Kontak</div>
                    <CustomInput
                        label="Email Terdaftar"
                        id="email"
                        name="email"
                        type="email"
                        defaultValue={tenant?.email || ""}
                        placeholder="misal: contact@acme.com"
                        containerClassName="grid gap-2"
                    />
                    <CustomInput
                        label="No. Telepon"
                        id="phone"
                        name="phone"
                        defaultValue={tenant?.phone || ""}
                        placeholder="misal: 08123456789"
                        containerClassName="grid gap-2"
                    />
                    <CustomInput
                        label="Nama Perusahaan"
                        id="companyName"
                        name="companyName"
                        defaultValue={tenant?.companyName || ""}
                        placeholder="misal: PT Acme Indonesia"
                        containerClassName="grid gap-2"
                    />

                    <div className="text-sm font-medium text-muted-foreground pt-2 border-t mt-4">Langganan & Tagihan</div>
                    <CustomSelect
                        label="Tipe Langganan"
                        name="subscription"
                        defaultValue={tenant?.subscription || SubscriptionType.FREE}
                        options={[
                            { value: SubscriptionType.FREE, label: "Free" },
                            { value: SubscriptionType.BASIC, label: "Basic" },
                            { value: SubscriptionType.PREMIUM, label: "Premium" },
                        ]}
                        containerClassName="grid gap-2"
                    />
                    <CustomInput
                        label="Email Tagihan"
                        id="billingEmail"
                        name="billingEmail"
                        type="email"
                        defaultValue={tenant?.billingEmail || ""}
                        placeholder="misal: billing@acme.com"
                        containerClassName="grid gap-2"
                    />
                    <CustomInput
                        label="Alamat Tagihan"
                        id="billingAddress"
                        name="billingAddress"
                        defaultValue={tenant?.billingAddress || ""}
                        placeholder="Alamat lengkap untuk tagihan"
                        containerClassName="grid gap-2"
                    />

                    {!isEditing && (
                        <>
                            <div className="text-sm font-medium text-muted-foreground pt-2 border-t mt-4">Autentikasi (Admin Default)</div>
                            <CustomInput
                                label="Password Superadmin"
                                id="superadminPassword"
                                name="superadminPassword"
                                type="password"
                                placeholder="Masukkan password untuk akun admin tenant baru"
                                containerClassName="grid gap-2"
                                required={!isEditing}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Username admin akan diatur ke: <strong>admin@{"{slug}"}.com</strong>
                            </p>
                        </>
                    )}

                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isEditing ? "Simpan Perubahan" : "Buat Tenant"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
