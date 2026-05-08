import { notFound, redirect } from "next/navigation";
import { getGuideDocs, getGuideNavigation } from "@/lib/user-guide";

export const dynamic = "force-dynamic";

export default async function DocsIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const docs = await getGuideDocs();
  const nav = await getGuideNavigation();

  if (docs.length === 0) {
    notFound();
  }

  const first = nav[0];
  redirect(`/${locale}/docs/${first.slug.join("/")}`);
}

