export const dynamic = "force-dynamic";

import { RolesView } from "./_components/roles-view";
import { getRoles } from "./actions";

export default async function RolesPage() {
  const roles = await getRoles();

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <RolesView roles={roles} />
    </div>
  );
}
