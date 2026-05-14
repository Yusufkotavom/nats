import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { SuperJSON } from "@/lib/superjson";

// --- Mocks: translations
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

// next-intl/navigation is pulled in transitively via i18n/routing.ts.
// Provide a minimal createNavigation stub so module init does not blow up.
vi.mock("next-intl/navigation", () => ({
  createNavigation: () => ({
    Link: () => null,
    redirect: () => undefined,
    usePathname: () => "/pos",
    useRouter: () => ({
      push: () => undefined,
      replace: () => undefined,
      refresh: () => undefined,
      back: () => undefined,
      forward: () => undefined,
      prefetch: () => undefined,
    }),
    getPathname: () => "/pos",
  }),
}));

// --- next/navigation is aliased via vitest.config to __mocks__/next-navigation.
// Override specific fn impls for this suite via vi.mocked().
import * as NextNav from "next/navigation";
const routerReplaceMock = vi.fn();
const routerPushMock = vi.fn();
const routerRefreshMock = vi.fn();
let currentSearchParams = new URLSearchParams();

vi.mocked(NextNav.useRouter).mockReturnValue({
  push: routerPushMock,
  replace: routerReplaceMock,
  refresh: routerRefreshMock,
  back: vi.fn(),
  forward: vi.fn(),
  prefetch: vi.fn(),
} as unknown as ReturnType<typeof NextNav.useRouter>);
vi.mocked(NextNav.useSearchParams).mockImplementation(
  () => currentSearchParams as unknown as ReturnType<typeof NextNav.useSearchParams>,
);
vi.mocked(NextNav.usePathname).mockReturnValue("/pos");

// --- Mocks: server actions
const actionMocks = {
  closePOSSession: vi.fn(),
  getPOSSessionCloseSummary: vi.fn(),
  getHeldOrders: vi.fn(),
  holdOrder: vi.fn(),
  getPOSProducts: vi.fn(),
  getDiningSpots: vi.fn(),
  getRestaurantFloorOverview: vi.fn(),
  getKitchenTickets: vi.fn(),
  getRestaurantBillingQueue: vi.fn(),
};
vi.mock("../actions", () => ({
  closePOSSession: (...args: unknown[]) => actionMocks.closePOSSession(...args),
  getPOSSessionCloseSummary: (...args: unknown[]) =>
    actionMocks.getPOSSessionCloseSummary(...args),
  getHeldOrders: (...args: unknown[]) => actionMocks.getHeldOrders(...args),
  holdOrder: (...args: unknown[]) => actionMocks.holdOrder(...args),
  getPOSProducts: (...args: unknown[]) => actionMocks.getPOSProducts(...args),
  getDiningSpots: (...args: unknown[]) => actionMocks.getDiningSpots(...args),
  getRestaurantFloorOverview: (...args: unknown[]) =>
    actionMocks.getRestaurantFloorOverview(...args),
  getKitchenTickets: (...args: unknown[]) =>
    actionMocks.getKitchenTickets(...args),
  getRestaurantBillingQueue: (...args: unknown[]) =>
    actionMocks.getRestaurantBillingQueue(...args),
}));

// --- Mocks: heavy children stubbed to isolate shell behavior
vi.mock("./product-grid", () => ({
  ProductGrid: () => <div data-testid="product-grid" />,
}));
vi.mock("./cart-view", () => ({
  CartView: () => <div data-testid="cart-view" />,
}));
vi.mock("./held-orders-dialog", () => ({
  HeldOrdersDialog: ({ trigger }: { trigger: ReactNode }) => <div>{trigger}</div>,
}));
vi.mock("./pos-history-dialog", () => ({
  POSHistoryDialog: () => null,
}));
vi.mock("./clock", () => ({
  Clock: () => <div data-testid="clock" />,
}));
vi.mock("./floor-tab", () => ({
  FloorTab: () => <div data-testid="floor-tab" />,
}));
vi.mock("./kitchen-tab", () => ({
  KitchenTab: () => <div data-testid="kitchen-tab" />,
}));
vi.mock("./billing-tab", () => ({
  BillingTab: () => <div data-testid="billing-tab" />,
}));
vi.mock("./service-workflow-panel", () => ({
  ServiceWorkflowPanel: () => <div data-testid="service-workflow-panel" />,
}));

// --- Session provider mock (used for useSession hook)
vi.mock("@/components/providers/session-provider", () => ({
  useSession: () => ({
    userName: "Jane Cashier",
    role: "Cashier",
  }),
  SessionProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
  ResizeObserverMock;

import { POSView } from "./pos-view";

function makeSerialized<T>(value: T) {
  return SuperJSON.serialize(value);
}

const baseProps = () => ({
  initialProducts: makeSerialized({
    items: [],
    total: 0,
    hasMore: false,
  }),
  categories: makeSerialized([]),
  session: makeSerialized({
    id: "sess-1",
    sessionNumber: "POS-1",
    startTime: new Date(),
    warehouse: { name: "Main" },
  }),
  diningSpots: makeSerialized([
    {
      id: "spot-1",
      spotCode: "T-01",
      spotName: "Table 1",
      spotType: "TABLE",
      status: "ORDERING",
      area: { id: "area-1", name: "Indoor" },
    },
  ]),
  checkoutSettings: { feeLines: [] },
});

function renderView() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={client}>
      <POSView {...baseProps()} />
    </QueryClientProvider>,
  );
}

describe("POSView tab shell", () => {
  beforeEach(() => {
    Object.values(actionMocks).forEach((m) => m.mockReset());
    actionMocks.getHeldOrders.mockResolvedValue(makeSerialized([]));
    actionMocks.getPOSSessionCloseSummary.mockResolvedValue(
      makeSerialized({
        openingCash: 100000,
        cashSales: 50000,
        systemCash: 150000,
      }),
    );
    actionMocks.getDiningSpots.mockResolvedValue(
      makeSerialized([
        {
          id: "spot-1",
          spotCode: "T-01",
          spotName: "Table 1",
          spotType: "TABLE",
          status: "ORDERING",
          area: { id: "area-1", name: "Indoor" },
        },
      ]),
    );
    routerReplaceMock.mockReset();
    routerPushMock.mockReset();
    routerRefreshMock.mockReset();
    currentSearchParams = new URLSearchParams();
  });

  it("renders all four tabs", () => {
    renderView();
    expect(screen.getByRole("tab", { name: /meja/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /kasir/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /dapur/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /billing/i })).toBeInTheDocument();
  });

  it("default tab is cashier when no ?tab in URL", () => {
    renderView();
    expect(
      screen.getByRole("tab", { name: /kasir/i }),
    ).toHaveAttribute("data-state", "active");
    expect(screen.getByTestId("cart-view")).toBeInTheDocument();
  });

  it("renders Floor tab when ?tab=floor", () => {
    currentSearchParams = new URLSearchParams("tab=floor");
    renderView();
    expect(
      screen.getByRole("tab", { name: /meja/i }),
    ).toHaveAttribute("data-state", "active");
    expect(screen.getByTestId("floor-tab")).toBeInTheDocument();
  });

  it("Alt+D shortcut navigates to Dapur tab via router.replace", () => {
    renderView();
    act(() => {
      fireEvent.keyDown(window, { key: "d", altKey: true });
    });
    expect(routerReplaceMock).toHaveBeenCalled();
    const lastCall = routerReplaceMock.mock.calls.at(-1)?.[0];
    expect(lastCall).toMatch(/tab=kitchen/);
  });

  it("Alt+B shortcut navigates to Billing tab", () => {
    renderView();
    act(() => {
      fireEvent.keyDown(window, { key: "B", altKey: true });
    });
    const lastCall = routerReplaceMock.mock.calls.at(-1)?.[0];
    expect(lastCall).toMatch(/tab=billing/);
  });

  it("Alt+M shortcut is ignored when typing in an input", () => {
    renderView();
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();
    act(() => {
      fireEvent.keyDown(input, { key: "m", altKey: true });
    });
    expect(routerReplaceMock).not.toHaveBeenCalled();
    input.remove();
  });

  it("shows 'Belum pilih meja' chip when no spot is selected", () => {
    renderView();
    expect(screen.getByText(/Belum pilih meja/i)).toBeInTheDocument();
  });

  it("shows spot chip when ?spot=... is in URL", () => {
    currentSearchParams = new URLSearchParams("spot=spot-1");
    renderView();
    expect(screen.getByText(/T-01/)).toBeInTheDocument();
    expect(screen.getByText(/Indoor/)).toBeInTheDocument();
    expect(screen.getByText(/ORDERING/)).toBeInTheDocument();
  });

  it("shows server cash field above actual cash in close-session dialog", () => {
    const { container } = renderView();

    const accountMenuTrigger = container.querySelector(
      'button[aria-haspopup="menu"]',
    ) as HTMLButtonElement | null;
    expect(accountMenuTrigger).toBeTruthy();
    fireEvent.pointerDown(accountMenuTrigger as HTMLButtonElement);
    fireEvent.click(screen.getByText("close_session"));

    const labels = screen.getAllByText(/\(Rp\)/i);
    expect(labels[0]).toHaveTextContent(/cash_in_server/i);
    expect(labels[1]).toHaveTextContent(/actual cash/i);
    expect(actionMocks.getPOSSessionCloseSummary).toHaveBeenCalledWith("sess-1");
  });
});
