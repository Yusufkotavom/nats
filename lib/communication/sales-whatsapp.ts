export function normalizePhoneForWhatsApp(phone?: string | null): string {
  if (!phone) return "";

  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("8")) return `62${digits}`;

  return digits;
}

export function buildSalesInvoiceWhatsAppMessage(input: {
  contactName: string;
  invoiceNumber: string;
  totalAmount: number;
  balanceDue: number;
  invoiceUrl: string;
  receiptUrl: string;
  introLabel: string;
  totalLabel: string;
  balanceLabel: string;
  helpLabel: string;
}) {
  return [
    `Halo ${input.contactName},`,
    "",
    `${input.introLabel} ${input.invoiceNumber}.`,
    `${input.totalLabel} ${input.totalAmount.toLocaleString("id-ID")}`,
    `${input.balanceLabel} ${input.balanceDue.toLocaleString("id-ID")}`,
    "",
    `Invoice PDF: ${input.invoiceUrl}`,
    `Nota POS: ${input.receiptUrl}`,
    "",
    input.helpLabel,
  ].join("\n");
}
