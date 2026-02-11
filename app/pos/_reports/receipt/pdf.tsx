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

    // --- Dynamic Height Calculation ---
    // Approximate heights in points (pt)
    const PADDING_V = 20; // 10 top + 10 bottom

    // Header: Name(14) + Info(10*2) + Title(17) + Meta(10*2) + Padding(15) ~ 86
    // We add a bit of buffer for wrapping text in address
    const HEADER_H = 100;

    // Cashier/Customer: 2 rows(11*2) + margin(5) ~ 27
    const META_H = 30;

    // Divider: 11 * 3 dividers = 33
    const DIVIDER_H = 11;

    // Totals: Subtotal(11) + Total(14) + Margin ~ 30. Optional Discount(11).
    const TOTALS_H = 30 + (Number(invoice.globalDiscount) > 0 ? 11 : 0);

    // Payment: 1 row(11) ~ 11
    const PAYMENT_H = 15;

    // Footer: ~40
    const FOOTER_H = 40;

    // Items calculation
    // Each item: Description + Details line + margin
    // We estimate description wrapping. 80mm width ~ 45 chars per line for 9pt font.
    const CHARS_PER_LINE = 45;
    const ITEM_BASE_H = 15; // Details line + margins
    const LINE_H = 10; // Description line height

    const itemsHeight = invoice.items.reduce((acc: number, item: any) => {
        const text = item.description || item.product?.name || "";
        const lines = Math.ceil((text.length || 1) / CHARS_PER_LINE);
        return acc + (lines * LINE_H) + ITEM_BASE_H;
    }, 0);

    const dynamicHeight =
        PADDING_V +
        HEADER_H +
        META_H +
        (DIVIDER_H * 3) +
        itemsHeight +
        TOTALS_H +
        PAYMENT_H +
        FOOTER_H +
        20; // Extra buffer

    // Default to 80mm width if not specified
    const pageSize = (config.pageSize === "A4" || !config.pageSize)
        ? [226, dynamicHeight]
        : [config.pageSize[0], dynamicHeight];

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
