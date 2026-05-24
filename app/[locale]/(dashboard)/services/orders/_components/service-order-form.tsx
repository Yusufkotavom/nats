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
  sessionId,
  products,
  contacts,
}: {
  sessionId: string;
  products: Array<{ id: string; name: string; price: number; isService?: boolean }>;
  contacts: Array<{ id: string; name: string }>;
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
          sessionId={sessionId}
          products={products}
          contacts={contacts}
        />
      </PageFormContent>
    </PageFormLayout>
  );
}
