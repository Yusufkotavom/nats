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
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import { useFormatCurrency } from '@/hooks/use-format-currency';
import { Loader2, CreditCard, Banknote, QrCode, Keyboard } from 'lucide-react';
import { NumPad } from './numpad';
import { useTranslations } from 'next-intl';

interface CheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalAmount: number;
  onConfirm: (paymentMethod: 'CASH' | 'CARD' | 'QRIS', amountPaid: number) => Promise<void>;
}

export function CheckoutDialog({ open, onOpenChange, totalAmount, onConfirm }: CheckoutDialogProps) {
  const t = useTranslations('POS');
  const [method, setMethod] = useState<'CASH' | 'CARD' | 'QRIS'>('CASH');
  // Use string state to support keypad input (e.g., "10.")
  const [amountPaidStr, setAmountPaidStr] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [showKeypad, setShowKeypad] = useState(false);
  const formatCurrency = useFormatCurrency();

  // Reset state when dialog opens or total changes
  useEffect(() => {
    if (open) {
      setAmountPaidStr('');
      setShowKeypad(false);
    }
  }, [open, totalAmount]);

  const amountPaid = parseFloat(amountPaidStr) || 0;
  const change = Math.max(0, amountPaid - totalAmount);
  const isValid = method !== 'CASH' || amountPaid >= totalAmount;

  const handleConfirm = async () => {
    if (!isValid) return;
    setLoading(true);
    try {
      await onConfirm(method, method === 'CASH' ? amountPaid : totalAmount);
      onOpenChange(false);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleKeypadPress = (key: string) => {
    setAmountPaidStr((prev) => {
      if (key === 'CLEAR') return '';
      if (key === 'BACKSPACE') return prev.slice(0, -1);
      if (key === '.') {
        if (prev.includes('.')) return prev;
        return prev ? prev + '.' : '0.';
      }
      // Validation to prevent multiple leading zeros
      if (prev === '0' && key === '0') return prev;
      if (prev === '0' && key !== '.') return key;
      return prev + key;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={showKeypad ? "sm:max-w-[800px]" : "sm:max-w-[500px]"}>
        <DialogHeader>
          <DialogTitle>{t('payment')}</DialogTitle>
          <DialogDescription>
            {t('payment_description')}
          </DialogDescription>
        </DialogHeader>

        <div className={`grid gap-6 py-4 ${showKeypad ? 'grid-cols-2' : 'grid-cols-1'}`}>
          <div className="space-y-6">
            <div className="flex flex-col items-center justify-center space-y-2 rounded-lg bg-muted/50 p-4">
              <span className="text-sm text-muted-foreground">{t('total_amount')}</span>
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
                <span className="text-sm font-medium">{t('cash')}</span>
              </div>
              <div
                onClick={() => setMethod('CARD')}
                className={`flex cursor-pointer flex-col items-center justify-between rounded-md border-2 p-4 hover:bg-accent hover:text-accent-foreground ${method === 'CARD' ? 'border-primary bg-accent text-accent-foreground' : 'border-muted bg-popover'}`}
              >
                <CreditCard className="mb-3 h-6 w-6" />
                <span className="text-sm font-medium">{t('card')}</span>
              </div>
              <div
                onClick={() => setMethod('QRIS')}
                className={`flex cursor-pointer flex-col items-center justify-between rounded-md border-2 p-4 hover:bg-accent hover:text-accent-foreground ${method === 'QRIS' ? 'border-primary bg-accent text-accent-foreground' : 'border-muted bg-popover'}`}
              >
                <QrCode className="mb-3 h-6 w-6" />
                <span className="text-sm font-medium">{t('qris')}</span>
              </div>
            </div>

            {method === 'CASH' && (
              <div className="space-y-4">
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="amountPaid">{t('amount_paid')}</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowKeypad(!showKeypad)}
                      className="h-8 px-2"
                    >
                      <Keyboard className="mr-2 h-4 w-4" />
                      {showKeypad ? t('hide_keypad') : t('show_keypad')}
                    </Button>
                  </div>
                  <CurrencyInput
                    id="amountPaid"
                    placeholder={t('enter_amount')}
                    value={amountPaidStr}
                    onChange={(val) => setAmountPaidStr(val ? val.toString() : '')}
                    className="text-lg"
                    autoFocus={!showKeypad}
                  />
                </div>
                <div className="flex justify-between rounded-lg border p-3">
                  <span className="font-medium">{t('change_due')}:</span>
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
                      onClick={() => setAmountPaidStr((amountPaid + amt).toString())}
                    >
                      +{amt}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAmountPaidStr(totalAmount.toString())}
                  >
                    {t('exact')}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {showKeypad && method === 'CASH' && (
            <div className="border-l pl-6">
              <NumPad onKeyPress={handleKeypadPress} className="h-full" />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('cancel')}</Button>
          <Button onClick={handleConfirm} disabled={!isValid || loading} size="lg" className="w-full sm:w-auto">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('confirm_payment')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
