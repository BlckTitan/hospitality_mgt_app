'use client';

import { BackLink } from '../../../../../shared/pageHeader';
import Spinner from '../../../../../shared/spinner';
import { useSearchParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import { EditPurchaseOrderForm } from '../components/editPurchaseOrderForm';
import { OrderLines } from '../components/orderLines';
import { api } from '../../../../../convex/_generated/api';
import { Id } from '../../../../../convex/_generated/dataModel';
import { InventoryPageGuide } from '../../components/inventoryPageGuide';

export default function Page() {
  const searchParams = useSearchParams();
  const purchaseOrderId = searchParams.get('purchase_order_id');
  const purchaseOrderResponse = useQuery(
    api.purchaseOrders.getPurchaseOrder,
    purchaseOrderId ? { purchaseOrderId: purchaseOrderId as Id<'purchaseOrders'> } : 'skip'
  );
  const suppliersResponse = useQuery(
    api.suppliers.getAllSuppliers,
    purchaseOrderResponse?.data?.propertyId
      ? { propertyId: purchaseOrderResponse.data.propertyId, activeOnly: true }
      : 'skip'
  );

  if (!purchaseOrderId) {
    return (
      <div className="w-full p-4 bg-white">
        <header className="w-full border-b mb-4 pb-3 flex justify-between items-start gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-800">Edit Purchase Order</h1>
            <InventoryPageGuide page="orders-edit" />
          </div>
          <BackLink />
        </header>
        <p>Purchase order not found.</p>
      </div>
    );
  }

  if (purchaseOrderResponse === undefined) {
    return (
      <div className="w-full h-screen flex justify-center items-center">
        <Spinner  size="sm"  />
      </div>
    );
  }

  if (!purchaseOrderResponse.success || !purchaseOrderResponse.data) {
    return <div>No data available!</div>;
  }

  return (
    <div className="w-full p-4 bg-white">
      <header className="w-full border-b mb-4 pb-3 flex justify-between items-start gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-gray-800">Update {purchaseOrderResponse.data.orderNumber}</h1>
        <InventoryPageGuide page="orders-edit" />
      </div>
        <BackLink />
      </header>
      <EditPurchaseOrderForm
        purchaseOrderData={purchaseOrderResponse.data}
        purchaseOrderId={purchaseOrderId}
        suppliers={suppliersResponse?.data || []}
      />
      <OrderLines
        purchaseOrderId={purchaseOrderId as Id<'purchaseOrders'>}
        propertyId={purchaseOrderResponse.data.propertyId}
      />
    </div>
  );
}
