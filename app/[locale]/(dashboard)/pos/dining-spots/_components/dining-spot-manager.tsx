"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { SuperJSONResult } from "superjson";
import { SuperJSON } from "@/lib/superjson";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, Column } from "@/components/ui/data-table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CustomInput } from "@/components/ui/custom-input";
import { CustomSelect } from "@/components/ui/custom-select";
import { Label } from "@/components/ui/label";
import { SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useConfirm } from "@/hooks/use-confirm";
import { createDiningArea, createDiningSpot, deleteDiningArea, deleteDiningSpot, getDiningSpotAdminData, updateDiningArea, updateDiningSpot } from "../actions";
import { MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

type AreaWithSpots = {
  id: string;
  name: string;
  code: string;
  sortOrder: number;
  isActive: boolean;
  spots: Array<{
    id: string;
    areaId: string;
    spotCode: string;
    spotName: string;
    spotType: "TABLE" | "ROOM";
    capacity: number;
    status: "AVAILABLE" | "ORDERING" | "BILLING" | "CLOSED";
    isActive: boolean;
  }>;
};

function AreaDialog({
  open,
  onOpenChange,
  area,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  area?: AreaWithSpots;
}) {
  const tCommon = useTranslations("Common");
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState(area?.name ?? "");
  const [code, setCode] = useState(area?.code ?? "");
  const [sortOrder, setSortOrder] = useState(String(area?.sortOrder ?? 0));
  const [isActive, setIsActive] = useState(area?.isActive ?? true);
  const queryClient = useQueryClient();

  const handleSubmit = async () => {
    setIsLoading(true);
    const payload = { name, code, sortOrder: Number(sortOrder) || 0, isActive };
    const res = area ? await updateDiningArea(area.id, payload) : await createDiningArea(payload);
    setIsLoading(false);
    if (res.success) {
      queryClient.invalidateQueries({ queryKey: ["dining-spot-admin"] });
      onOpenChange(false);
    } else {
      alert(res.error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{area ? "Edit Area" : "Create Area"}</DialogTitle>
          <DialogDescription>Manage dining area for table/room grouping.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <CustomInput label="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <CustomInput label="Code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
          <CustomInput label="Sort Order" type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
          <div className="flex items-center gap-2 pt-2">
            <Switch checked={isActive} onCheckedChange={setIsActive} id="areaActive" />
            <Label htmlFor="areaActive">{tCommon("active")}</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{tCommon("cancel")}</Button>
          <Button onClick={handleSubmit} disabled={isLoading || !name || !code}>{isLoading ? tCommon("saving") : tCommon("save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SpotDialog({
  open,
  onOpenChange,
  spot,
  areas,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spot?: AreaWithSpots["spots"][number];
  areas: AreaWithSpots[];
}) {
  const tCommon = useTranslations("Common");
  const [isLoading, setIsLoading] = useState(false);
  const [areaId, setAreaId] = useState(spot?.areaId ?? areas[0]?.id ?? "");
  const [spotCode, setSpotCode] = useState(spot?.spotCode ?? "");
  const [spotName, setSpotName] = useState(spot?.spotName ?? "");
  const [spotType, setSpotType] = useState<"TABLE" | "ROOM">(spot?.spotType ?? "TABLE");
  const [capacity, setCapacity] = useState(String(spot?.capacity ?? 2));
  const [isActive, setIsActive] = useState(spot?.isActive ?? true);
  const queryClient = useQueryClient();

  const handleSubmit = async () => {
    setIsLoading(true);
    const payload = {
      areaId,
      spotCode: spotCode.toUpperCase(),
      spotName,
      spotType,
      capacity: Number(capacity) || 2,
      isActive,
    };
    const res = spot ? await updateDiningSpot(spot.id, payload) : await createDiningSpot(payload);
    setIsLoading(false);
    if (res.success) {
      queryClient.invalidateQueries({ queryKey: ["dining-spot-admin"] });
      onOpenChange(false);
    } else {
      alert(res.error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{spot ? "Edit Spot" : "Create Spot"}</DialogTitle>
          <DialogDescription>Manage dining tables or rooms for POS dine-in.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <CustomSelect label="Area" value={areaId} onValueChange={setAreaId}>
            {areas.map((a) => (
              <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
            ))}
          </CustomSelect>
          <CustomInput label="Spot Code" value={spotCode} onChange={(e) => setSpotCode(e.target.value.toUpperCase())} />
          <CustomInput label="Spot Name" value={spotName} onChange={(e) => setSpotName(e.target.value)} />
          <CustomSelect label="Spot Type" value={spotType} onValueChange={(v) => setSpotType(v as "TABLE" | "ROOM")}>
            <SelectItem value="TABLE">TABLE</SelectItem>
            <SelectItem value="ROOM">ROOM</SelectItem>
          </CustomSelect>
          <CustomInput label="Capacity" type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
          <div className="flex items-center gap-2 pt-2">
            <Switch checked={isActive} onCheckedChange={setIsActive} id="spotActive" />
            <Label htmlFor="spotActive">{tCommon("active")}</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{tCommon("cancel")}</Button>
          <Button onClick={handleSubmit} disabled={isLoading || !areaId || !spotCode || !spotName}>{isLoading ? tCommon("saving") : tCommon("save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DiningSpotManager({ data }: { data: SuperJSONResult }) {
  const tCommon = useTranslations("Common");
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const [areaDialogOpen, setAreaDialogOpen] = useState(false);
  const [spotDialogOpen, setSpotDialogOpen] = useState(false);
  const [selectedArea, setSelectedArea] = useState<AreaWithSpots | undefined>();
  const [selectedSpot, setSelectedSpot] = useState<AreaWithSpots["spots"][number] | undefined>();

  const initial = SuperJSON.deserialize<{ areas: AreaWithSpots[] }>(data);

  const { data: adminData } = useQuery({
    queryKey: ["dining-spot-admin"],
    queryFn: async () => SuperJSON.deserialize<{ areas: AreaWithSpots[] }>(await getDiningSpotAdminData()),
    initialData: initial,
  });

  const areas = adminData?.areas ?? [];
  const spots = areas.flatMap((area) => area.spots.map((spot) => ({ ...spot, areaName: area.name })));

  const areaColumns: Column<AreaWithSpots>[] = [
    { header: "Code", accessorKey: "code", className: "font-medium" },
    { header: tCommon("name"), accessorKey: "name" },
    { header: "Sort", accessorKey: "sortOrder" },
    { header: "Spots", cell: (item) => item.spots.length },
    {
      header: tCommon("status"),
      cell: (item) => <Badge variant={item.isActive ? "default" : "secondary"}>{item.isActive ? tCommon("active") : tCommon("inactive")}</Badge>,
    },
    {
      header: tCommon("actions"),
      cell: (item) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{tCommon("actions")}</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => { setSelectedArea(item); setAreaDialogOpen(true); }}>
              <Pencil className="mr-2 h-4 w-4" /> {tCommon("edit")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={async () => {
                if (await confirm({ title: "Delete area", description: "Area with spots cannot be deleted." })) {
                  const res = await deleteDiningArea(item.id);
                  if (!res.success) alert(res.error);
                  queryClient.invalidateQueries({ queryKey: ["dining-spot-admin"] });
                }
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" /> {tCommon("delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const spotColumns: Column<(typeof spots)[number]>[] = [
    { header: "Code", accessorKey: "spotCode", className: "font-medium" },
    { header: tCommon("name"), accessorKey: "spotName" },
    { header: "Area", accessorKey: "areaName" },
    { header: "Type", accessorKey: "spotType" },
    { header: "Capacity", accessorKey: "capacity" },
    { header: "POS Status", accessorKey: "status" },
    {
      header: tCommon("status"),
      cell: (item) => <Badge variant={item.isActive ? "default" : "secondary"}>{item.isActive ? tCommon("active") : tCommon("inactive")}</Badge>,
    },
    {
      header: tCommon("actions"),
      cell: (item) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{tCommon("actions")}</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => { setSelectedSpot(item); setSpotDialogOpen(true); }}>
              <Pencil className="mr-2 h-4 w-4" /> {tCommon("edit")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={async () => {
                if (await confirm({ title: "Delete spot", description: "Only AVAILABLE spot can be deleted." })) {
                  const res = await deleteDiningSpot(item.id);
                  if (!res.success) alert(res.error);
                  queryClient.invalidateQueries({ queryKey: ["dining-spot-admin"] });
                }
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" /> {tCommon("delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Dining Areas</h3>
        <Button onClick={() => { setSelectedArea(undefined); setAreaDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Create Area
        </Button>
      </div>
      <DataTable data={areas} columns={areaColumns} emptyMessage="No dining area found" />

      <div className="flex items-center justify-between pt-4">
        <h3 className="text-lg font-semibold">Dining Spots</h3>
        <Button onClick={() => { setSelectedSpot(undefined); setSpotDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Create Spot
        </Button>
      </div>
      <DataTable data={spots} columns={spotColumns} emptyMessage="No dining spot found" />

      <AreaDialog open={areaDialogOpen} onOpenChange={setAreaDialogOpen} area={selectedArea} />
      <SpotDialog open={spotDialogOpen} onOpenChange={setSpotDialogOpen} spot={selectedSpot} areas={areas} />
    </div>
  );
}
