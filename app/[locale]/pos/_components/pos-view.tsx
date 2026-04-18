"use client";

import { useState, useMemo, useEffect } from "react";
import {
  POSProduct,
  POSCartItem,
  closePOSSession,
  getHeldOrders,
  holdOrder,
  getPOSProducts,
} from "../actions";
import { logout } from "@/app/[locale]/auth/actions";
import { Button } from "@/components/ui/button";
import { LogOut, History, Search, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { CartView } from "./cart-view";
import { ProductGrid } from "./product-grid";

import { SuperJSONResult } from "superjson";
import { SuperJSON } from "@/lib/superjson";
import { HeldOrdersDialog } from "./held-orders-dialog";
import { POSHistoryDialog } from "./pos-history-dialog";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/components/providers/session-provider";
import Link from "next/link";
import { LayoutDashboard } from "lucide-react";
import { Clock } from "./clock";
import { useTranslations } from "next-intl";
import { useDebounce } from "use-debounce";

interface POSViewProps {
  initialProducts: SuperJSONResult;
  categories: SuperJSONResult;
  session: SuperJSONResult;
}

export function POSView({
  initialProducts: serializedProducts,
  categories: serializedCategories,
  session: serializedSession,
}: POSViewProps) {
  const t = useTranslations("POS");
  const initialData = SuperJSON.deserialize<{
    items: POSProduct[];
    total: number;
    hasMore: boolean;
  }>(serializedProducts);
  const categories = SuperJSON.deserialize<any[]>(serializedCategories);
  const session = SuperJSON.deserialize<any>(serializedSession);

  const [cart, setCart] = useState<POSCartItem[]>([]);
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery] = useDebounce(searchQuery, 300);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const sessionData = useSession();
  const isCashier = sessionData?.role === "Cashier";

  const {
    data: productData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
  } = useInfiniteQuery({
    queryKey: ["pos-products", debouncedSearchQuery, selectedCategory],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await getPOSProducts(
        pageParam as number,
        20,
        debouncedSearchQuery,
        selectedCategory || undefined,
      );
      return SuperJSON.deserialize<{
        items: POSProduct[];
        total: number;
        hasMore: boolean;
      }>(res);
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.hasMore ? allPages.length + 1 : undefined;
    },
    initialData:
      debouncedSearchQuery === "" && !selectedCategory
        ? {
            pages: [initialData],
            pageParams: [1],
          }
        : undefined,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  const products = useMemo(() => {
    return productData?.pages.flatMap((page) => page.items) ?? [];
  }, [productData]);

  const { data: heldOrders = [] } = useQuery({
    queryKey: ["heldOrders"],
    queryFn: async () => {
      const res = await getHeldOrders();
      return SuperJSON.deserialize<any[]>(res);
    },
  });

  const addToCart = (product: POSProduct) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      return [...prev, { ...product, quantity: 1, discount: 0 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === productId) {
            const newQty = Math.max(0, item.quantity + delta);
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter((item) => item.quantity > 0),
    );
  };

  const updateDiscount = (productId: string, discount: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.id === productId) {
          return { ...item, discount };
        }
        return item;
      }),
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setGlobalDiscount(0);
  };

  const handleCloseSession = async () => {
    if (confirm(t("confirm_close_session"))) {
      try {
        await closePOSSession(session.id, 0); // TODO: Dialog to enter actual cash
        toast({ title: t("session_closed") });
        router.refresh();
      } catch (e) {
        toast({ variant: "destructive", title: t("error_closing") });
      }
    }
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = "/auth";
  };

  const handleViewHistoryItem = async (invoiceId: string) => {
    if (cart.length > 0) {
      try {
        await holdOrder(
          cart,
          cart.reduce((acc, item) => acc + item.price * item.quantity, 0) -
            globalDiscount, // Approx total
          t("auto_held_history"),
          undefined,
          "Walk-in Customer",
          globalDiscount,
        );
        toast({ title: t("order_held") });
        setCart([]);
        setGlobalDiscount(0);
      } catch (e) {
        console.error(e);
        toast({ variant: "destructive", title: t("failed_hold") });
        return; // Don't navigate if hold fails
      }
    }
    router.push(`/pos/invoices/${invoiceId}`);
  };

  const handleResume = (
    items: POSCartItem[],
    customerName?: string,
    customerId?: string,
    resumedGlobalDiscount?: number,
  ) => {
    setCart((prev) => {
      const newCart = [...prev];
      items.forEach((newItem) => {
        const existingIndex = newCart.findIndex((c) => c.id === newItem.id);
        if (existingIndex >= 0) {
          const existing = newCart[existingIndex];
          newCart[existingIndex] = {
            ...existing,
            quantity: existing.quantity + newItem.quantity,
          };
        } else {
          newCart.push(newItem);
        }
      });
      return newCart;
    });
    if (resumedGlobalDiscount !== undefined) {
      setGlobalDiscount(resumedGlobalDiscount);
    }
    toast({ title: t("items_added") });
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex h-16 items-center justify-between border-b bg-background px-4">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">{t("pos")}</h1>
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("search_products")}
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
                {t("held_orders")}
                {heldOrders.length > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                  >
                    {heldOrders.length}
                  </Badge>
                )}
              </Button>
            }
          />

          <Button
            variant="outline"
            size="sm"
            className="mr-2"
            onClick={() => setHistoryOpen(true)}
          >
            <History className="mr-2 h-4 w-4" />
            {t("history")}
          </Button>

          <div className="text-sm text-muted-foreground">
            {session.cashier?.name && (
              <span className="mr-3 font-medium text-foreground">
                {session.cashier?.name}
              </span>
            )}
            {t("session")}: {session.sessionNumber}
          </div>
          {session.warehouse && (
            <Badge variant="outline" className="text-sm font-normal">
              {t("location")}: {session.warehouse.name}
            </Badge>
          )}

          {!isCashier && (
            <Button variant="outline" size="sm" asChild>
              <Link href="/accounting/dashboard">
                <LayoutDashboard className="mr-2 h-4 w-4" />
                {t("dashboard")}
              </Link>
            </Button>
          )}

          <Clock startTime={session.startTime} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/avatars/01.png" alt="Cashier" />
                  <AvatarFallback>
                    {session.cashier?.name?.slice(0, 2).toUpperCase() || "CA"}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {t("cashier")}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {session.cashier?.name}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleCloseSession}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>{t("close_session")}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>{t("logout")}</span>
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
              {t("all_items")}
            </Button>
            {categories.map((cat) => (
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
          <ProductGrid
            products={products}
            onAddToCart={addToCart}
            onFetchNextPage={fetchNextPage}
            hasNextPage={!!hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            isLoading={isLoading}
            isError={isError}
            onRetry={() => refetch()}
          />
        </div>

        {/* Right: Cart */}
        <div className="w-[400px] border-l bg-background shadow-xl">
          <CartView
            cart={cart}
            globalDiscount={globalDiscount}
            onUpdateGlobalDiscount={setGlobalDiscount}
            onUpdateQuantity={updateQuantity}
            onUpdateDiscount={updateDiscount}
            onRemove={removeFromCart}
            onClear={clearCart}
            session={session}
          />
        </div>
      </div>

      <POSHistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        sessionId={session.id}
        onRowClick={handleViewHistoryItem}
      />
    </div>
  );
}
