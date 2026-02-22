import { getTranslations } from "next-intl/server";
import { getDocumentNumberingSettings } from "./actions";
import { SuperJSON } from "@/lib/superjson";
import type { DocumentNumbering } from "@/prisma/generated/prisma/client";
import { DocumentNumberingClient } from "./document-numbering-client";
import { PageListContent, PageListHeader, PageListLayout, PageListTitle } from "@/components/layout/page/list-layout";

export default async function DocumentNumberingPage() {
    const t = await getTranslations("System");
    const response = await getDocumentNumberingSettings();

    if (!response.success || !response.data) {
        return <div>Failed to load settings</div>;
    }

    const settings: DocumentNumbering[] = SuperJSON.deserialize(response.data);

    return (
        <PageListLayout>
            <PageListHeader>
                <PageListTitle title={t("document-numbering")} />
            </PageListHeader>
            <PageListContent>
                <DocumentNumberingClient data={settings} />
            </PageListContent>
        </PageListLayout>
    );
}
