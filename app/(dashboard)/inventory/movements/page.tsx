import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { getMovementBatches } from "./actions";
import { MovementsView } from "./_components/movements-view";
import { SuperJSON } from "@/lib/superjson";
import {
  InventoryMovement,
  InventoryMovementDetail,
  Product,
  Warehouse,
} from "@/prisma/generated/prisma/browser";

type BatchWithDetails = Omit<InventoryMovement, "status"> & {
  fromWarehouse: Warehouse | null;
  toWarehouse: Warehouse | null;
  details: (InventoryMovementDetail & {
    product: Product;
  })[];
  status: "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED" | "CANCELLED";
  approvedBy?: { name: string; email: string } | null;
  rejectionReason?: string | null;
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = await searchParams;
  const page = Number(resolvedSearchParams.page) || 1;
  const pageSize = 10;

  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: ["movement-batches", { page, pageSize }],
    queryFn: async () => {
      const { batches, total } = await getMovementBatches(page, pageSize);
      return {
        batches: SuperJSON.deserialize<BatchWithDetails[]>(batches),
        total,
      };
    },
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <MovementsView />
    </HydrationBoundary>
  );
}
