import { revalidatePath } from "next/cache";
import { routing } from "@/i18n/routing";

function normalizePath(path: string) {
  if (!path.startsWith("/")) return `/${path}`;
  return path;
}

export function revalidateLocalizedPath(path: string) {
  const normalized = normalizePath(path);
  revalidatePath(normalized);
  for (const locale of routing.locales) {
    revalidatePath(`/${locale}${normalized}`);
  }
}

export function revalidateLocalizedPaths(paths: string[]) {
  for (const path of paths) {
    revalidateLocalizedPath(path);
  }
}
