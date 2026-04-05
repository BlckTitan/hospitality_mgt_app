'use client'

import React from 'react';
import { Button } from 'react-bootstrap';
import { useMutation, useQuery } from 'convex/react';
import { toast } from 'sonner';
import { Id } from '../../../../convex/_generated/dataModel';
import { api } from '../../../../convex/_generated/api';

interface ReorderAlert {
  _id: Id<'reorderAlerts'>;
  propertyId: Id<'properties'>;
  beverageId: Id<'beverages'>;
  qtyAtAlert: number;
  reorderLevel: number;
  alertedAt: number;
  status: 'open' | 'acknowledged' | 'resolved';
  beverage?: {
    _id: Id<'beverages'>;
    name: string;
    category: string;
    unitOfMeasure: string;
  };
}

interface ReorderAlertsProps {
  currentPropertyId: Id<'properties'>;
}

const ReorderAlertsTable: React.FC<ReorderAlertsProps> = ({ currentPropertyId }) => {
  const alertsData = useQuery(api.reorderAlerts.getAllReorderAlerts, { propertyId: currentPropertyId });
  const acknowledgeAlert = useMutation(api.reorderAlerts.acknowledgeReorderAlert);
  const resolveAlert = useMutation(api.reorderAlerts.resolveReorderAlert);

  const handleAcknowledge = async (alertId: Id<'reorderAlerts'>) => {
    try {
      const response = await acknowledgeAlert({ alertId });
      if (response.success) {
        toast.success('Alert acknowledged successfully');
      } else {
        toast.error(response.message || 'Failed to acknowledge alert');
      }
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
      toast.error('Failed to acknowledge alert. Please try again.');
    }
  };

  const handleResolve = async (alertId: Id<'reorderAlerts'>) => {
    try {
      const response = await resolveAlert({ alertId });
      if (response.success) {
        toast.success('Alert resolved successfully');
      } else {
        toast.error(response.message || 'Failed to resolve alert');
      }
    } catch (error) {
      console.error('Failed to resolve alert:', error);
      toast.error('Failed to resolve alert. Please try again.');
    }
  };

  const formatDate = (timestamp: number) => new Date(timestamp).toLocaleString();

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      open: 'bg-red-100 text-red-800',
      acknowledged: 'bg-yellow-100 text-yellow-800',
      resolved: 'bg-green-100 text-green-800'
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyles[status as keyof typeof statusStyles]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getUrgencyLevel = (qtyAtAlert: number, reorderLevel: number) => {
    const percentage = (qtyAtAlert / reorderLevel) * 100;
    if (percentage <= 0) return { level: 'Critical', color: 'text-red-600 font-bold' };
    if (percentage <= 50) return { level: 'High', color: 'text-orange-600 font-semibold' };
    return { level: 'Medium', color: 'text-yellow-600' };
  };

  if (!alertsData) {
    return (
      <div className="w-full p-4 text-center">
        <p>Loading reorder alerts...</p>
      </div>
    );
  }

  if (!alertsData.success || alertsData.data.length === 0) {
    return (
      <div className="w-full p-4 text-center">
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-green-800 mb-2">No Reorder Alerts</h3>
          <p className="text-green-600">All beverage stock levels are within acceptable limits.</p>
        </div>
      </div>
    );
  }

  const alerts = alertsData.data;

  return (
    <div className="w-full">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Reorder Alerts Overview</h3>
        <p className="text-sm text-gray-600">Beverages that need restocking based on current inventory levels</p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200 rounded-lg">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Beverage
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Current Quantity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Reorder Level
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Urgency
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Alert Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {alerts.map((alert: ReorderAlert) => {
              const urgency = getUrgencyLevel(alert.qtyAtAlert, alert.reorderLevel);
              
              return (
                <tr key={alert._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {alert.beverage?.name || 'Unknown Beverage'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {alert.beverage?.unitOfMeasure || 'units'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      {alert.beverage?.category || 'Unknown'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      <span className={`font-semibold ${alert.qtyAtAlert === 0 ? 'text-red-600' : 'text-orange-600'}`}>
                        {alert.qtyAtAlert}
                      </span>
                      <span className="text-gray-500 ml-1">
                        {alert.beverage?.unitOfMeasure || 'units'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {alert.reorderLevel} {alert.beverage?.unitOfMeasure || 'units'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-sm ${urgency.color}`}>
                      {urgency.level}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(alert.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(alert.alertedAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      {alert.status === 'open' && (
                        <Button
                          variant="warning"
                          size="sm"
                          onClick={() => handleAcknowledge(alert._id)}
                          className="text-xs"
                        >
                          Acknowledge
                        </Button>
                      )}
                      {alert.status !== 'resolved' && (
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() => handleResolve(alert._id)}
                          className="text-xs"
                        >
                          Resolve
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
            <span className="text-gray-700">Critical: Stock at 0% of reorder level</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-orange-500 rounded-full mr-2"></div>
            <span className="text-gray-700">High: Stock at 50% or below reorder level</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
            <span className="text-gray-700">Medium: Stock above 50% of reorder level</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReorderAlertsTable;
