import { useEffect, useState } from 'react';
import { getCurrentUser } from '../utils/auth';
import { supabase } from '../utils/supabase/client';
import { DollarSign, TrendingUp, Receipt, Clock } from 'lucide-react';

// Helper function to get current shift start time (18:00 today or yesterday)
const getCurrentShiftStart = () => {
  const now = new Date();
  const currentHour = now.getHours();
  
  // If it's before 6 AM, we're still in yesterday's shift
  if (currentHour < 6) {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(18, 0, 0, 0);
    return yesterday;
  } else {
    // If it's after 6 AM, use today's 18:00
    const today = new Date(now);
    today.setHours(18, 0, 0, 0);
    return today;
  }
};

// Get shift end time (06:00 tomorrow or today)
const getCurrentShiftEnd = () => {
  const now = new Date();
  const currentHour = now.getHours();
  
  // If it's before 6 AM, shift ends today at 06:00
  if (currentHour < 6) {
    const today = new Date(now);
    today.setHours(6, 0, 0, 0);
    return today;
  } else {
    // If it's after 6 AM, shift ends tomorrow at 06:00
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(6, 0, 0, 0);
    return tomorrow;
  }
};

interface OrderSummary {
  id: string;
  table_name: string;
  total: number;
  service_fee: number;
  payment_method: string;
  created_at: string;
  item_count: number;
}

export default function MySales() {
  const user = getCurrentUser();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    fromDate: getCurrentShiftStart().toISOString().split('T')[0],
    fromTime: '18:00',
    toDate: getCurrentShiftEnd().toISOString().split('T')[0],
    toTime: '06:00',
  });

  useEffect(() => {
    loadSales();

    // Subscribe to real-time updates
    const subscription = supabase
      .channel('my_orders_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        loadSales();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [dateRange]);

  const loadSales = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Combine date and time for proper filtering
      const fromDateTime = `${dateRange.fromDate}T${dateRange.fromTime}:00`;
      const toDateTime = `${dateRange.toDate}T${dateRange.toTime}:59`;

      // Get all paid orders created by this staff member during this time range
      const { data: ordersData, error } = await supabase
        .from('orders')
        .select(`
          id,
          table_name,
          total,
          service_fee,
          payment_method,
          created_at,
          order_items(quantity),
          order_shots(quantity),
          order_specials(quantity)
        `)
        .eq('staff_id', user.id)
        .eq('status', 'paid')
        .gte('created_at', fromDateTime)
        .lt('created_at', toDateTime)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Calculate item count for each order
      const ordersWithCount: OrderSummary[] = (ordersData || []).map((order: any) => ({
        id: order.id,
        table_name: order.table_name,
        total: order.total,
        service_fee: order.service_fee,
        payment_method: order.payment_method,
        created_at: order.created_at,
        item_count: 
          (order.order_items?.reduce((sum: number, oi: any) => sum + oi.quantity, 0) || 0) +
          (order.order_shots?.reduce((sum: number, os: any) => sum + os.quantity, 0) || 0) +
          (order.order_specials?.reduce((sum: number, os: any) => sum + os.quantity, 0) || 0),
      }));

      setOrders(ordersWithCount);
    } catch (error) {
      console.error('Error loading sales:', error);
      alert('Failed to load sales data');
    } finally {
      setLoading(false);
    }
  };

  const totalSales = orders.reduce((sum, order) => sum + order.total, 0);
  const totalServiceFees = orders.reduce((sum, order) => sum + order.service_fee, 0);
  const totalOrders = orders.length;
  const averageOrder = totalOrders > 0 ? totalSales / totalOrders : 0;

  const shiftStart = getCurrentShiftStart();
  const shiftEnd = getCurrentShiftEnd();

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="mb-2">My Sales</h1>
        <p className="text-gray-600 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Viewing sales from {new Date(`${dateRange.fromDate}T${dateRange.fromTime}`).toLocaleString()} to {new Date(`${dateRange.toDate}T${dateRange.toTime}`).toLocaleString()}
        </p>
      </div>

      {/* Date and Time Range Filter */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-gray-700 text-xs mb-1">From Date</label>
            <input
              type="date"
              value={dateRange.fromDate}
              onChange={(e) => setDateRange({ ...dateRange, fromDate: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
            />
          </div>
          <div>
            <label className="block text-gray-700 text-xs mb-1">From Time</label>
            <input
              type="time"
              value={dateRange.fromTime}
              onChange={(e) => setDateRange({ ...dateRange, fromTime: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
            />
          </div>
          <div>
            <label className="block text-gray-700 text-xs mb-1">To Date</label>
            <input
              type="date"
              value={dateRange.toDate}
              onChange={(e) => setDateRange({ ...dateRange, toDate: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
            />
          </div>
          <div>
            <label className="block text-gray-700 text-xs mb-1">To Time</label>
            <input
              type="time"
              value={dateRange.toTime}
              onChange={(e) => setDateRange({ ...dateRange, toTime: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-green-600 rounded-lg shadow-sm p-5 text-white">
          <div className="flex items-center justify-between mb-2">
            <p className="text-white text-xs uppercase tracking-wider">Total Sales</p>
            <DollarSign className="w-6 h-6 text-green-200" />
          </div>
          <p className="text-2xl font-bold">M{totalSales.toFixed(2)}</p>
        </div>

        <div className="bg-blue-600 rounded-lg shadow-sm p-5 text-white">
          <div className="flex items-center justify-between mb-2">
            <p className="text-white text-xs uppercase tracking-wider">Total Orders</p>
            <Receipt className="w-6 h-6 text-blue-200" />
          </div>
          <p className="text-2xl font-bold">{totalOrders}</p>
        </div>

        <div className="bg-purple-600 rounded-lg shadow-sm p-5 text-white">
          <div className="flex items-center justify-between mb-2">
            <p className="text-white text-xs uppercase tracking-wider">Average Order</p>
            <TrendingUp className="w-6 h-6 text-purple-200" />
          </div>
          <p className="text-2xl font-bold">M{averageOrder.toFixed(2)}</p>
        </div>

        <div className="bg-orange-600 rounded-lg shadow-sm p-5 text-white">
          <div className="flex items-center justify-between mb-2">
            <p className="text-white text-xs uppercase tracking-wider">Service Fees</p>
            <DollarSign className="w-6 h-6 text-orange-200" />
          </div>
          <p className="text-2xl font-bold">M{totalServiceFees.toFixed(2)}</p>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h2 className="text-gray-700">Order Details</h2>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading sales data...</div>
          ) : orders.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No sales recorded for this shift yet.
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-gray-700">Time</th>
                  <th className="px-6 py-3 text-left text-gray-700">Table</th>
                  <th className="px-6 py-3 text-left text-gray-700">Items</th>
                  <th className="px-6 py-3 text-left text-gray-700">Payment</th>
                  <th className="px-6 py-3 text-left text-gray-700">Service Fee</th>
                  <th className="px-6 py-3 text-left text-gray-700">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {orders.map(order => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-gray-900">
                      {new Date(order.created_at).toLocaleTimeString()}
                    </td>
                    <td className="px-6 py-4 text-gray-900">{order.table_name}</td>
                    <td className="px-6 py-4 text-gray-600">{order.item_count} items</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs uppercase">
                        {order.payment_method}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-900">
                      M{order.service_fee.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-gray-900 font-bold">
                      M{order.total.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}