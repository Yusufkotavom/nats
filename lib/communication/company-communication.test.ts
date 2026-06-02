import { describe, expect, it } from "vitest";

import { getCommunicationEventMeta, renderCommunicationTemplate } from "./company-communication";

describe("company communication defaults", () => {
  it("renders sales invoice message as multiline whatsapp-style content", () => {
    const template = getCommunicationEventMeta("SALES_INVOICE_ISSUED")?.defaultTemplate;

    expect(template).toBeTruthy();

    const message = renderCommunicationTemplate(template!, {
      customer_name: "Wii Book",
      doc_number: "INV-2606-0038",
      amount: "Rp50.000,00",
      remaining_amount: "Rp0,00",
      doc_url: "https://restoran.devk.my.id/id/public/t/token-1",
      date: "02 Jun 2026",
      status: "ISSUED",
    });

    expect(message).toContain("\n");
    expect(message).toContain("*Invoice*");
    expect(message).toContain("*Nomor:* INV-2606-0038");
    expect(message).toContain("https://restoran.devk.my.id/id/public/t/token-1");
  });
});
