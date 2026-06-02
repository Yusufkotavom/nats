import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TransactionForm } from "./transaction-form";

const toastMock = vi.hoisted(() => vi.fn());
const createCashTransactionMock = vi.hoisted(() => vi.fn());
const updateCashTransactionMock = vi.hoisted(() => vi.fn());
const pushMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const labels: Record<string, string> = {
      amount: "Nominal",
      cash_bank_account: "Akun Kas/Bank",
      category: "Cashbank Category",
      date: "Tanggal",
      description: "Deskripsi",
      entry_mode: "Mode Input",
      entry_mode_accounting: "Accounting",
      entry_mode_simple: "Simple",
      expense_out: "Uang Keluar",
      contact_optional: "Kontak (opsional)",
      manage_categories: "Kelola kategori",
      new_cash_transaction: "Transaksi Kas Baru",
      optional_reference: "Referensi opsional",
      reference: "Referensi",
      revenue_in: "Uang Masuk",
      save_transaction: "Create",
      select_account: "Pilih akun",
      select_contact: "Pilih kontak",
      select_transaction_category: "Pilih kategori transaksi",
      transaction_description: "Contoh: Setoran penjualan shift pagi",
      type: "Jenis Transaksi",
      validation_error: "Data belum lengkap",
    };
    return labels[key] || key;
  },
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock("../actions", () => ({
  createCashTransaction: createCashTransactionMock,
  updateCashTransaction: updateCashTransactionMock,
}));

vi.mock("@/app/[locale]/(dashboard)/general/files/actions", () => ({
  uploadFile: vi.fn(),
}));

function renderForm() {
  const queryClient = new QueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <TransactionForm
        paymentMethodAccounts={[
          {
            id: "cash-1",
            name: "Kas Utama",
            method: "CASH",
            accountType: "CASH",
            bankName: null,
            accountNumber: null,
            glCode: "101",
            glName: "Kas",
            isDefault: true,
          },
        ]}
        glAccounts={[
          {
            id: "cat-1",
            code: "4001",
            name: "Penjualan Tunai",
            type: "revenue",
            parentId: "income-parent",
          } as any,
        ]}
        incomeParentAccountId="income-parent"
        expenseParentAccountId="expense-parent"
        contacts={[]}
        initialData={{
          date: new Date("2026-06-02"),
          type: "INCOME" as any,
          cashAccountId: "cash-1",
          contactId: "",
          amount: 50000,
          categoryAccountId: "cat-1",
          allocations: [{ accountId: "cat-1", amount: 50000, description: "" }],
          attachments: [],
          notes: "",
          reference: "",
          description: "",
        }}
      />
    </QueryClientProvider>,
  );
}

describe("TransactionForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("highlights the required main cash transaction fields", () => {
    renderForm();

    expect(screen.getByText("Field utama yang wajib diisi")).toBeInTheDocument();
    expect(screen.getByText("Akun Kas/Bank")).toBeInTheDocument();
    expect(screen.getByText("Nominal")).toBeInTheDocument();
    expect(screen.getByText("Cashbank Category")).toBeInTheDocument();
  });

  it("shows a clear description-required notification on create", () => {
    renderForm();

    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    expect(toastMock).toHaveBeenCalledWith({
      title: "Data belum lengkap",
      description:
        "Deskripsi wajib diisi. Tuliskan tujuan transaksi, contoh: Setoran penjualan shift pagi.",
      variant: "destructive",
    });
    expect(createCashTransactionMock).not.toHaveBeenCalled();
  });
});
