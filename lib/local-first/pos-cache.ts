"use client";

import { useEffect } from "react";
import { natsLocalDB } from "@/lib/local-first/db";
import type { LocalPOSContactOption, LocalPOSProduct } from "@/lib/local-first/types";

export function usePOSLocalCache(input: {
  companyId?: string | null;
  products?: LocalPOSProduct[];
  contacts?: LocalPOSContactOption[];
  paymentMethods?: Array<{ id: string; name: string; method: "CASH" | "BANK" }>;
}) {
  useEffect(() => {
    if (!input.companyId) return;
    if (!input.products?.length) return;
    const updatedAt = Date.now();
    void natsLocalDB.posProducts.bulkPut(
      input.products.map((product) => ({
        ...product,
        companyId: input.companyId as string,
        updatedAt,
      })),
    );
  }, [input.companyId, input.products]);

  useEffect(() => {
    if (!input.companyId) return;
    if (!input.contacts?.length) return;
    const updatedAt = Date.now();
    void natsLocalDB.posContacts.bulkPut(
      input.contacts.map((contact) => ({
        ...contact,
        companyId: input.companyId as string,
        updatedAt,
      })),
    );
  }, [input.companyId, input.contacts]);

  useEffect(() => {
    if (!input.companyId) return;
    if (!input.paymentMethods?.length) return;
    const updatedAt = Date.now();
    void natsLocalDB.posPaymentMethods.bulkPut(
      input.paymentMethods.map((method) => ({
        ...method,
        companyId: input.companyId as string,
        updatedAt,
      })),
    );
  }, [input.companyId, input.paymentMethods]);
}

export async function searchCachedPOSProducts(input: {
  companyId: string;
  query: string;
  categoryId?: string;
  limit?: number;
}) {
  const normalizedQuery = input.query.trim().toLowerCase();
  const limit = input.limit ?? 20;
  const rows = await natsLocalDB.posProducts.where("companyId").equals(input.companyId).toArray();
  return rows
    .filter((item) => {
      const matchesCategory = !input.categoryId || input.categoryId === "all" || item.categoryId === input.categoryId;
      if (!matchesCategory) return false;
      if (!normalizedQuery) return true;
      return item.name.toLowerCase().includes(normalizedQuery) || item.sku.toLowerCase().includes(normalizedQuery);
    })
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, limit);
}

export async function searchCachedPOSContacts(input: {
  companyId: string;
  query: string;
  limit?: number;
}) {
  const normalizedQuery = input.query.trim().toLowerCase();
  const limit = input.limit ?? 50;
  const rows = await natsLocalDB.posContacts.where("companyId").equals(input.companyId).toArray();
  return rows
    .filter((item) => {
      if (!normalizedQuery) return true;
      return [item.name, item.phone || "", item.email || ""]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    })
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, limit);
}

export async function getCachedPOSPaymentMethods(companyId: string) {
  const rows = await natsLocalDB.posPaymentMethods.where("companyId").equals(companyId).toArray();
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}
