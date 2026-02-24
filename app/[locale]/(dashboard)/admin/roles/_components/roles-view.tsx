"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Power, Ban, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RoleDialog } from "./role-dialog";
import { getRoles, toggleRoleStatus } from "../actions";
import { Prisma } from "@/prisma/generated/management-client";
type Role = Prisma.RoleGetPayload<{}>;

import { useTranslations } from "next-intl";

export function RolesView({
  roles,
}: {
  roles: Awaited<ReturnType<typeof getRoles>>;
}) {
  const t = useTranslations("Admin");
  const tCommon = useTranslations("Common");
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | undefined>(undefined);

  const handleCreate = () => {
    setEditingRole(undefined);
    setDialogOpen(true);
  };

  const handleEdit = (role: Role) => {
    setEditingRole(role);
    setDialogOpen(true);
  };

  const handlePermissions = (role: Role) => {
    router.push(`/admin/roles/${role.id}`);
  };

  const handleToggleStatus = async (role: Role) => {
    try {
      await toggleRoleStatus(role.id);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold tracking-tight">{t("role_definitions")}</h2>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          {t("add_role")}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
        {roles.map((role) => (
          <Card key={role.id} className={!role.isActive ? "opacity-60" : ""}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="capitalize flex items-center gap-2">
                  {role.name}
                  {role.name === "superadmin" && (
                    <Badge variant="default" className="bg-primary">
                      {tCommon("system")}
                    </Badge>
                  )}
                  {!role.isActive && (
                    <Badge variant="destructive">{tCommon("inactive")}</Badge>
                  )}
                </CardTitle>
                <div className="flex items-center gap-2">
                  {role.name !== "superadmin" && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handlePermissions(role)}
                        title={t("manage_permissions")}
                      >
                        <ShieldCheck className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleStatus(role)}
                        title={role.isActive ? t("deactivate") : t("activate")}
                      >
                        {role.isActive ? (
                          <Ban className="h-4 w-4 text-orange-500" />
                        ) : (
                          <Power className="h-4 w-4 text-green-500" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(role)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
              <CardDescription>{role.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <h4 className="text-sm font-medium">
                  {t("permissions_count", { count: role.permissions.length })}
                </h4>
                <div className="flex flex-wrap gap-2 max-h-[100px] overflow-hidden relative">
                  {role.permissions.slice(0, 10).map((permission) => (
                    <Badge key={permission} variant="secondary">
                      {permission}
                    </Badge>
                  ))}
                  {role.permissions.length > 10 && (
                    <Badge variant="outline">
                      +{role.permissions.length - 10} {t("more")}
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <RoleDialog
        role={editingRole}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
}
