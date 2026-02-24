import { getTenants } from "./actions";
import { TenantsView } from "./_components/tenants-view";

import { PageListLayout, PageListHeader, PageListTitle, PageListContent } from "@/components/layout/page/list-layout";

export default async function TenantsPage() {
    const tenants = await getTenants();

    return (
        <PageListLayout>
            <PageListHeader>
                <PageListTitle title="Manajemen Tenant" />
            </PageListHeader>
            <PageListContent className="p-4">
                <TenantsView tenants={tenants} />
            </PageListContent>
        </PageListLayout>
    );
}
