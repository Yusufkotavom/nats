import { Page, Text, View, Document, StyleSheet, Image, Font } from '@react-pdf/renderer';
import { ReportContext } from '../../types';
import { SalesOrderReportData } from './data';
import { format } from 'date-fns';

// Create styles
const styles = StyleSheet.create({
    page: {
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
        padding: 30,
        fontSize: 10,
        fontFamily: 'Helvetica',
    },
    header: {
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#112233',
        paddingBottom: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    headerLeft: {
        flexDirection: 'column',
    },
    headerRight: {
        flexDirection: 'column',
        alignItems: 'flex-end',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#112233',
        marginBottom: 5,
    },
    subtitle: {
        fontSize: 12,
        color: '#666',
    },
    companyName: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    companyInfo: {
        fontSize: 10,
        color: '#444',
        marginBottom: 2,
    },
    section: {
        margin: 10,
        padding: 10,
        flexGrow: 1,
    },
    row: {
        flexDirection: 'row',
        marginBottom: 20,
    },
    column: {
        flexDirection: 'column',
        flexGrow: 1,
    },
    label: {
        fontSize: 8,
        color: '#888',
        marginBottom: 2,
        textTransform: 'uppercase',
    },
    value: {
        fontSize: 10,
        color: '#000',
        marginBottom: 8,
    },
    table: {
        width: '100%',
        borderWidth: 1,
        borderColor: '#eee',
        marginBottom: 20,
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#f8f9fa',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        padding: 8,
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        padding: 8,
    },
    colDesc: { width: '40%' },
    colQty: { width: '15%', textAlign: 'right' },
    colPrice: { width: '20%', textAlign: 'right' },
    colTotal: { width: '25%', textAlign: 'right' },

    totalSection: {
        flexDirection: 'column',
        alignItems: 'flex-end',
        marginTop: 10,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginBottom: 5,
        width: '50%',
    },
    totalLabel: {
        width: '50%',
        textAlign: 'right',
        paddingRight: 10,
        color: '#666',
    },
    totalValue: {
        width: '50%',
        textAlign: 'right',
        fontWeight: 'bold',
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 30,
        right: 30,
        textAlign: 'center',
        color: '#888',
        fontSize: 8,
        borderTopWidth: 1,
        borderTopColor: '#eee',
        paddingTop: 10,
    },
});

export const SalesOrderPdf = ({ data, company, config }: ReportContext<SalesOrderReportData>) => {
    const { order } = data;

    return (
        <Document>
            <Page size={config.pageSize || "A4"} orientation={config.orientation || "portrait"} style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <Text style={styles.companyName}>{company.name}</Text>
                        <Text style={styles.companyInfo}>{company.address}</Text>
                        <Text style={styles.companyInfo}>{company.email}</Text>
                        <Text style={styles.companyInfo}>{company.phone}</Text>
                    </View>
                    <View style={styles.headerRight}>
                        <Text style={styles.title}>SALES ORDER</Text>
                        <Text style={styles.subtitle}>#{order.orderNumber}</Text>
                        <Text style={styles.value}>{format(new Date(order.orderDate), 'MMM dd, yyyy')}</Text>
                    </View>
                </View>

                {/* Info Row */}
                <View style={styles.row}>
                    <View style={styles.column}>
                        <Text style={styles.label}>BILL TO</Text>
                        <Text style={[styles.value, { fontWeight: 'bold' }]}>{order.contact.name}</Text>
                        <Text style={styles.value}>{order.contact.email}</Text>
                        <Text style={styles.value}>{order.contact.phone}</Text>
                        <Text style={styles.value}>{order.contact.billingAddress}</Text>
                    </View>
                    <View style={styles.column}>
                        <Text style={styles.label}>SHIP TO</Text>
                        <Text style={[styles.value, { fontWeight: 'bold' }]}>{order.contact.name}</Text>
                        <Text style={styles.value}>{order.contact.shippingAddress || order.contact.billingAddress}</Text>
                    </View>
                    <View style={styles.column}>
                        <Text style={styles.label}>DETAILS</Text>
                        <Text style={styles.label}>Status</Text>
                        <Text style={styles.value}>{order.status}</Text>
                        <Text style={styles.label}>Expected Date</Text>
                        <Text style={styles.value}>{order.expectedDate ? format(new Date(order.expectedDate), 'MMM dd, yyyy') : 'N/A'}</Text>
                    </View>
                </View>

                {/* Table */}
                <View style={styles.table}>
                    <View style={styles.tableHeader}>
                        <Text style={[styles.label, styles.colDesc]}>ITEM DESCRIPTION</Text>
                        <Text style={[styles.label, styles.colQty]}>QTY</Text>
                        <Text style={[styles.label, styles.colPrice]}>UNIT PRICE</Text>
                        <Text style={[styles.label, styles.colTotal]}>AMOUNT</Text>
                    </View>
                    {order.items.map((item: any) => (
                        <View key={item.id} style={styles.tableRow}>
                            <Text style={[styles.value, styles.colDesc]}>{item.product?.name || item.description}</Text>
                            <Text style={[styles.value, styles.colQty]}>{item.quantity}</Text>
                            <Text style={[styles.value, styles.colPrice]}>{Number(item.unitPrice).toFixed(2)}</Text>
                            <Text style={[styles.value, styles.colTotal]}>{Number(item.totalPrice).toFixed(2)}</Text>
                        </View>
                    ))}
                </View>

                {/* Totals */}
                <View style={styles.totalSection}>
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Subtotal:</Text>
                        <Text style={styles.totalValue}>{Number(order.subtotal).toFixed(2)}</Text>
                    </View>
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Tax:</Text>
                        <Text style={styles.totalValue}>{Number(order.taxAmount).toFixed(2)}</Text>
                    </View>
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Discount:</Text>
                        <Text style={styles.totalValue}>({Number(order.discountAmount).toFixed(2)})</Text>
                    </View>
                    <View style={[styles.totalRow, { borderTopWidth: 1, borderTopColor: '#000', paddingTop: 5 }]}>
                        <Text style={[styles.totalLabel, { color: '#000', fontWeight: 'bold' }]}>TOTAL:</Text>
                        <Text style={[styles.totalValue, { fontSize: 12 }]}>{Number(order.totalAmount).toFixed(2)}</Text>
                    </View>
                </View>

                {/* Footer */}
                <Text style={styles.footer}>
                    {company.name} | {company.website || 'www.company.com'} | Generated on {format(new Date(), 'PPpp')}
                </Text>
            </Page>
        </Document>
    );
};
