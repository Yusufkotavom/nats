export const dynamic = "force-dynamic";

import { getFiles } from "./actions";
import { FilesView } from "./_components/files-view";

export default async function FilesPage() {
  const files = await getFiles();

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <FilesView files={files} />
    </div>
  );
}
