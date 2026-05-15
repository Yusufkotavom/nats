import { describe, expect, it } from "vitest";
import {
  buildMailtoUrl,
  buildWhatsAppUrl,
  normalizePhoneForWhatsApp,
} from "./contact-communication";

describe("contact-communication", () => {
  it("normalizes Indonesian mobile numbers to 62 format", () => {
    expect(normalizePhoneForWhatsApp("0812-3456-7890")).toBe("6281234567890");
    expect(normalizePhoneForWhatsApp("+62 812 3456 7890")).toBe("6281234567890");
    expect(normalizePhoneForWhatsApp("81234567890")).toBe("6281234567890");
  });

  it("builds WhatsApp URL when phone exists", () => {
    const url = buildWhatsAppUrl("081234567890", "Halo Promo");
    expect(url).toContain("https://wa.me/6281234567890");
    expect(url).toContain("text=Halo%20Promo");
  });

  it("returns null WhatsApp URL for empty phone", () => {
    expect(buildWhatsAppUrl("", "msg")).toBeNull();
    expect(buildWhatsAppUrl(null, "msg")).toBeNull();
  });

  it("builds mailto URL when email exists", () => {
    const url = buildMailtoUrl("a@example.com", "Hello", "World");
    expect(url).toContain("mailto:a@example.com");
    expect(url).toContain("subject=Hello");
    expect(url).toContain("body=World");
  });
});
