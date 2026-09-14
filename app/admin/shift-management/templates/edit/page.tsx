'use client';

import React, { useState, useEffect } from 'react';
import { Button } from 'react-bootstrap';
import { useQuery } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import BootstrapModal from '../../../../../shared/modal';
import EditTemplateForm from '../components/editTemplateForm';

export default function EditTemplatePage() {
  const [modalShow, setModalShow] = useState(true);
  const [templateId, setTemplateId] = useState<string>('');
  const [propertyId, setPropertyId] = useState<string>('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('template_id');
    if (id) setTemplateId(id);
  }, []);

  const propertiesResponse = useQuery(api.property.getAllProperties);
  const properties = propertiesResponse?.data || [];
  const currentPropertyId = propertyId || properties?.[0]?._id || '';
  const templateResponse = useQuery(
    api.shiftTemplates.getShiftTemplate,
    templateId ? { templateId: templateId as any } : 'skip',
  );

  useEffect(() => {
    if (templateResponse?.success && templateResponse?.data) {
      setPropertyId(templateResponse.data.propertyId);
    }
  }, [templateResponse]);

  if (!propertiesResponse?.data || !templateResponse?.data) {
    return (
      <div className="w-full h-full flex justify-center items-center">
        Loading...
      </div>
    );
  }

  if (propertiesResponse.data?.length === 0) {
    return (
      <div className="w-full h-full flex justify-center items-center">
        <p className="text-xl">No properties yet!</p>
      </div>
    );
  }

  if (!templateResponse?.success) {
    return (
      <div className="w-full h-full flex justify-center items-center">
        <p className="text-xl">Department shift not found!</p>
      </div>
    );
  }

  return (
    <div className="w-full p-4 bg-white">
      <header className="w-full border-b flex justify-between items-center mb-4">
        <h3>Edit department shift</h3>
        <Button
          variant="light"
          className="cursor-pointer"
          style={{ width: 'fit', height: 'fit', padding: '0', borderRadius: '100%' }}
          onClick={() => { window.location.href = '/admin/shift-management/templates'; }}
        >
          ×
        </Button>
      </header>
      <ModalComponent
        modalShow={modalShow}
        setModalShow={setModalShow}
        propertyId={currentPropertyId}
        templateData={templateResponse.data}
        templateId={templateId}
      />
    </div>
  );
}

function ModalComponent(props: {
  modalShow: boolean;
  setModalShow: (show: boolean) => void;
  propertyId: string;
  templateData: any;
  templateId: string;
}) {
  return (
    <BootstrapModal
      show={props.modalShow}
      onHide={() => { window.location.href = '/admin/shift-management/templates'; }}
      backdrop="static"
      keyboard={false}
      heading="Edit department shift"
      body={
        <EditTemplateForm
          onSuccess={() => props.setModalShow(false)}
          onClose={() => { window.location.href = '/admin/shift-management/templates'; }}
          propertyId={props.propertyId}
          templateData={props.templateData}
          templateId={props.templateId}
        />
      }
    />
  );
}
