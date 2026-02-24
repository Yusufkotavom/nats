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
import { createTenant, updateTenant, getTenants } from "../actions";

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

        try {
            let res;
            if (isEditing) {
                res = await updateTenant(tenant.id, {
                    name,
                    slug,
                    dbUrl,
                    isActive,
                });
            } else {
                res = await createTenant({
                    name,
                    slug,
                    dbUrl,
                    isActive,
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
                <form onSubmit={handleSubmit} className="space-y-4">
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

                    <div className="flex items-center space-x-2">
                        <Switch
                            id="isActive"
                            checked={isActive}
                            onCheckedChange={setIsActive}
                            disabled={tenant?.slug === "default"}
                        />
                        <Label htmlFor="isActive">Aktif</Label>
                    </div>

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
