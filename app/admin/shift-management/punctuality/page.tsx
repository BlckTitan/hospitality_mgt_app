'use client'

import { BackLink } from '../../../../shared/pageHeader';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import Punctuality from './components/punctuality';
import { ShiftPageGuide } from '../components/shiftPageGuide';

export default function PunctualityPage() {
  const propertiesResponse = useQuery(api.property.getAllProperties);
  const properties = propertiesResponse?.data || [];
  const currentPropertyId = properties?.[0]?._id || '';

  if (!propertiesResponse?.data) {
    return <div className="w-full h-full flex justify-center items-center">Loading...</div>;
  }
  if (properties.length === 0) {
    return <div className="w-full p-4">No properties yet.</div>;
  }

  return (
    <div className="w-full p-4 bg-white">
      <header className="w-full border-b flex justify-between items-center mb-4">
        <h3>Punctuality</h3>
        <BackLink />
      </header>
      <ShiftPageGuide page="punctuality" />
      <Punctuality propertyId={currentPropertyId} />
    </div>
  );
}
