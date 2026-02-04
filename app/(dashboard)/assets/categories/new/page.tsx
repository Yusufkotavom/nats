"use client";

import { useQuery } from "@tanstack/react-query";
import { getAccounts } from "../../../accounting/accounts/actions";
import { SuperJSON } from "@/lib/superjson";
import { Account } from "@/prisma/generated/prisma/browser";
import { CategoryForm } from "../_components/category-form";
import { Loader2 } from "lucide-react";

export default function NewAssetCategoryPage() {
  const { data: accounts, isLoading } = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const result = await getAccounts();
      // Result can be Account[] or { data: Account[], ... } depending on pagination
      // Based on getAccounts implementation in actions.ts:
      // if no page provided, it returns Account[]
      return SuperJSON.deserialize<Account[]>(result as any);
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">New Asset Category</h1>
        <p className="text-muted-foreground">
          Define a new asset category and its GL mapping.
        </p>
      </div>
      <CategoryForm accounts={accounts || []} />
    </div>
  );
}
