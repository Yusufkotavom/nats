import { getCustomers } from "./actions";
import { CustomerTable } from "./_components/customer-table";

export default async function CustomersPage() {
  const customers = await getCustomers();

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <CustomerTable initialCustomers={customers} />
    </div>
  );
}
