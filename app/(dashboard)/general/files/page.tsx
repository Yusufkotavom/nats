import { Metadata } from "next";
import { getFiles } from "./actions";
import { FilesView } from "./_components/files-view";

export const metadata: Metadata = {
  title: "File Management",
  description: "Manage uploaded files",
};

export default async function FilesPage() {
  const files = await getFiles();

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <FilesView files={files} />
    </div>
  );
}
