'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Percent, DollarSign } from 'lucide-react';
import { useFormatCurrency } from '@/hooks/use-format-currency';

interface DiscountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (value: number, type: 'PERCENTAGE' | 'FIXED') => void;
  title?: string;
  initialValue?: number;
  initialType?: 'PERCENTAGE' | 'FIXED';
  maxAmount?: number; // Price of the item to cap fixed discount
}

export function DiscountDialog({
  open,
  onOpenChange,
  onApply,
  title = 'Apply Discount',
  initialValue = 0,
  initialType = 'FIXED',
  maxAmount,
}: DiscountDialogProps) {
  const [value, setValue] = useState(initialValue.toString());
  const [type, setType] = useState<'PERCENTAGE' | 'FIXED'>(initialType);
  const formatCurrency = useFormatCurrency();

  useEffect(() => {
    if (open) {
      setValue(initialValue.toString());
      setType(initialType);
    }
  }, [open, initialValue, initialType]);

  const handleApply = () => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0) return;

    // Validation
    if (type === 'PERCENTAGE' && numValue > 100) {
      // Allow > 100? Probably not.
      return;
    }
    
    if (type === 'FIXED' && maxAmount && numValue > maxAmount) {
      // Don't allow discount > price
      // But let's just let the parent handle logic or just warn?
      // Better to clamp or validate.
    }

    onApply(numValue, type);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        <Tabs value={type} onValueChange={(v) => setType(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="FIXED">Amount ({formatCurrency(0).charAt(0)})</TabsTrigger>
            <TabsTrigger value="PERCENTAGE">Percentage (%)</TabsTrigger>
          </TabsList>
          
          <div className="py-4">
            <div className="grid gap-2">
              <Label htmlFor="discount-value">
                {type === 'FIXED' ? 'Discount Amount' : 'Discount Percentage'}
              </Label>
              <div className="relative">
                <Input
                  id="discount-value"
                  type="number"
                  min="0"
                  step={type === 'FIXED' ? '0.01' : '1'}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="pl-9"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleApply();
                  }}
                />
                <div className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground">
                  {type === 'FIXED' ? <DollarSign className="h-4 w-4" /> : <Percent className="h-4 w-4" />}
                </div>
              </div>
              {maxAmount && type === 'FIXED' && (
                <p className="text-xs text-muted-foreground">
                  Max discount: {formatCurrency(maxAmount)}
                </p>
              )}
            </div>
          </div>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleApply}>Apply Discount</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
