import { getGuideNavigation } from "@/lib/user-guide";
import { DocsLayoutShell } from "./_components/docs-layout-shell";

export const dynamic = "force-dynamic";

export default async function DocsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const docs = await getGuideNavigation();

  return (
    <DocsLayoutShell
      locale={locale}
      docs={docs.map((doc) => ({
        title: doc.title,
        slug: doc.slug,
        summary: doc.summary,
      }))}
    >
      {children}
    </DocsLayoutShell>
  );
}

