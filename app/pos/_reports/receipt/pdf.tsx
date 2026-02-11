import React from 'react';
import { Page, Text, View, Document, StyleSheet, Font } from '@react-pdf/renderer';
import { ReportContext } from '@/lib/reporting/types';
import { POSReceiptData } from './data';
import { format } from 'date-fns';

// 80mm thermal paper width is approx 226 points (80mm * 2.83)
// 58mm thermal paper width is approx 164 points
// We'll design for 80mm by default but keep it responsive-ish

const styles = StyleSheet.create({
    page: {
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
        padding: 10,
        fontSize: 9,
        fontFamily: 'Helvetica',
        width: '100%', // Will be constrained by page size
    },
    center: { textAlign: 'center', alignItems: 'center' },
    header: { marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#000', borderStyle: 'dashed', paddingBottom: 5 },
    companyName: { fontSize: 12, fontWeight: 'bold', marginBottom: 2 },
    companyInfo: { fontSize: 8, marginBottom: 1 },
    title: { fontSize: 10, fontWeight: 'bold', marginTop: 5, marginBottom: 2 },
    meta: { fontSize: 8, marginBottom: 5 },
    row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
    itemRow: { flexDirection: 'row', marginBottom: 2, flexWrap: 'wrap' },
    itemDesc: { width: '100%', marginBottom: 1, fontWeight: 'bold' },
    itemDetails: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingLeft: 5 },
    divider: { borderBottomWidth: 1, borderBottomColor: '#000', borderStyle: 'dashed', marginVertical: 5 },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2, fontWeight: 'bold' },
    footer: { marginTop: 10, textAlign: 'center', fontSize: 8 },
});

export const POSReceiptPdf = ({ data, company, config }: ReportContext<POSReceiptData>) => {
    const { invoice, payment, cashier } = data;

    // Default to 80mm width if not specified
    // Cast config.pageSize to any because custom array [width, height] might conflict with strict PageSize types in some versions
    const pageSize = (config.pageSize === "A4" || !config.pageSize) ? [226, 800] : config.pageSize;

    return (
        <Document>
            <Page size={pageSize as any} style={styles.page}>

                {/* Header */}
                <View style={[styles.header, styles.center]}>
                    <Text style={styles.companyName}>{company.name}</Text>
                    <Text style={styles.companyInfo}>{company.address}</Text>
                    <Text style={styles.companyInfo}>{company.phone}</Text>

                    <Text style={styles.title}>SALES RECEIPT</Text>
                    <Text style={styles.meta}>#{invoice.invoiceNumber}</Text>
                    <Text style={styles.meta}>{format(new Date(invoice.invoiceDate), 'PP pp')}</Text>
                </View>

                {/* Cashier/Customer Info */}
                <View style={{ marginBottom: 5 }}>
                    <View style={styles.row}>
                        <Text>Cashier:</Text>
                        <Text>{cashier?.name || 'System'}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text>Customer:</Text>
                        <Text>{invoice.contact?.name || 'Walk-in'}</Text>
                    </View>
                </View>

                <View style={styles.divider} />

                {/* Items */}
                <View>
                    {invoice.items.map((item: any) => (
                        <View key={item.id} style={{ marginBottom: 4 }}>
                            <Text style={styles.itemDesc}>{item.description || item.product?.name}</Text>
                            <View style={styles.itemDetails}>
                                <Text>{item.quantity} x {Number(item.unitPrice).toFixed(2)}</Text>
                                <Text>{Number(item.totalPrice).toFixed(2)}</Text>
                            </View>
                        </View>
                    ))}
                </View>

                <View style={styles.divider} />

                {/* Totals */}
                <View>
                    <View style={styles.row}>
                        <Text>Subtotal</Text>
                        <Text>{Number(invoice.subtotal).toFixed(2)}</Text>
                    </View>
                    {Number(invoice.globalDiscount) > 0 && (
                        <View style={styles.row}>
                            <Text>Discount</Text>
                            <Text>-{Number(invoice.globalDiscount).toFixed(2)}</Text>
                        </View>
                    )}
                    <View style={[styles.totalRow, { marginTop: 3, fontSize: 11 }]}>
                        <Text>TOTAL</Text>
                        <Text>{Number(invoice.totalAmount).toFixed(2)}</Text>
                    </View>
                </View>

                <View style={styles.divider} />

                {/* Payment Info */}
                {payment && (
                    <View>
                        <View style={styles.row}>
                            <Text>Paid ({payment.method})</Text>
                            <Text>{Number(payment.amount).toFixed(2)}</Text>
                        </View>
                        {/* 
                   If we had change amount, we would show it here. 
                   Usually POS calculates change but it might not be stored in payment record directly 
                   unless we add 'tenderedAmount' to payment model. 
                   For now we assume exact or display what's recorded.
                */}
                    </View>
                )}

                {/* Footer */}
                <View style={styles.footer}>
                    <Text>Thank you for your purchase!</Text>
                    <Text>Please come again.</Text>
                    {company.website && <Text style={{ marginTop: 2 }}>{company.website}</Text>}
                </View>

            </Page>
        </Document>
    );
};
