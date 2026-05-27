"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SuperJSON } from "@/lib/superjson";
import { createPaymentMethod, getPaymentMethods } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

type Row = {
  id: string;
  name: string;
  methodType: "CASH" | "BANK";
  accountType: string;
  accountNumber: string | null;
  bankName: string | null;
  glAccountId: string;
  glCode: string;
  glName: string;
  isActive: boolean;
};

export function PaymentMethodView() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [type, setType] = useState<"CASH" | "BANK">("CASH");
  const [accountNumber, setAccountNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const methodsQuery = useQuery({
    queryKey: ["payment-methods"],
    queryFn: async () => {
      const raw = await getPaymentMethods();
      return SuperJSON.deserialize<Row[]>(raw);
    },
  });

  const onSubmit = async () => {
    if (!name.trim()) {
      toast({ title: "Nama payment method wajib diisi", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await createPaymentMethod({
        name,
        type,
        accountNumber: accountNumber || undefined,
        bankName: bankName || undefined,
      });
      setName("");
      setAccountNumber("");
      setBankName("");
      await queryClient.invalidateQueries({ queryKey: ["payment-methods"] });
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

  return (
    <div className="space-y-6">
      <div className="rounded-lg border p-4">
        <h2 className="mb-3 text-sm font-semibold">Add Payment Method</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="grid gap-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Contoh: Bank BCA Operasional" />
          </div>
          <div className="grid gap-2">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as "CASH" | "BANK")}>
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
        </div>
        <div className="mt-4">
          <Button onClick={onSubmit} disabled={submitting}>{submitting ? "Saving..." : "Add Payment Method"}</Button>
        </div>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Bank / Account</TableHead>
              <TableHead>Mapped GL Account</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(methodsQuery.data || []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground">No payment methods found</TableCell>
              </TableRow>
            ) : (
              (methodsQuery.data || []).map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell><Badge variant="outline">{row.methodType}</Badge></TableCell>
                  <TableCell>{row.bankName || "-"} / {row.accountNumber || "-"}</TableCell>
                  <TableCell>{row.glCode} - {row.glName}</TableCell>
                  <TableCell>{row.isActive ? "ACTIVE" : "INACTIVE"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
