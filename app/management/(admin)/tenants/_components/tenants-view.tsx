"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Power, Ban, Database, Search, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { getTenants, toggleTenantStatus, provisionTenantDatabase } from "../actions";

import { TenantDialog } from "./tenant-dialog";
import Link from "next/link";
import { useConfirm } from "@/hooks/use-confirm";

type Tenant = Awaited<ReturnType<typeof getTenants>>[0];


export function TenantsView({ tenants }: { tenants: Tenant[] }) {

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingTenant, setEditingTenant] = useState<Tenant | undefined>(undefined);
    const [searchQuery, setSearchQuery] = useState("");
    const [provisioningId, setProvisioningId] = useState<string | null>(null);
    const confirm = useConfirm();

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

    const handleProvisionDB = async (tenant: Tenant) => {
        const isConfirmed = await confirm({
            title: "Buat Database",
            description: `Apakah Anda yakin ingin membuat database untuk tenant ${tenant.name}? Proses ini mungkin memakan waktu beberapa saat.`,
            confirmText: "Buat",
        });

        if (!isConfirmed) return;

        setProvisioningId(tenant.id);
        try {
            const res = await provisionTenantDatabase(tenant.id);
            if (!res.success) {
                alert("Gagal membuat database: " + res.error);
            } else {
                alert("Database berhasil dibuat!");
            }
        } catch (error) {
            console.error(error);
        }
        setProvisioningId(null);
    };

    const filteredTenants = useMemo(() => {
        if (!searchQuery.trim()) return tenants;
        const lowerQuery = searchQuery.toLowerCase();
        return tenants.filter(
            (t) =>
                t.name.toLowerCase().includes(lowerQuery) ||
                t.slug.toLowerCase().includes(lowerQuery) ||
                (t.dbUrl && t.dbUrl.toLowerCase().includes(lowerQuery))
        );
    }, [tenants, searchQuery]);

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Cari tenant..."
                        className="pl-8 w-full bg-background"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Button onClick={handleCreate}>
                    <Plus className="mr-2 h-4 w-4" />
                    Tambah Tenant
                </Button>
            </div>

            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nama Tenant</TableHead>
                            <TableHead>Slug</TableHead>
                            <TableHead>Kontak</TableHead>
                            <TableHead>Langganan</TableHead>
                            <TableHead>Database</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredTenants.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center">
                                    Tidak ada data tenant yang ditemukan.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredTenants.map((tenant) => (
                                <TableRow key={tenant.id} className={!tenant.isActive ? "opacity-60 bg-muted/50" : ""}>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            {tenant.name}
                                            {tenant.slug === "default" && (
                                                <Badge variant="default" className="bg-primary">
                                                    Sistem
                                                </Badge>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>{tenant.slug}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-col text-sm">
                                            <span>{tenant.email || '-'}</span>
                                            <span className="text-xs text-muted-foreground">{tenant.phone || ''}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="capitalize">
                                            {tenant.subscription?.toLowerCase() || 'free'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <Database className="h-4 w-4" />
                                            <span className="truncate max-w-[150px]" title={tenant.dbUrl || "Tidak ada DB eksplisit dikonfigurasi"}>
                                                {tenant.dbUrl ? tenant.dbUrl.replace(/:[^:@]*@/, ':****@') : "-"}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {tenant.isActive ? (
                                            <Badge variant="outline" className="text-green-600 border-green-600 bg-green-50">Aktif</Badge>
                                        ) : (
                                            <Badge variant="destructive">Tidak Aktif</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            {!tenant.dbUrl && (
                                                <Button
                                                    variant="secondary"
                                                    size="icon"
                                                    onClick={() => handleProvisionDB(tenant)}
                                                    title="Generate Database"
                                                    disabled={provisioningId === tenant.id || tenant.slug === "default"}
                                                >
                                                    <Database className={`h-4 w-4 ${provisioningId === tenant.id ? "animate-spin" : ""}`} />
                                                </Button>
                                            )}
                                            {tenant.dbUrl && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    asChild
                                                    title="Statistik DB"
                                                >
                                                    <Link href={`/management/statistics?tenant=${tenant.id}`}>
                                                        <Activity className="h-4 w-4" />
                                                    </Link>
                                                </Button>
                                            )}
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
                                                title="Ubah"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <TenantDialog
                tenant={editingTenant}
                open={dialogOpen}
                onOpenChange={setDialogOpen}
            />
        </div>
    );
}
