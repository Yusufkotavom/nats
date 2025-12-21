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
import { Plus } from "lucide-react";
import { useState, useEffect } from "react";
import { createMovement } from "../actions";
import { getLocations } from "../../warehouses/[warehouseId]/locations/actions";
import {
  MovementType,
  Product,
  Warehouse,
  Unit,
  Location,
} from "@/prisma/generated/prisma/client";

interface MovementDialogProps {
  products: (Omit<Product, "price" | "cost"> & {
    price: number;
    cost: number;
    baseUnit?: Unit | null;
    purchaseUnit?: Unit | null;
    salesUnit?: Unit | null;
  })[];
  warehouses: Warehouse[];
}

export function MovementDialog({ products, warehouses }: MovementDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [type, setType] = useState<MovementType>("IN");
  
  // State for selections
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>(""); // For To/From based on Type
  const [locations, setLocations] = useState<Location[]>([]);
  
  const selectedProduct = products.find(p => p.id === selectedProductId);

  // Fetch locations when warehouse changes
  useEffect(() => {
    if (selectedWarehouseId) {
      getLocations(selectedWarehouseId).then(setLocations);
    } else {
      setLocations([]);
    }
  }, [selectedWarehouseId]);

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
      uomType: formData.get("uomType") as "base" | "purchase" | "sales" | undefined,
      locationId: (formData.get("locationId") as string) || undefined,
      reference: formData.get("reference") as string,
      notes: formData.get("notes") as string,
    };

    try {
      const res = await createMovement(data);
      if (res.success) {
        setOpen(false);
        // Reset form state if needed
        setSelectedProductId("");
        setSelectedWarehouseId("");
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
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Record Inventory Movement</DialogTitle>
          <DialogDescription>
            Record a new stock movement. This will update inventory levels
            immediately.
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
                onValueChange={(v) => {
                    setType(v as MovementType);
                    setSelectedWarehouseId(""); // Reset warehouse selection on type change
                }}
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
              <Select 
                name="productId" 
                required 
                value={selectedProductId}
                onValueChange={setSelectedProductId}
              >
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
                <Select 
                    name="fromWarehouseId" 
                    required
                    onValueChange={(val) => {
                        // Only set if this is the relevant warehouse for location picking?
                        // Actually for OUT, we pick from specific location? 
                        // Current logic in action doesn't support picking from specific location ID yet for OUT (it uses FIFO/Batch).
                        // So we only need location selection for IN/ADJUSTMENT destination.
                    }}
                >
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
                <Select 
                    name="toWarehouseId" 
                    required
                    value={selectedWarehouseId}
                    onValueChange={setSelectedWarehouseId}
                >
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

          {/* Location Selection (Only if Warehouse Selected and Locations exist) */}
          {selectedWarehouseId && locations.length > 0 && (
             <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="locationId" className="text-right">
                  Location
                </Label>
                <div className="col-span-3">
                  <Select name="locationId">
                    <SelectTrigger>
                      <SelectValue placeholder="General Area (Default)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">General Area</SelectItem>
                      {locations.map((loc) => (
                        <SelectItem key={loc.id} value={loc.id}>
                          {loc.code} - {loc.name} ({loc.type})
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
            <div className="col-span-3 flex gap-2">
                <Input
                  id="quantity"
                  name="quantity"
                  type="number"
                  className="flex-1"
                  required
                />
                <Select name="uomType" defaultValue="base">
                    <SelectTrigger className="w-[120px]">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="base">
                            {selectedProduct?.baseUnit?.symbol || "Base Unit"}
                        </SelectItem>
                        {selectedProduct?.purchaseUnit && (
                            <SelectItem value="purchase">
                                {selectedProduct.purchaseUnit.symbol} (Pur)
                            </SelectItem>
                        )}
                        {selectedProduct?.salesUnit && (
                            <SelectItem value="sales">
                                {selectedProduct.salesUnit.symbol} (Sal)
                            </SelectItem>
                        )}
                    </SelectContent>
                </Select>
            </div>
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
            <Textarea id="notes" name="notes" className="col-span-3" />
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
