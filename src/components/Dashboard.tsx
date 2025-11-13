import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCurrentUser } from '../utils/auth';
import { supabase, Item, Order } from '../utils/supabase/client';
import { Package, DollarSign, ShoppingCart, AlertTriangle, TrendingUp, Users as UsersIcon } from 'lucide-react';
import EmailScheduler from './EmailScheduler';

// Helper function to get current shift start time (17:00 today or yesterday)
const getCurrentShiftStart = () => {
  const now = new Date();
  const currentHour = now.getHours();
  
  // If it's before 7 AM, we're still in yesterday's shift
  if (currentHour < 7) {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(17, 0, 0, 0);
    return yesterday;
  } else {
    // If it's after 7 AM, use today's 17:00
    const today = new Date(now);
    today.setHours(17, 0, 0, 0);
    return today;
  }
};

// Get shift end time (07:00 tomorrow or today)
const getCurrentShiftEnd = () => {
  const now = new Date();
  const currentHour = now.getHours();
  
  // If it's before 7 AM, shift ends today at 07:00
  if (currentHour < 7) {
    const today = new Date(now);
    today.setHours(7, 0, 0, 0);
    return today;
  } else {
    // If it's after 7 AM, shift ends tomorrow at 07:00
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(7, 0, 0, 0);
    return tomorrow;
  }
};

export default function Dashboard() {
  const user = getCurrentUser();
  const [stats, setStats] = useState({
    totalItems: 0,
    lowStockItems: 0,
    todaySales: 0,
    todayOrders: 0,
    totalInventoryValue: 0,
    openOrders: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      // Get items stats
      const { data: items } = await supabase
        .from('items')
        .select('*');

      const totalItems = items?.length || 0;
      const lowStockItems = items?.filter((item: Item) => item.quantity <= item.low_stock_threshold).length || 0;
      const totalInventoryValue = items?.reduce((sum: number, item: Item) => sum + (item.quantity * item.price), 0) || 0;

      // Get current shift's orders (17:00 to 07:00)
      const shiftStart = getCurrentShiftStart();
      const shiftEnd = getCurrentShiftEnd();
      
      const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .gte('created_at', shiftStart.toISOString())
        .lt('created_at', shiftEnd.toISOString());

      const todayOrders = orders?.length || 0;
      const todaySales = orders?.reduce((sum: number, order: Order) => sum + order.total, 0) || 0;

      // Get open orders
      const { data: openOrders } = await supabase
        .from('orders')
        .select('*')
        .eq('status', 'pending');

      setStats({
        totalItems,
        lowStockItems,
        todaySales,
        todayOrders,
        totalInventoryValue,
        openOrders: openOrders?.length || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ icon: Icon, label, value, color, prefix = '' }: any) => (
    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 hover:shadow-md transition-all animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">{label}</p>
          <p className="text-gray-900 text-2xl font-bold">
            {prefix}{typeof value === 'number' ? value.toLocaleString() : value}
          </p>
        </div>
        <div className="p-3 rounded-lg" style={{ backgroundColor: `${color}15` }}>
          <Icon className="w-6 h-6" style={{ color }} />
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="mb-2">Welcome back, {user?.name}!</h1>
        <p className="text-gray-600">
          Current shift: {getCurrentShiftStart().toLocaleString()} - {getCurrentShiftEnd().toLocaleString()}
        </p>
      </div>

      {stats.lowStockItems > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-lg">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mr-3" />
            <div>
              <p className="text-yellow-800">
                <span className="font-semibold">{stats.lowStockItems}</span> item{stats.lowStockItems > 1 ? 's' : ''} running low on stock
              </p>
              <p className="text-yellow-700 text-sm">Check inventory to restock</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <StatCard
          label="Shift Sales"
          value={stats.todaySales.toFixed(2)}
          icon={DollarSign}
          color="#10b981"
          prefix="M"
        />
        <StatCard
          icon={ShoppingCart}
          label="Shift Orders"
          value={stats.todayOrders}
          color="#3b82f6"
        />
        <StatCard
          icon={Package}
          label="Total Items"
          value={stats.totalItems}
          color="#8b5cf6"
        />
        <StatCard
          icon={AlertTriangle}
          label="Low Stock Items"
          value={stats.lowStockItems}
          color="#f59e0b"
        />
        <StatCard
          icon={TrendingUp}
          label="Inventory Value"
          value={stats.totalInventoryValue.toFixed(2)}
          color="#06b6d4"
          prefix="M"
        />
        <StatCard
          icon={UsersIcon}
          label="Open Tabs"
          value={stats.openOrders}
          color="#ec4899"
        />
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/pos"
            className="flex items-center gap-3 p-4 border-2 border-purple-200 rounded-lg hover:bg-purple-50 transition-colors"
          >
            <ShoppingCart className="w-6 h-6 text-purple-600" />
            <div>
              <p className="text-gray-900">New Sale</p>
              <p className="text-gray-600 text-sm">Start a new order</p>
            </div>
          </Link>
          <Link
            to="/inventory"
            className="flex items-center gap-3 p-4 border-2 border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
          >
            <Package className="w-6 h-6 text-blue-600" />
            <div>
              <p className="text-gray-900">Inventory</p>
              <p className="text-gray-600 text-sm">Manage stock</p>
            </div>
          </Link>
          {user?.role === 'admin' && (
            <Link
              to="/reports"
              className="flex items-center gap-3 p-4 border-2 border-green-200 rounded-lg hover:bg-green-50 transition-colors"
            >
              <TrendingUp className="w-6 h-6 text-green-600" />
              <div>
                <p className="text-gray-900">Reports</p>
                <p className="text-gray-600 text-sm">View analytics</p>
              </div>
            </Link>
          )}
        </div>
      </div>

      {user?.role === 'admin' && (
        <div className="mt-8">
          <EmailScheduler />
        </div>
      )}
    </div>
  );
}