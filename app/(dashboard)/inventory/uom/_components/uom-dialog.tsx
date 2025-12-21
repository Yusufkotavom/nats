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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { useState } from "react";
import { createUnit, updateUnit } from "../actions";
import { Unit } from "@/prisma/generated/prisma/browser";

interface UomDialogProps {
  unit?: Unit;
  trigger?: React.ReactNode;
}

export function UomDialog({ unit, trigger }: UomDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

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
        setOpen(false);
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Unit
          </Button>
        )}
      </DialogTrigger>
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
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                defaultValue={unit?.name}
                placeholder="e.g. Kilogram"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="symbol">Symbol</Label>
              <Input
                id="symbol"
                name="symbol"
                defaultValue={unit?.symbol}
                placeholder="e.g. kg"
                required
              />
            </div>
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
