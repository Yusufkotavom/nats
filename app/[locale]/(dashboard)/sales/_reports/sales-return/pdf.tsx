import React from "react";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { ReportContext } from "@/lib/reporting/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { SalesReturnReportData } from "./data";

const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 10, fontFamily: "Helvetica" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16, borderBottomWidth: 1, borderBottomColor: "#ddd", paddingBottom: 8 },
  title: { fontSize: 20, fontWeight: "bold" },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  label: { color: "#666" },
  table: { borderWidth: 1, borderColor: "#eee", marginTop: 8 },
  tableHeader: { flexDirection: "row", backgroundColor: "#f5f5f5", padding: 6 },
  tableRow: { flexDirection: "row", padding: 6, borderTopWidth: 1, borderTopColor: "#eee" },
  colName: { width: "45%" },
  colQty: { width: "15%", textAlign: "right" },
  colPrice: { width: "20%", textAlign: "right" },
  colTotal: { width: "20%", textAlign: "right" },
});

export const SalesReturnPdf = ({ data, company, config }: ReportContext<SalesReturnReportData>) => {
  const { returnItem } = data;
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
            <Text style={styles.title}>SALES RETURN</Text>
            <Text>#{returnItem.returnNumber}</Text>
          </View>
        </View>

        <View style={styles.row}><Text style={styles.label}>Customer</Text><Text>{returnItem.contact?.name || "-"}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Return Date</Text><Text>{formatDate(returnItem.returnDate, dateOptions)}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Status</Text><Text>{returnItem.status}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Invoice / Order</Text><Text>{returnItem.salesInvoice?.invoiceNumber || "-"} / {returnItem.salesOrder?.orderNumber || "-"}</Text></View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colName}>Item</Text>
            <Text style={styles.colQty}>Qty</Text>
            <Text style={styles.colPrice}>Unit Price</Text>
            <Text style={styles.colTotal}>Total</Text>
          </View>
          {returnItem.items.map((item: any) => (
            <View key={item.id} style={styles.tableRow}>
              <Text style={styles.colName}>{item.product?.name || "-"}</Text>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colPrice}>{formatCurrency(item.unitPrice, currencyOptions)}</Text>
              <Text style={styles.colTotal}>{formatCurrency(item.totalPrice, currencyOptions)}</Text>
            </View>
          ))}
        </View>

        <View style={{ marginTop: 10 }}>
          <View style={styles.row}><Text style={styles.label}>Total Return</Text><Text>{formatCurrency(returnItem.totalAmount, currencyOptions)}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Notes</Text><Text>{returnItem.notes || "-"}</Text></View>
        </View>
      </Page>
    </Document>
  );
};
