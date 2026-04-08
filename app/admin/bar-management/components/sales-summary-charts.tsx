'use client'

import React, { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
} from 'chart.js';
import { Line, Pie, Bar } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface SalesSummaryChartsProps {
  currentPropertyId: Id<'properties'>;
}

const SalesSummaryCharts: React.FC<SalesSummaryChartsProps> = ({ currentPropertyId }) => {
  const [periodType, setPeriodType] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  
  // Fetch sales data
  const salesByBarData = useQuery(api.salesSummaries.getSalesByBarPeriod, {
    propertyId: currentPropertyId,
    periodType,
    limit: 10,
  });

  const salesByUserData = useQuery(api.salesSummaries.getSalesByUserPeriod, {
    propertyId: currentPropertyId,
    periodType,
    limit: 10,
  });

  const salesData = useQuery(api.salesSummaries.getSalesSummaries, {
    propertyId: currentPropertyId,
    periodType,
    limit: 30,
  });

  const getCurrencySymbol = (currency?: string) => {
    switch (currency?.toUpperCase()) {
      case 'USD': return '$';
      case 'EUR': return '€';
      case 'GBP': return '£';
      case 'JPY': return '¥';
      case 'NGN': return '₦';
      default: return '$';
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Prepare data for bar performance chart
  const barPerformanceChartData = salesByBarData?.success && salesByBarData.data ? {
    labels: salesByBarData.data.map(item => item.bar?.name || 'Unknown Bar'),
    datasets: [
      {
        label: 'Revenue',
        data: salesByBarData.data.map(item => item.totalRevenue),
        backgroundColor: 'rgba(59, 130, 246, 0.6)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1,
      },
      {
        label: 'Quantity Sold',
        data: salesByBarData.data.map(item => item.totalQtySold),
        backgroundColor: 'rgba(16, 185, 129, 0.6)',
        borderColor: 'rgba(16, 185, 129, 1)',
        borderWidth: 1,
        yAxisID: 'y1',
      },
    ],
  } : null;

  // Prepare data for user performance chart
  const userPerformanceChartData = salesByUserData?.success && salesByUserData.data ? {
    labels: salesByUserData.data.map(item => item.user?.name || 'Unknown User'),
    datasets: [
      {
        label: 'Revenue',
        data: salesByUserData.data.map(item => item.totalRevenue),
        backgroundColor: 'rgba(139, 92, 246, 0.6)',
        borderColor: 'rgba(139, 92, 246, 1)',
        borderWidth: 1,
      },
    ],
  } : null;

  // Prepare data for revenue trend chart
  const revenueTrendChartData = salesData?.success && salesData.data ? {
    labels: salesData.data.slice(0, 7).reverse().map(item => {
      const date = new Date(item.periodKey);
      return periodType === 'daily' 
        ? date.toLocaleDateString()
        : periodType === 'weekly'
        ? `Week ${date.toLocaleDateString()}`
        : date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }),
    datasets: [
      {
        label: 'Revenue Trend',
        data: salesData.data.slice(0, 7).reverse().map(item => item.totalRevenue),
        borderColor: 'rgba(251, 146, 60, 1)',
        backgroundColor: 'rgba(251, 146, 60, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  } : null;

  // Prepare data for beverage category pie chart
  const beverageCategoryData = salesData?.success && salesData.data ? {
    labels: [...new Set(salesData.data.map(item => item.beverage?.category).filter(Boolean))],
    datasets: [
      {
        data: [...new Set(salesData.data.map(item => item.beverage?.category).filter(Boolean))].map(category => {
          return salesData.data
            .filter(item => item.beverage?.category === category)
            .reduce((sum, item) => sum + item.totalRevenue, 0);
        }),
        backgroundColor: [
          'rgba(239, 68, 68, 0.6)',
          'rgba(59, 130, 246, 0.6)',
          'rgba(16, 185, 129, 0.6)',
          'rgba(251, 146, 60, 0.6)',
          'rgba(139, 92, 246, 0.6)',
          'rgba(236, 72, 153, 0.6)',
        ],
        borderColor: [
          'rgba(239, 68, 68, 1)',
          'rgba(59, 130, 246, 1)',
          'rgba(16, 185, 129, 1)',
          'rgba(251, 146, 60, 1)',
          'rgba(139, 92, 246, 1)',
          'rgba(236, 72, 153, 1)',
        ],
        borderWidth: 1,
      },
    ],
  } : null;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: false,
      },
    },
    scales: barPerformanceChartData ? {
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'Revenue ($)',
        },
        ticks: {
          callback: (value: number) => formatCurrency(value),
        },
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: true,
          text: 'Quantity',
        },
        grid: {
          drawOnChartArea: false,
        },
      },
    } : undefined,
  };

  const lineChartOptions = {
    ...chartOptions,
    scales: {
      y: {
        title: {
          display: true,
          text: 'Revenue ($)',
        },
        ticks: {
          callback: (value: number) => formatCurrency(value),
        },
      },
    },
  };

  if (!salesByBarData?.success || !salesByUserData?.success || !salesData?.success) {
    return (
      <div className="w-full p-4 text-center">
        <p>Loading sales summary data...</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Period Selector */}
      <div className="mb-6 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-800">Sales Analytics</h3>
        <div className="flex space-x-2">
          {(['daily', 'weekly', 'monthly'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setPeriodType(period)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                periodType === period
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Performance Chart */}
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h4 className="text-md font-semibold text-gray-800 mb-4">Bar Performance</h4>
          <div className="h-64">
            {barPerformanceChartData && <Bar data={barPerformanceChartData} options={chartOptions} />}
          </div>
        </div>

        {/* User Performance Chart */}
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h4 className="text-md font-semibold text-gray-800 mb-4">Top Performers</h4>
          <div className="h-64">
            {userPerformanceChartData && <Bar data={userPerformanceChartData} options={lineChartOptions} />}
          </div>
        </div>

        {/* Revenue Trend Chart */}
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h4 className="text-md font-semibold text-gray-800 mb-4">Revenue Trend</h4>
          <div className="h-64">
            {revenueTrendChartData && <Line data={revenueTrendChartData} options={lineChartOptions} />}
          </div>
        </div>

        {/* Beverage Category Distribution */}
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h4 className="text-md font-semibold text-gray-800 mb-4">Sales by Category</h4>
          <div className="h-64">
            {beverageCategoryData && <Pie data={beverageCategoryData} options={{ ...chartOptions, scales: undefined }} />}
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="text-sm text-blue-600 font-medium">Total Revenue</div>
          <div className="text-xl font-bold text-blue-800">
            {formatCurrency(
              salesByBarData.data?.reduce((sum, item) => sum + item.totalRevenue, 0) || 0
            )}
          </div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="text-sm text-green-600 font-medium">Total Quantity Sold</div>
          <div className="text-xl font-bold text-green-800">
            {salesByBarData.data?.reduce((sum, item) => sum + item.totalQtySold, 0).toLocaleString() || '0'}
          </div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <div className="text-sm text-purple-600 font-medium">Active Bars</div>
          <div className="text-xl font-bold text-purple-800">
            {salesByBarData.data?.length || 0}
          </div>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
          <div className="text-sm text-orange-600 font-medium">Active Staff</div>
          <div className="text-xl font-bold text-orange-800">
            {salesByUserData.data?.length || 0}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesSummaryCharts;
