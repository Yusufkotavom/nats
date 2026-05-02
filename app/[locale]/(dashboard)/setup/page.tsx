export const dynamic = "force-dynamic";

import { SetupWizard } from "./_components/setup-wizard";
import {
    getSetupStatus,
    getPostingAccounts,
    getCurrentDefaultAccounts,
} from "./actions";

export default async function SetupPage() {
    const [status, accounts, currentDefaults] = await Promise.all([
        getSetupStatus(),
        getPostingAccounts(),
        getCurrentDefaultAccounts(),
    ]);

    const existingDefaults = currentDefaults.map((d) => ({
        purpose: d.purpose,
        accountId: d.accountId,
    }));

    return (
        <div className="flex flex-1 flex-col gap-2 p-4 pt-0">
            <SetupWizard
                initialStatus={status}
                accounts={accounts.map((a) => ({
                    id: a.id,
                    code: a.code,
                    name: a.name,
                    type: a.type,
                }))}
                existingDefaults={existingDefaults}
            />
        </div>
    );
}
