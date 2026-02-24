"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Power, Ban, Database } from "lucide-react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getTenants, toggleTenantStatus } from "../actions";

import { TenantDialog } from "./tenant-dialog";

type Tenant = Awaited<ReturnType<typeof getTenants>>[0];

export function TenantsView({ tenants }: { tenants: Tenant[] }) {

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingTenant, setEditingTenant] = useState<Tenant | undefined>(undefined);

    const handleCreate = () => {
        setEditingTenant(undefined);
        setDialogOpen(true);
    };

    const handleEdit = (tenant: Tenant) => {
        setEditingTenant(tenant);
        setDialogOpen(true);
    };

    const handleToggleStatus = async (tenant: Tenant) => {
        if (tenant.slug === "default") {
            alert("Anda tidak dapat menonaktifkan tenant bawaan.");
            return;
        }

        try {
            await toggleTenantStatus(tenant.id);
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="p-2 space-y-2">
            <div className="flex items-center justify-between">
                <Button onClick={handleCreate}>
                    <Plus className="mr-2 h-4 w-4" />
                    Tambah Tenant
                </Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
                {tenants.map((tenant) => (
                    <Card key={tenant.id} className={!tenant.isActive ? "opacity-60" : ""}>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="capitalize flex items-center gap-2">
                                    {tenant.name}
                                    {tenant.slug === "default" && (
                                        <Badge variant="default" className="bg-primary">
                                            Sistem
                                        </Badge>
                                    )}
                                    {!tenant.isActive && (
                                        <Badge variant="destructive">Tidak Aktif</Badge>
                                    )}
                                </CardTitle>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleToggleStatus(tenant)}
                                        title={tenant.isActive ? "Nonaktifkan" : "Aktifkan"}
                                        disabled={tenant.slug === "default"}
                                    >
                                        {tenant.isActive ? (
                                            <Ban className="h-4 w-4 text-orange-500" />
                                        ) : (
                                            <Power className="h-4 w-4 text-green-500" />
                                        )}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleEdit(tenant)}
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                            <CardDescription>{tenant.slug}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4 text-sm">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Database className="h-4 w-4" />
                                    <span className="truncate" title={tenant.dbUrl || "Tidak ada DB eksplisit dikonfigurasi"}>
                                        {tenant.dbUrl ? tenant.dbUrl.replace(/:[^:@]*@/, ':****@') : "Tidak ada DB eksplisit dikonfigurasi"}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <TenantDialog
                tenant={editingTenant}
                open={dialogOpen}
                onOpenChange={setDialogOpen}
            />
        </div>
    );
}
