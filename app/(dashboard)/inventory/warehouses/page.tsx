import { getWarehouses } from "./actions";
import { WarehouseTable } from "./_components/warehouse-table";
import { WarehouseDialog } from "./_components/warehouse-dialog";
import { Protect } from "@/components/ui/protect";

export default async function Page() {
  const warehouses = await getWarehouses();

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">
          Warehouses & Stock
        </h2>
        <Protect permission="warehouses.create">
          <WarehouseDialog />
        </Protect>
      </div>
      <WarehouseTable warehouses={warehouses} />
    </div>
  );
}
