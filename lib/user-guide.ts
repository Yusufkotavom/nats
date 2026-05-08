import fs from "node:fs/promises";
import path from "node:path";

const DOCS_ROOT = path.join(process.cwd(), "docs", "user-guide");

export type GuideDoc = {
  slug: string[];
  title: string;
  module: string;
  order: number;
  updatedAt: string;
  summary: string;
  related: string[];
  content: string;
};

type GuideDocMeta = Omit<GuideDoc, "content">;

function parseFrontmatter(markdown: string): { meta: Record<string, string>; content: string } {
  if (!markdown.startsWith("---\n")) {
    return { meta: {}, content: markdown };
  }

  const end = markdown.indexOf("\n---\n", 4);
  if (end < 0) {
    return { meta: {}, content: markdown };
  }

  const rawMeta = markdown.slice(4, end);
  const content = markdown.slice(end + 5);
  const meta: Record<string, string> = {};

  for (const line of rawMeta.split("\n")) {
    const idx = line.indexOf(":");
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
    if (key) meta[key] = value;
  }

  return { meta, content };
}

function normalizeSlug(filePath: string): string[] {
  const relative = path.relative(DOCS_ROOT, filePath).replace(/\\/g, "/");
  return relative.replace(/\.md$/, "").split("/");
}

async function listMarkdownFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const result: string[] = [];

  for (const entry of entries) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push(...(await listMarkdownFiles(absolute)));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".md")) {
      result.push(absolute);
    }
  }

  return result;
}

function toDoc(meta: Record<string, string>, filePath: string, content: string): GuideDoc {
  const slug = normalizeSlug(filePath);
  const title = meta.title || slug[slug.length - 1].replace(/-/g, " ");
  const module = meta.module || "general";
  const order = Number(meta.order || "999");
  const updatedAt = meta.updatedAt || new Date().toISOString().slice(0, 10);
  const summary = meta.summary || "";
  const related = meta.related
    ? meta.related.split(",").map((x) => x.trim()).filter(Boolean)
    : [];

  return { slug, title, module, order, updatedAt, summary, related, content };
}

export async function getGuideDocs(): Promise<GuideDoc[]> {
  const files = await listMarkdownFiles(DOCS_ROOT);
  const docs: GuideDoc[] = [];

  for (const file of files) {
    const raw = await fs.readFile(file, "utf8");
    const parsed = parseFrontmatter(raw);
    docs.push(toDoc(parsed.meta, file, parsed.content));
  }

  return docs.sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    return a.slug.join("/").localeCompare(b.slug.join("/"));
  });
}

export async function getGuideNavigation(): Promise<GuideDocMeta[]> {
  const docs = await getGuideDocs();
  return docs.map(({ content: _content, ...meta }) => meta);
}

export async function getGuideDocBySlug(slug: string[]): Promise<GuideDoc | null> {
  const docs = await getGuideDocs();
  const key = slug.join("/");
  return docs.find((doc) => doc.slug.join("/") === key) || null;
}

