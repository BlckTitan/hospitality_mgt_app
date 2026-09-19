'use client';

import { BackLink } from '../../../../../shared/pageHeader';
import { Spinner } from 'react-bootstrap';
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
        <header className="w-full border-b flex justify-between items-center mb-4">
          <h3>Edit Purchase Order</h3>
          <BackLink />
        </header>
        <p>Purchase order not found.</p>
      </div>
    );
  }

  if (purchaseOrderResponse === undefined) {
    return (
      <div className="w-full h-screen flex justify-center items-center">
        <Spinner animation="border" size="sm" variant="dark" />
      </div>
    );
  }

  if (!purchaseOrderResponse.success || !purchaseOrderResponse.data) {
    return <div>No data available!</div>;
  }

  return (
    <div className="w-full p-4 bg-white">
      <header className="w-full border-b flex justify-between items-center mb-4">
        <h3>Update {purchaseOrderResponse.data.orderNumber}</h3>
        <BackLink />
      </header>
      <InventoryPageGuide page="orders-edit" />
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
