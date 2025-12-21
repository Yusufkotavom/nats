import { getUnits } from "./actions";
import { UomTable } from "./_components/uom-table";
import { UomDialog } from "./_components/uom-dialog";
import { Protect } from "@/components/protect";

export default async function Page() {
  const units = await getUnits();

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">
          Units of Measure
        </h2>
        <Protect permission="inventory_products.create">
          <UomDialog />
        </Protect>
      </div>
      <UomTable units={units} />
    </div>
  );
}
