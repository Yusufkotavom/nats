"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CustomInput } from "@/components/ui/custom-input";
import { Plus } from "lucide-react";
import { useState } from "react";
import { createUnit, updateUnit } from "../actions";
import { Unit } from "@/prisma/generated/prisma/browser";

import { useQueryClient } from "@tanstack/react-query";

interface UomDialogProps {
  unit?: Unit;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function UomDialog({
  unit,
  open,
  onOpenChange,
  onSuccess,
}: UomDialogProps) {
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      symbol: formData.get("symbol") as string,
    };

    try {
      let res;
      if (unit) {
        res = await updateUnit(unit.id, data);
      } else {
        res = await createUnit(data);
      }

      if (res.success) {
        queryClient.invalidateQueries({ queryKey: ["uom"] });
        onSuccess?.();
        onOpenChange(false);
      } else {
        alert(res.error);
      }
    } catch (error) {
      console.error(error);
      alert("Failed to save unit");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{unit ? "Edit Unit" : "Add Unit"}</DialogTitle>
          <DialogDescription>
            {unit
              ? "Make changes to the unit of measure here."
              : "Add a new unit of measure."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <CustomInput
              label="Name"
              id="name"
              name="name"
              defaultValue={unit?.name}
              placeholder="e.g. Kilogram"
              required
              containerClassName="grid gap-2"
            />
            <CustomInput
              label="Symbol"
              id="symbol"
              name="symbol"
              defaultValue={unit?.symbol}
              placeholder="e.g. kg"
              required
              containerClassName="grid gap-2"
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
