'use client';

import { POSProduct } from '../actions';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import Image from 'next/image';
import { useFormatCurrency } from '@/hooks/use-format-currency';

interface ProductGridProps {
  products: POSProduct[];
  onAddToCart: (product: POSProduct) => void;
}

export function ProductGrid({ products, onAddToCart }: ProductGridProps) {
  const formatCurrency = useFormatCurrency();

  if (products.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
        <p>No products found.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {products.map((product) => (
        <Card
          key={product.id}
          className="cursor-pointer overflow-hidden transition-all hover:shadow-md"
          onClick={() => onAddToCart(product)}
        >
          <div className="flex relative aspect-square w-full bg-muted">
            {product.image ? (
              <Image
                src={product.image}
                alt={product.name}
                fill
                className="flex-1 object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-4xl font-bold text-muted-foreground/20">
                {product.name.charAt(0)}
              </div>
            )}
            <div className="absolute right-2 top-2">
              <Badge variant={product.stock > 0 ? "secondary" : "destructive"}>
                {product.stock} in stock
              </Badge>
            </div>
          </div>
          <CardContent className="p-3 grow">
            <h3 className="line-clamp-2 text-sm font-medium leading-tight">
              {product.name}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">{product.sku}</p>
          </CardContent>
          <CardFooter className="flex-1 flex items-center justify-between p-3 pt-0">
            <span className="font-bold text-primary">
              {formatCurrency(product.price)}
            </span>
            <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full">
              <Plus className="h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
