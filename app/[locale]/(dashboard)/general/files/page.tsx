export const dynamic = "force-dynamic";

import { getFiles } from "./actions";
import { FilesView } from "./_components/files-view";

export default async function FilesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = await searchParams;
  const page = Number(resolvedSearchParams.page) || 1;
  const limit = Number(resolvedSearchParams.limit) || 10;
  const search =
    typeof resolvedSearchParams.search === "string"
      ? resolvedSearchParams.search
      : undefined;

  const { data, total } = await getFiles(page, limit, search);

  return (
    <FilesView
      initialFiles={data}
      total={total}
      page={page}
      limit={limit}
      search={search}
    />
  );
}
