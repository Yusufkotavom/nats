import React from "react";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { ReportContext } from "@/lib/reporting/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { SalesPaymentReportData } from "./data";

const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 10, fontFamily: "Helvetica" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16, borderBottomWidth: 1, borderBottomColor: "#ddd", paddingBottom: 8 },
  title: { fontSize: 20, fontWeight: "bold" },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  label: { color: "#666" },
});

export const SalesPaymentPdf = ({ data, company, config }: ReportContext<SalesPaymentReportData>) => {
  const { payment } = data;
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
            <Text style={styles.title}>SALES PAYMENT</Text>
            <Text>#{payment.paymentNumber}</Text>
          </View>
        </View>

        <View style={styles.row}><Text style={styles.label}>Customer</Text><Text>{payment.contact?.name || "-"}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Payment Date</Text><Text>{formatDate(payment.paymentDate, dateOptions)}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Sales Invoice</Text><Text>{payment.salesInvoice?.invoiceNumber || "-"}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Method</Text><Text>{payment.method || "-"}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Deposit Account</Text><Text>{payment.cashAccount?.name || "-"}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Reference</Text><Text>{payment.reference || "-"}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Amount</Text><Text>{formatCurrency(payment.amount, currencyOptions)}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Notes</Text><Text>{payment.notes || "-"}</Text></View>
      </Page>
    </Document>
  );
};
