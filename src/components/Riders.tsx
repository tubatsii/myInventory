import { useEffect, useState } from 'react';
import { getCurrentUser } from '../utils/auth';
import { supabase, Item, Rider } from '../utils/supabase/client';
import { Gift, Plus, Search, Download, History, Clock } from 'lucide-react';

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

export default function Riders() {
  const user = getCurrentUser();
  const [riders, setRiders] = useState<Rider[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [formData, setFormData] = useState({
    item_id: '',
    quantity: 1,
    recipient: '',
  });

  useEffect(() => {
    loadRiders();
    loadItems();

    // Subscribe to real-time updates
    const subscription = supabase
      .channel('riders_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'riders' }, () => {
        loadRiders();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadRiders = async () => {
    const { data, error } = await supabase
      .from('riders')
      .select(`
        *,
        item:items(*),
        staff:users!riders_given_by_fkey(*)
      `)
      .order('created_at', { ascending: false });

    if (data) {
      setRiders(data as any);
    }
  };

  const loadItems = async () => {
    const { data } = await supabase
      .from('items')
      .select('*')
      .order('name');

    if (data) {
      setItems(data);
    }
  };

  const openModal = () => {
    setFormData({
      item_id: '',
      quantity: 1,
      recipient: '',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      // Check stock availability
      const item = items.find(i => i.id === formData.item_id);
      if (!item || item.quantity < formData.quantity) {
        alert('Not enough stock available!');
        setLoading(false);
        return;
      }

      // Create rider record
      const { error: riderError } = await supabase
        .from('riders')
        .insert({
          item_id: formData.item_id,
          quantity: formData.quantity,
          recipient: formData.recipient,
          given_by: user.id,
        });

      if (riderError) throw riderError;

      // Update inventory
      const { error: updateError } = await supabase
        .from('items')
        .update({ quantity: item.quantity - formData.quantity })
        .eq('id', formData.item_id);

      if (updateError) throw updateError;

      closeModal();
      loadRiders();
      loadItems();
      alert('Rider given successfully!');
    } catch (error) {
      console.error('Error giving rider:', error);
      alert('Failed to give rider. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Item', 'Quantity', 'Recipient', 'Given By'];
    const rows = filteredRiders.map(rider => [
      new Date(rider.created_at!).toLocaleString(),
      rider.item?.name || '',
      rider.quantity,
      rider.recipient,
      rider.staff?.name || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `riders_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const filteredRiders = riders.filter(rider => {
    const matchesSearch = 
      rider.recipient.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rider.item?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rider.staff?.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;
    
    // If showing history, show all
    if (showHistory) return true;
    
    // Only show today's shift (18:00 - 06:00)
    const shiftStart = getCurrentShiftStart();
    const riderDate = new Date(rider.created_at!);
    return riderDate >= shiftStart;
  });

  const todayRiders = riders.filter(rider => {
    const shiftStart = getCurrentShiftStart();
    const riderDate = new Date(rider.created_at!);
    return riderDate >= shiftStart;
  });

  const totalRidersValue = filteredRiders.reduce((sum, rider) => {
    const itemPrice = rider.item?.price || 0;
    return sum + (itemPrice * rider.quantity);
  }, 0);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="mb-2">Riders (Free Items)</h1>
          <p className="text-gray-600">Total Value: M{totalRidersValue.toFixed(2)}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-5 h-5" />
            Export CSV
          </button>
          <button
            onClick={openModal}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Give Rider
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6 flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by recipient, item, or staff..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowHistory(false)}
            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
              !showHistory
                ? 'bg-purple-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <Clock className="w-4 h-4" />
            Today's Shift ({todayRiders.length})
          </button>
          <button
            onClick={() => setShowHistory(true)}
            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
              showHistory
                ? 'bg-purple-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <History className="w-4 h-4" />
            Full History ({riders.length})
          </button>
        </div>
      </div>

      {/* Riders Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-gray-700">Date & Time</th>
                <th className="px-6 py-3 text-left text-gray-700">Item</th>
                <th className="px-6 py-3 text-left text-gray-700">Quantity</th>
                <th className="px-6 py-3 text-left text-gray-700">Recipient</th>
                <th className="px-6 py-3 text-left text-gray-700">Given By</th>
                <th className="px-6 py-3 text-left text-gray-700">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredRiders.map(rider => (
                <tr key={rider.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-gray-900">
                    {new Date(rider.created_at!).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-gray-900">{rider.item?.name}</td>
                  <td className="px-6 py-4 text-gray-900">{rider.quantity}</td>
                  <td className="px-6 py-4 text-gray-900">{rider.recipient}</td>
                  <td className="px-6 py-4 text-gray-600">{rider.staff?.name}</td>
                  <td className="px-6 py-4 text-gray-900">
                    M{((rider.item?.price || 0) * rider.quantity).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Give Rider Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="flex items-center gap-2 mb-4">
              <Gift className="w-6 h-6 text-purple-600" />
              <h2 className="text-purple-600">Give Rider</h2>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-700 mb-2">Select Item *</label>
                <select
                  value={formData.item_id}
                  onChange={(e) => setFormData({ ...formData, item_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                >
                  <option value="">Choose an item...</option>
                  {items.map(item => (
                    <option key={item.id} value={item.id} disabled={item.quantity <= 0}>
                      {item.name} - M{item.price.toFixed(2)} (Stock: {item.quantity})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Quantity *</label>
                <input
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Recipient Name *</label>
                <input
                  type="text"
                  value={formData.recipient}
                  onChange={(e) => setFormData({ ...formData, recipient: e.target.value })}
                  placeholder="Enter recipient name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>
              <div className="bg-purple-50 p-3 rounded-lg">
                <p className="text-purple-800 text-sm">
                  <strong>Given by:</strong> {user?.name}
                </p>
                {formData.item_id && (
                  <p className="text-purple-800 text-sm mt-1">
                    <strong>Value:</strong> M
                    {((items.find(i => i.id === formData.item_id)?.price || 0) * formData.quantity).toFixed(2)}
                  </p>
                )}
              </div>
              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Give Rider'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}