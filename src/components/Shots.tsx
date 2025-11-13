import { useEffect, useState } from 'react';
import { supabase, Shot } from '../utils/supabase/client';
import { Zap, Plus, Edit2, Trash2, Search } from 'lucide-react';

export default function Shots() {
  const [shots, setShots] = useState<Shot[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingShot, setEditingShot] = useState<Shot | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
  });

  useEffect(() => {
    loadShots();

    // Subscribe to real-time updates
    const subscription = supabase
      .channel('shots_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shots' }, () => {
        loadShots();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadShots = async () => {
    const { data, error } = await supabase
      .from('shots')
      .select('*')
      .order('name');

    if (data) {
      setShots(data);
    }
  };

  const openModal = (shot?: Shot) => {
    if (shot) {
      setEditingShot(shot);
      setFormData({
        name: shot.name,
        price: shot.price.toString(),
      });
    } else {
      setEditingShot(null);
      setFormData({
        name: '',
        price: '',
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingShot(null);
    setFormData({
      name: '',
      price: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.price) {
      alert('Please fill in all fields');
      return;
    }

    try {
      if (editingShot) {
        // Update existing shot
        const { error } = await supabase
          .from('shots')
          .update({
            name: formData.name,
            price: parseFloat(formData.price),
          })
          .eq('id', editingShot.id);

        if (error) throw error;
        alert('Shot updated successfully!');
      } else {
        // Create new shot
        const { error } = await supabase
          .from('shots')
          .insert({
            name: formData.name,
            price: parseFloat(formData.price),
          });

        if (error) throw error;
        alert('Shot created successfully!');
      }

      closeModal();
      loadShots();
    } catch (error) {
      console.error('Error saving shot:', error);
      alert('Failed to save shot. Please try again.');
    }
  };

  const handleDelete = async (shot: Shot) => {
    if (!confirm(`Are you sure you want to delete "${shot.name}"?`)) return;

    try {
      const { error } = await supabase
        .from('shots')
        .delete()
        .eq('id', shot.id);

      if (error) throw error;

      alert('Shot deleted successfully!');
      loadShots();
    } catch (error) {
      console.error('Error deleting shot:', error);
      alert('Failed to delete shot. Please try again.');
    }
  };

  const filteredShots = shots.filter(shot =>
    shot.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="mb-2">Shots Management</h1>
          <p className="text-gray-600">Manage shots (no inventory tracking)</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Shot
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search shots..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Shots Table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b-2 border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-gray-700">Name</th>
                <th className="px-6 py-4 text-left text-gray-700">Price</th>
                <th className="px-6 py-4 text-left text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredShots.map(shot => (
                <tr key={shot.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-gray-900">{shot.name}</td>
                  <td className="px-6 py-4 text-gray-900">M{shot.price.toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openModal(shot)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(shot)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredShots.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No shots found
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-scaleIn">
            <div className="p-6 border-b bg-gradient-to-r from-purple-600 to-purple-700 text-white">
              <h2>{editingShot ? 'Edit Shot' : 'Add New Shot'}</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-gray-700 mb-2">Shot Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none"
                  placeholder="e.g., Hennessy VSOP (shot)"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-700 mb-2">Price (M) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none"
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all shadow-md font-medium"
                >
                  {editingShot ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
