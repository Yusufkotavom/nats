"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Search, Menu, FileText } from "lucide-react";
import { CustomInput } from "@/components/ui/custom-input";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

type DocsNavItem = {
  title: string;
  slug: string[];
  summary: string;
};

type DocsGroup = {
  key: string;
  label: string;
  items: DocsNavItem[];
};

function groupDocs(docs: DocsNavItem[]): DocsGroup[] {
  const map = new Map<string, DocsNavItem[]>();
  for (const doc of docs) {
    const section = doc.slug[0] || "general";
    map.set(section, [...(map.get(section) || []), doc]);
  }
  return Array.from(map.entries()).map(([key, items]) => ({
    key,
    label: key.replace(/-/g, " "),
    items,
  }));
}

function DocsSidebar({
  docs,
  locale,
  onNavigate,
}: {
  docs: DocsNavItem[];
  locale: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const groups = useMemo(() => groupDocs(docs), [docs]);

  return (
    <nav className="space-y-5">
      {groups.map((group) => (
        <div key={group.key} className="space-y-1.5">
          <p className="px-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {group.label}
          </p>
          {group.items.map((doc) => {
            const href = `/${locale}/docs/${doc.slug.join("/")}`;
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={onNavigate}
                className={`block rounded-lg px-2.5 py-2 text-sm transition-colors ${
                  active
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-foreground/85 hover:bg-muted hover:text-foreground"
                }`}
              >
                {doc.title}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

export function DocsLayoutShell({
  children,
  locale,
  docs,
}: {
  children: React.ReactNode;
  locale: string;
  docs: DocsNavItem[];
}) {
  const t = useTranslations("Docs");
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return docs
      .filter((doc) => {
        const slugText = doc.slug.join(" ").toLowerCase();
        return (
          doc.title.toLowerCase().includes(q) ||
          doc.summary.toLowerCase().includes(q) ||
          slugText.includes(q)
        );
      })
      .slice(0, 8);
  }, [docs, query]);

  const currentDoc = useMemo(() => {
    return docs.find((doc) => pathname === `/${locale}/docs/${doc.slug.join("/")}`);
  }, [docs, locale, pathname]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1500px] items-center gap-3 px-3 md:px-6">
          <div className="md:hidden">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label="Open docs navigation">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[88vw] max-w-[360px] p-0">
                <div className="border-b p-4">
                  <SheetTitle>{t("documentation")}</SheetTitle>
                </div>
                <div className="h-[calc(100vh-72px)] overflow-y-auto p-4">
                  <DocsSidebar docs={docs} locale={locale} onNavigate={() => setMobileOpen(false)} />
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <Link href={`/${locale}/docs`} className="flex items-center gap-2 font-semibold tracking-tight">
            <FileText className="h-4 w-4 text-primary" />
            <span>{t("official_docs")}</span>
          </Link>

          <div className="relative ml-auto w-full max-w-md">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <CustomInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("search_placeholder")}
              className="pl-8"
            />
            {query.trim() && (
              <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 rounded-lg border bg-popover p-1 shadow-lg">
                {searchResults.length === 0 ? (
                  <p className="px-2 py-2 text-sm text-muted-foreground">{t("no_results")}</p>
                ) : (
                  searchResults.map((doc) => {
                    const href = `/${locale}/docs/${doc.slug.join("/")}`;
                    return (
                      <Link
                        key={href}
                        href={href}
                        onClick={() => setQuery("")}
                        className="block rounded-md px-2 py-2 text-sm hover:bg-muted"
                      >
                        <p className="font-medium">{doc.title}</p>
                        <p className="line-clamp-1 text-xs text-muted-foreground">
                          /{doc.slug.join("/")}
                        </p>
                      </Link>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] grid-cols-1 gap-6 px-3 py-6 md:px-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="hidden xl:block">
          <div className="sticky top-20 rounded-xl border bg-card p-4 shadow-sm">
            <DocsSidebar docs={docs} locale={locale} />
          </div>
        </aside>

        <main className="min-w-0">
          <div className="mb-4 text-sm text-muted-foreground">
            <span>{t("documentation")}</span>
            {currentDoc ? (
              <>
                {" / "}
                <span className="capitalize">{(currentDoc.slug[0] || "").replace(/-/g, " ")}</span>
                {" / "}
                <span className="text-foreground">{currentDoc.title}</span>
              </>
            ) : null}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}

