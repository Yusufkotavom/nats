"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import {
  closePOSSession,
  getHeldOrders,
  holdOrder,
  getPOSProducts,
  getDiningSpots,
  openDiningSpot,
  closeDiningSpot,
} from "../actions";
import { logout } from "@/app/[locale]/auth/actions";
import { Button } from "@/components/ui/button";
import { LogOut, History, Search, RotateCcw, Keyboard, PowerOffIcon } from "lucide-react";
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
import { useConfirm } from "@/hooks/use-confirm";
import { useRouter } from "next/navigation";
import { CartView } from "./cart-view";
import { ProductGrid } from "./product-grid";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ShoppingCart } from "lucide-react";

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
import { POSCartItem, POSProduct } from "../types";
import { POSDiningSpot } from "../types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const DINING_STATUS_META: Record<
  POSDiningSpot["status"],
  { label: string; badgeVariant: "default" | "secondary" | "outline"; dotClass: string }
> = {
  AVAILABLE: {
    label: "Kosong",
    badgeVariant: "outline",
    dotClass: "bg-emerald-500",
  },
  ORDERING: {
    label: "Sedang Pesan",
    badgeVariant: "default",
    dotClass: "bg-sky-500",
  },
  BILLING: {
    label: "Pembayaran",
    badgeVariant: "default",
    dotClass: "bg-amber-500",
  },
  CLOSED: {
    label: "Ditutup",
    badgeVariant: "secondary",
    dotClass: "bg-zinc-500",
  },
};

interface POSViewProps {
  initialProducts: SuperJSONResult;
  categories: SuperJSONResult;
  session: SuperJSONResult;
  diningSpots: SuperJSONResult;
}

export function POSView({
  initialProducts: serializedProducts,
  categories: serializedCategories,
  session: serializedSession,
  diningSpots: serializedDiningSpots,
}: POSViewProps) {
  const t = useTranslations("POS");
  const initialData = SuperJSON.deserialize<{
    items: POSProduct[];
    total: number;
    hasMore: boolean;
  }>(serializedProducts);
  const categories = SuperJSON.deserialize<any[]>(serializedCategories);
  const session = SuperJSON.deserialize<any>(serializedSession);
  const initialDiningSpots = SuperJSON.deserialize<POSDiningSpot[]>(serializedDiningSpots);

  const [cart, setCart] = useState<POSCartItem[]>([]);
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery] = useDebounce(searchQuery, 300);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedDiningSpotId, setSelectedDiningSpotId] = useState<string>("");
  const { toast } = useToast();
  const confirm = useConfirm();
  const router = useRouter();
  const sessionData = useSession();
  const isCashier = sessionData?.role === "Cashier";
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F4 or Ctrl+S to focus search
      if (e.key === "F4" || (e.ctrlKey && e.key === "s")) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }

      // Alt + 1-9 for categories
      if (e.altKey && /^[1-9]$/.test(e.key)) {
        e.preventDefault();
        const index = parseInt(e.key) - 1;
        if (index === 0) {
          setSelectedCategory(null);
        } else if (categories[index - 1]) {
          setSelectedCategory(categories[index - 1].id);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [categories]);

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

  const { data: diningSpots = [], refetch: refetchDiningSpots } = useQuery({
    queryKey: ["diningSpots"],
    queryFn: async () => {
      const res = await getDiningSpots();
      return SuperJSON.deserialize<POSDiningSpot[]>(res);
    },
    initialData: initialDiningSpots,
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
    const ok = await confirm({
      title: t("close_session"),
      description: t("confirm_close_session"),
      variant: "destructive",
    });

    if (ok) {
      try {
        await closePOSSession(session.id, 0); // TODO: Dialog to enter actual cash
        toast({ title: t("session_closed") });
        router.refresh();
      } catch {
        toast({ variant: "destructive", title: t("error_closing") });
      }
    }
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = "/auth";
  };

  const selectedSpot = useMemo(
    () => diningSpots.find((spot) => spot.id === selectedDiningSpotId),
    [diningSpots, selectedDiningSpotId],
  );
  const diningSpotSummary = useMemo(() => {
    const totals = {
      total: diningSpots.length,
      AVAILABLE: 0,
      ORDERING: 0,
      BILLING: 0,
      CLOSED: 0,
    };
    for (const spot of diningSpots) {
      totals[spot.status] += 1;
    }
    return totals;
  }, [diningSpots]);

  const handleOpenSpot = async () => {
    if (!selectedDiningSpotId) {
      toast({ variant: "destructive", title: "Pilih meja/lokasi terlebih dahulu" });
      return;
    }
    try {
      await openDiningSpot(selectedDiningSpotId);
      toast({ title: "Meja/lokasi dibuka" });
      await refetchDiningSpots();
    } catch (error) {
      toast({
        variant: "destructive",
        title: error instanceof Error ? error.message : "Gagal membuka meja/lokasi",
      });
    }
  };

  const handleCloseSpot = async () => {
    if (!selectedDiningSpotId) {
      toast({ variant: "destructive", title: "Pilih meja/lokasi terlebih dahulu" });
      return;
    }
    try {
      await closeDiningSpot(selectedDiningSpotId);
      toast({ title: "Meja/lokasi ditutup" });
      await refetchDiningSpots();
    } catch (error) {
      toast({
        variant: "destructive",
        title: error instanceof Error ? error.message : "Gagal menutup meja/lokasi",
      });
    }
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
          t("walk_in_customer"),
          globalDiscount,
          selectedDiningSpotId || undefined,
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
    diningSpotId?: string,
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
    if (diningSpotId) {
      setSelectedDiningSpotId(diningSpotId);
    }
    toast({ title: t("items_added") });
  };

  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex h-16 items-center justify-between border-b bg-background px-2 sm:px-4">
        <div className="flex items-center gap-4 flex-1">
          <h1 className="hidden text-xl font-bold lg:block">{t("pos")}</h1>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="hidden lg:block">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground"
                  >
                    <Keyboard className="h-4 w-4" />
                  </Button>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="w-64 p-3">
                <div className="space-y-2">
                  <p className="font-semibold border-b pb-1 text-xs uppercase tracking-wider text-muted-foreground">
                    {t("shortcuts")}
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <span className="font-medium">{t("focus_search")}</span>
                    <kbd className="justify-self-end rounded border bg-muted px-1.5 font-sans">
                      F4 / Ctrl+S
                    </kbd>

                    <span className="font-medium">{t("select_category")}</span>
                    <kbd className="justify-self-end rounded border bg-muted px-1.5 font-sans">
                      Alt + 1-9
                    </kbd>

                    <span className="font-medium">
                      {t("navigate_products")}
                    </span>
                    <kbd className="justify-self-end rounded border bg-muted px-1.5 font-sans">
                      ↑ ↓ ← →
                    </kbd>

                    <span className="font-medium">{t("add_to_cart")}</span>
                    <kbd className="justify-self-end rounded border bg-muted px-1.5 font-sans">
                      Enter
                    </kbd>

                    <span className="font-medium">{t("checkout")}</span>
                    <kbd className="justify-self-end rounded border bg-muted px-1.5 font-sans">
                      F9
                    </kbd>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <HeldOrdersDialog
            onResume={handleResume}
            trigger={
              <Button variant="outline" size="sm" className="relative mr-2">
                <RotateCcw className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">{t("held_orders")}</span>
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
            <span className="hidden sm:inline">{t("history")}</span>
          </Button>

          <div className="hidden md:block text-sm text-muted-foreground">
            {sessionData?.userName && (
              <span className="mr-3 font-medium text-foreground">
                {sessionData.userName}
              </span>
            )}
            {t("session")}: {session.sessionNumber}
          </div>
          {session.warehouse && (
            <Badge variant="outline" className="hidden md:inline-flex text-sm font-normal">
              {t("location")}: {session.warehouse.name}
            </Badge>
          )}

          {!isCashier && (
            <Button variant="outline" size="sm" asChild className="hidden sm:inline-flex">
              <Link href="/accounting/dashboard">
                <LayoutDashboard className="mr-2 h-4 w-4" />
                {t("dashboard")}
              </Link>
            </Button>
          )}

          <div className="hidden sm:block">
            <Clock startTime={session.startTime} />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/avatars/01.png" alt="Cashier" />
                  <AvatarFallback>
                    {sessionData?.userName?.slice(0, 2).toUpperCase() || "CA"}
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
                    {sessionData?.userName}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleCloseSession}>
                <PowerOffIcon className="mr-2 h-4 w-4" />
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

      <div className="border-b bg-muted/20 px-2 py-2 sm:px-4">
        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs sm:text-sm">
          <Badge variant="outline">Total spot: {diningSpotSummary.total}</Badge>
          <Badge variant="outline">Kosong: {diningSpotSummary.AVAILABLE}</Badge>
          <Badge variant="default">Sedang pesan: {diningSpotSummary.ORDERING}</Badge>
          <Badge variant="default">Pembayaran: {diningSpotSummary.BILLING}</Badge>
          <Badge variant="secondary">Ditutup: {diningSpotSummary.CLOSED}</Badge>
          {selectedSpot ? (
            <Badge variant={DINING_STATUS_META[selectedSpot.status].badgeVariant}>
              Terpilih: {selectedSpot.spotCode} ({DINING_STATUS_META[selectedSpot.status].label})
            </Badge>
          ) : (
            <Badge variant="secondary">Belum pilih meja/kamar</Badge>
          )}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {diningSpots.map((spot) => {
            const statusMeta = DINING_STATUS_META[spot.status];
            const isSelected = selectedDiningSpotId === spot.id;
            return (
              <button
                key={spot.id}
                type="button"
                onClick={() => setSelectedDiningSpotId(spot.id)}
                className={`min-w-[180px] rounded-md border bg-background p-2 text-left transition ${isSelected ? "border-primary ring-1 ring-primary" : "hover:border-primary/40"
                  }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">{spot.area.name}</span>
                  <span className={`h-2.5 w-2.5 rounded-full ${statusMeta.dotClass}`} />
                </div>
                <p className="mt-1 text-sm font-semibold">
                  {spot.spotCode} - {spot.spotName}
                </p>
                <div className="mt-1 flex items-center justify-between">
                  <Badge variant={statusMeta.badgeVariant}>{statusMeta.label}</Badge>
                  <span className="text-xs text-muted-foreground">{spot.spotType}</span>
                </div>
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleOpenSpot}
            disabled={!selectedSpot || selectedSpot.status !== "AVAILABLE"}
          >
            Buka meja/kamar
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCloseSpot}
            disabled={!selectedSpot || selectedSpot.status === "AVAILABLE"}
          >
            Tutup meja/kamar
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left: Product Grid */}
        <div className="flex-1 overflow-y-auto bg-muted/20 p-2 md:p-4 pb-20 lg:pb-4">
          <div className="relative w-full mb-4">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              placeholder={`${t("search_products")} (F4)`}
              className="h-11 pl-10 text-base shadow-sm transition-all focus-visible:ring-2"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
            <Button
              variant={selectedCategory === null ? "default" : "outline"}
              onClick={() => setSelectedCategory(null)}
              className="whitespace-nowrap"
            >
              {t("all_items")}
              <kbd className="ml-2 hidden rounded border px-1.5 font-sans text-[10px] lg:inline-block">
                Alt+1
              </kbd>
            </Button>
            {categories.map((cat, index) => (
              <Button
                key={cat.id}
                variant={selectedCategory === cat.id ? "default" : "outline"}
                onClick={() => setSelectedCategory(cat.id)}
                className="whitespace-nowrap"
              >
                {cat.name}
                {index < 8 && (
                  <kbd className="ml-2 hidden rounded border px-1.5 font-sans text-[10px] lg:inline-block">
                    Alt+{index + 2}
                  </kbd>
                )}
              </Button>
            ))}
          </div>
          <ProductGrid
            key={`${selectedCategory}-${debouncedSearchQuery}`}
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

        {/* Right: Cart Desktop */}
        <div className="hidden lg:block w-[400px] border-l bg-background shadow-xl">
          <CartView
            cart={cart}
            globalDiscount={globalDiscount}
            onUpdateGlobalDiscount={setGlobalDiscount}
            onUpdateQuantity={updateQuantity}
            onUpdateDiscount={updateDiscount}
            onRemove={removeFromCart}
            onClear={clearCart}
            session={session}
            selectedDiningSpotId={selectedDiningSpotId || undefined}
            selectedDiningSpotName={selectedSpot ? `${selectedSpot.spotCode} - ${selectedSpot.spotName}` : undefined}
            selectedDiningSpotStatus={selectedSpot?.status}
          />
        </div>

        {/* Mobile Cart Trigger */}
        <div className="lg:hidden absolute bottom-4 left-4 right-4 z-10">
          <Sheet>
            <SheetTrigger asChild>
              <Button className="w-full h-14 rounded-full shadow-lg text-lg flex justify-between px-6" size="lg">
                <span className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  {t("cart")}
                </span>
                <span className="bg-primary-foreground text-primary px-3 py-1 rounded-full text-sm font-bold">
                  {totalItems}
                </span>
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[90vh] p-0 flex flex-col">
              <SheetHeader className="sr-only">
                <SheetTitle>{t("cart")}</SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-hidden">
                <CartView
                  cart={cart}
                  globalDiscount={globalDiscount}
                  onUpdateGlobalDiscount={setGlobalDiscount}
                  onUpdateQuantity={updateQuantity}
                  onUpdateDiscount={updateDiscount}
                  onRemove={removeFromCart}
                  onClear={clearCart}
                  session={session}
                  selectedDiningSpotId={selectedDiningSpotId || undefined}
                  selectedDiningSpotName={selectedSpot ? `${selectedSpot.spotCode} - ${selectedSpot.spotName}` : undefined}
                  selectedDiningSpotStatus={selectedSpot?.status}
                />
              </div>
            </SheetContent>
          </Sheet>
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
