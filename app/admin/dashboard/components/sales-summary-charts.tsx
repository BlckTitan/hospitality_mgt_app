// 'use client'

// import React, { useState } from 'react';
// import { useQuery } from 'convex/react';
// import { api } from '../../../../convex/_generated/api';
// import { Id } from '../../../../convex/_generated/dataModel';
// import {
//   Chart as ChartJS,
//   CategoryScale,
//   LinearScale,
//   PointElement,
//   LineElement,
//   Title,
//   Tooltip,
//   Legend,
//   ArcElement,
//   BarElement,
// } from 'chart.js';
// import { Line, Pie, Bar } from 'react-chartjs-2';

// // Register Chart.js components
// ChartJS.register(
//   CategoryScale,
//   LinearScale,
//   PointElement,
//   LineElement,
//   BarElement,
//   Title,
//   Tooltip,
//   Legend,
//   ArcElement
// );

// interface DashboardSalesChartsProps {
//   currentPropertyId: Id<'properties'>;
// }

// const DashboardSalesCharts: React.FC<DashboardSalesChartsProps> = ({ currentPropertyId }) => {
//   const [periodType, setPeriodType] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  
//   // Fetch comprehensive sales data for dashboard
//   const dailySalesData = useQuery(api.salesSummaries.getSalesSummaries, {
//     propertyId: currentPropertyId,
//     periodType: 'daily',
//     limit: 7,
//   });

//   const weeklySalesData = useQuery(api.salesSummaries.getSalesSummaries, {
//     propertyId: currentPropertyId,
//     periodType: 'weekly',
//     limit: 8,
//   });

//   const monthlySalesData = useQuery(api.salesSummaries.getSalesSummaries, {
//     propertyId: currentPropertyId,
//     periodType: 'monthly',
//     limit: 12,
//   });

//   const barPerformanceData = useQuery(api.salesSummaries.getSalesByBarPeriod, {
//     propertyId: currentPropertyId,
//     periodType: 'monthly',
//     limit: 5,
//   });

//   const topUsersData = useQuery(api.salesSummaries.getSalesByUserPeriod, {
//     propertyId: currentPropertyId,
//     periodType: 'monthly',
//     limit: 5,
//   });

//   const getCurrencySymbol = (currency?: string) => {
//     switch (currency?.toUpperCase()) {
//       case 'USD': return '$';
//       case 'EUR': return '€';
//       case 'GBP': return '£';
//       case 'JPY': return '¥';
//       case 'NGN': return '₦';
//       default: return '$';
//     }
//   };

//   const formatCurrency = (value: number) => {
//     return new Intl.NumberFormat('en-US', {
//       style: 'currency',
//       currency: 'USD',
//       minimumFractionDigits: 0,
//       maximumFractionDigits: 0,
//     }).format(value);
//   };

//   // Get current period data
//   const getCurrentPeriodData = () => {
//     switch (periodType) {
//       case 'daily':
//         return dailySalesData;
//       case 'weekly':
//         return weeklySalesData;
//       case 'monthly':
//         return monthlySalesData;
//       default:
//         return dailySalesData;
//     }
//   };

//   const currentData = getCurrentPeriodData();

//   // Prepare data for revenue trend chart
//   const revenueTrendChartData = currentData?.success && currentData.data ? {
//     labels: currentData.data.slice(0, 7).reverse().map(item => {
//       const date = new Date(item.periodKey);
//       return periodType === 'daily' 
//         ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
//         : periodType === 'weekly'
//         ? `W${date.toLocaleDateString('en-US', { month: 'short' })}`
//         : date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
//     }),
//     datasets: [
//       {
//         label: 'Revenue',
//         data: currentData.data.slice(0, 7).reverse().map(item => item.totalRevenue),
//         borderColor: 'rgba(59, 130, 246, 1)',
//         backgroundColor: 'rgba(59, 130, 246, 0.1)',
//         tension: 0.4,
//         fill: true,
//       },
//       {
//         label: 'Quantity Sold',
//         data: currentData.data.slice(0, 7).reverse().map(item => item.totalQtySold),
//         borderColor: 'rgba(16, 185, 129, 1)',
//         backgroundColor: 'rgba(16, 185, 129, 0.1)',
//         tension: 0.4,
//         fill: true,
//         yAxisID: 'y1',
//       },
//     ],
//   } : null;

//   // Prepare data for bar performance comparison
//   const barComparisonChartData = barPerformanceData?.success && barPerformanceData.data ? {
//     labels: barPerformanceData.data.map(item => item.bar?.name || 'Unknown'),
//     datasets: [
//       {
//         label: 'Monthly Revenue',
//         data: barPerformanceData.data.map(item => item.totalRevenue),
//         backgroundColor: [
//           'rgba(59, 130, 246, 0.6)',
//           'rgba(16, 185, 129, 0.6)',
//           'rgba(251, 146, 60, 0.6)',
//           'rgba(139, 92, 246, 0.6)',
//           'rgba(239, 68, 68, 0.6)',
//         ],
//         borderColor: [
//           'rgba(59, 130, 246, 1)',
//           'rgba(16, 185, 129, 1)',
//           'rgba(251, 146, 60, 1)',
//           'rgba(139, 92, 246, 1)',
//           'rgba(239, 68, 68, 1)',
//         ],
//         borderWidth: 1,
//       },
//     ],
//   } : null;

//   // Prepare data for top performers chart
//   const topPerformersChartData = topUsersData?.success && topUsersData.data ? {
//     labels: topUsersData.data.map(item => item.user?.name || 'Unknown'),
//     datasets: [
//       {
//         label: 'Monthly Revenue',
//         data: topUsersData.data.map(item => item.totalRevenue),
//         backgroundColor: 'rgba(139, 92, 246, 0.6)',
//         borderColor: 'rgba(139, 92, 246, 1)',
//         borderWidth: 1,
//       },
//     ],
//   } : null;

//   // Prepare data for period comparison
//   const periodComparisonChartData = monthlySalesData?.success && monthlySalesData.data ? {
//     labels: monthlySalesData.data.slice(0, 6).reverse().map(item => {
//       const date = new Date(item.periodKey);
//       return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
//     }),
//     datasets: [
//       {
//         label: 'Revenue',
//         data: monthlySalesData.data.slice(0, 6).reverse().map(item => item.totalRevenue),
//         backgroundColor: 'rgba(251, 146, 60, 0.6)',
//         borderColor: 'rgba(251, 146, 60, 1)',
//         borderWidth: 1,
//       },
//       {
//         label: 'Previous Period',
//         data: monthlySalesData.data.slice(6, 12).reverse().map(item => item.totalRevenue),
//         backgroundColor: 'rgba(156, 163, 175, 0.6)',
//         borderColor: 'rgba(156, 163, 175, 1)',
//         borderWidth: 1,
//       },
//     ],
//   } : null;

//   const chartOptions = {
//     responsive: true,
//     maintainAspectRatio: false,
//     plugins: {
//       legend: {
//         position: 'top' as const,
//       },
//       title: {
//         display: false,
//       },
//     },
//     scales: revenueTrendChartData ? {
//       y: {
//         type: 'linear' as const,
//         display: true,
//         position: 'left' as const,
//         title: {
//           display: true,
//           text: 'Revenue ($)',
//         },
//         ticks: {
//           callback: (value: number) => formatCurrency(value),
//         },
//       },
//       y1: {
//         type: 'linear' as const,
//         display: true,
//         position: 'right' as const,
//         title: {
//           display: true,
//           text: 'Quantity',
//         },
//         grid: {
//           drawOnChartArea: false,
//         },
//       },
//     } : undefined,
//   };

//   const singleAxisOptions = {
//     ...chartOptions,
//     scales: {
//       y: {
//         title: {
//           display: true,
//           text: 'Revenue ($)',
//         },
//         ticks: {
//           callback: (value: number) => formatCurrency(value),
//         },
//       },
//     },
//   };

//   // Calculate key metrics
//   const totalRevenue = currentData?.data?.reduce(
//     (sum: number, item: any) => sum + (item.totalRevenue || 0), 0
//   ) || 0;
//   const totalQuantity = currentData?.data?.reduce((sum: number, item: any) => sum + (item.totalQtySold || 0), 0) || 0;
//   const averageRevenue = currentData?.data?.length ? totalRevenue / currentData.data.length : 0;
//   const topBar = barPerformanceData?.data?.[0];

//   if (!currentData?.success) {
//     return (
//       <div className="w-full p-4 text-center">
//         <p>Loading dashboard data...</p>
//       </div>
//     );
//   }

//   return (
//     <div className="w-full">
//       {/* Header with Period Selector */}
//       <div className="mb-6 flex justify-between items-center">
//         <h3 className="text-lg font-semibold text-gray-800">Sales Overview</h3>
//         <div className="flex space-x-2">
//           {(['daily', 'weekly', 'monthly'] as const).map((period) => (
//             <button
//               key={period}
//               onClick={() => setPeriodType(period)}
//               className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
//                 periodType === period
//                   ? 'bg-blue-600 text-white'
//                   : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
//               }`}
//             >
//               {period.charAt(0).toUpperCase() + period.slice(1)}
//             </button>
//           ))}
//         </div>
//       </div>

//       {/* Key Metrics Cards */}
//       <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
//         <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 rounded-lg text-white">
//           <div className="text-sm opacity-90">Total Revenue</div>
//           <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
//           <div className="text-xs opacity-75 mt-1">Current {periodType}</div>
//         </div>
//         <div className="bg-gradient-to-r from-green-500 to-green-600 p-4 rounded-lg text-white">
//           <div className="text-sm opacity-90">Total Sales</div>
//           <div className="text-2xl font-bold">{totalQuantity.toLocaleString()}</div>
//           <div className="text-xs opacity-75 mt-1">Units sold</div>
//         </div>
//         <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-4 rounded-lg text-white">
//           <div className="text-sm opacity-90">Average Revenue</div>
//           <div className="text-2xl font-bold">{formatCurrency(averageRevenue)}</div>
//           <div className="text-xs opacity-75 mt-1">Per {periodType.slice(0, -1)}</div>
//         </div>
//         <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-4 rounded-lg text-white">
//           <div className="text-sm opacity-90">Top Bar</div>
//           <div className="text-xl font-bold truncate">{topBar?.bar?.name || 'N/A'}</div>
//           <div className="text-xs opacity-75 mt-1">{formatCurrency(topBar?.totalRevenue || 0)}</div>
//         </div>
//       </div>

//       {/* Charts Grid */}
//       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//         {/* Revenue Trend Chart */}
//         <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
//           <h4 className="text-md font-semibold text-gray-800 mb-4">Revenue & Sales Trend</h4>
//           <div className="h-64">
//             {revenueTrendChartData && <Line data={revenueTrendChartData} options={chartOptions} />}
//           </div>
//         </div>

//         {/* Bar Performance Comparison */}
//         <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
//           <h4 className="text-md font-semibold text-gray-800 mb-4">Bar Performance</h4>
//           <div className="h-64">
//             {barComparisonChartData && <Bar data={barComparisonChartData} options={singleAxisOptions} />}
//           </div>
//         </div>

//         {/* Top Performers */}
//         <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
//           <h4 className="text-md font-semibold text-gray-800 mb-4">Top Performers</h4>
//           <div className="h-64">
//             {topPerformersChartData && <Bar data={topPerformersChartData} options={singleAxisOptions} />}
//           </div>
//         </div>

//         {/* Period Comparison */}
//         <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
//           <h4 className="text-md font-semibold text-gray-800 mb-4">Monthly Comparison</h4>
//           <div className="h-64">
//             {periodComparisonChartData && <Bar data={periodComparisonChartData} options={singleAxisOptions} />}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default DashboardSalesCharts;
