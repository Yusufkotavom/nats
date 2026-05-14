import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { GuideDoc } from "@/lib/user-guide";
import { DocsShell } from "./docs-shell";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

class IntersectionObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe("DocsShell", () => {
  beforeEach(() => {
    (globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver =
      IntersectionObserverMock;
  });

  it("renders h2-h4 sections in TOC and creates heading anchors", async () => {
    const current: GuideDoc = {
      slug: ["modules", "budgeting"],
      title: "Modul Budgeting",
      module: "budgeting",
      order: 180,
      updatedAt: "2026-05-14",
      summary: "summary",
      related: [],
      content: [
        "## Ringkasan",
        "Intro",
        "### Aturan Utama",
        "Detail aturan",
        "#### Catatan Teknis",
        "Detail teknis",
      ].join("\n"),
    };

    render(<DocsShell current={current} docs={[current]} locale="en" />);

    expect(screen.getByRole("heading", { name: /Ringkasan/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Aturan Utama/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Catatan Teknis/ })).toBeInTheDocument();

    const ringkasanLinks = screen.getAllByRole("link", { name: "Ringkasan" });
    const aturanLinks = screen.getAllByRole("link", { name: "Aturan Utama" });
    const catatanLinks = screen.getAllByRole("link", { name: "Catatan Teknis" });

    expect(ringkasanLinks.some((link) => link.getAttribute("href") === "#ringkasan")).toBe(true);
    expect(aturanLinks.some((link) => link.getAttribute("href") === "#aturan-utama")).toBe(true);
    expect(catatanLinks.some((link) => link.getAttribute("href") === "#catatan-teknis")).toBe(true);

    expect(screen.getAllByText("Ringkasan").length).toBeGreaterThan(1);
    expect(screen.getAllByText("Aturan Utama").length).toBeGreaterThan(1);
    expect(screen.getAllByText("Catatan Teknis").length).toBeGreaterThan(1);
  });
});
