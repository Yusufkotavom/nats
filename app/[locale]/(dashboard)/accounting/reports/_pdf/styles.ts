import { StyleSheet } from '@react-pdf/renderer';

export const styles = StyleSheet.create({
  page: { flexDirection: 'column', backgroundColor: '#FFFFFF', padding: 30, fontSize: 10, fontFamily: 'Helvetica' },
  header: { marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#112233', paddingBottom: 10, flexDirection: 'row', justifyContent: 'space-between' },
  headerLeft: { flexDirection: 'column' },
  headerRight: { flexDirection: 'column', alignItems: 'flex-end' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#112233', marginBottom: 5 },
  subtitle: { fontSize: 12, color: '#666' },
  companyName: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  companyInfo: { fontSize: 10, color: '#444', marginBottom: 2 },
  
  // Table
  table: { width: '100%', marginBottom: 20 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f8f9fa', borderBottomWidth: 1, borderBottomColor: '#eee', padding: 8 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#eee', paddingVertical: 6, paddingHorizontal: 8 },
  tableRowTotal: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#000', paddingVertical: 6, paddingHorizontal: 8, marginTop: 5 },
  
  // Columns
  colLabel: { flexGrow: 1 },
  colAmount: { width: '20%', textAlign: 'right' },
  colPercent: { width: '15%', textAlign: 'right' },
  
  // Text Styles
  label: { fontSize: 10, color: '#333' },
  labelBold: { fontSize: 10, color: '#000', fontWeight: 'bold' },
  amount: { fontSize: 10, color: '#333' },
  amountBold: { fontSize: 10, color: '#000', fontWeight: 'bold' },
  
  // Indentation
  indent1: { paddingLeft: 10 },
  indent2: { paddingLeft: 20 },
  indent3: { paddingLeft: 30 },

  sectionTitle: { fontSize: 12, fontWeight: 'bold', marginTop: 10, marginBottom: 5, color: '#112233', backgroundColor: '#f0f0f0', padding: 5 },
  
  footer: { position: 'absolute', bottom: 30, left: 30, right: 30, textAlign: 'center', color: '#888', fontSize: 8, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 10 },
});
