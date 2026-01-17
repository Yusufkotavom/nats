import { useState } from "react";
import { getAccountHistory, getLedgerAccounts } from "./actions";
import { NormalBalance } from "@/prisma/generated/prisma/browser";
import { useQuery, keepPreviousData } from "@tanstack/react-query";

type AccountHistory = NonNullable<
  Awaited<ReturnType<typeof getAccountHistory>>
>["data"];

export function useLedger() {
  const [selectedAccount, setSelectedAccount] = useState<
    | NonNullable<Awaited<ReturnType<typeof getLedgerAccounts>>["data"]>[number]
    | undefined
  >();

  // Filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showDraft, setShowDraft] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data: entries, isLoading: loading } = useQuery({
    queryKey: [
      "ledger-entries",
      { accountId: selectedAccount?.id, page, pageSize, startDate, endDate, showDraft },
    ],
    queryFn: async () => {
      if (!selectedAccount?.id) return null;
      const response = await getAccountHistory({
        accountId: selectedAccount.id,
        page,
        pageSize,
        startDate,
        endDate,
        showDraft,
      });
      return response.success ? response.data : null;
    },
    enabled: !!selectedAccount?.id,
    placeholderData: keepPreviousData,
  });

  const accountDetails = entries?.account || null;

  const handleAccountChange = (
    value: string,
    accounts: Awaited<ReturnType<typeof getLedgerAccounts>>["data"]
  ) => {
    const found = accounts?.find((item) => item.id == value);
    if (found) {
      setSelectedAccount(found);
      setPage(1);
    }
  };

  const balance =
    accountDetails?.normalBalance === "debit"
      ? (entries?.totals?.debit ?? 0) - (entries?.totals?.credit ?? 0)
      : (entries?.totals?.credit ?? 0) - (entries?.totals?.debit ?? 0);

  return {
    selectedAccount,
    entries,
    loading,
    accountDetails,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    showDraft,
    setShowDraft,
    page,
    setPage,
    handleAccountChange,
    balance,
    pageSize,
  };
}
