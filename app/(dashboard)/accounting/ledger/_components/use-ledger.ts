import { useState, useEffect } from "react";
import { getAccountHistory, getLedgerAccounts } from "../actions";
import { NormalBalance } from "@/prisma/generated/prisma/browser";

type AccountHistory = NonNullable<
  Awaited<ReturnType<typeof getAccountHistory>>
>["data"];

export function useLedger() {
  const [selectedAccount, setSelectedAccount] = useState<
    | NonNullable<Awaited<ReturnType<typeof getLedgerAccounts>>["data"]>[number]
    | undefined
  >();
  const [entries, setEntries] = useState<AccountHistory>();
  const [loading, setLoading] = useState(false);
  const [accountDetails, setAccountDetails] = useState<{
    normalBalance: NormalBalance;
  } | null>(null);
  
  // Filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showDraft, setShowDraft] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    if (!selectedAccount?.id) return;

    const fetchEntries = async () => {
      setLoading(true);
      const responseWithPagination = await getAccountHistory({
        accountId: selectedAccount.id,
        page,
        pageSize,
        startDate,
        endDate,
        showDraft,
      });

      if (responseWithPagination.success && responseWithPagination.data) {
        setEntries(responseWithPagination.data);
        setAccountDetails(responseWithPagination.data.account);
      }
      setLoading(false);
    };

    // Debounce fetching
    const timer = setTimeout(() => {
      fetchEntries();
    }, 300);

    return () => clearTimeout(timer);
  }, [selectedAccount?.id, startDate, endDate, showDraft, page, pageSize]);

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
