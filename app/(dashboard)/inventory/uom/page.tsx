import { getUnits } from "./actions";
import { UomTable } from "./_components/uom-table";
import { UomDialog } from "./_components/uom-dialog";
import { Protect } from "@/components/ui/protect";

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
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Units of Measure</h2>
        <Protect permission="inventory_products.create">
          <UomDialog />
        </Protect>
      </div>
      <UomTable units={units} totalEntries={total} />
    </div>
  );
}
