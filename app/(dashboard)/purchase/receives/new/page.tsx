import { PurchaseReceiveForm } from "../_components/purchase-receive-form";
import { getVendors, getProducts, getPurchaseOrdersForSelect } from "../actions";

export default async function Page() {
  const [vendors, products, purchaseOrders] = await Promise.all([
    getVendors(),
    getProducts(),
    getPurchaseOrdersForSelect(),
  ]);

  return (
    <div className="flex-1 space-y-4 p-4 pt-0">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">New Purchase Receive</h2>
      </div>
      <PurchaseReceiveForm
        vendors={vendors}
        products={products.map(p => ({
          ...p,
          cost: 0 // Products in receive don't need cost shown necessarily, but form expects it? Actually form uses it for auto-fill but receive logic might differ. 
          // Wait, Receive Items don't strictly need cost unless we are recording it.
          // The form uses product.cost to auto-fill unitCost if available, but PurchaseReceiveItem doesn't store unitCost directly in the schema I see?
          // Let's check schema. PurchaseReceiveItem has quantity, productId. It does NOT have unitCost. 
          // PurchaseOrderItem HAS unitCost.
          // InventoryMovementDetail has unitCost.
          // So Receive itself captures Qty. Cost is derived from PO or Product cost for valuation.
        }))}
        purchaseOrders={purchaseOrders.map(po => ({
          id: po.id,
          orderNumber: po.orderNumber,
          vendorId: po.vendorId,
          vendor: po.vendor,
          items: po.items, // Need items for filtering
        }))}
      />
    </div>
  );
}
