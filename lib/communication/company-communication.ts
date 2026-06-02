import type { CompanyCommunicationEventKey } from "@/prisma/generated/prisma/client";

export const COMPANY_COMMUNICATION_EVENTS: Array<{
  key: CompanyCommunicationEventKey;
  label: string;
  defaultEnabled: boolean;
  defaultTemplate: string;
}> = [
  {
    key: "SALES_ORDER_CREATED",
    label: "Sales Order Created",
    defaultEnabled: true,
    defaultTemplate: `Halo {{customer_name}},

*Order Dibuat*
*Nomor SO:* {{doc_number}}
*Status:* {{status}}
*Total:* {{amount}}

*Cek Progress:* {{doc_url}}`,
  },
  {
    key: "SALES_INVOICE_ISSUED",
    label: "Sales Invoice Issued",
    defaultEnabled: true,
    defaultTemplate: `Halo {{customer_name}},

*Invoice*
*Nomor:* {{doc_number}}
*Tanggal:* {{date}}
*Status:* {{status}}
*Total:* {{amount}}
*Sisa Tagihan:* {{remaining_amount}}

*Cek Detail:* {{doc_url}}`,
  },
  {
    key: "SALES_PAYMENT_POSTED",
    label: "Sales Payment Posted",
    defaultEnabled: true,
    defaultTemplate: `Halo {{customer_name}},

*Pembayaran Diterima*
*Nomor Pembayaran:* {{doc_number}}
*Nominal Bayar:* {{amount}}
*Sisa Tagihan:* {{remaining_amount}}

*Cek Detail:* {{doc_url}}`,
  },
  {
    key: "SERVICE_CREATED",
    label: "Service Created",
    defaultEnabled: true,
    defaultTemplate: `Halo {{customer_name}},

*Service Diterima*
*Nomor WO:* {{doc_number}}
*Tanggal:* {{date}}
*Total:* {{amount}}
*Sisa Tagihan:* {{remaining_amount}}
*Estimasi:* {{target_date}}

*Cek Progress:* {{doc_url}}`,
  },
  {
    key: "SERVICE_READY",
    label: "Service Ready",
    defaultEnabled: true,
    defaultTemplate: `Halo {{customer_name}},

*Service Ready*
*Nomor WO:* {{doc_number}}
*Status:* {{status}}

Barang sudah siap dan bisa diambil.
*Cek Progress:* {{doc_url}}`,
  },
  {
    key: "SERVICE_COST_DONE",
    label: "Service Cost Done",
    defaultEnabled: true,
    defaultTemplate: `Halo {{customer_name}},

*Konfirmasi Biaya Service*
*Nomor WO:* {{doc_number}}
*Biaya:* {{amount}}
*Sisa Tagihan:* {{remaining_amount}}

*Cek Detail:* {{doc_url}}`,
  },
  {
    key: "SERVICE_PICKED_UP",
    label: "Service Picked Up",
    defaultEnabled: true,
    defaultTemplate: `Halo {{customer_name}},

*Service Selesai Diambil*
*Nomor WO:* {{doc_number}}
*Garansi:* {{warranty_text}}

Terima kasih. Silakan simpan link ini untuk monitoring dokumen.
*Cek Detail:* {{doc_url}}`,
  },
  {
    key: "POS_PAYMENT_POSTED",
    label: "POS Payment Posted",
    defaultEnabled: false,
    defaultTemplate: `Halo {{customer_name}},

*Pembayaran POS Berhasil*
*Nomor:* {{doc_number}}
*Nominal:* {{amount}}

*Cek Detail:* {{doc_url}}`,
  },
];

export function normalizePhoneForWhatsApp(phone?: string | null): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("8")) return `62${digits}`;
  return digits;
}

export function renderCommunicationTemplate(
  template: string,
  vars: Record<string, string | number | null | undefined>,
) {
  let output = template;
  for (const [key, rawValue] of Object.entries(vars)) {
    const value = rawValue === null || rawValue === undefined ? "-" : String(rawValue);
    output = output.replaceAll(`{{${key}}}`, value);
  }
  return output;
}

export function getCommunicationEventMeta(eventKey: CompanyCommunicationEventKey) {
  return COMPANY_COMMUNICATION_EVENTS.find((item) => item.key === eventKey);
}
