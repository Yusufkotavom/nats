import { getPOSInvoice } from '../../actions';
import { POSInvoiceDetail } from '../../_components/pos-invoice-detail';
import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function POSInvoicePage({ params }: PageProps) {
  const { id } = await params;
  const invoice = await getPOSInvoice(id);

  if (!invoice) {
    notFound();
  }

  return <POSInvoiceDetail invoice={invoice} />;
}
