"use client";

import * as React from "react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { CustomInput } from "@/components/ui/custom-input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ChevronRight, ChevronDown, Pencil, Trash2, Plus } from "lucide-react";
import { updateAccount, deleteAccount } from "../actions";
import { Account } from "../../types";
import { AccountDialog } from "./account-dialog";
import { Protect } from "@/components/ui/protect";
import { useToast } from "@/hooks/use-toast";

export function AccountTable({
  initialAccounts,
}: {
  initialAccounts: Account[];
}) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState<string>("");
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const byId = useMemo(() => {
    const map: Record<string, Account> = {};
    initialAccounts.forEach((a) => (map[a.id] = { ...a, children: [] }));
    initialAccounts.forEach((a) => {
      if (a.parentId && map[a.parentId]) {
        map[a.parentId].children!.push(map[a.id]);
      }
    });
    return map;
  }, [initialAccounts]);

  const roots = useMemo(() => {
    const res: Account[] = [];
    initialAccounts.forEach((a) => {
      if (!a.parentId) {
        res.push(byId[a.id] || a);
      }
    });
    // sort by code for stable view
    res.sort((x, y) => x.code.localeCompare(y.code));
    return res;
  }, [initialAccounts, byId]);

  function toggleExpand(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !(prev[id] ?? true) }));
  }

  function beginEdit(a: Account) {
    setEditingId(a.id);
    setDraftName(a.name);
  }

  async function commitEdit(a: Account) {
    if (!editingId) return;
    setError(null);
    await updateAccount(a.id, { name: draftName });
    toast({
      title: "Success",
      description: "Account updated successfully",
    });
    // Data refresh is handled by Next.js Server Actions revalidation
    setEditingId(null);
    setDraftName("");
  }

  async function confirmDelete() {
    if (!accountToDelete) return;
    setIsDeleting(true);
    setError(null);

    try {
      const res = await deleteAccount(accountToDelete.id);
      if (!res?.success) {
        setError(res?.error || "Delete failed");
        toast({
          title: "Error",
          description: res?.error || "Delete failed",
          variant: "destructive",
        });
      } else {
        setAccountToDelete(null);
        toast({
          title: "Success",
          description: "Account deleted successfully",
        });
      }
    } catch (err) {
      setError("An unexpected error occurred");
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  }

  function handleDelete(a: Account) {
    setAccountToDelete(a);
  }

  function renderRows(a: Account, depth = 0): React.ReactElement[] {
    const hasChildren = (a.children?.length || 0) > 0;
    const isOpen = expanded[a.id] ?? true;
    const isUsed = (a._count?.journalEntryLines || 0) > 0;
    const canDelete = !isUsed && !hasChildren;

    let deleteTooltip = "Delete account";
    if (isUsed) deleteTooltip = "Cannot delete: used in transactions";
    else if (hasChildren) deleteTooltip = "Cannot delete: has child accounts";

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
                <CustomInput
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
                <Protect permission="accounts.edit">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => beginEdit(a)}
                    title="Edit name"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Pencil />
                  </Button>
                </Protect>
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
            title={deleteTooltip}
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
            .flatMap((c) => renderRows(c as Account, depth + 1))
        : [];
    return [row, ...childrenRows];
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Chart of Accounts</h2>
        <Button onClick={() => setIsAdding(true)}>
          <Plus className="mr-2" /> Add Account
        </Button>
      </div>

      {error && <div className="text-destructive text-sm">{error}</div>}

      <div className="rounded-lg border p-0">
        <Table className="w-full">
          <TableHeader className="bg-muted">
            <TableRow className="text-left text-sm text-muted-foreground">
              <TableHead className="w-12 rounded-tl-lg"> </TableHead>
              <TableHead className="w-28">Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="w-24 text-right rounded-tr-lg">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{roots.flatMap((r) => renderRows(r))}</TableBody>
        </Table>
      </div>

      <AccountDialog
        open={isAdding}
        onOpenChange={setIsAdding}
        accounts={initialAccounts}
        onSuccess={() => {
          toast({
            title: "Success",
            description: "Account created successfully",
          });
        }}
      />

      <ConfirmDialog
        open={!!accountToDelete}
        onOpenChange={(open) =>
          !open && !isDeleting && setAccountToDelete(null)
        }
        title="Are you sure?"
        description={
          <>
            This action cannot be undone. This will permanently delete the
            account
            <span className="font-medium text-foreground">
              {" "}
              {accountToDelete?.code} — {accountToDelete?.name}
            </span>
            .
          </>
        }
        onConfirm={confirmDelete}
        confirmText="Delete"
        variant="destructive"
        isLoading={isDeleting}
      />
    </div>
  );
}
