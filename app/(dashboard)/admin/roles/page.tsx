import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ROLE_PERMISSIONS, ROLE_DESCRIPTIONS } from "@/lib/permissions";
import { Role } from "@/prisma/generated/prisma/enums";

export default function RolesPage() {
  const roles = Object.keys(ROLE_PERMISSIONS) as Role[];

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Role Definitions</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
        {roles.map((role) => (
          <Card key={role}>
            <CardHeader>
              <CardTitle className="capitalize flex items-center gap-2">
                {role}
                {role === "superadmin" && (
                  <Badge variant="default" className="bg-primary">
                    System
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>{ROLE_DESCRIPTIONS[role]}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Permissions</h4>
                <div className="flex flex-wrap gap-2">
                  {ROLE_PERMISSIONS[role].map((permission) => (
                    <Badge key={permission} variant="secondary">
                      {permission}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
