'use client';

import React, { useState } from 'react';
import { Button } from 'react-bootstrap';
import { useSearchParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import { EditFnbMenuItemForm } from '../components/editFnbMenuItemForm';
import { api } from '../../../../../convex/_generated/api';
import { Id } from '../../../../../convex/_generated/dataModel';
import BootstrapModal from '../../../../../shared/modal';

export default function EditFnbMenuItemPage() {
  const searchParams = useSearchParams();
  const menuItemId = searchParams.get('menu_item_id');
  const [modalShow, setModalShow] = useState(true);

  const menuItemResponse = useQuery(
    api.fnbMenuItems.getFnbMenuItem, menuItemId ? { menuItemId: menuItemId as Id<'fnbMenuItems'> } : null
  );

  if (!menuItemId) {
    return (
      <div className="w-full p-4 bg-white">
        <div className="text-center py-8">
          <h3 className="text-red-600">Menu item not found</h3>
          <a href="/admin/food-n-beverage/fnb-menu-item" className="text-blue-600 hover:underline">
            Go back to Menu Items
          </a>
        </div>
      </div>
    );
  }

  if (!menuItemResponse?.success || !menuItemResponse.data) {
    return (
      <div className="w-full p-4 bg-white">
        <div className="text-center py-8">
          <h3 className="text-gray-700">Loading...</h3>
        </div>
      </div>
    );
  }

  const menuItem = menuItemResponse.data;

  return (
    <div className="w-full p-4 bg-white">
      <header className="w-full border-b flex justify-between items-center mb-4">
        <h3>Edit Menu Item</h3>
        <a href="/admin/food-n-beverage/fnb-menu-item" className="text-blue-600 hover:underline">
          Back to Menu Items
        </a>
      </header>

      <div className="max-w-2xl">
        <ModalComponent
          modalShow={modalShow}
          setModalShow={setModalShow}
          menuItem={menuItem}
          onSuccess={() => {
            setModalShow(false);
          }}
        />
      </div>
    </div>
  );
}

function ModalComponent(props: {
  modalShow: boolean;
  setModalShow: (show: boolean) => void;
  menuItem: any;
  onSuccess: () => void;
}) {
  return (
    <BootstrapModal
      show={props.modalShow}
      onHide={() => props.setModalShow(false)}
      backdrop="static"
      keyboard={false}
      heading="Edit Menu Item"
      body={
        <EditFnbMenuItemForm
          menuItem={props.menuItem}
          onSuccess={props.onSuccess}
          onClose={() => props.setModalShow(false)}
        />
      }
    />
  );
}
