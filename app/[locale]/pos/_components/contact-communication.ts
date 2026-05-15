export function normalizePhoneForWhatsApp(phone?: string | null): string {
  if (!phone) return "";

  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";

  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("8")) return `62${digits}`;

  return digits;
}

export function buildWhatsAppUrl(phone: string | null | undefined, message: string): string | null {
  const normalized = normalizePhoneForWhatsApp(phone);
  if (!normalized) return null;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

export function buildMailtoUrl(
  email: string | null | undefined,
  subject: string,
  body: string,
): string | null {
  if (!email) return null;
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
