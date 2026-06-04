"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Eye, ExternalLink } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomInput } from "@/components/ui/custom-input";
import { CustomPagination } from "@/components/ui/custom-pagination";
import { getContacts } from "@/app/[locale]/(dashboard)/general/contacts/actions";
import { ContactType } from "@/prisma/generated/prisma/browser";
import Link from "next/link";
import { useTranslations } from "next-intl";

type Contact = Awaited<ReturnType<typeof getContacts>>["data"][number];

export default function CrmOpportunitiesPage() {
  const t = useTranslations("General.Contacts");
  const tCommon = useTranslations("Common");
  const tCrm = useTranslations("CRM");

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchData() {
      const data = await getContacts({ page, search, type: ContactType.CUSTOMER });
      setContacts(data.data);
      setTotal(data.total);
    }
    fetchData();
  }, [page, search]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{tCrm("opportunities")}</h1>
          <p className="text-muted-foreground">
            Peluang penjualan dikelola melalui modul Sales. Pilih pelanggan untuk melihat pipeline-nya.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/sales/orders/new">
              <ExternalLink className="mr-2 h-4 w-4" />
              Buat Sales Order
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/sales/dashboard">
              <ExternalLink className="mr-2 h-4 w-4" />
              Sales Dashboard
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Sales Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild variant="link" className="p-0 h-auto text-2xl font-bold">
              <Link href="/sales/orders">Lihat</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Sales Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild variant="link" className="p-0 h-auto text-2xl font-bold">
              <Link href="/sales/invoices">Lihat</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Sales Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild variant="link" className="p-0 h-auto text-2xl font-bold">
              <Link href="/sales/payments">Lihat</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Pelanggan — Pipeline per Kontak</CardTitle>
              <CardDescription>
                Klik kontak untuk melihat histori transaksi lengkap
              </CardDescription>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <CustomInput
                name="search"
                placeholder={t("search_placeholder")}
                className="pl-8 w-64"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("name")}</TableHead>
                <TableHead>{t("email")}</TableHead>
                <TableHead>{t("phone")}</TableHead>
                <TableHead>{t("address")}</TableHead>
                <TableHead>{t("status")}</TableHead>
                <TableHead className="text-right">{tCommon("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">{t("no_contacts_found")}</TableCell>
                </TableRow>
              ) : (
                contacts.map((contact) => (
                  <TableRow key={contact.id}>
                    <TableCell className="font-medium">
                      <Link href={`/general/contacts/${contact.id}`} className="hover:underline">
                        {contact.name}
                      </Link>
                    </TableCell>
                    <TableCell>{contact.email || "-"}</TableCell>
                    <TableCell>{contact.phone || "-"}</TableCell>
                    <TableCell>{contact.address || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={contact.isActive ? "default" : "secondary"}>
                        {contact.isActive ? t("active") : t("inactive")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>{tCommon("actions")}</DropdownMenuLabel>
                          <DropdownMenuItem asChild>
                            <Link href={`/general/contacts/${contact.id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              Detail &amp; Transaksi
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/sales/orders/new`}>
                              <ExternalLink className="mr-2 h-4 w-4" />
                              Buat Sales Order
                            </Link>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <CustomPagination
            totalEntries={total}
            pageSize={20}
            currentPage={page}
            onPageChange={setPage}
          />
        </CardContent>
      </Card>
    </div>
  );
}
