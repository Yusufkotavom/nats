import { headers } from "next/headers";
import Link from "next/link";
import { MessageCircleMore, MapPin, Phone, ReceiptText } from "lucide-react";
import { getPublicTrackingPageData } from "@/lib/public-tracking/customer-tracking";

function getRequestBaseUrl(headerStore: Headers) {
  const forwardedProto = headerStore.get("x-forwarded-proto");
  const host = headerStore.get("x-forwarded-host") || headerStore.get("host");

  if (forwardedProto && host) {
    return `${forwardedProto}://${host}`;
  }

  if (host) {
    return `https://${host}`;
  }

  return process.env.NEXT_PUBLIC_APP_URL || "https://restoran.devk.my.id";
}

export default async function PublicTrackingPage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale, token } = await params;
  const headerStore = await headers();
  const baseUrl = getRequestBaseUrl(headerStore);
  const currentUrl = `${baseUrl}/${locale}/public/t/${token}`;
  const data = await getPublicTrackingPageData({ token, currentUrl });

  if (!data.isFound) {
    return (
      <main className="min-h-screen bg-stone-100 px-4 py-10 text-stone-900">
        <div className="mx-auto max-w-3xl rounded-[28px] border border-stone-200 bg-white p-8 shadow-sm">
          <div className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-rose-700">
            Public Tracking
          </div>
          <h1 className="mt-5 font-serif text-3xl font-semibold">
            {data.reason === "expired" ? "Link sudah kedaluwarsa" : "Link tidak ditemukan"}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-stone-600">
            Minta admin mengirim ulang link tracking terbaru agar status dokumen dan transaksi tetap bisa dipantau.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#fef3c7,_#fafaf9_42%,_#e7e5e4_100%)] px-4 py-8 text-stone-900">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="overflow-hidden rounded-[32px] border border-stone-200/80 bg-white shadow-[0_24px_80px_-40px_rgba(28,25,23,0.35)]">
          <div className="border-b border-stone-200 bg-[linear-gradient(135deg,_rgba(245,158,11,0.16),_rgba(255,255,255,0.92))] px-6 py-6 sm:px-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-4">
                <div className="inline-flex rounded-full border border-amber-300 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-amber-700">
                  Customer Tracking
                </div>
                <div>
                  <h1 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
                    {data.company.name}
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
                    Halaman ini bersifat publik untuk memantau status dokumen dan progres transaksi secara berkala.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 text-sm text-stone-600">
                  {data.company.address ? (
                    <span className="inline-flex items-center gap-2 rounded-full bg-stone-100 px-3 py-1.5">
                      <MapPin className="h-4 w-4" />
                      {data.company.address}
                    </span>
                  ) : null}
                  {data.company.phone ? (
                    <span className="inline-flex items-center gap-2 rounded-full bg-stone-100 px-3 py-1.5">
                      <Phone className="h-4 w-4" />
                      {data.company.phone}
                    </span>
                  ) : null}
                </div>
              </div>

              {data.company.supportWhatsAppUrl ? (
                <Link
                  href={data.company.supportWhatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                >
                  <MessageCircleMore className="h-4 w-4" />
                  Hubungi Support WhatsApp
                </Link>
              ) : null}
            </div>
          </div>

          <div className="grid gap-6 px-6 py-6 sm:px-8 lg:grid-cols-[1.15fr_0.85fr]">
            <section className="rounded-[24px] border border-stone-200 bg-stone-50 p-5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">
                <ReceiptText className="h-4 w-4" />
                Ringkasan Customer
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <InfoCard label="Nama" value={data.customer.name} />
                <InfoCard label="No. HP" value={data.customer.phone || "-"} />
                <InfoCard label="Jenis Dokumen" value={data.document.type} />
                <InfoCard label="Nomor Dokumen" value={data.document.number} />
                <InfoCard label="Nomor Order" value={data.document.orderNumber || "-"} />
                <InfoCard label="Nomor Invoice" value={data.document.invoiceNumber || "-"} />
                <InfoCard label="Nominal" value={data.document.amount} />
                <InfoCard label="Sisa Tagihan" value={data.document.remainingAmount} />
                <InfoCard label="Tanggal Dokumen" value={data.document.date || "-"} />
                <InfoCard label="Target / Jatuh Tempo" value={data.document.targetDate || "-"} />
              </div>
            </section>

            <section className="rounded-[24px] border border-stone-200 bg-white p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">
                Status Terkait Dokumen
              </div>
              <div className="mt-5 space-y-3">
                {data.statuses.map((status) => (
                  <div
                    key={`${status.label}-${status.value}`}
                    className="flex items-center justify-between rounded-2xl border border-stone-200 px-4 py-3"
                  >
                    <div>
                      <div className="text-xs font-medium uppercase tracking-[0.16em] text-stone-500">
                        {status.label}
                      </div>
                      <div className="mt-1 text-sm text-stone-600">
                        Status terbaru yang terlihat oleh customer.
                      </div>
                    </div>
                    <span className={badgeClassName(status.tone)}>{status.value}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3">
      <div className="text-xs font-medium uppercase tracking-[0.16em] text-stone-500">{label}</div>
      <div className="mt-1 text-sm font-medium text-stone-900">{value}</div>
    </div>
  );
}

function badgeClassName(tone: "neutral" | "success" | "warning" | "danger") {
  if (tone === "success") {
    return "rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700";
  }
  if (tone === "warning") {
    return "rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700";
  }
  if (tone === "danger") {
    return "rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-rose-700";
  }
  return "rounded-full border border-stone-200 bg-stone-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-stone-700";
}
