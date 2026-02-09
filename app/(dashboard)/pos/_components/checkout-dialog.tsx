'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFormatCurrency } from '@/hooks/use-format-currency';
import { Loader2, CreditCard, Banknote, QrCode } from 'lucide-react';

interface CheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalAmount: number;
  onConfirm: (paymentMethod: 'CASH' | 'CARD' | 'QRIS', amountPaid: number) => Promise<void>;
}

export function CheckoutDialog({ open, onOpenChange, totalAmount, onConfirm }: CheckoutDialogProps) {
  const [method, setMethod] = useState<'CASH' | 'CARD' | 'QRIS'>('CASH');
  const [amountPaid, setAmountPaid] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const formatCurrency = useFormatCurrency();

  // Reset amount paid when dialog opens or total changes
  useEffect(() => {
    if (open) {
      setAmountPaid('');
    }
  }, [open]);

  const change = Math.max(0, (parseFloat(amountPaid) || 0) - totalAmount);
  const isValid = method !== 'CASH' || (parseFloat(amountPaid) || 0) >= totalAmount;

  const handleConfirm = async () => {
    if (!isValid) return;
    setLoading(true);
    try {
      await onConfirm(method, method === 'CASH' ? parseFloat(amountPaid) : totalAmount);
      onOpenChange(false);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Payment</DialogTitle>
          <DialogDescription>
            Select payment method and process transaction.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="flex flex-col items-center justify-center space-y-2 rounded-lg bg-muted/50 p-4">
            <span className="text-sm text-muted-foreground">Total Amount</span>
            <span className="text-4xl font-bold text-primary">
              {formatCurrency(totalAmount)}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div
              onClick={() => setMethod('CASH')}
              className={`flex cursor-pointer flex-col items-center justify-between rounded-md border-2 p-4 hover:bg-accent hover:text-accent-foreground ${method === 'CASH' ? 'border-primary bg-accent text-accent-foreground' : 'border-muted bg-popover'}`}
            >
              <Banknote className="mb-3 h-6 w-6" />
              <span className="text-sm font-medium">Cash</span>
            </div>
            <div
              onClick={() => setMethod('CARD')}
              className={`flex cursor-pointer flex-col items-center justify-between rounded-md border-2 p-4 hover:bg-accent hover:text-accent-foreground ${method === 'CARD' ? 'border-primary bg-accent text-accent-foreground' : 'border-muted bg-popover'}`}
            >
              <CreditCard className="mb-3 h-6 w-6" />
              <span className="text-sm font-medium">Card</span>
            </div>
            <div
              onClick={() => setMethod('QRIS')}
              className={`flex cursor-pointer flex-col items-center justify-between rounded-md border-2 p-4 hover:bg-accent hover:text-accent-foreground ${method === 'QRIS' ? 'border-primary bg-accent text-accent-foreground' : 'border-muted bg-popover'}`}
            >
              <QrCode className="mb-3 h-6 w-6" />
              <span className="text-sm font-medium">QRIS</span>
            </div>
          </div>

          {method === 'CASH' && (
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="amountPaid">Amount Paid</Label>
                <Input
                  id="amountPaid"
                  type="number"
                  placeholder="Enter amount..."
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  className="text-lg"
                  autoFocus
                />
              </div>
              <div className="flex justify-between rounded-lg border p-3">
                <span className="font-medium">Change Due:</span>
                <span className="font-bold text-green-600">
                  {formatCurrency(change)}
                </span>
              </div>
              <div className="flex gap-2">
                {[10, 20, 50, 100].map((amt) => (
                  <Button
                    key={amt}
                    variant="outline"
                    size="sm"
                    onClick={() => setAmountPaid(amt.toString())}
                  >
                    {formatCurrency(amt)}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAmountPaid(totalAmount.toString())}
                >
                  Exact
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={!isValid || loading} size="lg" className="w-full sm:w-auto">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
