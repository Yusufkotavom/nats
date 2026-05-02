"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { notFound, useParams } from "next/navigation";
import { RolePermissionForm } from "../_components/role-permission-form";
import { getRole } from "../actions";

import { useTranslations } from "next-intl";

export default function RolePage() {
  const tCommon = useTranslations("Common");
  const params = useParams<{ id: string }>();
  const [role, setRole] = useState<Awaited<ReturnType<typeof getRole>>>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRole() {
      if (!params.id) return;
      try {
        const data = await getRole(params.id);
        setRole(data);
      } catch (error) {
        console.error("Failed to fetch role", error);
      } finally {
        setLoading(false);
      }
    }
    fetchRole();
  }, [params.id]);

  if (loading) {
    return <div className="p-4">{tCommon("loading")}</div>;
  }

  if (!role) {
    notFound();
  }

  return (
    <div className="flex flex-1 flex-col gap-2 p-4 pt-0">
      <RolePermissionForm role={role} />
    </div>
  );
}
