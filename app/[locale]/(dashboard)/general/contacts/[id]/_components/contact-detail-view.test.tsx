import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ContactDetailView } from "./contact-detail-view";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/id/general/contacts/c1",
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-format-currency", () => ({
  useFormatCurrency: () => (value: number) => `Rp ${value}`,
}));

vi.mock("@/hooks/use-format-date", () => ({
  useFormatDate: () => (value: Date | string) =>
    typeof value === "string" ? value : value.toISOString(),
}));

vi.mock("@/components/ui/tabs", async () => {
  const React = await import("react");

  const TabsContext = React.createContext<{
    value: string;
    setValue: (value: string) => void;
  } | null>(null);

  return {
    Tabs: ({
      defaultValue,
      children,
    }: {
      defaultValue: string;
      children: React.ReactNode;
    }) => {
      const [value, setValue] = React.useState(defaultValue);
      return (
        <TabsContext.Provider value={{ value, setValue }}>
          {children}
        </TabsContext.Provider>
      );
    },
    TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    TabsTrigger: ({
      value,
      children,
    }: {
      value: string;
      children: React.ReactNode;
    }) => {
      const context = React.useContext(TabsContext);
      if (!context) {
        throw new Error("TabsTrigger must be used within Tabs");
      }
      const active = context.value === value;
      return (
        <button
          aria-selected={active}
          role="tab"
          type="button"
          onClick={() => context.setValue(value)}
        >
          {children}
        </button>
      );
    },
    TabsContent: ({
      value,
      children,
    }: {
      value: string;
      children: React.ReactNode;
    }) => {
      const context = React.useContext(TabsContext);
      if (!context || context.value !== value) {
        return null;
      }
      return <div>{children}</div>;
    },
  };
});

vi.mock("@/app/[locale]/communications/actions", () => ({
  getContactMessageTemplates: vi.fn().mockResolvedValue([]),
  upsertContactMessageTemplate: vi.fn().mockResolvedValue(undefined),
  createContactCommunicationLog: vi.fn().mockResolvedValue({ id: "log-1" }),
  updateContactCommunicationLogStatus: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../_components/contact-dialog", () => ({
  ContactDialog: ({
    open,
  }: {
    open: boolean;
  }) => (open ? <div>edit_contact</div> : null),
}));

describe("ContactDetailView transactions filter", () => {
  it("filters transaction rows by area", async () => {
    render(
      <ContactDetailView
        contact={{
          id: "c1",
          name: "Customer 1",
          type: "CUSTOMER",
          email: "c1@example.com",
          phone: "08123",
          address: "Bandung",
          isActive: true,
          createdAt: new Date("2026-06-01T00:00:00.000Z"),
          updatedAt: new Date("2026-06-02T00:00:00.000Z"),
        } as any}
        messagingContext={{
          contact: {
            id: "c1",
            name: "Customer 1",
            phone: "08123",
            email: "c1@example.com",
            type: "CUSTOMER",
          },
          summary: {
            totalTransactions: 3,
            totalSalesInvoiced: 150000,
            totalSalesPaid: 100000,
            outstandingBalance: 50000,
            lastTransactionAt: new Date("2026-06-03T00:00:00.000Z"),
          },
          transactionHistory: [
            {
              id: "sales-1",
              area: "Sales",
              type: "Sales Invoice",
              documentNumber: "INV-001",
              status: "ISSUED",
              amount: 150000,
              balanceDue: 50000,
              happenedAt: new Date("2026-06-03T00:00:00.000Z"),
              detail: "Invoice aktif",
              href: "/sales/invoices/inv1",
            },
            {
              id: "service-1",
              area: "Service",
              type: "Service Order",
              documentNumber: "SVC-001",
              status: "PROCESSING",
              amount: 75000,
              balanceDue: 25000,
              happenedAt: new Date("2026-06-02T00:00:00.000Z"),
              detail: "Service laptop",
              href: null,
            },
            {
              id: "cash-1",
              area: "Cash",
              type: "Cash Income",
              documentNumber: "CASH-001",
              status: "APPROVED",
              amount: 100000,
              balanceDue: null,
              happenedAt: new Date("2026-06-01T00:00:00.000Z"),
              detail: "Kas masuk",
              href: null,
            },
          ],
          latestInvoice: null,
          latestSalesOrder: null,
          latestServiceOrder: null,
          recentWhatsAppLogs: [],
        }}
      />,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Transactions" }));

    await waitFor(() => {
      expect(
        screen.getByRole("tab", { name: "Transactions" }),
      ).toHaveAttribute("aria-selected", "true");
      expect(screen.getByText("INV-001")).toBeInTheDocument();
    });
    expect(screen.getByText("SVC-001")).toBeInTheDocument();
    expect(screen.getByText("CASH-001")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Service" }));

    await waitFor(() => {
      expect(screen.queryByText("INV-001")).not.toBeInTheDocument();
    });
    expect(screen.getByText("SVC-001")).toBeInTheDocument();
    expect(screen.queryByText("CASH-001")).not.toBeInTheDocument();
  });

  it("opens existing contact dialog from detail header edit action", async () => {
    render(
      <ContactDetailView
        contact={{
          id: "c1",
          name: "Customer 1",
          type: "CUSTOMER",
          email: "c1@example.com",
          phone: "08123",
          address: "Bandung",
          isActive: true,
          createdAt: new Date("2026-06-01T00:00:00.000Z"),
          updatedAt: new Date("2026-06-02T00:00:00.000Z"),
        } as any}
        messagingContext={null as any}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit Contact" }));

    expect(await screen.findByText("edit_contact")).toBeInTheDocument();
  });
});
