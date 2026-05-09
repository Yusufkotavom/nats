import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { GuideDoc } from "@/lib/user-guide";

type GuideMeta = Omit<GuideDoc, "content">;

function findAdjacentDocs(current: GuideMeta, docs: GuideMeta[]) {
  const idx = docs.findIndex((d) => d.slug.join("/") === current.slug.join("/"));
  return {
    prev: idx > 0 ? docs[idx - 1] : null,
    next: idx >= 0 && idx < docs.length - 1 ? docs[idx + 1] : null,
  };
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
  const { prev, next } = findAdjacentDocs(current, docs);
  const currentSlug = current.slug.join("/");

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-md border p-4">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Panduan
          </h2>
          <nav className="space-y-2">
            {docs.map((doc) => {
              const slug = doc.slug.join("/");
              const active = slug === currentSlug;
              return (
                <Link
                  key={slug}
                  href={`/${locale}/docs/${slug}`}
                  className={`block rounded px-2 py-1 text-sm ${
                    active ? "bg-primary/10 font-medium text-primary" : "hover:bg-muted"
                  }`}
                >
                  {doc.title}
                </Link>
              );
            })}
          </nav>
        </aside>

        <article className="rounded-md border p-6">
          <p className="mb-2 text-xs text-muted-foreground">Terakhir diperbarui: {current.updatedAt}</p>
          <h1 className="mb-6 text-2xl font-bold">{current.title}</h1>

          <div className="prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                table: ({ children }) => (
                  <div className="my-4 w-full overflow-x-auto">
                    <table className="w-full min-w-[680px] border-collapse">{children}</table>
                  </div>
                ),
                thead: ({ children }) => <thead className="bg-muted/40">{children}</thead>,
                th: ({ children }) => (
                  <th className="border px-3 py-2 text-left align-top text-xs font-semibold uppercase tracking-wide">
                    {children}
                  </th>
                ),
                td: ({ children }) => <td className="border px-3 py-2 align-top">{children}</td>,
                ul: ({ children }) => <ul className="list-disc space-y-1 pl-6">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal space-y-1 pl-6">{children}</ol>,
              }}
            >
              {current.content}
            </ReactMarkdown>
          </div>

          {current.related.length > 0 && (
            <div className="mt-8 rounded-md bg-muted/40 p-4">
              <p className="mb-2 text-sm font-semibold">Related Docs</p>
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

          <div className="mt-8 flex items-center justify-between border-t pt-4 text-sm">
            <div>
              {prev ? (
                <Link className="underline" href={`/${locale}/docs/${prev.slug.join("/")}`}>
                  ← {prev.title}
                </Link>
              ) : null}
            </div>
            <div>
              {next ? (
                <Link className="underline" href={`/${locale}/docs/${next.slug.join("/")}`}>
                  {next.title} →
                </Link>
              ) : null}
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
