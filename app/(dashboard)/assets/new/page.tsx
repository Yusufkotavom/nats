"use client";

import { useQuery } from "@tanstack/react-query";
import { getAssetCategories } from "../actions";
import { SuperJSON } from "@/lib/superjson";
import { AssetCategory } from "@/prisma/generated/prisma/browser";
import { AssetForm } from "../_components/asset-form";
import { Loader2 } from "lucide-react";

export default function NewAssetPage() {
  const { data: categories, isLoading } = useQuery({
    queryKey: ["asset-categories"],
    queryFn: async () => {
      const serialized = await getAssetCategories();
      return SuperJSON.deserialize<AssetCategory[]>(serialized);
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
        <h1 className="text-3xl font-bold tracking-tight">New Asset</h1>
        <p className="text-muted-foreground">
          Record a new fixed asset.
        </p>
      </div>
      <AssetForm categories={categories || []} />
    </div>
  );
}
