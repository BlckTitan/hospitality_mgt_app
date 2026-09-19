'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Page() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/admin/inventory-management/purchase-order');
  }, [router]);
  return (
    <div className="w-full p-4 bg-white">
      <p>Order lines now live on each purchase order. Redirecting…</p>
    </div>
  );
}
