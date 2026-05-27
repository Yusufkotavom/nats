"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SuperJSON } from "@/lib/superjson";
import {
  createPaymentMethod,
  deletePaymentMethodAccount,
  deletePaymentMethodMapping,
  getPaymentMethodMappings,
  updatePaymentMethodAccount,
  updatePaymentMethodMapping,
} from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type Method = "CASH" | "BANK";

type AccountOption = {
  id: string;
  name: string;
  type: string;
  bankName: string | null;
  accountNumber: string | null;
  glCode: string;
  glName: string;
};

type Data = {
  rows: Array<{
    method: Method;
    label: string;
    description: string;
    mappedAccount: AccountOption | null;
  }>;
  options: {
    CASH: AccountOption[];
    BANK: AccountOption[];
  };
};

export function PaymentMethodView() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingMethod, setEditingMethod] = useState<Method | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<Method>("CASH");
  const [accountNumber, setAccountNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState<Method>("CASH");
  const [editBankName, setEditBankName] = useState("");
  const [editAccountNumber, setEditAccountNumber] = useState("");

  const query = useQuery({
    queryKey: ["payment-method-mappings"],
    queryFn: async () => {
      const raw = await getPaymentMethodMappings();
      return SuperJSON.deserialize<Data>(raw);
    },
  });

  const startEdit = (method: Method, currentId?: string | null) => {
    setEditingMethod(method);
    setSelectedAccountId(currentId || "");
  };

  const saveEdit = async () => {
    if (!editingMethod || !selectedAccountId) {
      toast({ title: "Pilih akun terlebih dahulu", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await updatePaymentMethodMapping({
        method: editingMethod,
        cashAccountId: selectedAccountId,
      });
      await queryClient.invalidateQueries({ queryKey: ["payment-method-mappings"] });
      setEditingMethod(null);
      setSelectedAccountId("");
      toast({ title: "Mapping payment method berhasil diperbarui" });
    } catch (error) {
      toast({
        title: "Gagal update mapping",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const deleteMapping = async (method: Method) => {
    const ok = window.confirm(
      "Hapus mapping method ini? Akun tidak akan dihapus, hanya relasi mapping yang dilepas.",
    );
    if (!ok) return;
    setSubmitting(true);
    try {
      await deletePaymentMethodMapping(method);
      await queryClient.invalidateQueries({ queryKey: ["payment-method-mappings"] });
      toast({ title: "Mapping berhasil dihapus" });
    } catch (error) {
      toast({
        title: "Gagal hapus mapping",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const addMethod = async () => {
    if (!name.trim()) {
      toast({ title: "Nama payment method wajib diisi", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await createPaymentMethod({
        name,
        type,
        bankName: bankName || undefined,
        accountNumber: accountNumber || undefined,
      });
      setName("");
      setAccountNumber("");
      setBankName("");
      await queryClient.invalidateQueries({ queryKey: ["payment-method-mappings"] });
      setCreateOpen(false);
      toast({ title: "Payment method berhasil ditambahkan" });
    } catch (error) {
      toast({
        title: "Gagal menambah payment method",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const openEditAccount = (acc: AccountOption) => {
    setEditingAccountId(acc.id);
    setEditName(acc.name);
    setEditType(acc.type === "BANK" || acc.type === "EWALLET" ? "BANK" : "CASH");
    setEditBankName(acc.bankName || "");
    setEditAccountNumber(acc.accountNumber || "");
    setEditOpen(true);
  };

  const saveEditAccount = async () => {
    if (!editingAccountId) return;
    if (!editName.trim()) {
      toast({ title: "Nama akun wajib diisi", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await updatePaymentMethodAccount({
        cashAccountId: editingAccountId,
        name: editName,
        type: editType,
        bankName: editBankName || undefined,
        accountNumber: editAccountNumber || undefined,
      });
      await queryClient.invalidateQueries({ queryKey: ["payment-method-mappings"] });
      setEditOpen(false);
      setEditingAccountId(null);
      toast({ title: "Akun payment method berhasil diupdate" });
    } catch (error) {
      toast({
        title: "Gagal update akun",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const removeAccount = async (cashAccountId: string) => {
    const ok = window.confirm("Hapus akun ini dari daftar payment method?");
    if (!ok) return;
    setSubmitting(true);
    try {
      await deletePaymentMethodAccount(cashAccountId);
      await queryClient.invalidateQueries({ queryKey: ["payment-method-mappings"] });
      if (editingAccountId === cashAccountId) {
        setEditOpen(false);
        setEditingAccountId(null);
      }
      toast({ title: "Akun payment method berhasil dihapus" });
    } catch (error) {
      toast({
        title: "Gagal hapus akun",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>Add Payment Method</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Payment Method</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="grid gap-2">
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Contoh: Bank BCA Operasional" />
              </div>
              <div className="grid gap-2">
                <Label>Type</Label>
                <Select value={type} onValueChange={(v) => setType(v as Method)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">CASH</SelectItem>
                    <SelectItem value="BANK">BANK</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Bank Name (optional)</Label>
                <Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="BCA / BRI / BTN / dll" />
              </div>
              <div className="grid gap-2">
                <Label>Account Number (optional)</Label>
                <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="1234567890" />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button onClick={addMethod} disabled={submitting}>{submitting ? "Saving..." : "Save"}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Method</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Mapped Account</TableHead>
              <TableHead className="w-[220px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(query.data?.rows || []).map((row) => {
              const isEditing = editingMethod === row.method;
              const options = query.data?.options[row.method] || [];
              return (
                <TableRow key={row.method}>
                  <TableCell>
                    <Badge variant="outline">{row.method}</Badge>
                  </TableCell>
                  <TableCell>{row.description}</TableCell>
                  <TableCell>
                    {row.mappedAccount
                      ? `${row.mappedAccount.name} (${row.mappedAccount.glCode} - ${row.mappedAccount.glName})`
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <div className="space-y-2">
                        <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih akun cash/bank" />
                          </SelectTrigger>
                          <SelectContent>
                            {options.map((opt) => (
                              <SelectItem key={opt.id} value={opt.id}>
                                {opt.name} ({opt.glCode})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={saveEdit} disabled={submitting}>
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingMethod(null);
                              setSelectedAccountId("");
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startEdit(row.method, row.mappedAccount?.id)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteMapping(row.method)}
                          disabled={submitting}
                        >
                          Delete Mapping
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="rounded-lg border">
        <div className="border-b px-4 py-3">
          <h3 className="text-sm font-semibold">Available Payment Accounts</h3>
          <p className="text-xs text-muted-foreground">
            Akun yang Anda tambah akan muncul di sini, lalu bisa dipilih lewat tombol Edit pada mapping CASH/BANK.
          </p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Bank / Account</TableHead>
              <TableHead>GL Account</TableHead>
              <TableHead className="w-[180px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...(query.data?.options.CASH || []), ...(query.data?.options.BANK || [])].length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground">No payment accounts available</TableCell>
              </TableRow>
            ) : (
              [...(query.data?.options.CASH || []), ...(query.data?.options.BANK || [])].map((acc) => (
                <TableRow key={acc.id}>
                  <TableCell className="font-medium">{acc.name}</TableCell>
                  <TableCell><Badge variant="outline">{acc.type}</Badge></TableCell>
                  <TableCell>{acc.bankName || "-"} / {acc.accountNumber || "-"}</TableCell>
                  <TableCell>{acc.glCode} - {acc.glName}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEditAccount(acc)}>Edit</Button>
                      <Button size="sm" variant="destructive" onClick={() => removeAccount(acc.id)} disabled={submitting}>
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Payment Account</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-2">
              <Label>Name</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Type</Label>
              <Select value={editType} onValueChange={(v) => setEditType(v as Method)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">CASH</SelectItem>
                  <SelectItem value="BANK">BANK</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Bank Name (optional)</Label>
              <Input value={editBankName} onChange={(e) => setEditBankName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Account Number (optional)</Label>
              <Input value={editAccountNumber} onChange={(e) => setEditAccountNumber(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button onClick={saveEditAccount} disabled={submitting}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
