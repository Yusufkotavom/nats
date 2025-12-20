import { getAccounts } from "./actions";
import { AccountTable } from "./_components/account-table";
import { Account } from "../types";

export default async function Page() {
  const accounts = (await getAccounts()) as Account[];

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <AccountTable initialAccounts={accounts} />
    </div>
  );
}
