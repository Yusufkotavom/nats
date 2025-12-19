"use client";
import * as React from "react";

import { useEffect, useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { ChevronRight, ChevronDown, Pencil, Trash2, Plus } from "lucide-react";
import { AccountType } from "@prisma/client";
import {
  createAccount,
  deleteAccount,
  getAccounts,
  updateAccount,
} from "./actions";

type AccountNode = {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  parentId: string | null;
  children?: AccountNode[];
  isPosting?: boolean;
  level?: number;
  _count?: { journalEntryLines: number };
};

export default function Page() {
  const [accounts, setAccounts] = useState<AccountNode[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState<string>("");
  const [adding, setAdding] = useState<boolean>(false);
  const [addForm, setAddForm] = useState<{
    name: string;
    code: string;
    type: AccountType | "";
    parentId: string | null;
  }>({ name: "", code: "", type: "", parentId: null });
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    startTransition(async () => {
      const data = await getAccounts();
      setAccounts(data as AccountNode[]);
    });
  }, []);

  const byId = useMemo(() => {
    const map: Record<string, AccountNode> = {};
    accounts.forEach((a) => (map[a.id] = { ...a, children: [] }));
    accounts.forEach((a) => {
      if (a.parentId && map[a.parentId]) {
        map[a.parentId].children!.push(map[a.id]);
      }
    });
    return map;
  }, [accounts]);

  const roots = useMemo(() => {
    const res: AccountNode[] = [];
    accounts.forEach((a) => {
      if (!a.parentId) {
        res.push(byId[a.id] || a);
      }
    });
    // sort by code for stable view
    res.sort((x, y) => x.code.localeCompare(y.code));
    return res;
  }, [accounts, byId]);

  function toggleExpand(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !(prev[id] ?? true) }));
  }

  function beginEdit(a: AccountNode) {
    setEditingId(a.id);
    setDraftName(a.name);
  }
  async function commitEdit(a: AccountNode) {
    if (!editingId) return;
    setError(null);
    await updateAccount(a.id, { name: draftName });
    const data = await getAccounts();
    setAccounts(data as AccountNode[]);
    setEditingId(null);
    setDraftName("");
  }

  async function handleDelete(a: AccountNode) {
    setError(null);
    const res = await deleteAccount(a.id);
    if (!res?.success) {
      setError(res?.error || "Delete failed");
      return;
    }
    const data = await getAccounts();
    setAccounts(data as AccountNode[]);
  }

  function openAdd() {
    setAdding(true);
    setAddForm({ name: "", code: "", type: "", parentId: null });
  }
  function cancelAdd() {
    setAdding(false);
    setAddForm({ name: "", code: "", type: "", parentId: null });
    setError(null);
  }
  async function submitAdd() {
    setError(null);
    if (!addForm.name || !addForm.code || !addForm.type || !addForm.parentId) {
      setError("Please fill name, code, type, and select a parent");
      return;
    }

    // Code validation
    const parent = accounts.find((a) => a.id === addForm.parentId);
    if (!parent) {
      setError("Invalid parent account");
      return;
    }

    if (addForm.code.length !== 6) {
      setError("Account code must be exactly 6 digits");
      return;
    }

    if (!addForm.code.startsWith(parent.code)) {
      setError(
        `Account code must start with parent code prefix (${parent.code})`
      );
      return;
    }

    const isDuplicate = accounts.some((a) => a.code === addForm.code);
    if (isDuplicate) {
      setError("Account code already exists");
      return;
    }

    const res = await createAccount({
      name: addForm.name,
      code: addForm.code,
      type: addForm.type as AccountType,
      parentId: addForm.parentId,
    });
    if (!res?.success) {
      setError(res?.error || "Failed to create account");
      return;
    }
    const data = await getAccounts();
    setAccounts(data as AccountNode[]);
    cancelAdd();
  }

  function renderRows(a: AccountNode, depth = 0): React.ReactElement[] {
    const hasChildren = (a.children?.length || 0) > 0;
    const isOpen = expanded[a.id] ?? true;
    const canDelete = (a._count?.journalEntryLines || 0) === 0;
    const row = (
      <TableRow key={a.id} className="border-b last:border-b-0">
        <TableCell className="w-12 align-middle">
          {hasChildren ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => toggleExpand(a.id)}
              className="shrink-0"
            >
              {isOpen ? <ChevronDown /> : <ChevronRight />}
            </Button>
          ) : null}
        </TableCell>
        <TableCell className="w-28 text-muted-foreground align-middle">
          {a.code}
        </TableCell>
        <TableCell className="align-middle">
          <div
            className="group flex items-center gap-2"
            style={{ paddingLeft: depth * 16 }}
          >
            {editingId === a.id ? (
              <>
                <Input
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      void commitEdit(a);
                    }
                    if (e.key === "Escape") {
                      setEditingId(null);
                      setDraftName("");
                    }
                  }}
                  className="w-72"
                  autoFocus
                />
                <Button size="sm" onClick={() => commitEdit(a)}>
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditingId(null);
                    setDraftName("");
                  }}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <span className="font-medium">{a.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => beginEdit(a)}
                  title="Edit name"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Pencil />
                </Button>
              </>
            )}
          </div>
        </TableCell>
        <TableCell className="align-middle">
          <span className="capitalize">{a.type.toLowerCase()}</span>
        </TableCell>
        <TableCell className="w-24 text-right align-middle">
          <Button
            variant="ghost"
            size="icon"
            disabled={!canDelete}
            onClick={() => handleDelete(a)}
            title={
              canDelete
                ? "Delete account"
                : "Cannot delete: used in transactions"
            }
          >
            <Trash2 />
          </Button>
        </TableCell>
      </TableRow>
    );
    const childrenRows: React.ReactElement[] =
      hasChildren && isOpen
        ? a
            .children!.sort((x, y) => x.code.localeCompare(y.code))
            .flatMap((c) => renderRows(c, depth + 1))
        : [];
    return [row, ...childrenRows];
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Chart of Accounts</h2>
        <Dialog
          open={adding}
          onOpenChange={(o) => (o ? openAdd() : cancelAdd())}
        >
          <DialogTrigger asChild>
            <Button onClick={openAdd}>
              <Plus className="mr-2" /> Add Account
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Account</DialogTitle>
              <DialogDescription>
                Enter details for the new account. Type defines category; parent
                creates hierarchy.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3 items-center">
                <div className="space-y-1">
                  <Label htmlFor="acc-name">Name</Label>
                  <Input
                    id="acc-name"
                    value={addForm.name}
                    onChange={(e) =>
                      setAddForm((f) => ({ ...f, name: e.target.value }))
                    }
                    placeholder="e.g. Cash"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="acc-code">Code</Label>
                  <Input
                    id="acc-code"
                    value={addForm.code}
                    onChange={(e) =>
                      setAddForm((f) => ({ ...f, code: e.target.value }))
                    }
                    placeholder="e.g. 1-1-3"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Parent</Label>
                  <Select
                    value={addForm.parentId || ""}
                    onValueChange={(val) => {
                      const p = accounts.find((a) => a.id === val);
                      if (p) {
                        setAddForm((f) => ({
                          ...f,
                          parentId: val,
                          code: p.code,
                          type: p.type,
                        }));
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select parent" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts
                        .sort((x, y) => x.code.localeCompare(y.code))
                        .map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.code} — {a.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 w-full">
                  <Label>Type</Label>
                  <Select
                    value={addForm.type || ""}
                    disabled
                    onValueChange={(val) =>
                      setAddForm((f) => ({
                        ...f,
                        type: (val as AccountType) || "",
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asset">Asset</SelectItem>
                      <SelectItem value="liability">Liability</SelectItem>
                      <SelectItem value="equity">Equity</SelectItem>
                      <SelectItem value="revenue">Revenue</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {error && <div className="text-destructive text-sm">{error}</div>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={cancelAdd}>
                Cancel
              </Button>
              <Button onClick={submitAdd}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {/* Add account now opens via dialog */}
      {error && !adding && (
        <div className="text-destructive text-sm">{error}</div>
      )}
      <div className="rounded-lg border">
        <Table className="w-full">
          <TableHeader className="bg-muted">
            <TableRow className="text-left text-sm text-muted-foreground">
              <TableHead className="w-12"> </TableHead>
              <TableHead className="w-28">Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roots
              .flatMap((r) => r.children || [])
              .sort((a, b) => a.code.localeCompare(b.code))
              .flatMap((r) => renderRows(r))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
