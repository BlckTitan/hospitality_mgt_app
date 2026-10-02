'use client';

import { BackLink } from '../../../../shared/pageHeader';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { OccupancyCalendar } from './occupancyCalendar';
import { RoomPageGuide } from '../components/roomPageGuide';

export default function OccupancyPage() {
  const propertiesResponse = useQuery(api.property.getAllProperties);
  const currentPropertyId = propertiesResponse?.data?.[0]?._id;

  if (!propertiesResponse?.data) {
    return (
      <div className="w-full h-full flex justify-center items-center">
        Loading...
      </div>
    );
  }

  if (propertiesResponse.data.length === 0 || !currentPropertyId) {
    return (
      <div className="w-full h-full flex justify-center items-center">
        <p className="text-xl">No properties yet!</p>
      </div>
    );
  }

  return (
    <div className="w-full p-4 bg-white">
      <header className="w-full border-b mb-4 pb-3 flex justify-between items-start gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-gray-800">Occupancy</h1>
        <RoomPageGuide page="occupancy" />
      </div>
        <BackLink />
      </header>
      <OccupancyCalendar propertyId={currentPropertyId} />
    </div>
  );
}
