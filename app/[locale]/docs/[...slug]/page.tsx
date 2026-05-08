import { notFound } from "next/navigation";
import { getGuideDocBySlug, getGuideNavigation } from "@/lib/user-guide";
import { DocsShell } from "../_components/docs-shell";

export const dynamic = "force-dynamic";

export default async function DocsDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string[] }>;
}) {
  const { locale, slug } = await params;
  const doc = await getGuideDocBySlug(slug);
  const nav = await getGuideNavigation();

  if (!doc) {
    notFound();
  }

  return <DocsShell current={doc} docs={nav} locale={locale} />;
}

