"use client";

import {
  PageFormActions,
  PageFormContent,
  PageFormHeader,
  PageFormLayout,
  PageFormTitle,
} from "@/components/layout/page/form-layout";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { ServiceOrderCreateForm } from "./service-order-create-form";

export function ServiceOrderForm({
  products,
  contacts,
  createOrderAction,
  createQuickContactAction,
}: {
  products: Array<{ id: string; name: string; price: number; isService?: boolean }>;
  contacts: Array<{ id: string; name: string }>;
  createOrderAction: (input: {
    customerId?: string;
    notes?: string;
    targetDate?: Date;
    downPaymentAmount?: number;
    paymentMethod?: "CASH" | "BANK";
    items: Array<{
      productId: string;
      quantity: number;
      price?: number;
      discount?: number;
      notes?: string;
    }>;
  }) => Promise<unknown>;
  createQuickContactAction: (input: {
    name: string;
    phone?: string;
    email?: string;
  }) => Promise<unknown>;
}) {
  const router = useRouter();

  return (
    <PageFormLayout>
      <PageFormHeader>
        <PageFormTitle title="Service Order" />
        <PageFormActions>
          <Button variant="outline" onClick={() => router.push("/services/orders")}>Kembali</Button>
        </PageFormActions>
      </PageFormHeader>
      <PageFormContent>
        <ServiceOrderCreateForm
          products={products}
          contacts={contacts}
          createOrderAction={createOrderAction}
          createQuickContactAction={createQuickContactAction}
        />
      </PageFormContent>
    </PageFormLayout>
  );
}
