"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { createPOSQuickContact } from "../actions";
import { SuperJSON } from "@/lib/superjson";
import { POSContactOption } from "../types";
import { useToast } from "@/hooks/use-toast";

interface QuickContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (contact: POSContactOption) => void;
}

export function QuickContactDialog({
  open,
  onOpenChange,
  onCreated,
}: QuickContactDialogProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({
        variant: "destructive",
        title: "Nama kontak wajib diisi",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const raw = await createPOSQuickContact({
        name: name.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
      });

      const contact = SuperJSON.deserialize<POSContactOption>(raw);
      onCreated(contact);

      toast({ title: "Kontak berhasil dibuat" });
      setName("");
      setPhone("");
      setEmail("");
      onOpenChange(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Gagal membuat kontak",
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isSubmitting) onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Quick Create Contact</DialogTitle>
          <DialogDescription>
            Tambah customer cepat langsung dari POS.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <Label htmlFor="quick-contact-name">Nama</Label>
            <Input
              id="quick-contact-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nama customer"
              autoFocus
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="quick-contact-phone">No. HP</Label>
            <Input
              id="quick-contact-phone"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="08xxxxxxxxxx"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="quick-contact-email">Email</Label>
            <Input
              id="quick-contact-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="nama@email.com"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Batal
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
