"use client";

import { useMemo, useState, useTransition } from "react";
import { ReportTemplate } from "@/prisma/generated/prisma/client";
import { SuperJSON } from "@/lib/superjson";
import { SuperJSONResult } from "superjson";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { updateDocumentTemplateSetting } from "./actions";

type EditableTemplate = {
  id: string;
  name: string;
  code: string;
  module: string;
  description: string;
  isActive: boolean;
  pageSize: string;
  orientation: "portrait" | "landscape";
  theme: string;
};

// TODO(user): Tambahkan daftar tema resmi tim Anda di sini (5-10 baris),
// contoh: [{ value: "default", label: "Default" }, ...]
const THEME_PRESETS: Array<{ value: string; label: string }> = [];

function mapTemplate(item: ReportTemplate): EditableTemplate {
  const cfg = (item.config || {}) as Record<string, unknown>;
  return {
    id: item.id,
    name: item.name,
    code: item.code,
    module: item.module,
    description: item.description || "",
    isActive: item.isActive,
    pageSize: typeof cfg.pageSize === "string" ? cfg.pageSize : "A4",
    orientation: cfg.orientation === "landscape" ? "landscape" : "portrait",
    theme: typeof cfg.theme === "string" ? cfg.theme : "default",
  };
}

export function DocumentSettingsClient({ data }: { data: SuperJSONResult }) {
  const raw = SuperJSON.deserialize<ReportTemplate[]>(data);
  const [items, setItems] = useState<EditableTemplate[]>(raw.map(mapTemplate));
  const [selected, setSelected] = useState<EditableTemplate | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const grouped = useMemo(() => {
    return items.reduce<Record<string, EditableTemplate[]>>((acc, item) => {
      acc[item.module] ||= [];
      acc[item.module].push(item);
      return acc;
    }, {});
  }, [items]);

  const handleSave = () => {
    if (!selected) return;
    startTransition(async () => {
      const res = await updateDocumentTemplateSetting(selected.id, {
        name: selected.name,
        description: selected.description,
        isActive: selected.isActive,
        pageSize: selected.pageSize,
        orientation: selected.orientation,
        theme: selected.theme,
      });

      if (!res.success) {
        toast({ title: "Error", description: res.error || "Failed to save", variant: "destructive" });
        return;
      }

      setItems((prev) => prev.map((it) => (it.id === selected.id ? selected : it)));
      toast({ title: "Saved", description: "Document setting updated" });
      setSelected(null);
    });
  };

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Module</TableHead>
              <TableHead>Theme</TableHead>
              <TableHead>Orientation</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="w-[100px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.entries(grouped).flatMap(([module, rows]) =>
              rows.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs">{item.code}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{module}</TableCell>
                  <TableCell>{item.theme}</TableCell>
                  <TableCell>{item.orientation}</TableCell>
                  <TableCell>{item.isActive ? "Yes" : "No"}</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => setSelected(item)}>
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              )),
            )}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Document Template Setting</DialogTitle>
          </DialogHeader>
          {selected ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Code</Label>
                <Input value={selected.code} disabled />
              </div>
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={selected.name} onChange={(e) => setSelected({ ...selected, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input value={selected.description} onChange={(e) => setSelected({ ...selected, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Page Size</Label>
                  <Select value={selected.pageSize} onValueChange={(v) => setSelected({ ...selected, pageSize: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A4">A4</SelectItem>
                      <SelectItem value="LETTER">Letter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Orientation</Label>
                  <Select value={selected.orientation} onValueChange={(v) => setSelected({ ...selected, orientation: v as "portrait" | "landscape" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="portrait">Portrait</SelectItem>
                      <SelectItem value="landscape">Landscape</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Theme</Label>
                <Input value={selected.theme} onChange={(e) => setSelected({ ...selected, theme: e.target.value })} placeholder="default" />
                {THEME_PRESETS.length > 0 ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {THEME_PRESETS.map((preset) => (
                      <Button
                        key={preset.value}
                        variant="outline"
                        size="sm"
                        type="button"
                        onClick={() => setSelected({ ...selected, theme: preset.value })}
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="flex items-center justify-between rounded border p-3">
                <Label>Active</Label>
                <Switch checked={selected.isActive} onCheckedChange={(val) => setSelected({ ...selected, isActive: val })} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelected(null)}>Cancel</Button>
                <Button onClick={handleSave} disabled={isPending}>Save</Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
