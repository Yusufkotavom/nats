
import { getOpenPOSSession, getPOSProducts, getPOSCategories, getWarehouses } from './actions';
import { POSSessionDialog } from './_components/pos-session-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';
import { POSView } from './_components/pos-view';

export default async function POSPage() {
  const session = await getOpenPOSSession();
  const products = await getPOSProducts();
  const categories = await getPOSCategories();
  const warehouses = await getWarehouses();

  if (!session) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Open POS Session</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-4">
              <div className="rounded-full bg-yellow-100 p-3 dark:bg-yellow-900/20">
                <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <p className="text-center text-muted-foreground">
                You need to open a new POS session to start processing transactions.
              </p>
              <POSSessionDialog warehouses={warehouses} />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] overflow-hidden bg-muted/20">
      <POSView
        initialProducts={products}
        categories={categories}
        session={session}
      />
    </div>
  );
}
