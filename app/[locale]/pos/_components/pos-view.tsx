"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import {
  closePOSSession,
  getHeldOrders,
  holdOrder,
  getPOSProducts,
  getDiningSpots,
} from "../actions";
import { logout } from "@/app/[locale]/auth/actions";
import { Button } from "@/components/ui/button";
import {
  LogOut,
  History,
  Search,
  RotateCcw,
  Keyboard,
  PowerOffIcon,
  ShoppingCart,
  ChefHat,
  Utensils,
  Receipt,
  LayoutDashboard,
} from "lucide-react";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { CartView } from "./cart-view";
import { ProductGrid } from "./product-grid";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import { SuperJSONResult } from "superjson";
import { SuperJSON } from "@/lib/superjson";
import { HeldOrdersDialog } from "./held-orders-dialog";
import { POSHistoryDialog } from "./pos-history-dialog";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/components/providers/session-provider";
import Link from "next/link";
import { Clock } from "./clock";
import { useTranslations } from "next-intl";
import { useDebounce } from "use-debounce";
import { POSCartItem, POSProduct, POSDiningSpot } from "../types";
import { POSCheckoutSettings } from "../actions";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FloorTab } from "./floor-tab";
import { KitchenTab } from "./kitchen-tab";
import { BillingTab } from "./billing-tab";

type POSTabValue = "floor" | "cashier" | "kitchen" | "billing";

const TAB_VALUES: POSTabValue[] = ["floor", "cashier", "kitchen", "billing"];

function isPOSTabValue(value: string | null): value is POSTabValue {
  return value !== null && TAB_VALUES.includes(value as POSTabValue);
}

interface POSViewProps {
  initialProducts: SuperJSONResult;
  categories: SuperJSONResult;
  session: SuperJSONResult;
  diningSpots: SuperJSONResult;
  checkoutSettings: POSCheckoutSettings;
}

export function POSView({
  initialProducts: serializedProducts,
  categories: serializedCategories,
  session: serializedSession,
  diningSpots: serializedDiningSpots,
  checkoutSettings,
}: POSViewProps) {
  const t = useTranslations("POS");
  const initialData = SuperJSON.deserialize<{
    items: POSProduct[];
    total: number;
    hasMore: boolean;
  }>(serializedProducts);
  const categories = SuperJSON.deserialize<any[]>(serializedCategories);
  const session = SuperJSON.deserialize<any>(serializedSession);
  const initialDiningSpots = SuperJSON.deserialize<POSDiningSpot[]>(
    serializedDiningSpots,
  );

  const [cart, setCart] = useState<POSCartItem[]>([]);
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery] = useDebounce(searchQuery, 300);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedDiningSpotId, setSelectedDiningSpotId] = useState<string>("");
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sessionData = useSession();
  const isCashier = sessionData?.role === "Cashier";
  const searchInputRef = useRef<HTMLInputElement>(null);

  const tabParam = searchParams.get("tab");
  const activeTab: POSTabValue = isPOSTabValue(tabParam) ? tabParam : "cashier";

  const setActiveTab = (next: POSTabValue) => {
    const params = new URLSearchParams(searchParams);
    params.set("tab", next);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip when typing in inputs/textareas
      const target = e.target as HTMLElement | null;
      const isEditing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      // Alt+M/K/D/B to switch tabs (allowed from any tab)
      if (e.altKey && !isEditing) {
        const keyMap: Record<string, POSTabValue | undefined> = {
          m: "floor",
          M: "floor",
          k: "cashier",
          K: "cashier",
          d: "kitchen",
          D: "kitchen",
          b: "billing",
          B: "billing",
        };
        const nextTab = keyMap[e.key];
        if (nextTab) {
          e.preventDefault();
          setActiveTab(nextTab);
          return;
        }
      }

      if (activeTab !== "cashier") return;

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
  }, [categories, activeTab, setActiveTab]);

  useEffect(() => {
    const spotFromQuery = searchParams.get("spot");
    if (!spotFromQuery) return;
    setSelectedDiningSpotId(spotFromQuery);
  }, [searchParams]);

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

  const { data: diningSpots = [] } = useQuery({
    queryKey: ["diningSpots"],
    queryFn: async () => {
      const res = await getDiningSpots();
      return SuperJSON.deserialize<POSDiningSpot[]>(res);
    },
    initialData: initialDiningSpots,
  });

  const selectedSpot = useMemo(
    () => diningSpots.find((spot) => spot.id === selectedDiningSpotId),
    [diningSpots, selectedDiningSpotId],
  );

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

  const [closeSessionOpen, setCloseSessionOpen] = useState(false);
  const [actualCashInput, setActualCashInput] = useState("");
  const [closeNoteInput, setCloseNoteInput] = useState("");
  const [isClosingSession, setIsClosingSession] = useState(false);

  const handleOpenCloseSession = () => {
    setActualCashInput("");
    setCloseNoteInput("");
    setCloseSessionOpen(true);
  };

  const handleConfirmCloseSession = async () => {
    const actualCash = Number(actualCashInput || 0);
    if (Number.isNaN(actualCash) || actualCash < 0) {
      toast({
        variant: "destructive",
        title: "Actual cash tidak valid",
      });
      return;
    }
    setIsClosingSession(true);
    try {
      await closePOSSession(
        session.id,
        actualCash,
        closeNoteInput.trim() || undefined,
      );
      toast({ title: t("session_closed") });
      setCloseSessionOpen(false);
      router.refresh();
    } catch (e) {
      toast({ variant: "destructive", title: t("error_closing") });
    } finally {
      setIsClosingSession(false);
    }
  };

  const handleCloseSession = async () => {
    handleOpenCloseSession();
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
            globalDiscount,
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
        return;
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

  const handleSelectSpot = (spotId: string, goCashier?: boolean) => {
    setSelectedDiningSpotId(spotId);
    if (goCashier) setActiveTab("cashier");
  };

  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);

  const spotChip = selectedSpot ? (
    <Badge variant="outline" className="gap-1 font-normal">
      <span className="text-muted-foreground">Meja:</span>
      <span className="font-medium">
        {selectedSpot.area?.name ? `[${selectedSpot.area.name}] ` : ""}
        {selectedSpot.spotCode}
      </span>
      <span className="ml-1 text-muted-foreground">· {selectedSpot.status}</span>
    </Badge>
  ) : (
    <Badge variant="outline" className="font-normal text-muted-foreground">
      Belum pilih meja
    </Badge>
  );

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex h-16 items-center justify-between border-b bg-background px-2 sm:px-4 gap-2">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <h1 className="hidden text-xl font-bold lg:block">{t("pos")}</h1>
          <div className="hidden md:inline-flex">{spotChip}</div>
          <div className="hidden md:block text-sm text-muted-foreground min-w-0">
            {sessionData?.userName && (
              <span className="mr-3 font-medium text-foreground">
                {sessionData.userName}
              </span>
            )}
            {t("session")}: {session.sessionNumber}
          </div>
          {session.warehouse && (
            <Badge
              variant="outline"
              className="hidden md:inline-flex text-sm font-normal"
            >
              {t("location")}: {session.warehouse.name}
            </Badge>
          )}
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

                    <span className="font-medium">
                      {t("select_category")}
                    </span>
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

          {!isCashier && (
            <Button
              variant="outline"
              size="sm"
              asChild
              className="hidden sm:inline-flex"
            >
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
              <Button
                variant="ghost"
                className="relative h-8 w-8 rounded-full"
              >
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

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as POSTabValue)}
        className="flex-1 flex flex-col overflow-hidden"
      >
        <div className="border-b bg-muted/40 px-2 sm:px-4">
          <TabsList className="bg-transparent p-0 h-10">
            <TabsTrigger value="floor" className="gap-2">
              <Utensils className="h-4 w-4" /> Meja
            </TabsTrigger>
            <TabsTrigger value="cashier" className="gap-2">
              <ShoppingCart className="h-4 w-4" /> Kasir
            </TabsTrigger>
            <TabsTrigger value="kitchen" className="gap-2">
              <ChefHat className="h-4 w-4" /> Dapur
            </TabsTrigger>
            <TabsTrigger value="billing" className="gap-2">
              <Receipt className="h-4 w-4" /> Billing
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent
          value="floor"
          className="flex-1 overflow-y-auto m-0 data-[state=inactive]:hidden"
        >
          <FloorTab
            sessionId={session.id}
            selectedDiningSpotId={selectedDiningSpotId}
            onSelectSpot={handleSelectSpot}
          />
        </TabsContent>

        <TabsContent
          value="cashier"
          className="flex-1 overflow-hidden m-0 data-[state=inactive]:hidden"
        >
          <div className="flex h-full overflow-hidden relative">
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
                    variant={
                      selectedCategory === cat.id ? "default" : "outline"
                    }
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
                selectedDiningSpot={selectedSpot}
                checkoutSettings={checkoutSettings}
              />
            </div>

            {/* Mobile Cart Trigger */}
            <div className="lg:hidden absolute bottom-4 left-4 right-4 z-10">
              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    className="w-full h-14 rounded-full shadow-lg text-lg flex justify-between px-6"
                    size="lg"
                  >
                    <span className="flex items-center gap-2">
                      <ShoppingCart className="h-5 w-5" />
                      {t("cart")}
                    </span>
                    <span className="bg-primary-foreground text-primary px-3 py-1 rounded-full text-sm font-bold">
                      {totalItems}
                    </span>
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="bottom"
                  className="h-[90vh] p-0 flex flex-col"
                >
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
                      selectedDiningSpot={selectedSpot}
                      checkoutSettings={checkoutSettings}
                    />
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </TabsContent>

        <TabsContent
          value="kitchen"
          className="flex-1 overflow-y-auto m-0 data-[state=inactive]:hidden"
        >
          <KitchenTab sessionId={session.id} />
        </TabsContent>

        <TabsContent
          value="billing"
          className="flex-1 overflow-y-auto m-0 data-[state=inactive]:hidden"
        >
          <BillingTab
            sessionId={session.id}
            checkoutSettings={checkoutSettings}
          />
        </TabsContent>
      </Tabs>

      <POSHistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        sessionId={session.id}
        onRowClick={handleViewHistoryItem}
      />

      <Dialog
        open={closeSessionOpen}
        onOpenChange={(open) => {
          if (!isClosingSession) setCloseSessionOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("close_session")}</DialogTitle>
            <DialogDescription>
              Masukkan jumlah kas fisik yang dihitung saat tutup sesi. Selisih
              terhadap kas sistem akan tercatat sebagai variance.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">
                Actual Cash (Rp)
              </label>
              <Input
                type="number"
                inputMode="decimal"
                min="0"
                value={actualCashInput}
                onChange={(e) => setActualCashInput(e.target.value)}
                placeholder="0"
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">
                Catatan (opsional)
              </label>
              <textarea
                value={closeNoteInput}
                onChange={(e) => setCloseNoteInput(e.target.value)}
                rows={2}
                placeholder="Contoh: kurang Rp5.000 karena kembalian"
                className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              disabled={isClosingSession}
              onClick={() => setCloseSessionOpen(false)}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              disabled={isClosingSession}
              onClick={handleConfirmCloseSession}
            >
              {isClosingSession ? "Menutup..." : "Tutup Sesi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
