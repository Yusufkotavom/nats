"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Plus, Pencil, Trash2 } from "lucide-react";
import { UserDialog } from "./user-dialog";
import { deleteUser, getRoles, getUsers } from "./actions";

import { useConfirm } from "@/hooks/use-confirm";
import { Protect } from "@/components/ui/protect";
import {
  PageListActions,
  PageListContent,
  PageListHeader,
  PageListLayout,
  PageListTitle,
} from "@/components/layout/page/list-layout";
import { CustomPagination } from "@/components/ui/custom-pagination";
import { useFormatDate } from "@/hooks";

type User = Awaited<ReturnType<typeof getUsers>>["data"][number];

import { useTranslations } from "next-intl";

export default function UsersPage() {
  const t = useTranslations("Admin");
  const tCommon = useTranslations("Common");
  const tAuth = useTranslations("Auth");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [roles, setRoles] = useState<
    { id: string; name: string; description: string | null }[]
  >([]);
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const confirm = useConfirm();
  const formatDate = useFormatDate();

  const handleAddUser = () => {
    setSelectedUser(undefined);
    setIsDialogOpen(true);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setIsDialogOpen(true);
  };

  const handleDeleteClick = async (user: User) => {
    if (
      await confirm({
        title: t("delete_user_confirm"),
        description: t("delete_user_desc"),
        confirmText: tCommon("delete"),
        variant: "destructive",
      })
    ) {
      await deleteUser(user.id);
    }
  };

  useEffect(() => {
    async function fetchData() {
      const roles = await getRoles();
      const users = await getUsers(1, 20);
      setRoles(roles);
      setUsers(users.data);
      setTotal(users.total);
    }

    fetchData();
  }, [page]);

  return (
    <PageListLayout>
      <PageListHeader>
        <PageListTitle title={t("user_management")} />
        <PageListActions>
          <Protect permission="users.create">
            <Button onClick={handleAddUser}>
              <Plus className="mr-2 h-4 w-4" /> {t("add_user")}
            </Button>
          </Protect>
        </PageListActions>
      </PageListHeader>

      <PageListContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{tCommon("name")}</TableHead>
              <TableHead>{tAuth("email_label")}</TableHead>
              <TableHead>{t("role")}</TableHead>
              <TableHead>{tCommon("created_at")}</TableHead>
              <TableHead className="text-right">{tCommon("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  {t("no_users_found")}
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell className="capitalize">{user.role.name}</TableCell>
                  <TableCell>{formatDate(user.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">{tCommon("open_menu")}</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>{tCommon("actions")}</DropdownMenuLabel>
                        <Protect permission="users.edit">
                          <DropdownMenuItem
                            onClick={() => handleEditUser(user)}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            {tCommon("edit")}
                          </DropdownMenuItem>
                        </Protect>
                        <DropdownMenuSeparator />
                        <Protect permission="users.delete">
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => handleDeleteClick(user)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {tCommon("delete")}
                          </DropdownMenuItem>
                        </Protect>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          <TableFooter></TableFooter>
        </Table>

        <CustomPagination
          totalEntries={total || 0}
          pageSize={20}
          currentPage={page}
          onPageChange={setPage}
        />
      </PageListContent>

      <UserDialog
        user={selectedUser}
        roles={roles}
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setSelectedUser(undefined);
        }}
      />
    </PageListLayout>
  );
}
