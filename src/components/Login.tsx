import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, setCurrentUser } from '../utils/auth';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { user, error: loginError } = await login(username, pin);

    if (loginError) {
      // Simplified, vague error message
      setError('Incorrect credentials');
      setLoading(false);
      return;
    }

    if (user) {
      setCurrentUser(user);
      navigate('/dashboard');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-md shadow-2xl p-10 pb-20 w-full max-w-sm animate-scaleIn">
        <div className="text-center" style={{ marginTop: '40px', marginBottom: '60px' }}>
          <h1 className="font-bold text-4xl text-gray-900">myInventory</h1>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col items-center gap-8">
          <div className="w-full max-w-xs">
            <label htmlFor="username" className="block text-gray-700 mb-3 text-sm text-center">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-3 border border-gray-300 rounded focus:ring-1 focus:ring-gray-400 focus:border-gray-400 transition-all text-center"
              placeholder="Enter username"
              required
              autoFocus
            />
          </div>

          <div className="w-full max-w-xs">
            <label htmlFor="pin" className="block text-gray-700 mb-3 text-sm text-center">
              PIN
            </label>
            <div className="relative">
              <input
                id="pin"
                type={showPin ? 'text' : 'password'}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded focus:ring-1 focus:ring-gray-400 focus:border-gray-400 transition-all text-center pr-10"
                placeholder="Enter PIN"
                required
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="w-full max-w-xs bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded animate-slideIn flex items-center justify-center gap-2 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-20 py-4 mt-8 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed text-lg text-center"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Logging in...
              </span>
            ) : (
              'Login'
            )}
          </button>
          
          <div className="h-3"></div>
        </form>
      </div>
    </div>
  );
}