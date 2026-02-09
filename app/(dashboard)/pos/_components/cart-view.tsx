'use client';

import { useState } from 'react';
import { POSCartItem, processPOSTransaction } from '../actions';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Minus, Plus, Trash2, ShoppingCart } from 'lucide-react';
import { useFormatCurrency } from '@/hooks/use-format-currency';
import { CheckoutDialog } from './checkout-dialog';
import { useToast } from '@/hooks/use-toast';

interface CartViewProps {
  cart: POSCartItem[];
  onUpdateQuantity: (productId: string, delta: number) => void;
  onRemove: (productId: string) => void;
  onClear: () => void;
  session: any;
}

export function CartView({ cart, onUpdateQuantity, onRemove, onClear, session }: CartViewProps) {
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const formatCurrency = useFormatCurrency();
  const { toast } = useToast();

  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const tax = 0; // TODO: Implement tax logic
  const total = subtotal + tax;

  const handleCheckout = async (method: 'CASH' | 'CARD' | 'QRIS', amountPaid: number) => {
    try {
      const items = cart.map(item => ({
        productId: item.id,
        quantity: item.quantity,
        price: item.price,
        discount: item.discount
      }));

      await processPOSTransaction(session.id, items, method, amountPaid);

      toast({
        title: 'Transaction Successful',
        description: 'Receipt generated.',
      });
      onClear();
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Transaction Failed',
        description: 'Please try again.',
      });
      throw error; // Re-throw to keep dialog open or handle
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b p-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <ShoppingCart className="h-5 w-5" />
          Current Order
        </h2>
        <Button variant="ghost" size="sm" onClick={onClear} disabled={cart.length === 0} className="text-destructive hover:text-destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          Clear
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {cart.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-muted-foreground opacity-50">
            <ShoppingCart className="mb-4 h-12 w-12" />
            <p>Cart is empty</p>
          </div>
        ) : (
          <div className="space-y-4">
            {cart.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-4 rounded-lg border p-3 shadow-sm">
                <div className="flex-1">
                  <h4 className="font-medium">{item.name}</h4>
                  <p className="text-xs text-muted-foreground">{item.sku}</p>
                  <div className="mt-1 font-bold text-primary">
                    {formatCurrency(item.price)}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-2 rounded-md border bg-muted/50 p-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 rounded-sm"
                      onClick={() => onUpdateQuantity(item.id, -1)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-4 text-center text-sm font-medium">{item.quantity}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 rounded-sm"
                      onClick={() => onUpdateQuantity(item.id, 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="font-bold">
                    {formatCurrency(item.price * item.quantity)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t bg-muted/10 p-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tax</span>
            <span>{formatCurrency(tax)}</span>
          </div>
          <Separator className="my-2" />
          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>
        <Button
          className="mt-4 w-full"
          size="lg"
          disabled={cart.length === 0}
          onClick={() => setCheckoutOpen(true)}
        >
          Checkout
        </Button>
      </div>

      <CheckoutDialog
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        totalAmount={total}
        onConfirm={handleCheckout}
      />
    </div>
  );
}
