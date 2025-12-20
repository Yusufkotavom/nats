import { getMovements } from "./actions";
import { getProducts } from "../products/actions";
import { getWarehouses } from "../warehouses/actions";
import { MovementTable } from "./_components/movement-table";
import { MovementDialog } from "./_components/movement-dialog";
import { Protect } from "@/components/protect";

export default async function Page() {
  const movements = await getMovements();
  const { products } = await getProducts();
  const warehouses = await getWarehouses();

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">
          Inventory Movements
        </h2>
        <Protect permission="inventory_movements.create">
          <MovementDialog
            products={products.map((p) => ({
              ...p,
              price: Number(p.price),
              cost: Number(p.cost),
            }))}
            warehouses={warehouses}
          />
        </Protect>
      </div>
      <MovementTable movements={movements} />
    </div>
  );
}
