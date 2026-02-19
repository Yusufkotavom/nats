'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { validateDiscountCode } from '../actions';
import { SuperJSON } from "@/lib/superjson";
import { Loader2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';

interface DiscountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (value: number, type: 'PERCENTAGE' | 'FIXED') => void;
  title?: string;
  productId?: string | null;
  // Kept for interface compatibility but not used in code mode
  initialValue?: number;
  initialType?: 'PERCENTAGE' | 'FIXED';
  maxAmount?: number;
  availableDiscounts?: {
    code: string;
    type: 'PERCENTAGE' | 'FIXED_AMOUNT';
    value: number;
  }[];
}

export function DiscountDialog({
  open,
  onOpenChange,
  onApply,
  title = 'Apply Discount Code',
  productId,
  initialValue = 0,
  availableDiscounts = [],
}: DiscountDialogProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setCode('');
    }
  }, [open]);

  const handleApply = async (codeToApply?: string) => {
    const finalCode = codeToApply || code;
    if (!finalCode.trim()) return;

    setLoading(true);
    try {
      const res = await validateDiscountCode(finalCode);
      const discount = SuperJSON.deserialize<any>(res);

      // Validate Applicability
      const productIds = discount.products?.map((p: any) => p.id) || [];
      const isGlobal = productIds.length === 0;

      if (productId) {
        // Item Discount Mode
        if (!isGlobal && !productIds.includes(productId)) {
          throw new Error('This discount code does not apply to this product.');
        }
      } else {
        // Global Discount Mode
        if (!isGlobal) {
          throw new Error('This code is for specific products, not a global discount.');
        }
      }

      onApply(Number(discount.value), discount.type === 'FIXED_AMOUNT' ? 'FIXED' : 'PERCENTAGE');
      onOpenChange(false);
      setCode('');
      toast({ title: 'Discount Applied', description: `${discount.type === 'PERCENTAGE' ? `${discount.value}%` : `Amount ${discount.value}`} off` });

    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Invalid Discount Code',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Enter a valid discount code to apply.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="grid gap-2">
            <Label htmlFor="discount-code">Discount Code</Label>
            <Input
              id="discount-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. SUMMER2025"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleApply();
              }}
            />
          </div>

          {availableDiscounts.length > 0 && (
            <div className="mt-4">
              <Label className="text-xs text-muted-foreground mb-2 block">Available Coupons:</Label>
              <div className="flex flex-wrap gap-2">
                {availableDiscounts.map((d) => (
                  <Badge
                    key={d.code}
                    variant="secondary"
                    className="cursor-pointer hover:bg-primary/20"
                    onClick={() => handleApply(d.code)}
                  >
                    {d.code} ({d.type === 'PERCENTAGE' ? `${d.value}%` : d.value})
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {initialValue > 0 && (
            <Button variant="destructive" onClick={() => { onApply(0, 'FIXED'); onOpenChange(false); }}>
              Remove Discount
            </Button>
          )}
          <Button onClick={() => handleApply()} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
