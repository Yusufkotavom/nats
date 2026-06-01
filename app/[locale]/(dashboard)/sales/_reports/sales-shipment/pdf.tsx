import React from "react";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { ReportContext } from "@/lib/reporting/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { SalesShipmentReportData } from "./data";

const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 10, fontFamily: "Helvetica" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16, borderBottomWidth: 1, borderBottomColor: "#ddd", paddingBottom: 8 },
  title: { fontSize: 20, fontWeight: "bold" },
  section: { marginBottom: 10 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  label: { color: "#666" },
  table: { borderWidth: 1, borderColor: "#eee", marginTop: 8 },
  tableHeader: { flexDirection: "row", backgroundColor: "#f5f5f5", padding: 6 },
  tableRow: { flexDirection: "row", padding: 6, borderTopWidth: 1, borderTopColor: "#eee" },
  colName: { width: "50%" },
  colQty: { width: "20%", textAlign: "right" },
  colUnit: { width: "30%", textAlign: "right" },
  footer: { marginTop: 18, fontSize: 8, color: "#666", textAlign: "center" },
});

export const SalesShipmentPdf = ({ data, company, config }: ReportContext<SalesShipmentReportData>) => {
  const { shipment } = data;
  const dateOptions = { dateFormat: company.dateFormat };
  const currencyOptions = {
    currency: company.currency,
    currencySymbol: company.currencySymbol,
    currencyFormat: company.currencyFormat,
    locale: company.locale,
  };

  return (
    <Document>
      <Page size={config.pageSize || "A4"} orientation={config.orientation || "portrait"} style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text>{company.name}</Text>
            <Text>{company.address}</Text>
          </View>
          <View>
            <Text style={styles.title}>SALES SHIPMENT</Text>
            <Text>#{shipment.shipmentNumber}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.row}><Text style={styles.label}>Customer</Text><Text>{shipment.contact?.name || "-"}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Shipment Date</Text><Text>{formatDate(shipment.shipmentDate, dateOptions)}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Status</Text><Text>{shipment.status}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Sales Order</Text><Text>{shipment.salesOrder?.orderNumber || "-"}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Carrier / Tracking</Text><Text>{shipment.carrier || "-"} {shipment.trackingNumber ? `(${shipment.trackingNumber})` : ""}</Text></View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colName}>Item</Text>
            <Text style={styles.colQty}>Qty</Text>
            <Text style={styles.colUnit}>Est. Value</Text>
          </View>
          {shipment.items.map((item: any) => (
            <View key={item.id} style={styles.tableRow}>
              <Text style={styles.colName}>{item.product?.name || "-"}</Text>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colUnit}>
                {formatCurrency((item.salesOrderItem?.unitPrice || 0) * item.quantity, currencyOptions)}
              </Text>
            </View>
          ))}
        </View>

        <Text style={styles.footer}>Generated on {formatDate(new Date(), { ...dateOptions, includeTime: true })}</Text>
      </Page>
    </Document>
  );
};
