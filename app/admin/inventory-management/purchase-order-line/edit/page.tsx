'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import { Id } from '../../../../../convex/_generated/dataModel';

export default function Page() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lineId = searchParams.get('purchase_order_line_id');
  const line = useQuery(
    api.purchaseOrderLines.getPurchaseOrderLine,
    lineId ? { purchaseOrderLineId: lineId as Id<'purchaseOrderLines'> } : 'skip'
  );

  useEffect(() => {
    const orderId = line?.data?.purchaseOrderId;
    if (orderId) {
      router.replace(`/admin/inventory-management/purchase-order/edit?purchase_order_id=${orderId}`);
      return;
    }
    if (line && !line.success) {
      router.replace('/admin/inventory-management/purchase-order');
    }
  }, [line, router]);

  return (
    <div className="w-full p-4 bg-white">
      <p>Order lines now live on the purchase order. Redirecting…</p>
    </div>
  );
}
