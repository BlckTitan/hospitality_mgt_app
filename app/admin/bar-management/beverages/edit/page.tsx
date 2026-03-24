'use client';

import React, { useState } from 'react';
import { Button } from 'react-bootstrap';
import { useSearchParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import { EditBeverageForm } from '../components/editBeverageForm';
import { api } from '../../../../../convex/_generated/api';
import { Id } from '../../../../../convex/_generated/dataModel';
import BootstrapModal from '../../../../../shared/modal';

export default function EditBeveragePage() {
  const searchParams = useSearchParams();
  const beverageId = searchParams.get('beverage_id');
  const [modalShow, setModalShow] = useState(true);

  const beverageResponse = useQuery(
    api.beverages.getBeverage, beverageId ? { beverageId: beverageId as Id<'beverages'> } : null
  );

  if (!beverageId) {
    return (
      <div className="w-full p-4 bg-white">
        <div className="text-center py-8">
          <h3 className="text-red-600">Beverage not found</h3>
          <a href="/admin/bar-management/beverages" className="text-blue-600 hover:underline">Go back to Beverages</a>
        </div>
      </div>
    );
  }

  if (!beverageResponse?.success || !beverageResponse.data) {
    return (
      <div className="w-full p-4 bg-white">
        <div className="text-center py-8">
          <h3 className="text-gray-700">Loading...</h3>
        </div>
      </div>
    );
  }

  const beverage = beverageResponse.data;

  return (
    <div className="w-full p-4 bg-white">
      <header className="w-full border-b flex justify-between items-center mb-4">
        <h3>Edit Beverage</h3>
        <a href="/admin/bar-management/beverages" className="text-blue-600 hover:underline">← Back</a>
      </header>

      <ModalComponent
        beverageData={beverage}
        beverageId={beverageId}
        modalShow={modalShow}
        setModalShow={setModalShow}
        onSuccess={() => setModalShow(false)}
      />
    </div>
  );
}

function ModalComponent(props: {
  beverageData: any;
  beverageId: string;
  modalShow: boolean;
  setModalShow: (show: boolean) => void;
  onSuccess: () => void;
}) {
  return (
    <BootstrapModal
      show={props.modalShow}
      onHide={() => props.setModalShow(false)}
      backdrop="static"
      keyboard={false}
      heading="Edit Beverage"
      body={
        <EditBeverageForm
          beverageData={props.beverageData}
          beverageId={props.beverageId}
          onSuccess={props.onSuccess}
          onClose={() => props.setModalShow(false)}
        />
      }
    />
  );
}
