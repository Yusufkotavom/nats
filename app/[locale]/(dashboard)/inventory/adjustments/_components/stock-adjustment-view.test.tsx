import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi, describe, it, expect, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { SuperJSON } from "@/lib/superjson";

// --- Mocks: translations
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

// --- Mocks: server actions (next/cache etc. can't run in jsdom)
const postStockAdjustmentMock = vi.fn();
const getWarehouseStockSnapshotMock = vi.fn();
vi.mock("../actions", () => ({
  postStockAdjustment: (...args: unknown[]) => postStockAdjustmentMock(...args),
  getWarehouseStockSnapshot: (...args: unknown[]) =>
    getWarehouseStockSnapshotMock(...args),
}));

// --- Mock SearchableSelect to avoid cmdk/Radix overhead in jsdom
vi.mock("@/components/ui/searchable-select", () => ({
  SearchableSelect: ({
    value,
    onValueChange,
    options,
    placeholder,
  }: {
    value: string;
    onValueChange: (value: string) => void;
    options: { value: string; label: string }[];
    placeholder?: string;
  }) => (
    <select
      data-testid="warehouse-select"
      aria-label={placeholder}
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
    >
      <option value="">{placeholder || ""}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}));

// --- Mock layout components (they depend on context/providers not needed for this test)
vi.mock("@/components/layout/page/list-layout", () => ({
  PageListLayout: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  PageListHeader: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  PageListTitle: ({ title }: { title: string }) => <h1>{title}</h1>,
  PageListActions: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  PageListFilter: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  PageListContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
}));

// --- ResizeObserver polyfill for Radix dialog in jsdom
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
  ResizeObserverMock;

// Import AFTER mocks so the component picks them up.
import {
  StockAdjustmentView,
  buildAdjustmentSummary,
} from "./stock-adjustment-view";

const warehouses = [
  { id: "w1", name: "Gudang Utama" },
  { id: "w2", name: "Gudang Cabang" },
];

const products = [
  {
    id: "p1",
    name: "Beras 5kg",
    sku: "BRS-5KG",
    averageCost: 50_000,
    cost: 50_000,
    baseUnit: { symbol: "pcs" },
  },
  {
    id: "p2",
    name: "Gula 1kg",
    sku: "GLA-1KG",
    averageCost: 15_000,
    cost: 15_000,
    baseUnit: { symbol: "pcs" },
  },
  {
    id: "p3",
    name: "Minyak 1L",
    sku: "MNY-1L",
    averageCost: 20_000,
    cost: 20_000,
    baseUnit: { symbol: "pcs" },
  },
];

function renderView() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={client}>
      <StockAdjustmentView warehouses={warehouses} products={products} />
    </QueryClientProvider>,
  );
}

describe("buildAdjustmentSummary", () => {
  it("filters out rows without diff and aggregates counts + absolute impact", () => {
    const snapshot = new Map([
      ["p1", { currentStock: 10, unitCost: 50_000 }],
      ["p2", { currentStock: 5, unitCost: 15_000 }],
      ["p3", { currentStock: 8, unitCost: 20_000 }],
    ]);
    const rows = {
      p1: { productId: "p1", actualStock: 12, note: "" }, // +2 * 50_000 = 100_000
      p2: { productId: "p2", actualStock: 3, note: "short" }, // -2 * 15_000 = 30_000
      p3: { productId: "p3", actualStock: 8, note: "" }, // 0 diff -> excluded
    };

    const summary = buildAdjustmentSummary(products, rows, snapshot);

    expect(summary.changes).toHaveLength(2);
    expect(summary.increaseCount).toBe(1);
    expect(summary.decreaseCount).toBe(1);
    expect(summary.totalAbsoluteImpact).toBe(130_000);

    const byId = Object.fromEntries(
      summary.changes.map((change) => [change.productId, change]),
    );
    expect(byId.p1.diff).toBe(2);
    expect(byId.p1.lineImpact).toBe(100_000);
    expect(byId.p2.diff).toBe(-2);
    expect(byId.p2.lineImpact).toBe(30_000);
    expect(byId.p2.note).toBe("short");
  });

  it("falls back to product cost when snapshot unitCost is missing", () => {
    const snapshot = new Map<string, { currentStock: number; unitCost: number }>();
    const rows = {
      p1: { productId: "p1", actualStock: 1, note: "" }, // current 0 -> +1
    };
    const summary = buildAdjustmentSummary([products[0]], rows, snapshot);
    expect(summary.changes).toHaveLength(1);
    expect(summary.changes[0].unitCost).toBe(50_000);
    expect(summary.totalAbsoluteImpact).toBe(50_000);
  });
});

describe("StockAdjustmentView confirmation flow", () => {
  beforeEach(() => {
    postStockAdjustmentMock.mockReset();
    getWarehouseStockSnapshotMock.mockReset();
    // Start with all stocks at a known level.
    getWarehouseStockSnapshotMock.mockResolvedValue(
      SuperJSON.serialize([
        { productId: "p1", currentStock: 10, unitCost: 50_000 },
        { productId: "p2", currentStock: 5, unitCost: 15_000 },
        { productId: "p3", currentStock: 8, unitCost: 20_000 },
      ]),
    );
  });

  async function changeActual(productSku: string, newValue: number) {
    // The Actual input is the first number input in the row containing the SKU text.
    const rowText = screen.getByText(productSku);
    const row = rowText.closest("tr");
    if (!row) throw new Error("row not found");
    const numberInputs = row.querySelectorAll<HTMLInputElement>(
      'input[type="number"]',
    );
    fireEvent.change(numberInputs[0], { target: { value: String(newValue) } });
  }

  it("does not open the confirmation dialog when there is no diff", async () => {
    renderView();

    // Wait until the snapshot is applied (Current column renders "10 pcs" for p1).
    await waitFor(() =>
      expect(screen.getByText(/10 pcs/)).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: /post adjustment/i }));

    // No dialog (resume) should appear.
    expect(screen.queryByTestId("confirm-post-dialog")).not.toBeInTheDocument();
    expect(postStockAdjustmentMock).not.toHaveBeenCalled();
  });

  it("opens the dialog with a resume of changes, and cancels without posting", async () => {
    renderView();

    await waitFor(() =>
      expect(screen.getByText(/10 pcs/)).toBeInTheDocument(),
    );

    // Change p1 from 10 -> 12 (+2, impact 100_000), p2 from 5 -> 3 (-2, impact 30_000)
    await changeActual("BRS-5KG", 12);
    await changeActual("GLA-1KG", 3);

    fireEvent.click(screen.getByRole("button", { name: /post adjustment/i }));

    // Dialog opens with resume figures.
    expect(
      await screen.findByTestId("confirm-post-dialog"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("confirm-warehouse")).toHaveTextContent(
      "Gudang Utama",
    );
    expect(screen.getByTestId("confirm-changed-lines")).toHaveTextContent("2");
    expect(screen.getByTestId("confirm-increase-count")).toHaveTextContent(
      "+1",
    );
    expect(screen.getByTestId("confirm-decrease-count")).toHaveTextContent(
      "-1",
    );
    expect(screen.getByTestId("confirm-total-impact")).toHaveTextContent(
      "130.000",
    );

    // Resume list includes both changed products (not the untouched one).
    const list = screen.getByTestId("confirm-changes-list");
    expect(list).toHaveTextContent("Beras 5kg");
    expect(list).toHaveTextContent("Gula 1kg");
    expect(list).not.toHaveTextContent("Minyak 1L");

    // Cancel: posting action must not be called.
    fireEvent.click(screen.getByRole("button", { name: /batal/i }));
    expect(postStockAdjustmentMock).not.toHaveBeenCalled();
  });

  it("posts only non-zero diff lines when the user confirms", async () => {
    postStockAdjustmentMock.mockResolvedValue({
      success: true,
      data: { movementId: "mv-1", journalEntryId: "je-1", adjustedLines: 2 },
    });

    renderView();

    await waitFor(() =>
      expect(screen.getByText(/10 pcs/)).toBeInTheDocument(),
    );

    await changeActual("BRS-5KG", 12);
    await changeActual("GLA-1KG", 3);

    fireEvent.click(screen.getByRole("button", { name: /post adjustment/i }));
    await screen.findByTestId("confirm-post-dialog");

    fireEvent.click(screen.getByRole("button", { name: /post sekarang/i }));

    await waitFor(() => expect(postStockAdjustmentMock).toHaveBeenCalledTimes(1));

    const payload = postStockAdjustmentMock.mock.calls[0][0];
    expect(payload.warehouseId).toBe("w1");
    expect(payload.lines).toHaveLength(2);
    const byProduct = Object.fromEntries(
      payload.lines.map(
        (line: { productId: string; actualStock: number }) => [
          line.productId,
          line.actualStock,
        ],
      ),
    );
    expect(byProduct.p1).toBe(12);
    expect(byProduct.p2).toBe(3);
    // Unchanged product must not be in the payload.
    expect(payload.lines.some((line: { productId: string }) => line.productId === "p3")).toBe(false);
  });
});
