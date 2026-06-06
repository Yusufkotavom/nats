"use client";

import Dexie, { type Table } from "dexie";
import type { LocalPOSContactOption, LocalPOSProduct } from "@/lib/local-first/types";

export type POSCachedProduct = LocalPOSProduct & {
  companyId: string;
  updatedAt: number;
};

export type POSCachedContact = LocalPOSContactOption & {
  companyId: string;
  updatedAt: number;
};

export type POSCachedPaymentMethod = {
  id: string;
  companyId: string;
  name: string;
  method: "CASH" | "BANK";
  updatedAt: number;
};

class NATSLocalDB extends Dexie {
  posProducts!: Table<POSCachedProduct, string>;
  posContacts!: Table<POSCachedContact, string>;
  posPaymentMethods!: Table<POSCachedPaymentMethod, string>;

  constructor() {
    super("nats-local-db");
    this.version(1).stores({
      posProducts: "id, companyId, name, sku, categoryId, updatedAt",
      posContacts: "id, companyId, name, phone, email, updatedAt",
      posPaymentMethods: "id, companyId, name, method, updatedAt",
    });
  }
}

export const natsLocalDB = new NATSLocalDB();
