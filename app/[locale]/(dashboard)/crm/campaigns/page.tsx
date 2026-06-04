"use client";
export const dynamic = "force-dynamic";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink, MessageSquare, Mail, Users } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

export default function CrmCampaignsPage() {
  const tCrm = useTranslations("CRM");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{tCrm("campaigns")}</h1>
          <p className="text-muted-foreground">
            Kampanye pemasaran dikelola melalui template komunikasi dan follow-up per kontak.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin/settings/communication">
            <ExternalLink className="mr-2 h-4 w-4" />
            Template Komunikasi
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-green-600" />
              WhatsApp Templates
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Kelola template pesan WhatsApp per event bisnis (invoice, payment, service).
            </p>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/settings/communication">
                <ExternalLink className="mr-2 h-4 w-4" />
                Kelola Templates
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              Follow-up per Kontak
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Kirim pesan WhatsApp dengan konteks transaksi terbaru langsung dari halaman kontak.
            </p>
            <Button asChild variant="outline" size="sm">
              <Link href="/crm/activities">
                <ExternalLink className="mr-2 h-4 w-4" />
                Buka Aktivitas
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Mail className="h-4 w-4 text-orange-600" />
              Public Tracking Link
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Bagikan link tracking publik ke customer agar mereka bisa melihat status dokumen tanpa login.
            </p>
            <Button asChild variant="outline" size="sm">
              <Link href="/sales/invoices">
                <ExternalLink className="mr-2 h-4 w-4" />
                Buka Sales Invoices
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Cara Mengirim Kampanye WhatsApp</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3 text-sm text-muted-foreground list-decimal list-inside">
            <li>
              Buka{" "}
              <Link href="/admin/settings/communication" className="underline hover:text-foreground">
                Admin &gt; Settings &gt; Communication
              </Link>{" "}
              untuk setup template pesan per event.
            </li>
            <li>
              Buka{" "}
              <Link href="/general/contacts" className="underline hover:text-foreground">
                General &gt; Contacts
              </Link>{" "}
              dan pilih kontak yang ingin di-follow up.
            </li>
            <li>
              Di halaman detail kontak, buka tab <span className="font-medium text-foreground">Follow-up</span>.
            </li>
            <li>
              Pilih template, ubah isi pesan jika perlu, lalu klik <span className="font-medium text-foreground">Kirim WhatsApp</span>.
            </li>
            <li>
              Riwayat pengiriman tersimpan otomatis di panel <span className="font-medium text-foreground">Riwayat WA Terbaru</span>.
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
