'use client'

import React, { useState } from 'react';
import { useQuery } from 'convex/react';
import { Button } from 'react-bootstrap';
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

const CHART_TABS = [
  'Bar Performance',
  'Top Performers',
  'Revenue Trend',
  'Sales by Category',
  'SKU Performance',
] as const;

const PERIODS = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'yearly', label: 'Yearly' },
  { id: 'yoy', label: 'YoY' },
] as const;

type PeriodView = (typeof PERIODS)[number]['id'];

interface SalesSummaryChartsProps {
  currentPropertyId: Id<'properties'>;
}

const SalesSummaryCharts: React.FC<SalesSummaryChartsProps> = ({ currentPropertyId }) => {
  const [periodType, setPeriodType] = useState<PeriodView>('daily');
  const [tab, setTab] = useState<(typeof CHART_TABS)[number]>('Bar Performance');
  const summaryPeriod = periodType === 'yoy' ? 'yearly' : periodType;
  
  // Fetch sales data
  const salesByBarData = useQuery(api.salesSummaries.getSalesByBarPeriod, {
    propertyId: currentPropertyId,
    periodType: summaryPeriod,
    limit: 10,
  });

  const salesByUserData = useQuery(api.salesSummaries.getSalesByUserPeriod, {
    propertyId: currentPropertyId,
    periodType: summaryPeriod,
    limit: 10,
  });

  const salesData = useQuery(
    api.salesSummaries.getRevenueTrend,
    periodType === 'yoy'
      ? 'skip'
      : {
          propertyId: currentPropertyId,
          periodType: summaryPeriod,
          limit: periodType === 'yearly' ? 5 : 7,
        },
  );

  const yoyOverview = useQuery(
    api.salesSummaries.getYearOnYearOverview,
    periodType === 'yoy' ? { propertyId: currentPropertyId } : 'skip',
  );

  const categorySource = useQuery(api.salesSummaries.getSalesSummaries, {
    propertyId: currentPropertyId,
    periodType: summaryPeriod,
    limit: 30,
  });

  const health = useQuery(api.barHealth.getBarHealthMetrics, {
    propertyId: currentPropertyId,
    periodType,
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

  const formatPercent = (value: number) => `${Math.round(value * 100)}%`;

  const formatYoY = (value: number | null | undefined) => {
    if (value === null || value === undefined) return 'No prior-year data';
    const sign = value > 0 ? '+' : '';
    return `${sign}${Math.round(value * 100)}% vs last year YTD`;
  };

  const formatAgeHours = (hours: number | null) => {
    if (hours === null) return '—';
    if (hours < 1) return '<1h';
    if (hours < 48) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
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
  const yoyTrend = yoyOverview?.success ? yoyOverview.data : null;
  const revenueTrendChartData = yoyTrend
    ? {
        labels: yoyTrend.monthly.map((item) => item.label),
        datasets: [
          {
            label: String(yoyTrend.thisYear),
            data: yoyTrend.monthly.map((item) => item.currentRevenue),
            borderColor: 'rgba(251, 146, 60, 1)',
            backgroundColor: 'rgba(251, 146, 60, 0.1)',
            tension: 0.4,
            fill: false,
          },
          {
            label: String(yoyTrend.lastYear),
            data: yoyTrend.monthly.map((item) => item.previousRevenue),
            borderColor: 'rgba(59, 130, 246, 1)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.4,
            fill: false,
          },
        ],
      }
    : salesData?.success && salesData.data
      ? {
          labels: salesData.data.map((item) => item.periodKey),
          datasets: [
            {
              label: periodType === 'yearly' ? 'Yearly Revenue' : 'Revenue Trend',
              data: salesData.data.map((item) => item.totalRevenue),
              borderColor: 'rgba(251, 146, 60, 1)',
              backgroundColor: 'rgba(251, 146, 60, 0.1)',
              tension: 0.4,
              fill: true,
            },
          ],
        }
      : null;

  // Prepare data for beverage category pie chart
  const beverageCategoryData = categorySource?.success && categorySource.data ? {
    labels: [...new Set(categorySource.data.map(item => item.beverage?.category).filter(Boolean))],
    datasets: [
      {
        data: [...new Set(categorySource.data.map(item => item.beverage?.category).filter(Boolean))].map(category => {
          return categorySource.data
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

  if (
    salesByBarData === undefined ||
    salesByUserData === undefined ||
    categorySource === undefined ||
    (periodType === 'yoy' ? yoyOverview === undefined : salesData === undefined)
  ) {
    return (
      <div className="w-full p-4 text-center">
        <p>Loading sales summary data...</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="text-sm text-blue-600 font-medium">Total Revenue</div>
          <div className="text-xl font-bold text-blue-800">
            {formatCurrency(
              periodType === 'yoy'
                ? yoyTrend?.current.totalRevenue || 0
                : salesByBarData.data?.reduce((sum, item) => sum + item.totalRevenue, 0) || 0
            )}
          </div>
          {periodType === 'yoy' && (
            <div className={`text-xs mt-1 ${
              (yoyTrend?.revenueChange ?? 0) >= 0 ? 'text-green-700' : 'text-red-700'
            }`}>
              {formatYoY(yoyTrend?.revenueChange)}
            </div>
          )}
        </div>
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="text-sm text-green-600 font-medium">Total Quantity Sold</div>
          <div className="text-xl font-bold text-green-800">
            {periodType === 'yoy'
              ? (yoyTrend?.current.totalQtySold || 0).toLocaleString()
              : salesByBarData.data?.reduce((sum, item) => sum + item.totalQtySold, 0).toLocaleString() || '0'}
          </div>
          {periodType === 'yoy' && (
            <div className={`text-xs mt-1 ${
              (yoyTrend?.qtyChange ?? 0) >= 0 ? 'text-green-700' : 'text-red-700'
            }`}>
              {formatYoY(yoyTrend?.qtyChange)}
            </div>
          )}
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

      {health === undefined ? (
        <div className="mb-6 text-sm text-gray-500">Loading health metrics…</div>
      ) : (
        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className={`p-4 rounded-lg border ${
            health.openLogCount > 0
              ? 'bg-yellow-50 border-yellow-200'
              : 'bg-teal-50 border-teal-200'
          }`}>
            <div className={`text-sm font-medium ${health.openLogCount > 0 ? 'text-yellow-700' : 'text-teal-700'}`}>
              Stock days finalized
            </div>
            <div className={`text-xl font-bold ${health.openLogCount > 0 ? 'text-yellow-900' : 'text-teal-900'}`}>
              {health.sessionCount === 0
                ? '—'
                : `${health.finalizedSessionCount} / ${health.sessionCount}`}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              {health.sessionCount === 0
                ? 'No stock sessions this period'
                : `${formatPercent(health.finalizeRate)}${
                    health.healthWindowDays && (periodType === 'yearly' || periodType === 'yoy')
                      ? ` · last ${health.healthWindowDays} days`
                      : ''
                  }`}
            </div>
          </div>
          <div className={`p-4 rounded-lg border ${
            (health.openReorderCount ?? 0) > 0
              ? 'bg-red-50 border-red-200'
              : 'bg-slate-50 border-slate-200'
          }`}>
            <div className={`text-sm font-medium ${(health.openReorderCount ?? 0) > 0 ? 'text-red-700' : 'text-slate-600'}`}>
              Open reorders
            </div>
            <div className={`text-xl font-bold ${(health.openReorderCount ?? 0) > 0 ? 'text-red-900' : 'text-slate-800'}`}>
              {health.openReorderCount ?? '—'}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              {health.openReorderCount === null
                ? 'Needs inventory access'
                : health.oldestReorderAgeHours === null
                  ? 'No open alerts'
                  : `Oldest ${formatAgeHours(health.oldestReorderAgeHours)}`}
            </div>
          </div>
          <div className={`p-4 rounded-lg border ${
            (health.staleReorderCount ?? 0) > 0
              ? 'bg-amber-50 border-amber-200'
              : 'bg-slate-50 border-slate-200'
          }`}>
            <div className={`text-sm font-medium ${(health.staleReorderCount ?? 0) > 0 ? 'text-amber-700' : 'text-slate-600'}`}>
              Stale reorders (24h+)
            </div>
            <div className={`text-xl font-bold ${(health.staleReorderCount ?? 0) > 0 ? 'text-amber-900' : 'text-slate-800'}`}>
              {health.staleReorderCount ?? '—'}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              Unresolved open or acknowledged alerts
            </div>
          </div>
          <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
            <div className="text-sm text-indigo-600 font-medium">Revenue / waiter-shift</div>
            <div className="text-xl font-bold text-indigo-800">
              {formatCurrency(health.revenuePerWaiterShift)}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              {health.waiterShiftCount} waiter-shift{health.waiterShiftCount === 1 ? '' : 's'}
              {periodType === 'yearly' || periodType === 'yoy' ? ' · last 30 days' : ''}
            </div>
          </div>
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {CHART_TABS.map((item) => (
            <Button
              key={item}
              size="sm"
              variant={tab === item ? 'dark' : 'outline-secondary'}
              onClick={() => setTab(item)}
            >
              {item}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {PERIODS.map((period) => (
            <button
              key={period.id}
              onClick={() => setPeriodType(period.id)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                periodType === period.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {period.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg border border-gray-200">
        {tab === 'Bar Performance' && (
          <div className="h-80">
            {barPerformanceChartData ? (
              <Bar data={barPerformanceChartData} options={chartOptions} />
            ) : (
              <p className="h-full flex items-center justify-center text-gray-500">No bar performance data</p>
            )}
          </div>
        )}
        {tab === 'Top Performers' && (
          <div className="space-y-4">
            <div className="h-72">
              {userPerformanceChartData ? (
                <Bar data={userPerformanceChartData} options={lineChartOptions} />
              ) : (
                <p className="h-full flex items-center justify-center text-gray-500">No performer data</p>
              )}
            </div>
            {health && health.waiters.length > 0 && (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b">
                      <th className="py-2 pr-4 font-medium">Waiter</th>
                      <th className="py-2 pr-4 font-medium">Shifts</th>
                      <th className="py-2 pr-4 font-medium">Revenue</th>
                      <th className="py-2 font-medium">Per shift</th>
                    </tr>
                  </thead>
                  <tbody>
                    {health.waiters.map((waiter) => (
                      <tr key={waiter.userId} className="border-b last:border-0">
                        <td className="py-2 pr-4">{waiter.name}</td>
                        <td className="py-2 pr-4">{waiter.shiftCount || '—'}</td>
                        <td className="py-2 pr-4">{formatCurrency(waiter.totalRevenue)}</td>
                        <td className="py-2 font-medium">{formatCurrency(waiter.revenuePerShift)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        {tab === 'Revenue Trend' && (
          <div>
            {periodType === 'yoy' && yoyTrend && (
              <p className="text-xs text-gray-500 mb-2">
                {yoyTrend.thisYear} vs {yoyTrend.lastYear} by month. KPI totals compare year-to-date through {yoyTrend.monthly[yoyTrend.throughMonth - 1]?.label}.
              </p>
            )}
            <div className="h-80">
              {revenueTrendChartData ? (
                <Line data={revenueTrendChartData} options={lineChartOptions} />
              ) : (
                <p className="h-full flex items-center justify-center text-gray-500">No revenue trend data</p>
              )}
            </div>
          </div>
        )}
        {tab === 'Sales by Category' && (
          <div className="h-80">
            {beverageCategoryData ? (
              <Pie data={beverageCategoryData} options={{ ...chartOptions, scales: undefined }} />
            ) : (
              <p className="h-full flex items-center justify-center text-gray-500">No category data</p>
            )}
          </div>
        )}
        {tab === 'SKU Performance' && (
          health === undefined ? (
            <p className="h-80 flex items-center justify-center text-gray-500">Loading SKUs…</p>
          ) : health.topSkus.length === 0 ? (
            <p className="h-80 flex items-center justify-center text-gray-500">No SKU data</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-semibold text-gray-800 mb-3">Top SKUs</h4>
                <ul className="space-y-2">
                  {health.topSkus.map((sku) => (
                    <li key={sku.beverageId} className="flex justify-between gap-4 border-b border-gray-100 pb-2">
                      <div>
                        <div className="font-medium text-gray-800">{sku.name}</div>
                        <div className="text-xs text-gray-500">{sku.qty.toLocaleString()} sold</div>
                      </div>
                      <div className="font-semibold text-gray-800">{formatCurrency(sku.revenue)}</div>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-800 mb-3">Slowest SKUs</h4>
                {health.bottomSkus.length === 0 ? (
                  <p className="text-sm text-gray-500">Not enough SKUs to rank a bottom list.</p>
                ) : (
                  <ul className="space-y-2">
                    {health.bottomSkus.map((sku) => (
                      <li key={sku.beverageId} className="flex justify-between gap-4 border-b border-gray-100 pb-2">
                        <div>
                          <div className="font-medium text-gray-800">{sku.name}</div>
                          <div className="text-xs text-gray-500">{sku.qty.toLocaleString()} sold</div>
                        </div>
                        <div className="font-semibold text-gray-800">{formatCurrency(sku.revenue)}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default SalesSummaryCharts;
