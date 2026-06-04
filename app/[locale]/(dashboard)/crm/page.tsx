"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, TrendingUp, MessageSquare, ExternalLink } from "lucide-react";
import { getContacts } from "@/app/[locale]/(dashboard)/general/contacts/actions";
import { ContactType } from "@/prisma/generated/prisma/browser";
import Link from "next/link";
import { useTranslations } from "next-intl";

type Contact = Awaited<ReturnType<typeof getContacts>>["data"][number];

export default function CrmDashboard() {
  const t = useTranslations("General.Contacts");
  const tCrm = useTranslations("CRM");

  const [customers, setCustomers] = useState<Contact[]>([]);
  const [vendors, setVendors] = useState<Contact[]>([]);
  const [employees, setEmployees] = useState<Contact[]>([]);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [totalVendors, setTotalVendors] = useState(0);
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const [custResult, vendResult, empResult] = await Promise.all([
        getContacts({ type: ContactType.CUSTOMER, pageSize: 5 }),
        getContacts({ type: ContactType.VENDOR, pageSize: 5 }),
        getContacts({ type: ContactType.EMPLOYEE, pageSize: 5 }),
      ]);
      setCustomers(custResult.data);
      setTotalCustomers(custResult.total);
      setVendors(vendResult.data);
      setTotalVendors(vendResult.total);
      setEmployees(empResult.data);
      setTotalEmployees(empResult.total);
      setLoading(false);
    }
    fetchData();
  }, []);

  const buildWhatsAppUrl = (phone: string | null, name: string) => {
    if (!phone) return null;
    const normalized = phone.replace(/\D/g, "");
    const waPhone = normalized.startsWith("0") ? "62" + normalized.slice(1) : normalized;
    const msg = encodeURIComponent(`Halo ${name}, `);
    return `https://wa.me/${waPhone}?text=${msg}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">CRM Dashboard</h1>
          <p className="text-muted-foreground">
            Data dari{" "}
            <Link href="/general/contacts" className="underline hover:text-foreground">
              General &gt; Contacts
            </Link>
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/general/contacts">
            <ExternalLink className="mr-2 h-4 w-4" />
            Kelola Semua Kontak
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("customer")}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "…" : totalCustomers}</div>
            <Link href="/crm/leads" className="text-xs text-muted-foreground hover:underline">
              Lihat semua pelanggan
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("vendor")}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "…" : totalVendors}</div>
            <Link href="/crm/contacts" className="text-xs text-muted-foreground hover:underline">
              Lihat semua vendor
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("employee")}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "…" : totalEmployees}</div>
            <Link href="/crm/contacts" className="text-xs text-muted-foreground hover:underline">
              Lihat semua karyawan
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Pelanggan Terbaru</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/crm/leads">Lihat semua</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {loading ? (
                <p className="text-sm text-muted-foreground">Memuat...</p>
              ) : customers.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("no_contacts_found")}</p>
              ) : (
                customers.map((contact) => {
                  const waUrl = buildWhatsAppUrl(contact.phone, contact.name);
                  return (
                    <div key={contact.id} className="flex items-center justify-between">
                      <div>
                        <Link href={`/general/contacts/${contact.id}`} className="text-sm font-medium hover:underline">
                          {contact.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">{contact.phone || contact.email || "-"}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={contact.isActive ? "default" : "secondary"} className="text-xs">
                          {contact.isActive ? t("active") : t("inactive")}
                        </Badge>
                        {waUrl && (
                          <a href={waUrl} target="_blank" rel="noopener noreferrer">
                            <MessageSquare className="h-4 w-4 text-green-600 hover:text-green-700" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Vendor Terbaru</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/crm/contacts">Lihat semua</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {loading ? (
                <p className="text-sm text-muted-foreground">Memuat...</p>
              ) : vendors.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("no_contacts_found")}</p>
              ) : (
                vendors.map((contact) => (
                  <div key={contact.id} className="flex items-center justify-between">
                    <div>
                      <Link href={`/general/contacts/${contact.id}`} className="text-sm font-medium hover:underline">
                        {contact.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">{contact.phone || contact.email || "-"}</p>
                    </div>
                    <Badge variant={contact.isActive ? "default" : "secondary"} className="text-xs">
                      {contact.isActive ? t("active") : t("inactive")}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Navigasi Cepat</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-3">
              <Button asChild variant="outline" className="justify-start">
                <Link href="/crm/leads">
                  <Users className="mr-2 h-4 w-4" />
                  Pelanggan & Prospek
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start">
                <Link href="/crm/contacts">
                  <Users className="mr-2 h-4 w-4" />
                  Semua Kontak
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start">
                <Link href="/crm/activities">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Aktivitas Follow-up
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start">
                <Link href="/sales/dashboard">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Sales Dashboard
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start">
                <Link href="/sales/orders">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Sales Orders
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start">
                <Link href="/general/contacts">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Kelola Kontak
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
