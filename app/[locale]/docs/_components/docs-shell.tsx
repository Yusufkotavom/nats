"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { GuideDoc } from "@/lib/user-guide";
import { useTranslations } from "next-intl";

type GuideMeta = Omit<GuideDoc, "content">;

type DocHeading = {
  id: string;
  text: string;
  level: 2 | 3;
};

function findAdjacentDocs(current: GuideMeta, docs: GuideMeta[]) {
  const idx = docs.findIndex((d) => d.slug.join("/") === current.slug.join("/"));
  return {
    prev: idx > 0 ? docs[idx - 1] : null,
    next: idx >= 0 && idx < docs.length - 1 ? docs[idx + 1] : null,
  };
}

function toHeadingId(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}

function toPlainText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map((item) => toPlainText(item)).join("");
  if (node && typeof node === "object" && "props" in node) {
    return toPlainText((node as { props?: { children?: ReactNode } }).props?.children);
  }
  return "";
}

function extractHeadings(markdown: string): DocHeading[] {
  const lines = markdown.split("\n");
  const headings: DocHeading[] = [];

  for (const line of lines) {
    const match = /^(##|###)\s+(.+)$/.exec(line.trim());
    if (!match) continue;

    const level = match[1] === "##" ? 2 : 3;
    const text = match[2].trim();
    if (!text) continue;

    headings.push({
      id: toHeadingId(text),
      text,
      level,
    });
  }

  return headings;
}

export function DocsShell({
  current,
  docs,
  locale,
}: {
  current: GuideDoc;
  docs: GuideMeta[];
  locale: string;
}) {
  const t = useTranslations("Docs");
  const { prev, next } = findAdjacentDocs(current, docs);
  const headings = useMemo(() => extractHeadings(current.content), [current.content]);
  const [activeHeading, setActiveHeading] = useState<string>(headings[0]?.id || "");

  useEffect(() => {
    if (headings.length === 0) {
      setActiveHeading("");
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target?.id) {
          setActiveHeading(visible[0].target.id);
        }
      },
      {
        rootMargin: "-90px 0px -65% 0px",
        threshold: [0.1, 0.4, 0.8],
      }
    );

    for (const heading of headings) {
      const el = document.getElementById(heading.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [current.slug, headings]);

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_250px]">
      <article className="rounded-xl border bg-card p-6 shadow-sm md:p-8">
        <div className="mb-8 border-b pb-6">
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {t("official_docs")}
          </p>
          <h1 className="mb-2 text-3xl font-semibold tracking-tight">{current.title}</h1>
          <p className="text-sm text-muted-foreground">
            {t("last_updated")}: {current.updatedAt}
          </p>
        </div>

        <div className="prose prose-slate max-w-none text-[15px] leading-7 dark:prose-invert prose-headings:scroll-mt-24 prose-headings:font-semibold prose-h2:mt-10 prose-h2:mb-3 prose-h2:border-b prose-h2:pb-2 prose-h3:mt-8 prose-h3:mb-2 prose-p:my-4 prose-li:my-1 prose-code:rounded prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:font-mono prose-code:text-[0.9em] prose-code:before:content-none prose-code:after:content-none prose-pre:overflow-x-auto prose-pre:rounded-xl prose-pre:border prose-pre:bg-slate-950 prose-pre:px-4 prose-pre:py-4 prose-pre:text-slate-100 prose-table:my-6 prose-th:border prose-th:bg-muted/50 prose-th:px-3 prose-th:py-2 prose-th:text-left prose-th:text-xs prose-th:uppercase prose-th:tracking-wide prose-td:border prose-td:px-3 prose-td:py-2 prose-blockquote:rounded-r-lg prose-blockquote:border-l-4 prose-blockquote:border-primary/50 prose-blockquote:bg-muted/40 prose-blockquote:px-4 prose-blockquote:py-2 prose-a:text-primary prose-a:no-underline hover:prose-a:underline">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h2: ({ children }) => {
                const text = toPlainText(children).trim();
                const id = toHeadingId(text);
                return (
                  <h2 id={id}>
                    <a href={`#${id}`} className="no-underline hover:text-primary">
                      {children}
                    </a>
                  </h2>
                );
              },
              h3: ({ children }) => {
                const text = toPlainText(children).trim();
                const id = toHeadingId(text);
                return (
                  <h3 id={id}>
                    <a href={`#${id}`} className="no-underline hover:text-primary">
                      {children}
                    </a>
                  </h3>
                );
              },
              table: ({ children }) => (
                <div className="my-4 w-full overflow-x-auto">
                  <table className="w-full min-w-[680px] border-collapse text-sm">{children}</table>
                </div>
              ),
              ul: ({ children }) => <ul className="list-disc space-y-1 pl-6 marker:text-muted-foreground">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal space-y-1 pl-6 marker:text-muted-foreground">{children}</ol>,
              a: ({ href, children }) => (
                <a href={href} target={href?.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
                  {children}
                </a>
              ),
            }}
          >
            {current.content}
          </ReactMarkdown>
        </div>

        {current.related.length > 0 && (
          <div className="mt-8 rounded-lg border bg-muted/30 p-4">
            <p className="mb-2 text-sm font-semibold">{t("related_docs")}</p>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {current.related.map((rel) => (
                <li key={rel}>
                  <Link className="underline" href={`/${locale}/docs/${rel}`}>
                    {rel}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-8 grid gap-3 border-t pt-4 md:grid-cols-2">
          {prev ? (
            <Link
              className="rounded-lg border p-3 transition-colors hover:bg-muted"
              href={`/${locale}/docs/${prev.slug.join("/")}`}
            >
              <p className="text-xs text-muted-foreground">{t("previous")}</p>
              <p className="font-medium">{prev.title}</p>
            </Link>
          ) : (
            <div />
          )}
          {next ? (
            <Link
              className="rounded-lg border p-3 text-right transition-colors hover:bg-muted"
              href={`/${locale}/docs/${next.slug.join("/")}`}
            >
              <p className="text-xs text-muted-foreground">{t("next")}</p>
              <p className="font-medium">{next.title}</p>
            </Link>
          ) : null}
        </div>
      </article>

      <aside className="hidden xl:block">
        <div className="sticky top-20 rounded-xl border bg-card p-4 shadow-sm">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {t("on_this_page")}
          </p>
          {headings.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("no_sections")}</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {headings.map((heading) => (
                <li key={heading.id}>
                  <a
                    href={`#${heading.id}`}
                    className={`block rounded px-2 py-1 transition-colors ${
                      heading.id === activeHeading
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-foreground/80 hover:bg-muted hover:text-foreground"
                    } ${heading.level === 3 ? "ml-3 text-[13px]" : ""}`}
                  >
                    {heading.text}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}
