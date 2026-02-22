import { getTranslations } from "next-intl/server";
import { getDocumentNumberingSettings } from "./actions";
import { SuperJSON } from "@/lib/superjson";
import type { DocumentNumbering } from "@/prisma/generated/prisma/client";
import { DocumentNumberingClient } from "./document-numbering-client";

export default async function DocumentNumberingPage() {
    const t = await getTranslations("System");
    const response = await getDocumentNumberingSettings();

    if (!response.success || !response.data) {
        return <div>Failed to load settings</div>;
    }

    const settings: DocumentNumbering[] = SuperJSON.deserialize(response.data);

    return (
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">{t("document-numbering")}</h1>
                    <p className="text-muted-foreground">Configure the formatting rules for generated document numbers.</p>
                </div>
            </div>
            <DocumentNumberingClient data={settings} />
        </div>
    );
}
