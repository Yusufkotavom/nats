"use client";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, ArrowLeft, CheckCircle } from "lucide-react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getDueDepreciationSchedules, postDepreciationRun } from "../actions";
import { SuperJSON } from "@/lib/superjson";
import { Asset, AssetCategory, DepreciationSchedule } from "@/prisma/generated/prisma/browser";
import { useFormatCurrency, useFormatDate } from "@/hooks";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  PageListActions,
  PageListContent,
  PageListHeader,
  PageListLayout,
  PageListTitle,
} from "@/components/layout/page/list-layout";

type ScheduleWithAsset = DepreciationSchedule & {
  asset: Asset & {
    category: AssetCategory;
  };
};

export default function DepreciationRunPage() {
  const formatCurrency = useFormatCurrency();
  const formatDate = useFormatDate();
  const { toast } = useToast();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isPosting, setIsPosting] = useState(false);

  const { data: schedules, isLoading, refetch } = useQuery({
    queryKey: ["due-depreciation"],
    queryFn: async () => {
      const serialized = await getDueDepreciationSchedules();
      return SuperJSON.deserialize<ScheduleWithAsset[]>(serialized);
    },
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked && schedules) {
      setSelectedIds(schedules.map((s) => s.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelect = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((i) => i !== id));
    }
  };

  const handlePost = async () => {
    if (selectedIds.length === 0) return;
    setIsPosting(true);
    try {
      // Mock user ID - in real app, get from session
      const userId = "user_1";
      const result = await postDepreciationRun(selectedIds, userId);
      if (result.success) {
        toast({ title: `Posted ${result.count} entries` });
        setSelectedIds([]);
        refetch();
      } else {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to post", variant: "destructive" });
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <PageListLayout>
      <PageListHeader>
        <div className="flex items-center gap-4">
          <PageListTitle title="Depreciation Run" />
        </div>
        <PageListActions>
          <Button onClick={handlePost} disabled={selectedIds.length === 0 || isPosting}>
            {isPosting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <CheckCircle className="mr-2 h-4 w-4" />
            Post Selected ({selectedIds.length})
          </Button>
        </PageListActions>
      </PageListHeader>

      <PageListContent>
        {isLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={schedules && schedules.length > 0 && selectedIds.length === schedules.length}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Asset</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Book Value After</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedules?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    No pending depreciation found.
                  </TableCell>
                </TableRow>
              )}
              {schedules?.map((schedule) => (
                <TableRow key={schedule.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(schedule.id)}
                      onCheckedChange={(c) => handleSelect(schedule.id, c as boolean)}
                    />
                  </TableCell>
                  <TableCell>{formatDate(schedule.date)}</TableCell>
                  <TableCell>{schedule.asset.name} ({schedule.asset.code})</TableCell>
                  <TableCell>{schedule.asset.category.name}</TableCell>
                  <TableCell className="text-right">{formatCurrency(Number(schedule.amount))}</TableCell>
                  <TableCell className="text-right">{formatCurrency(Number(schedule.bookValueAfter))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </PageListContent>
    </PageListLayout>
  );
}
