export const dynamic = "force-dynamic";

import { DefaultAccountsView } from "./_components/default-accounts-view"
import { getAccounts, getDefaultAccounts } from "./actions"

export default async function DefaultAccountsPage() {
  const [defaultAccounts, accounts] = await Promise.all([
    getDefaultAccounts(),
    getAccounts(),
  ])

  return <DefaultAccountsView defaultAccounts={defaultAccounts} accounts={accounts} />
}
