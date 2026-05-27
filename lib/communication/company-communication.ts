import type { CompanyCommunicationEventKey } from "@/prisma/generated/prisma/client";

export const COMPANY_COMMUNICATION_EVENTS: Array<{
  key: CompanyCommunicationEventKey;
  label: string;
  defaultEnabled: boolean;
  defaultTemplate: string;
}> = [
  {
    key: "SALES_INVOICE_ISSUED",
    label: "Sales Invoice Issued",
    defaultEnabled: true,
    defaultTemplate:
      "Halo {{customer_name}}, invoice {{doc_number}} sudah terbit. Total: {{amount}}. Sisa: {{remaining_amount}}. Invoice: {{doc_url}}",
  },
  {
    key: "SALES_PAYMENT_POSTED",
    label: "Sales Payment Posted",
    defaultEnabled: true,
    defaultTemplate:
      "Halo {{customer_name}}, pembayaran {{doc_number}} sebesar {{amount}} sudah kami terima.",
  },
  {
    key: "SERVICE_CREATED",
    label: "Service Created",
    defaultEnabled: true,
    defaultTemplate:
      "Halo {{customer_name}}, WO {{doc_number}} sudah diterima. Total: {{amount}}. Sisa: {{remaining_amount}}.",
  },
  {
    key: "SERVICE_READY",
    label: "Service Ready",
    defaultEnabled: true,
    defaultTemplate:
      "Halo {{customer_name}}, WO {{doc_number}} sudah READY dan bisa diambil.",
  },
  {
    key: "SERVICE_COST_DONE",
    label: "Service Cost Done",
    defaultEnabled: true,
    defaultTemplate:
      "Halo {{customer_name}}, konfirmasi biaya WO {{doc_number}}: {{amount}}.",
  },
  {
    key: "SERVICE_PICKED_UP",
    label: "Service Picked Up",
    defaultEnabled: true,
    defaultTemplate:
      "Halo {{customer_name}}, WO {{doc_number}} sudah diambil. Garansi: {{warranty_text}}.",
  },
  {
    key: "POS_PAYMENT_POSTED",
    label: "POS Payment Posted",
    defaultEnabled: false,
    defaultTemplate:
      "Halo {{customer_name}}, pembayaran POS {{doc_number}} sebesar {{amount}} berhasil.",
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
