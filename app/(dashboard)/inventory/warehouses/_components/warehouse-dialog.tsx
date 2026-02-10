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
import { Label } from "@/components/ui/label";
import { CustomInput } from "@/components/ui/custom-input";
import { Plus } from "lucide-react";
import { useState } from "react";
import { createWarehouse, updateWarehouse } from "../actions";
import { Warehouse } from "@/prisma/generated/prisma/browser";

interface WarehouseDialogProps {
  warehouse?: Warehouse;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
}

export function WarehouseDialog({
  warehouse,
  trigger,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  onSuccess,
}: WarehouseDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? setControlledOpen : setInternalOpen;

  const isEditing = !!warehouse;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      location: (formData.get("location") as string) || undefined,
    };

    try {
      if (isEditing) {
        await updateWarehouse(warehouse.id, data);
      } else {
        await createWarehouse(data);
      }
      onSuccess?.();
      setOpen?.(false);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Location" : "Add Location"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Make changes to the location here."
              : "Add a new location to your network."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <CustomInput
              id="name"
              name="name"
              defaultValue={warehouse?.name}
              containerClassName="col-span-3"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="location" className="text-right">
              Address
            </Label>
            <CustomInput
              id="location"
              name="location"
              defaultValue={warehouse?.location || ""}
              containerClassName="col-span-3"
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
