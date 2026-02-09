'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, RotateCcw, Trash2, User } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getHeldOrders, resumeOrder, deleteHeldOrder, POSCartItem } from '../actions';
import { SuperJSON } from "@/lib/superjson";
import { formatDistanceToNow } from 'date-fns';
import { useFormatCurrency } from '@/hooks/use-format-currency';
import { useToast } from '@/hooks/use-toast';

interface HeldOrdersDialogProps {
  onResume: (items: POSCartItem[], customerName?: string, customerId?: string) => void;
  trigger?: React.ReactNode;
}

export function HeldOrdersDialog({ onResume, trigger }: HeldOrdersDialogProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const formatCurrency = useFormatCurrency();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: heldOrders = [], isLoading } = useQuery({
    queryKey: ['heldOrders'],
    queryFn: async () => {
      const res = await getHeldOrders();
      return SuperJSON.deserialize<any[]>(res);
    },
    enabled: open, // Only fetch when open
  });

  const resumeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await resumeOrder(id);
      return SuperJSON.deserialize<any>(res);
    },
    onSuccess: (data) => {
      const items = data.items as POSCartItem[];
      onResume(items, data.customerName, data.customerId);
      setOpen(false);
      toast({ title: 'Order Resumed' });
      queryClient.invalidateQueries({ queryKey: ['heldOrders'] });
    },
    onError: () => {
      toast({ variant: 'destructive', title: 'Failed to resume order' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteHeldOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['heldOrders'] });
      toast({ title: 'Held order deleted' });
    },
  });

  const filteredOrders = heldOrders.filter(order =>
    order.holdId.toLowerCase().includes(search.toLowerCase()) ||
    order.customerName?.toLowerCase().includes(search.toLowerCase()) ||
    order.user.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Held Orders</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 mb-4">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by ID, customer or cashier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">Loading...</div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">No held orders found</div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => (
                <div key={order.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{order.holdId}</span>
                        <Badge variant="outline" className="text-xs">
                          {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                        <User className="h-3 w-3" />
                        {order.customerName || 'Walk-in Customer'}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Held by: {order.user.name}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg">{formatCurrency(order.totalAmount)}</div>
                      <div className="text-xs text-muted-foreground">{order.items.length} items</div>
                    </div>
                  </div>

                  {order.note && (
                    <div className="text-sm bg-muted/50 p-2 rounded">
                      Note: {order.note}
                    </div>
                  )}

                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteMutation.mutate(order.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => resumeMutation.mutate(order.id)}
                      disabled={resumeMutation.isPending}
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Resume
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
