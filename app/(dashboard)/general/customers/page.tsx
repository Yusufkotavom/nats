import { getCustomers } from "./actions";
import { CustomerTable } from "./_components/customer-table";

export default async function CustomersPage(props: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const searchParams = await props.searchParams;
  const page = Number(searchParams.page) || 1;
  const search = searchParams.search || "";
  
  const customers = await getCustomers({ page, search });

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <CustomerTable initialData={customers} />
    </div>
  );
}
