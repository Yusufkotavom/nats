import React from "react";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ReportContext } from "@/lib/reporting/types";
import { ServiceInvoiceReportData } from "./data";

const styles = StyleSheet.create({
  page: { padding: 28, fontSize: 10, fontFamily: "Helvetica", backgroundColor: "#FFFFFF" },
  header: { flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "#E5E7EB", paddingBottom: 10, marginBottom: 14 },
  companyName: { fontSize: 16, fontWeight: "bold" },
  muted: { color: "#6B7280" },
  title: { fontSize: 20, fontWeight: "bold", textAlign: "right" },
  row: { flexDirection: "row", gap: 16, marginBottom: 12 },
  col: { flex: 1 },
  label: { fontSize: 8, color: "#6B7280", textTransform: "uppercase", marginBottom: 2 },
  value: { marginBottom: 4 },
  table: { borderWidth: 1, borderColor: "#E5E7EB", marginTop: 6 },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#E5E7EB", padding: 7 },
  th: { backgroundColor: "#F3F4F6" },
  c1: { width: "44%" },
  c2: { width: "12%", textAlign: "right" },
  c3: { width: "22%", textAlign: "right" },
  c4: { width: "22%", textAlign: "right" },
  totalWrap: { marginTop: 10, alignItems: "flex-end" },
  total: { width: "45%", flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  note: { marginTop: 10, padding: 8, backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB" },
});

export const ServiceInvoicePdf = ({ data, company, config }: ReportContext<ServiceInvoiceReportData>) => {
  const { serviceOrder, invoice } = data;
  const currencyOptions = {
    currency: company.currency,
    currencySymbol: company.currencySymbol,
    currencyFormat: company.currencyFormat,
    locale: company.locale,
  };
  const dateOptions = { dateFormat: company.dateFormat };

  return (
    <Document>
      <Page size={config.pageSize || "A4"} orientation={config.orientation || "portrait"} style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.companyName}>{company.name}</Text>
            <Text style={styles.muted}>{company.address || ""}</Text>
            <Text style={styles.muted}>{company.phone || ""}</Text>
          </View>
          <View>
            <Text style={styles.title}>SERVICE INVOICE</Text>
            <Text>#{invoice.invoiceNumber}</Text>
            <Text style={styles.muted}>{formatDate(invoice.invoiceDate, dateOptions)}</Text>
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.label}>Customer</Text>
            <Text style={styles.value}>{invoice.contact?.name || "Walk-in Customer"}</Text>
            <Text style={styles.value}>{invoice.contact?.phone || "-"}</Text>
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>Service Order</Text>
            <Text style={styles.value}>{serviceOrder.orderNumber}</Text>
            <Text style={styles.label}>Status</Text>
            <Text style={styles.value}>{invoice.status}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={[styles.tr, styles.th]}>
            <Text style={styles.c1}>Item</Text>
            <Text style={styles.c2}>Qty</Text>
            <Text style={styles.c3}>Unit Price</Text>
            <Text style={styles.c4}>Total</Text>
          </View>
          {invoice.items.map((item: any) => (
            <View key={item.id} style={styles.tr}>
              <Text style={styles.c1}>{item.product?.name || item.description || "Service"}</Text>
              <Text style={styles.c2}>{item.quantity}</Text>
              <Text style={styles.c3}>{formatCurrency(item.unitPrice, currencyOptions)}</Text>
              <Text style={styles.c4}>{formatCurrency(item.totalPrice, currencyOptions)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalWrap}>
          <View style={styles.total}>
            <Text>Subtotal</Text>
            <Text>{formatCurrency(invoice.subtotal, currencyOptions)}</Text>
          </View>
          <View style={styles.total}>
            <Text>Total</Text>
            <Text>{formatCurrency(invoice.totalAmount, currencyOptions)}</Text>
          </View>
          <View style={styles.total}>
            <Text>Paid</Text>
            <Text>{formatCurrency(serviceOrder.paidAmount, currencyOptions)}</Text>
          </View>
          <View style={styles.total}>
            <Text>Remaining</Text>
            <Text>{formatCurrency(serviceOrder.remainingAmount, currencyOptions)}</Text>
          </View>
        </View>

        {(invoice.notes || company.serviceUniversalNote) ? (
          <View style={styles.note}>
            <Text style={styles.label}>Notes</Text>
            {invoice.notes ? <Text>{invoice.notes}</Text> : null}
            {company.serviceUniversalNote ? <Text>{company.serviceUniversalNote}</Text> : null}
          </View>
        ) : null}
      </Page>
    </Document>
  );
};
