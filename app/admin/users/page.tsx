import { getUsers } from "./actions";
import { UserTable } from "./user-table";

export default async function UsersPage() {
  const users = await getUsers();
  const formattedUsers = users.map((user) => ({
    ...user,
    createdAt: user.createdAt.toISOString(),
  }));

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="grid auto-rows-min gap-4 md:grid-cols-1">
        <UserTable initialUsers={formattedUsers} />
      </div>
    </div>
  );
}
