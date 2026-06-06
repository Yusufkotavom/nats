import { headers } from "next/headers";
import Link from "next/link";
import {
  Download,
  ExternalLink,
  History,
  MapPin,
  MessageCircleMore,
  Phone,
  ReceiptText,
} from "lucide-react";
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
          <h1 className="mt-5 text-3xl font-semibold">
            {data.reason === "expired" ? "Link sudah kedaluwarsa" : "Link tidak ditemukan"}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-stone-600">
            Minta admin mengirim ulang link tracking terbaru agar customer tetap bisa melihat riwayat dan dokumen yang relevan.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-100 px-4 py-6 text-stone-900 sm:py-8">
      <div className="mx-auto max-w-5xl">
        <section className="overflow-hidden rounded-[28px] border border-stone-200 bg-white shadow-sm">
          <div className="border-b border-stone-200 px-5 py-5 sm:px-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-4">
                <div className="inline-flex rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-stone-700">
                  Customer Tracking
                </div>
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{data.company.name}</h1>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">
                    Halaman publik ini menampilkan status terbaru, history transaksi customer, dan dokumen yang bisa diunduh tanpa login.
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
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-700"
                >
                  <MessageCircleMore className="h-4 w-4" />
                  Hubungi Support WhatsApp
                </Link>
              ) : null}
            </div>
          </div>

          <div className="px-5 py-5 sm:px-7">
            <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-8">
                <SectionHeader
                  icon={<ReceiptText className="h-4 w-4" />}
                  title="Ringkasan Dokumen"
                  description="Snapshot dokumen utama yang terkait dengan link publik ini."
                />
                <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                  <MetaRow label="Nama Customer" value={data.customer.name} />
                  <MetaRow label="No. HP" value={data.customer.phone || "-"} />
                  <MetaRow label="Jenis Dokumen" value={data.document.type} />
                  <MetaRow label="Nomor Dokumen" value={data.document.number} />
                  <MetaRow label="Nomor Order" value={data.document.orderNumber || "-"} />
                  <MetaRow label="Nomor Invoice" value={data.document.invoiceNumber || "-"} />
                  <MetaRow label="Nominal" value={data.document.amount} />
                  <MetaRow label="Sisa Tagihan" value={data.document.remainingAmount} />
                  <MetaRow label="Tanggal Dokumen" value={data.document.date || "-"} />
                  <MetaRow label="Target / Jatuh Tempo" value={data.document.targetDate || "-"} />
                </div>

                <div className="border-t border-stone-200 pt-8">
                  <SectionHeader
                    icon={<History className="h-4 w-4" />}
                    title="History Transaksi"
                    description="Riwayat terbaru ke terlama untuk customer ini."
                  />
                  <div className="mt-5 space-y-0">
                    {data.fullHistory.length > 0 ? (
                      data.fullHistory.map((item, index) => (
                        <HistoryRow
                          key={item.id}
                          item={item}
                          bordered={index < data.fullHistory.length - 1}
                        />
                      ))
                    ) : (
                      <EmptyState text="Belum ada histori transaksi." />
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-8 border-t border-stone-200 pt-8 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
                <div>
                  <SectionHeader
                    icon={<Download className="h-4 w-4" />}
                    title="Dokumen Tersedia"
                    description="Unduh dokumen publik yang terkait langsung dengan transaksi ini."
                  />
                  <div className="mt-5 space-y-3">
                    {data.availableDocuments.length > 0 ? (
                      data.availableDocuments.map((document) => (
                        <Link
                          key={`${document.code}-${document.entityId}`}
                          href={document.href}
                          className="flex items-center justify-between border-b border-stone-200 py-3 text-sm transition hover:text-stone-950"
                        >
                          <span className="font-medium text-stone-800">{document.label}</span>
                          <span className="inline-flex items-center gap-2 text-stone-500">
                            <Download className="h-4 w-4" />
                            PDF
                          </span>
                        </Link>
                      ))
                    ) : (
                      <EmptyState text="Belum ada dokumen publik yang tersedia untuk diunduh." />
                    )}
                  </div>
                </div>

                <div className="border-t border-stone-200 pt-8">
                  <SectionHeader
                    icon={<ReceiptText className="h-4 w-4" />}
                    title="Status Terkait"
                    description="Status terbaru yang terlihat oleh customer."
                  />
                  <div className="mt-5 space-y-3">
                    {data.statuses.map((status) => (
                      <div key={`${status.label}-${status.value}`} className="flex items-center justify-between gap-4 border-b border-stone-200 py-3">
                        <div>
                          <div className="text-xs font-medium uppercase tracking-[0.16em] text-stone-500">{status.label}</div>
                          <div className="mt-1 text-sm text-stone-600">Snapshot status terkini.</div>
                        </div>
                        <span className={badgeClassName(status.tone)}>{status.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {data.actions.length > 0 ? (
                  <div className="border-t border-stone-200 pt-8">
                    <SectionHeader
                      icon={<ExternalLink className="h-4 w-4" />}
                      title="Aksi Lanjutan"
                      description="Gunakan kanal ini bila perlu konfirmasi tambahan."
                    />
                    <div className="mt-5 flex flex-wrap gap-3">
                      {data.actions.map((action) => (
                        <Link
                          key={`${action.kind}-${action.href}`}
                          href={action.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-900 transition hover:bg-stone-100"
                        >
                          {action.label}
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function SectionHeader({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-stone-100 text-stone-700">
        {icon}
      </div>
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-700">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-stone-500">{description}</p>
      </div>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-stone-200 pb-3">
      <div className="text-xs font-medium uppercase tracking-[0.16em] text-stone-500">{label}</div>
      <div className="mt-1 text-sm font-medium text-stone-900">{value}</div>
    </div>
  );
}

function HistoryRow({
  item,
  bordered,
}: {
  item: {
    area: string;
    type: string;
    documentNumber: string;
    status: string;
    amount: string;
    balanceDue: string | null;
    happenedAt: string | null;
    detail: string;
    isLatest: boolean;
    documentLinks: Array<{ label: string; href: string; code: string; entityId: string }>;
  };
  bordered: boolean;
}) {
  return (
    <div className={bordered ? "border-b border-stone-200 py-5" : "py-5"}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">{item.area}</span>
            {item.isLatest ? (
              <span className="rounded-full bg-stone-900 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white">
                Latest
              </span>
            ) : null}
          </div>
          <div className="text-base font-semibold text-stone-900">
            {item.type} <span className="text-stone-400">•</span> {item.documentNumber}
          </div>
          <p className="text-sm leading-6 text-stone-600">{item.detail}</p>
          {item.documentLinks.length > 0 ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {item.documentLinks.map((document) => (
                <Link
                  key={`${document.code}-${document.entityId}`}
                  href={document.href}
                  className="inline-flex items-center gap-2 rounded-full border border-stone-200 px-3 py-1.5 text-xs font-semibold text-stone-700 transition hover:bg-stone-100"
                >
                  <Download className="h-3.5 w-3.5" />
                  {document.label}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
        <div className="space-y-1 sm:text-right">
          <div className="text-sm font-semibold text-stone-900">{item.amount}</div>
          {item.balanceDue ? <div className="text-sm text-amber-700">Sisa {item.balanceDue}</div> : null}
          <div className="text-xs uppercase tracking-[0.14em] text-stone-500">{item.happenedAt || "-"}</div>
          <span className={historyStatusClassName(item.status)}>{item.status}</span>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="py-4 text-sm text-stone-500">{text}</div>;
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

function historyStatusClassName(status: string) {
  return badgeClassName(
    ["PAID", "DONE", "CLOSED", "READY", "ISSUED", "POSTED", "COMPLETED"].includes(status)
      ? "success"
      : ["DRAFT", "NEW", "PROCESSING", "PARTIALLY_PAID", "OVERDUE"].includes(status)
        ? "warning"
        : ["CANCELLED", "FAILED"].includes(status)
          ? "danger"
          : "neutral",
  );
}
