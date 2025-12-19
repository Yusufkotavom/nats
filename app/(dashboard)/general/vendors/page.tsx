import { getVendors } from "./actions";
import { VendorTable } from "./_components/vendor-table";

export default async function VendorsPage() {
  const vendors = await getVendors();

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <VendorTable initialVendors={vendors} />
    </div>
  );
}
