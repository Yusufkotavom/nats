import { getUsers, getRoles } from "./actions";
import { UserTable } from "./user-table";

export default async function UsersPage(props: {
  searchParams: Promise<{ page?: string; limit?: string }>;
}) {
  const searchParams = await props.searchParams;
  const page = Number(searchParams?.page) || 1;
  const limit = Number(searchParams?.limit) || 10;
  const [{ users, totalPages, total }, roles] = await Promise.all([
    getUsers(page, limit),
    getRoles(),
  ]);

  const formattedUsers = users.map((user) => ({
    ...user,
    createdAt: user.createdAt.toISOString(),
  }));

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="grid auto-rows-min gap-4 md:grid-cols-1">
        <UserTable
          initialUsers={formattedUsers}
          roles={roles}
          page={page}
          totalPages={totalPages}
          total={total}
        />
      </div>
    </div>
  );
}
