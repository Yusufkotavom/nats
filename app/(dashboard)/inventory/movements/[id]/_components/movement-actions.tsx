"use client";

import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { useTransition } from "react";
import { approveMovement, rejectMovement } from "../../actions";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/hooks/use-confirm";
import { useAlert } from "@/hooks/use-alert";

interface MovementActionsProps {
  batchId: string;
  status: string;
}

export function MovementActions({ batchId, status }: MovementActionsProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const confirm = useConfirm();
  const alert = useAlert();

  if (status !== "PENDING") return null;

  const handleApprove = async () => {
    if (
      await confirm({
        title: "Approve Movement",
        description:
          "Are you sure you want to approve this movement? This will update inventory levels and cannot be undone.",
      })
    ) {
      startTransition(async () => {
        const result = await approveMovement(batchId);
        if (!result.success) {
          await alert({ title: "Error", description: result.error });
        } else {
          router.refresh();
        }
      });
    }
  };

  const handleReject = () => {
    const reason = prompt("Enter rejection reason:");
    if (!reason) return;

    startTransition(async () => {
      const result = await rejectMovement({ movementId: batchId, reason });
      if (!result.success) {
        await alert({ title: "Error", description: result.error });
      } else {
        router.refresh();
      }
    });
  };

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        onClick={handleApprove}
        disabled={isPending}
        className="text-green-600 hover:text-green-700 hover:bg-green-50"
      >
        <Check className="mr-2 h-4 w-4" />
        Approve
      </Button>
      <Button
        variant="outline"
        onClick={handleReject}
        disabled={isPending}
        className="text-red-600 hover:text-red-700 hover:bg-red-50"
      >
        <X className="mr-2 h-4 w-4" />
        Reject
      </Button>
    </div>
  );
}
