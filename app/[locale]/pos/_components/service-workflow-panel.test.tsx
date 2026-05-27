import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SuperJSON } from "@/lib/superjson";
import { ServiceWorkflowPanel } from "./service-workflow-panel";

const actionsMock = vi.hoisted(() => ({
  getPOSServiceOrders: vi.fn(),
  getPOSContacts: vi.fn(),
  getPOSServiceNotifySettings: vi.fn(),
  getPOSPaymentMethods: vi.fn(),
}));

vi.mock("../actions", () => ({
  getPOSServiceOrders: (...args: unknown[]) => actionsMock.getPOSServiceOrders(...args),
  getPOSContacts: (...args: unknown[]) => actionsMock.getPOSContacts(...args),
  getPOSServiceNotifySettings: (...args: unknown[]) =>
    actionsMock.getPOSServiceNotifySettings(...args),
  getPOSPaymentMethods: (...args: unknown[]) =>
    actionsMock.getPOSPaymentMethods(...args),
  createPOSServiceOrder: vi.fn(),
  settlePOSServiceOrder: vi.fn(),
  updatePOSServiceOrderStatus: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/id/pos",
}));

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

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock("./quick-contact-dialog", () => ({
  QuickContactDialog: () => null,
}));

describe("ServiceWorkflowPanel responsive layout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    actionsMock.getPOSServiceOrders.mockResolvedValue(SuperJSON.serialize([]));
    actionsMock.getPOSContacts.mockResolvedValue(SuperJSON.serialize([]));
    actionsMock.getPOSServiceNotifySettings.mockResolvedValue(
      SuperJSON.serialize({
        serviceNotifyOnCreated: true,
        serviceNotifyOnReady: true,
        serviceNotifyOnCostDone: true,
        serviceNotifyOnPickedUp: true,
        serviceTemplateCreated: "",
        serviceTemplateReady: "",
        serviceTemplateCostDone: "",
        serviceTemplatePickedUp: "",
        serviceWarrantyDuration: 0,
        serviceWarrantyUnit: "DAY",
      }),
    );
    actionsMock.getPOSPaymentMethods.mockResolvedValue(SuperJSON.serialize([]));
  });

  it("uses mobile-first stacked layout for form fields and desktop-only queue max-height", async () => {
    const client = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    const { container } = render(
      <QueryClientProvider client={client}>
        <ServiceWorkflowPanel
          sessionId="sess-1"
          products={[
            {
              id: "svc-1",
              name: "Jasa A",
              sku: "SVC-1",
              price: 120000,
              image: null,
              isService: true,
              categoryId: null,
              categoryName: null,
              stock: 0,
              availableDiscounts: [],
            },
          ]}
        />
      </QueryClientProvider>,
    );

    expect(screen.getByText("Buat Service Order")).toBeInTheDocument();
    expect(screen.getByText("Service Queue")).toBeInTheDocument();

    const responsiveFieldRows = container.querySelectorAll(
      "div.grid.grid-cols-1.gap-2.sm\\:grid-cols-2",
    );
    expect(responsiveFieldRows.length).toBeGreaterThanOrEqual(2);

    const queueContent = screen.getByText("Service Queue").closest(".min-h-0")?.querySelector(
      ".space-y-3.overflow-y-auto",
    ) as HTMLElement | null;
    expect(queueContent).not.toBeNull();
    expect(queueContent?.className).toContain("lg:max-h-[calc(100vh-16rem)]");
  });
});
