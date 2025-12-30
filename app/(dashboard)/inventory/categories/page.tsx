import { getCategories } from "./actions";
import { CategoryTable } from "./_components/category-table";
import { CategoryDialog } from "./_components/category-dialog";
import { Protect } from "@/components/ui/protect";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const search = params.search || "";

  const { categories, total } = await getCategories(page, 10, search);

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">
          Product Categories
        </h2>
        <Protect permission="categories.create">
          <CategoryDialog />
        </Protect>
      </div>
      <CategoryTable categories={categories} totalEntries={total} />
    </div>
  );
}
