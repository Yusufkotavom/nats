'use client';

import { useState, useMemo } from 'react';
import { POSProduct, POSCartItem, closePOSSession, getHeldOrders } from '../actions';
import { Button } from '@/components/ui/button';
import { LogOut, History, Search, RotateCcw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { CartView } from './cart-view';
import { ProductGrid } from './product-grid';

import { SuperJSONResult } from "superjson";
import { SuperJSON } from "@/lib/superjson";
import { HeldOrdersDialog } from './held-orders-dialog';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';

interface POSViewProps {
  initialProducts: SuperJSONResult;
  categories: SuperJSONResult;
  session: SuperJSONResult;
}

export function POSView({ initialProducts: serializedProducts, categories: serializedCategories, session: serializedSession }: POSViewProps) {
  const initialProducts = SuperJSON.deserialize<POSProduct[]>(serializedProducts);
  const categories = SuperJSON.deserialize<any[]>(serializedCategories);
  const session = SuperJSON.deserialize<any>(serializedSession);

  const [cart, setCart] = useState<POSCartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  const { data: heldOrders = [] } = useQuery({
    queryKey: ['heldOrders'],
    queryFn: async () => {
      const res = await getHeldOrders();
      return SuperJSON.deserialize<any[]>(res);
    },
  });

  const filteredProducts = useMemo(() => {
    return initialProducts.filter((product) => {
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory ? product.categoryId === selectedCategory : true;
      return matchesSearch && matchesCategory;
    });
  }, [initialProducts, searchQuery, selectedCategory]);

  const addToCart = (product: POSProduct) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1, discount: 0 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.id === productId) {
          const newQty = Math.max(0, item.quantity + delta);
          return { ...item, quantity: newQty };
        }
        return item;
      }).filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const handleCloseSession = async () => {
    if (confirm('Are you sure you want to close this session?')) {
      try {
        await closePOSSession(session.id, 0); // TODO: Dialog to enter actual cash
        toast({ title: 'Session Closed' });
        router.refresh();
      } catch (e) {
        toast({ variant: 'destructive', title: 'Error closing session' });
      }
    }
  };

  const handleResume = (items: POSCartItem[], customerName?: string, customerId?: string) => {
    setCart(prev => {
      const newCart = [...prev];
      items.forEach(newItem => {
        const existingIndex = newCart.findIndex(c => c.id === newItem.id);
        if (existingIndex >= 0) {
          const existing = newCart[existingIndex];
          newCart[existingIndex] = {
            ...existing,
            quantity: existing.quantity + newItem.quantity
          };
        } else {
          newCart.push(newItem);
        }
      });
      return newCart;
    });
    toast({ title: 'Order items added to cart' });
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex h-16 items-center justify-between border-b bg-background px-4">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">POS</h1>
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <HeldOrdersDialog
            onResume={handleResume}
            trigger={
              <Button variant="outline" size="sm" className="relative mr-2">
                <RotateCcw className="mr-2 h-4 w-4" />
                Held Orders
                {heldOrders.length > 0 && (
                  <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                    {heldOrders.length}
                  </Badge>
                )}
              </Button>
            }
          />

          <div className="text-sm text-muted-foreground">
            Session: {session.sessionNumber}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/avatars/01.png" alt="Cashier" />
                  <AvatarFallback>C</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">Cashier</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {session.cashier?.name}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleCloseSession}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Close Session</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Product Grid */}
        <div className="flex-1 overflow-y-auto bg-muted/20 p-4">
          <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
            <Button
              variant={selectedCategory === null ? "default" : "outline"}
              onClick={() => setSelectedCategory(null)}
              className="whitespace-nowrap"
            >
              All Items
            </Button>
            {categories.map(cat => (
              <Button
                key={cat.id}
                variant={selectedCategory === cat.id ? "default" : "outline"}
                onClick={() => setSelectedCategory(cat.id)}
                className="whitespace-nowrap"
              >
                {cat.name}
              </Button>
            ))}
          </div>
          <ProductGrid products={filteredProducts} onAddToCart={addToCart} />
        </div>

        {/* Right: Cart */}
        <div className="w-[400px] border-l bg-background shadow-xl">
          <CartView
            cart={cart}
            onUpdateQuantity={updateQuantity}
            onRemove={removeFromCart}
            onClear={clearCart}
            session={session}
          />
        </div>
      </div>
    </div>
  );
}
