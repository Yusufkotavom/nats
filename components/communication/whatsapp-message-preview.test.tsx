import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { WhatsAppMessagePreview } from "./whatsapp-message-preview";

describe("WhatsAppMessagePreview", () => {
  it("renders whatsapp line breaks and bold markers as readable preview", () => {
    render(
      <WhatsAppMessagePreview
        message={
          "Halo Wii Book,\n\n*Invoice*\n*Nomor:* INV-2606-0038\n*Link:* https://restoran.devk.my.id/id/public/t/token-1"
        }
      />,
    );

    expect(screen.getByText("Invoice")).toHaveClass("font-semibold");
    expect(
      screen.getByText((_, element) => element?.textContent === "Nomor: INV-2606-0038"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        (_, element) =>
          element?.textContent === "Link: https://restoran.devk.my.id/id/public/t/token-1",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Preview WhatsApp").parentElement).toHaveClass("whitespace-pre-wrap");
  });
});
