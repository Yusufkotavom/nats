import { getLedgerAccounts } from "./actions";
import { LedgerView } from "./_components/ledger-view";

export default async function LedgerPage() {
  const res = await getLedgerAccounts();
  const accounts = res.success && res.data ? res.data : [];

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <LedgerView accounts={accounts} />
    </div>
  );
}
