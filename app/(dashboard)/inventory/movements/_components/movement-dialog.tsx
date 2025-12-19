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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MovementType, Product, Warehouse } from "@prisma/client";
import { Plus } from "lucide-react";
import { useState } from "react";
import { createMovement } from "../actions";

interface MovementDialogProps {
  products: (Omit<Product, "price" | "cost"> & {
    price: number;
    cost: number;
  })[];
  warehouses: Warehouse[];
}

export function MovementDialog({ products, warehouses }: MovementDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [type, setType] = useState<MovementType>("IN");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      type: formData.get("type") as MovementType,
      productId: formData.get("productId") as string,
      fromWarehouseId: (formData.get("fromWarehouseId") as string) || undefined,
      toWarehouseId: (formData.get("toWarehouseId") as string) || undefined,
      quantity: Number(formData.get("quantity")),
      reference: formData.get("reference") as string,
      notes: formData.get("notes") as string,
    };

    try {
      const res = await createMovement(data);
      if (res.success) {
        setOpen(false);
      } else {
        alert(res.error);
      }
    } catch (error) {
      console.error(error);
      alert("Failed to create movement");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Record Movement
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Record Inventory Movement</DialogTitle>
          <DialogDescription>
            Record a new stock movement. This will update inventory levels immediately.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="type" className="text-right">
              Type
            </Label>
            <div className="col-span-3">
              <Select
                name="type"
                value={type}
                onValueChange={(v) => setType(v as MovementType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IN">Receive (IN)</SelectItem>
                  <SelectItem value="OUT">Shipment (OUT)</SelectItem>
                  <SelectItem value="TRANSFER">Transfer</SelectItem>
                  <SelectItem value="ADJUSTMENT">Adjustment</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="productId" className="text-right">
              Product
            </Label>
            <div className="col-span-3">
              <Select name="productId" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.sku} - {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {(type === "OUT" || type === "TRANSFER") && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="fromWarehouseId" className="text-right">
                From
              </Label>
              <div className="col-span-3">
                <Select name="fromWarehouseId" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select source warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {(type === "IN" || type === "TRANSFER" || type === "ADJUSTMENT") && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="toWarehouseId" className="text-right">
                {type === "ADJUSTMENT" ? "Warehouse" : "To"}
              </Label>
              <div className="col-span-3">
                <Select name="toWarehouseId" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select destination warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="quantity" className="text-right">
              Quantity
            </Label>
            <Input
              id="quantity"
              name="quantity"
              type="number"
              className="col-span-3"
              required
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="reference" className="text-right">
              Ref #
            </Label>
            <Input
              id="reference"
              name="reference"
              placeholder="PO-123, SO-456"
              className="col-span-3"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="notes" className="text-right">
              Notes
            </Label>
            <Textarea
              id="notes"
              name="notes"
              className="col-span-3"
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Recording..." : "Record Movement"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
