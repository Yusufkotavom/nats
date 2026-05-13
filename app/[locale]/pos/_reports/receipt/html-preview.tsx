"use client";

import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { ReportContext } from "@/lib/reporting/types";
import type { POSReceiptData } from "./data";

function toNumber(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  if (typeof value === "object" && "toNumber" in value && typeof (value as any).toNumber === "function") {
    return (value as any).toNumber();
  }
  return Number(value);
}

function formatMoney(value: unknown, locale = "id-ID", currency = "IDR") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(toNumber(value));
}

function formatReceiptDate(value: unknown, locale = "id-ID") {
  const date = value ? new Date(value as any) : new Date();
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function POSReceiptHtmlPreview({
  data,
  company,
  translations = {},
}: ReportContext<POSReceiptData>) {
  const { invoice, payment, cashierName } = data;
  const locale = company.locale || "id-ID";
  const currency = company.currency || "IDR";
  const t = (key: string) => translations[key] || key;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="h-full overflow-auto rounded-md border bg-muted/20 p-4">
      <div className="no-print mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium">Preview struk POS</div>
          <div className="text-xs text-muted-foreground">
            Gunakan tombol ini, bukan Ctrl+P/browser print, supaya yang tercetak isi struk — bukan ID/blob viewer.
          </div>
        </div>
        <Button onClick={handlePrint} size="sm">
          <Printer className="mr-2 h-4 w-4" />
          Print Struk
        </Button>
      </div>

      <div className="receipt-print mx-auto bg-white p-4 font-mono text-[12px] leading-tight text-black shadow-sm">
        <div className="text-center">
          <div className="text-sm font-bold uppercase">{company.name}</div>
          {company.address ? <div>{company.address}</div> : null}
          {company.phone ? <div>{company.phone}</div> : null}
          <div className="my-2 border-t border-dashed border-black" />
          <div className="font-bold uppercase">{t("pos_receipt")}</div>
          <div>#{invoice.invoiceNumber}</div>
          <div>{formatReceiptDate(invoice.invoiceDate || invoice.createdAt, locale)}</div>
        </div>

        <div className="my-2 border-t border-dashed border-black" />

        <div className="space-y-1">
          <div className="flex justify-between gap-3">
            <span>{t("cashier")}</span>
            <span className="text-right">{cashierName || "System"}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span>{t("customer")}</span>
            <span className="text-right">{invoice.contact?.name || t("walk_in_customer")}</span>
          </div>
        </div>

        <div className="my-2 border-t border-dashed border-black" />

        <div className="space-y-2">
          {invoice.items.map((item: any) => (
            <div key={item.id}>
              <div className="font-semibold">{item.description || item.product?.name || "Item"}</div>
              <div className="flex justify-between gap-3 pl-2">
                <span>
                  {toNumber(item.quantity)} x {formatMoney(item.unitPrice, locale, currency)}
                </span>
                <span>{formatMoney(item.totalPrice, locale, currency)}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="my-2 border-t border-dashed border-black" />

        <div className="space-y-1">
          <div className="flex justify-between gap-3">
            <span>{t("subtotal")}</span>
            <span>{formatMoney(invoice.subtotal, locale, currency)}</span>
          </div>
          {toNumber(invoice.globalDiscount) > 0 ? (
            <div className="flex justify-between gap-3">
              <span>{t("discount")}</span>
              <span>-{formatMoney(invoice.globalDiscount, locale, currency)}</span>
            </div>
          ) : null}
          {toNumber(invoice.totalTax) > 0 ? (
            <div className="flex justify-between gap-3">
              <span>{t("tax")}</span>
              <span>{formatMoney(invoice.totalTax, locale, currency)}</span>
            </div>
          ) : null}
          {toNumber(invoice.shippingCost) > 0 ? (
            <div className="flex justify-between gap-3">
              <span>{t("additional_fee")}</span>
              <span>{formatMoney(invoice.shippingCost, locale, currency)}</span>
            </div>
          ) : null}
          <div className="flex justify-between gap-3 text-sm font-bold uppercase">
            <span>{t("total")}</span>
            <span>{formatMoney(invoice.totalAmount, locale, currency)}</span>
          </div>
        </div>

        {payment ? (
          <>
            <div className="my-2 border-t border-dashed border-black" />
            <div className="flex justify-between gap-3">
              <span>{payment.method}</span>
              <span>{formatMoney(payment.amount, locale, currency)}</span>
            </div>
          </>
        ) : null}

        <div className="my-3 text-center">
          <div>{t("thank_you")}</div>
          <div>{t("come_again")}</div>
          {company.email ? <div className="mt-1">{company.email}</div> : null}
          {company.website ? <div>{company.website}</div> : null}
        </div>
      </div>

      <style jsx global>{`
        .receipt-print {
          width: 80mm;
          max-width: 100%;
        }
        @media print {
          body * {
            visibility: hidden !important;
          }
          .receipt-print,
          .receipt-print * {
            visibility: visible !important;
          }
          .receipt-print {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 80mm !important;
            box-shadow: none !important;
            border: 0 !important;
            margin: 0 !important;
            padding: 4mm !important;
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: 80mm auto;
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
}
