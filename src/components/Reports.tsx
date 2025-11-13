import { useEffect, useState } from 'react';
import { supabase, OrderItem, Rider } from '../utils/supabase/client';
import { BarChart3, Download, DollarSign, Users, Gift, TrendingUp } from 'lucide-react';

export default function Reports() {
  const [dateRange, setDateRange] = useState({
    fromDate: new Date().toISOString().split('T')[0],
    fromTime: '18:00',
    toDate: new Date().toISOString().split('T')[0],
    toTime: '23:59',
  });
  const [salesData, setSalesData] = useState<OrderItem[]>([]);
  const [ridersData, setRidersData] = useState<Rider[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadReports();
  }, [dateRange]);

  const loadReports = async () => {
    setLoading(true);
    try {
      // Combine date and time for proper filtering
      const fromDateTime = `${dateRange.fromDate}T${dateRange.fromTime}:00`;
      const toDateTime = `${dateRange.toDate}T${dateRange.toTime}:59`;

      // Load sales data
      const { data: orderItems } = await supabase
        .from('order_items')
        .select(`
          *,
          item:items(*),
          staff:users!order_items_staff_id_fkey(*)
        `)
        .gte('created_at', fromDateTime)
        .lte('created_at', toDateTime);

      if (orderItems) {
        setSalesData(orderItems as any);
      }

      // Load riders data
      const { data: riders } = await supabase
        .from('riders')
        .select(`
          *,
          item:items(*),
          staff:users!riders_given_by_fkey(*)
        `)
        .gte('created_at', fromDateTime)
        .lte('created_at', toDateTime);

      if (riders) {
        setRidersData(riders as any);
      }
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate metrics
  const totalRevenue = salesData.reduce((sum, item) => sum + (item.price_at_time * item.quantity), 0);
  const totalItems = salesData.reduce((sum, item) => sum + item.quantity, 0);
  const totalRidersValue = ridersData.reduce((sum, rider) => sum + ((rider.item?.price || 0) * rider.quantity), 0);

  // Staff performance
  const staffPerformance = salesData.reduce((acc, item) => {
    const staffId = item.staff_id;
    const staffName = item.staff?.name || 'Unknown';
    if (!acc[staffId]) {
      acc[staffId] = { name: staffName, revenue: 0, items: 0 };
    }
    acc[staffId].revenue += item.price_at_time * item.quantity;
    acc[staffId].items += item.quantity;
    return acc;
  }, {} as Record<string, { name: string; revenue: number; items: number }>);

  const staffPerformanceArray = Object.values(staffPerformance).sort((a, b) => b.revenue - a.revenue);

  // Product performance
  const productPerformance = salesData.reduce((acc, item) => {
    const itemId = item.item_id;
    const itemName = item.item?.name || 'Unknown';
    if (!acc[itemId]) {
      acc[itemId] = { name: itemName, quantity: 0, revenue: 0 };
    }
    acc[itemId].quantity += item.quantity;
    acc[itemId].revenue += item.price_at_time * item.quantity;
    return acc;
  }, {} as Record<string, { name: string; quantity: number; revenue: number }>);

  const productPerformanceArray = Object.values(productPerformance).sort((a, b) => b.revenue - a.revenue);

  const exportSalesCSV = () => {
    const headers = ['Date', 'Item', 'Quantity', 'Price', 'Total', 'Staff'];
    const rows = salesData.map(item => [
      new Date(item.created_at!).toLocaleString(),
      item.item?.name || '',
      item.quantity,
      item.price_at_time.toFixed(2),
      (item.quantity * item.price_at_time).toFixed(2),
      item.staff?.name || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales_report_${dateRange.fromDate}_${dateRange.fromTime}_to_${dateRange.toDate}_${dateRange.toTime}.csv`;
    a.click();
  };

  const exportStaffPerformanceCSV = () => {
    const headers = ['Staff Name', 'Items Sold', 'Revenue'];
    const rows = staffPerformanceArray.map(staff => [
      staff.name,
      staff.items,
      staff.revenue.toFixed(2),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `staff_performance_${dateRange.fromDate}_${dateRange.fromTime}_to_${dateRange.toDate}_${dateRange.toTime}.csv`;
    a.click();
  };

  const StatCard = ({ icon: Icon, label, value, color, prefix = '' }: any) => (
    <div className="bg-white rounded-lg shadow-md p-6 border-l-4" style={{ borderLeftColor: color }}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 mb-1">{label}</p>
          <p className="text-gray-900">
            {prefix}{typeof value === 'number' ? value.toLocaleString() : value}
          </p>
        </div>
        <div className="p-3 rounded-full" style={{ backgroundColor: `${color}20` }}>
          <Icon className="w-6 h-6" style={{ color }} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6">
      <h1 className="mb-6">Reports & Analytics</h1>

      {/* Date Range Filter */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-gray-700 mb-2">From Date</label>
            <input
              type="date"
              value={dateRange.fromDate}
              onChange={(e) => setDateRange({ ...dateRange, fromDate: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-gray-700 mb-2">From Time</label>
            <input
              type="time"
              value={dateRange.fromTime}
              onChange={(e) => setDateRange({ ...dateRange, fromTime: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-gray-700 mb-2">To Date</label>
            <input
              type="date"
              value={dateRange.toDate}
              onChange={(e) => setDateRange({ ...dateRange, toDate: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-gray-700 mb-2">To Time</label>
            <input
              type="time"
              value={dateRange.toTime}
              onChange={(e) => setDateRange({ ...dateRange, toTime: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={loadReports}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Generate Report
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading reports...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              label="Total Revenue"
              value={totalRevenue.toFixed(2)}
              icon={DollarSign}
              color="#10b981"
              prefix="M"
            />
            <StatCard
              icon={TrendingUp}
              label="Items Sold"
              value={totalItems}
              color="#3b82f6"
            />
            <StatCard
              icon={Gift}
              label="Riders Value"
              value={totalRidersValue.toFixed(2)}
              color="#f59e0b"
              prefix="M"
            />
            <StatCard
              icon={Users}
              label="Active Staff"
              value={staffPerformanceArray.length}
              color="#8b5cf6"
            />
          </div>

          {/* Staff Performance */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2>Staff Performance</h2>
              <button
                onClick={exportStaffPerformanceCSV}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-gray-700">Staff Name</th>
                    <th className="px-6 py-3 text-left text-gray-700">Items Sold</th>
                    <th className="px-6 py-3 text-left text-gray-700">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {staffPerformanceArray.map((staff, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-gray-900">{staff.name}</td>
                      <td className="px-6 py-4 text-gray-900">{staff.items}</td>
                      <td className="px-6 py-4 text-gray-900">M{staff.revenue.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Product Performance */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="mb-4">Product Performance</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-gray-700">Product</th>
                    <th className="px-6 py-3 text-left text-gray-700">Quantity Sold</th>
                    <th className="px-6 py-3 text-left text-gray-700">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {productPerformanceArray.slice(0, 10).map((product, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-gray-900">{product.name}</td>
                      <td className="px-6 py-4 text-gray-900">{product.quantity}</td>
                      <td className="px-6 py-4 text-gray-900">M{product.revenue.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sales Details */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2>Sales Details</h2>
              <button
                onClick={exportSalesCSV}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-gray-700">Date & Time</th>
                    <th className="px-6 py-3 text-left text-gray-700">Item</th>
                    <th className="px-6 py-3 text-left text-gray-700">Quantity</th>
                    <th className="px-6 py-3 text-left text-gray-700">Price</th>
                    <th className="px-6 py-3 text-left text-gray-700">Total</th>
                    <th className="px-6 py-3 text-left text-gray-700">Staff</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {salesData.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-gray-900">
                        {new Date(item.created_at!).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-gray-900">{item.item?.name}</td>
                      <td className="px-6 py-4 text-gray-900">{item.quantity}</td>
                      <td className="px-6 py-4 text-gray-900">M{item.price_at_time.toFixed(2)}</td>
                      <td className="px-6 py-4 text-gray-900">
                        M{(item.quantity * item.price_at_time).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-gray-600">{item.staff?.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}