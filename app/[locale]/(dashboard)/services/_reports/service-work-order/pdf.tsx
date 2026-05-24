import React from "react";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ReportContext } from "@/lib/reporting/types";
import { ServiceWorkOrderReportData } from "./data";

const styles = StyleSheet.create({
  page: { padding: 28, fontSize: 10, fontFamily: "Helvetica", backgroundColor: "#FFFFFF" },
  header: { flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "#E5E7EB", paddingBottom: 10, marginBottom: 14 },
  companyName: { fontSize: 16, fontWeight: "bold" },
  muted: { color: "#6B7280" },
  title: { fontSize: 20, fontWeight: "bold", textAlign: "right" },
  section: { marginBottom: 12 },
  row: { flexDirection: "row", gap: 16 },
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
  footer: { position: "absolute", bottom: 18, left: 28, right: 28, textAlign: "center", color: "#9CA3AF", fontSize: 8 },
});

export const ServiceWorkOrderPdf = ({ data, company, config }: ReportContext<ServiceWorkOrderReportData>) => {
  const { serviceOrder, salesOrder } = data;
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
            <Text style={styles.title}>SERVICE WORK ORDER</Text>
            <Text>#{serviceOrder.orderNumber}</Text>
            <Text style={styles.muted}>{formatDate(serviceOrder.createdAt, dateOptions)}</Text>
          </View>
        </View>

        <View style={[styles.section, styles.row]}>
          <View style={styles.col}>
            <Text style={styles.label}>Customer</Text>
            <Text style={styles.value}>{salesOrder.contact?.name || "Walk-in Customer"}</Text>
            <Text style={styles.value}>{salesOrder.contact?.phone || "-"}</Text>
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>Service Status</Text>
            <Text style={styles.value}>{serviceOrder.status}</Text>
            <Text style={styles.label}>Target Date</Text>
            <Text style={styles.value}>{serviceOrder.targetDate ? formatDate(serviceOrder.targetDate, dateOptions) : "-"}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={[styles.tr, styles.th]}>
            <Text style={styles.c1}>Item</Text>
            <Text style={styles.c2}>Qty</Text>
            <Text style={styles.c3}>Unit Price</Text>
            <Text style={styles.c4}>Total</Text>
          </View>
          {serviceOrder.items.map((item: any) => (
            <View key={item.id} style={styles.tr}>
              <Text style={styles.c1}>{item.productName || item.product?.name || "Service"}</Text>
              <Text style={styles.c2}>{item.quantity}</Text>
              <Text style={styles.c3}>{formatCurrency(item.unitPrice, currencyOptions)}</Text>
              <Text style={styles.c4}>{formatCurrency(item.totalPrice, currencyOptions)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalWrap}>
          <View style={styles.total}>
            <Text>Subtotal</Text>
            <Text>{formatCurrency(serviceOrder.subtotal, currencyOptions)}</Text>
          </View>
          <View style={styles.total}>
            <Text>Down Payment</Text>
            <Text>{formatCurrency(serviceOrder.dpAmount, currencyOptions)}</Text>
          </View>
          <View style={styles.total}>
            <Text>Total</Text>
            <Text>{formatCurrency(serviceOrder.totalAmount, currencyOptions)}</Text>
          </View>
        </View>

        {(serviceOrder.notes || company.serviceUniversalNote) ? (
          <View style={styles.note}>
            <Text style={styles.label}>Notes</Text>
            {serviceOrder.notes ? <Text>{serviceOrder.notes}</Text> : null}
            {company.serviceUniversalNote ? <Text>{company.serviceUniversalNote}</Text> : null}
          </View>
        ) : null}

        <Text style={styles.footer}>Generated on {formatDate(new Date(), { ...dateOptions, includeTime: true })}</Text>
      </Page>
    </Document>
  );
};
