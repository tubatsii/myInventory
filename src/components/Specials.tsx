import { useEffect, useState } from 'react';
import { getCurrentUser } from '../utils/auth';
import { supabase } from '../utils/supabase/client';
import { Utensils, Plus, Trash2, Search } from 'lucide-react';

interface Special {
  id: string;
  name: string;
  price: number;
  created_at?: string;
}

export default function Specials() {
  const user = getCurrentUser();
  const [specials, setSpecials] = useState<Special[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingSpecial, setEditingSpecial] = useState<Special | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
  });

  useEffect(() => {
    loadSpecials();

    // Subscribe to real-time updates
    const subscription = supabase
      .channel('specials_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'specials' }, () => {
        loadSpecials();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadSpecials = async () => {
    const { data, error } = await supabase
      .from('specials')
      .select('*')
      .order('name');

    if (data) {
      setSpecials(data);
    }
  };

  const openModal = (special?: Special) => {
    if (special) {
      setEditingSpecial(special);
      setFormData({
        name: special.name,
        price: special.price.toString(),
      });
    } else {
      setEditingSpecial(null);
      setFormData({
        name: '',
        price: '',
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingSpecial(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      const specialData = {
        name: formData.name,
        price: parseFloat(formData.price),
      };

      if (editingSpecial) {
        // Update existing special
        const { error } = await supabase
          .from('specials')
          .update(specialData)
          .eq('id', editingSpecial.id);

        if (error) throw error;
        alert('Special updated successfully!');
      } else {
        // Create new special
        const { error } = await supabase
          .from('specials')
          .insert(specialData);

        if (error) throw error;
        alert('Special created successfully!');
      }

      closeModal();
    } catch (error) {
      console.error('Error saving special:', error);
      alert('Failed to save special');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (specialId: string) => {
    if (!confirm('Are you sure you want to delete this special?')) return;

    try {
      const { error } = await supabase
        .from('specials')
        .delete()
        .eq('id', specialId);

      if (error) throw error;
      alert('Special deleted successfully!');
    } catch (error) {
      console.error('Error deleting special:', error);
      alert('Failed to delete special');
    }
  };

  const filteredSpecials = specials.filter(special =>
    special.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="mb-2">Specials Management</h1>
          <p className="text-gray-600">Manage food specials like loaded fries, wings, hookah, etc. (No inventory tracking)</p>
        </div>
        <button
          onClick={() => openModal()}
          className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-3 rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Special
        </button>
      </div>

      {/* Search */}
      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search specials..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        />
      </div>

      {/* Specials Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredSpecials.map(special => (
          <div
            key={special.id}
            className="bg-white rounded-lg shadow-md hover:shadow-xl transition-all p-6 border-2 border-transparent hover:border-orange-500"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="bg-orange-100 p-3 rounded-lg">
                <Utensils className="w-6 h-6 text-orange-600" />
              </div>
              <button
                onClick={() => handleDelete(special.id)}
                className="text-red-500 hover:text-red-700 transition-colors"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
            <h3 className="text-gray-900 mb-2">{special.name}</h3>
            <p className="text-2xl text-orange-600 mb-4">M{special.price.toFixed(2)}</p>
            <button
              onClick={() => openModal(special)}
              className="w-full bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Edit
            </button>
          </div>
        ))}
      </div>

      {filteredSpecials.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Utensils className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p>No specials found. Add your first special!</p>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-gray-900 mb-6">
              {editingSpecial ? 'Edit Special' : 'Add New Special'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Special Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Loaded Fries, Wings, Hookah"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                />
              </div>
              <div className="mb-6">
                <label className="block text-gray-700 mb-2">Price (M)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 text-white py-2 rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all disabled:opacity-50"
                >
                  {loading ? 'Saving...' : editingSpecial ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
