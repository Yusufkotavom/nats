import { getVendors } from "./actions";
import { VendorTable } from "./_components/vendor-table";

export default async function VendorsPage(props: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const searchParams = await props.searchParams;
  const page = Number(searchParams.page) || 1;
  const search = searchParams.search || "";
  
  const vendors = await getVendors({ page, search });

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <VendorTable initialData={vendors} />
    </div>
  );
}
