"use client";

import { useState } from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Pencil, Search } from "lucide-react";
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
import { SubscriptionDialog } from "./subscription-dialog";

export function SubscriptionsView({ tenants }: { tenants: any[] }) {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedTenant, setSelectedTenant] = useState<any | undefined>(undefined);
    const [dialogOpen, setDialogOpen] = useState(false);

    const filteredTenants = tenants.filter(t =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.slug.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleEdit = (tenant: any) => {
        setSelectedTenant(tenant);
        setDialogOpen(true);
    };

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
            </div>

            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nama Tenant</TableHead>
                            <TableHead>Paket</TableHead>
                            <TableHead>Mulai Langganan</TableHead>
                            <TableHead>Berakhir (Expired)</TableHead>
                            <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredTenants.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    Tidak ada data langganan yang ditemukan.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredTenants.map((tenant) => (
                                <TableRow key={tenant.id} className={!tenant.isActive ? "opacity-60 bg-muted/50" : ""}>
                                    <TableCell className="font-medium">
                                        <div className="flex flex-col">
                                            <span>{tenant.name}</span>
                                            <span className="text-xs text-muted-foreground">{tenant.slug}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="capitalize">
                                            {tenant.subscription?.toLowerCase() || 'free'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {tenant.subscriptionStart
                                            ? format(new Date(tenant.subscriptionStart), "dd MMM yyyy", { locale: id })
                                            : "-"}
                                    </TableCell>
                                    <TableCell>
                                        {tenant.subscriptionEnd
                                            ? format(new Date(tenant.subscriptionEnd), "dd MMM yyyy", { locale: id })
                                            : "-"}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleEdit(tenant)}
                                            title="Ubah Langganan"
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <SubscriptionDialog
                tenant={selectedTenant}
                open={dialogOpen}
                onOpenChange={setDialogOpen}
            />
        </div>
    );
}
