import { prisma } from "@/lib/prisma";
import { RolesView } from "./_components/roles-view";

export default async function RolesPage() {
  const roles = await prisma.role.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <RolesView roles={roles} />
    </div>
  );
}
