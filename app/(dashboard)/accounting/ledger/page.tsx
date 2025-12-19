import { getPostingAccounts } from "./actions";
import { LedgerView } from "./_components/ledger-view";
import { Account } from "../types";

export default async function LedgerPage() {
  const res = await getPostingAccounts();
  const accounts = (res.success && res.data ? res.data : []) as Account[];

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <LedgerView accounts={accounts} />
    </div>
  );
}
