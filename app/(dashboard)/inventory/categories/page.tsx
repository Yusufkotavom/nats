import { getCategories } from "./actions";
import { CategoryTable } from "./_components/category-table";
import { CategoryDialog } from "./_components/category-dialog";
import { Protect } from "@/components/protect";

export default async function Page() {
  const categories = await getCategories();

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Product Categories</h2>
        <Protect permission="categories.create">
          <CategoryDialog />
        </Protect>
      </div>
      <CategoryTable categories={categories} />
    </div>
  );
}
