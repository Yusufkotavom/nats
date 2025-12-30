import { getUnits } from "./actions";
import { UomTable } from "./_components/uom-table";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = await searchParams;
  const page = Number(resolvedSearchParams.page) || 1;
  const { units, total } = await getUnits(page);

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <UomTable units={units} totalEntries={total} />
    </div>
  );
}
