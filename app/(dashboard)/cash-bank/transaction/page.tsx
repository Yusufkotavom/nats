"use client";

import { Button } from "@/components/ui/button";
import {
  Plus,
  Check,
  Edit,
  Trash2,
  Eye,
  MoreHorizontal,
  Pencil,
} from "lucide-react";
import Link from "next/link";
import {
  getCashTransactions,
  approveCashTransaction,
  deleteCashTransaction,
} from "./actions";
import {
  PageListActions,
  PageListContent,
  PageListHeader,
  PageListLayout,
  PageListTitle,
} from "@/components/layout/page/list-layout";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { DataTable, Column } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatCurrency } from "@/lib/utils";
import {
  CashTransaction,
  CashAccount,
  CashTransactionAllocation,
  CashTransactionStatus,
  Contact,
} from "@/prisma/generated/prisma/browser";
import { Skeleton } from "@/components/ui/skeleton";
import { Decimal } from "decimal.js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useConfirm } from "@/hooks/use-confirm";
import { useTransition } from "react";
import { SuperJSON } from "@/lib/superjson";

interface TransactionWithDetails extends CashTransaction {
  cashAccount: CashAccount;
  allocations: CashTransactionAllocation[];
  status: CashTransactionStatus;
  contact?: Contact | null;
}

export default function CashTransactionListPage() {
  const searchParams = useSearchParams();
  const page = Number(searchParams.get("page")) || 1;
  const { toast } = useToast();
  const confirm = useConfirm();
  const [isPending, startTransition] = useTransition();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["cash-transactions", page],
    queryFn: async () => {
      const res = await getCashTransactions(page);
      console.log({ res });
      return {
        ...res,
        transactions: SuperJSON.deserialize(res.transactions),
      };
    },
    refetchOnMount: true,
    staleTime: 0,
  });

  const transactions = (data?.transactions ||
    []) as unknown as TransactionWithDetails[];
  const total = data?.total || 0;

  const handleApprove = async (id: string) => {
    if (
      await confirm({
        title: "Approve Transaction",
        description:
          "Are you sure you want to approve this transaction? This will post the journal entries and lock the transaction.",
      })
    ) {
      startTransition(async () => {
        try {
          await approveCashTransaction(id);
          queryClient.invalidateQueries({ queryKey: ["cash-transactions"] });
          queryClient.invalidateQueries({
            queryKey: ["cash-bank", "dashboard-stats"],
          });
          toast({
            title: "Success",
            description: "Transaction approved successfully",
          });
        } catch (error) {
          toast({
            title: "Error",
            description:
              error instanceof Error ? error.message : "Failed to approve",
            variant: "destructive",
          });
        }
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (
      await confirm({
        title: "Delete Transaction",
        description:
          "Are you sure you want to delete this transaction? This action cannot be undone.",
      })
    ) {
      startTransition(async () => {
        try {
          await deleteCashTransaction(id);
          queryClient.invalidateQueries({ queryKey: ["cash-transactions"] });
          queryClient.invalidateQueries({
            queryKey: ["cash-bank", "dashboard-stats"],
          });
          toast({
            title: "Success",
            description: "Transaction deleted successfully",
          });
        } catch (error) {
          toast({
            title: "Error",
            description:
              error instanceof Error ? error.message : "Failed to delete",
            variant: "destructive",
          });
        }
      });
    }
  };

  const columns: Column<TransactionWithDetails>[] = [
    {
      header: "Date",
      cell: (tx) => formatDate(tx.date),
    },
    {
      header: "Reference",
      cell: (tx) => tx.reference || "-",
    },
    {
      header: "Type",
      cell: (tx) => (
        <Badge variant={tx.type === "INCOME" ? "default" : "destructive"}>
          {tx.type}
        </Badge>
      ),
    },
    {
      header: "Contact",
      accessorKey: "contact",
      cell: (tx) => tx.contact?.name || "-",
    },
    {
      header: "Cash Account",
      accessorKey: "cashAccount",
      cell: (tx) => (
        <Link href={`/accounting/ledger/${tx.cashAccount.glAccountId}`} target="_blank">
          <span className="font-medium text-primary">{tx.cashAccount.name}</span>
        </Link>
      ),
    },
    {
      header: "Description",
      accessorKey: "description",
    },
    {
      header: "Amount",
      className: "text-right",
      headerClassName: "text-right",
      cell: (tx) => {
        const totalAmount = tx.allocations.reduce(
          (sum, a) => sum.plus(new Decimal(a.amount)),
          new Decimal(0),
        );
        return formatCurrency(totalAmount, { currency: "IDR" });
      },
    },
    {
      header: "Status",
      cell: (tx) => (
        <Badge
          variant={
            tx.status === "APPROVED"
              ? "default"
              : tx.status === "REJECTED"
                ? "destructive"
                : "secondary"
          }
        >
          {tx.status}
        </Badge>
      ),
    },
    {
      header: "Actions",
      cell: (tx) => {
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              {tx.status === "APPROVED" ? (
                <DropdownMenuItem asChild>
                  <Link href={`/cash-bank/transaction/${tx.id}`}>
                    <Eye className="mr-2 h-4 w-4" />
                    View
                  </Link>
                </DropdownMenuItem>
              ) : (
                <>
                  <DropdownMenuItem onClick={() => handleApprove(tx.id)}>
                    <Check className="mr-2 h-4 w-4" />
                    Approve
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/cash-bank/transaction/${tx.id}`}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => handleDelete(tx.id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <PageListLayout>
      <PageListHeader>
        <PageListTitle title="Cash In & Out" />
        <PageListActions>
          <Button asChild>
            <Link href="/cash-bank/transaction/new">
              <Plus className="mr-2 h-4 w-4" /> New Transaction
            </Link>
          </Button>
        </PageListActions>
      </PageListHeader>
      <PageListContent>
        {isLoading ? (
          <Skeleton className="h-[400px] w-full" />
        ) : (
          <DataTable
            data={transactions}
            columns={columns}
            pagination={{
              totalEntries: total,
              pageSize: 20,
              currentPage: page,
            }}
            emptyMessage="No transactions found."
          />
        )}
      </PageListContent>
    </PageListLayout>
  );
}
