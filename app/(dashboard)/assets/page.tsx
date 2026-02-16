"use client";
export const dynamic = "force-dynamic";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search, Loader2 } from "lucide-react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getAssets } from "./actions";
import { SuperJSON } from "@/lib/superjson";
import { Asset, AssetCategory } from "@/prisma/generated/prisma/browser";
import { useState } from "react";
import { useFormatCurrency, useFormatDate } from "@/hooks";
import { Badge } from "@/components/ui/badge";
import {
  PageListActions,
  PageListContent,
  PageListFilter,
  PageListHeader,
  PageListLayout,
  PageListTitle,
} from "@/components/layout/page/list-layout";
import { CustomInput } from "@/components/ui/custom-input";

type AssetWithCategory = Asset & {
  category: AssetCategory;
};

export default function AssetsPage() {
  const [search, setSearch] = useState("");
  const formatCurrency = useFormatCurrency();
  const formatDate = useFormatDate();

  const { data: assets, isLoading } = useQuery({
    queryKey: ["assets"],
    queryFn: async () => {
      const serialized = await getAssets();
      return SuperJSON.deserialize<AssetWithCategory[]>(serialized);
    },
  });

  const filteredAssets = assets?.filter((asset) =>
    asset.name.toLowerCase().includes(search.toLowerCase()) ||
    asset.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PageListLayout>
      <PageListHeader>
        <PageListTitle title="Assets" />
        <PageListActions>
          <div className="flex gap-2">
            <Link href="/assets/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Asset
              </Button>
            </Link>
          </div>
        </PageListActions>
      </PageListHeader>

      <PageListFilter>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          <CustomInput
            placeholder="Search assets..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </PageListFilter>

      <PageListContent>
        {isLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Purchase Date</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">Book Value</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAssets?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    No assets found.
                  </TableCell>
                </TableRow>
              )}
              {filteredAssets?.map((asset) => (
                <TableRow key={asset.id}>
                  <TableCell className="font-medium">{asset.code}</TableCell>
                  <TableCell>
                    <Link href={`/assets/${asset.id}`} className="hover:underline">
                      {asset.name}
                    </Link>
                  </TableCell>
                  <TableCell>{asset.category.name}</TableCell>
                  <TableCell>
                    <Badge variant={asset.status === "ACTIVE" ? "default" : "secondary"}>
                      {asset.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(asset.purchaseDate)}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(Number(asset.acquisitionCost))}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(Number(asset.currentBookValue))}
                  </TableCell>
                  <TableCell>
                    <Link href={`/assets/${asset.id}`}>
                      <Button variant="ghost" size="sm">View</Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </PageListContent>
    </PageListLayout>
  );
}
