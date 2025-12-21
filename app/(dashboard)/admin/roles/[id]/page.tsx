import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { RolePermissionForm } from "../_components/role-permission-form";

interface RolePageProps {
  params: {
    id: string;
  };
}

export default async function RolePage({ params }: RolePageProps) {
  const role = await prisma.role.findUnique({
    where: { id: (await params).id },
  });

  if (!role) {
    notFound();
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <RolePermissionForm role={role} />
    </div>
  );
}
