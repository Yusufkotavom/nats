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
import { SelectItem } from "@/components/ui/select";
import { CustomInput } from "@/components/ui/custom-input";
import { CustomSelect } from "@/components/ui/custom-select";
import { Plus } from "lucide-react";
import { useState } from "react";
import { createLocation, updateLocation } from "../actions";
import { Location, LocationType } from "@/prisma/generated/prisma/browser";

interface LocationDialogProps {
  warehouseId: string;
  location?: Location;
  trigger?: React.ReactNode;
}

export function LocationDialog({
  warehouseId,
  location,
  trigger,
}: LocationDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      code: formData.get("code") as string,
      type: formData.get("type") as LocationType,
      warehouseId,
    };

    try {
      if (location) {
        await updateLocation(location.id, {
          name: data.name,
          code: data.code,
          type: data.type,
        });
      } else {
        await createLocation(data);
      }
      setOpen(false);
    } catch (error) {
      console.error(error);
      alert("Failed to save location");
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
            Add Location
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {location ? "Edit Location" : "Add Location"}
          </DialogTitle>
          <DialogDescription>
            {location
              ? "Make changes to the location here."
              : "Add a new location to your warehouse."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <CustomInput
              label="Name"
              name="name"
              id="name"
              defaultValue={location?.name}
              required
            />
            <CustomInput
              label="Code"
              name="code"
              id="code"
              defaultValue={location?.code}
              required
            />
            <CustomSelect
              label="Type"
              name="type"
              defaultValue={location?.type || "STORAGE"}
              placeholder="Select type"
            >
              {Object.values(LocationType).map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </CustomSelect>
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
