"use client";

import { useEffect } from "react";
import { useInView } from "react-intersection-observer";
import { POSProduct } from "../actions";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, AlertCircle, RefreshCcw } from "lucide-react";
import { useFormatCurrency } from "@/hooks/use-format-currency";
import { ProductImage } from "./product-image";
import { Skeleton } from "@/components/ui/skeleton";

interface ProductGridProps {
  products: POSProduct[];
  onAddToCart: (product: POSProduct) => void;
  onFetchNextPage: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

export function ProductGrid({
  products,
  onAddToCart,
  onFetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  isLoading,
  isError,
  onRetry,
}: ProductGridProps) {
  const formatCurrency = useFormatCurrency();
  const { ref, inView } = useInView({
    threshold: 0,
    rootMargin: "100px",
  });

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      onFetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, onFetchNextPage]);

  if (isLoading && products.length === 0) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (isError && products.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center space-y-4 py-12">
        <div className="rounded-full bg-destructive/10 p-3">
          <AlertCircle className="h-6 w-6 text-destructive" />
        </div>
        <div className="text-center">
          <p className="font-medium">Failed to load products</p>
          <p className="text-sm text-muted-foreground">
            Please try again later
          </p>
        </div>
        <Button onClick={onRetry} variant="outline" size="sm">
          <RefreshCcw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center py-12 text-muted-foreground">
        <p>No products found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {products.map((product, index) => (
          <Card
            key={product.id + "" + index}
            className="p-0 cursor-pointer overflow-hidden transition-all hover:shadow-md"
            onClick={() => onAddToCart(product)}
          >
            <div className="flex relative aspect-square w-full bg-muted">
              <ProductImage
                src={product.image}
                alt={product.name}
                category={product.categoryName}
                productId={product.id}
              />
              <div className="absolute right-2 top-2">
                <Badge
                  variant={product.stock > 0 ? "secondary" : "destructive"}
                >
                  {product.stock} in stock
                </Badge>
              </div>
            </div>
            <CardContent className="p-3 grow">
              <h3 className="line-clamp-2 text-sm font-medium leading-tight">
                {product.name}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {product.sku}
              </p>
            </CardContent>
            <CardFooter className="flex-1 flex items-center justify-between p-3 pt-0">
              <span className="font-bold text-primary">
                {formatCurrency(product.price)}
              </span>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 rounded-full"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        ))}

        {isFetchingNextPage &&
          Array.from({ length: 5 }).map((_, i) => (
            <ProductCardSkeleton key={`skeleton-${i}`} />
          ))}
      </div>

      {hasNextPage && (
        <div
          ref={ref}
          className="h-10 flex items-center justify-center"
          role="status"
          aria-live="polite"
        >
          {isFetchingNextPage && (
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span className="text-sm text-muted-foreground">
                Loading more products...
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ProductCardSkeleton() {
  return (
    <Card className="p-0 overflow-hidden">
      <Skeleton className="aspect-square w-full" />
      <CardContent className="p-3">
        <Skeleton className="h-4 w-3/4 mb-2" />
        <Skeleton className="h-3 w-1/2" />
      </CardContent>
      <CardFooter className="p-3 pt-0 flex justify-between">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </CardFooter>
    </Card>
  );
}
