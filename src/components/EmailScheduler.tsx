import { useState, useEffect } from 'react';
import { Mail, Clock, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

export default function EmailScheduler() {
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [lastSent, setLastSent] = useState<string | null>(null);
  const [nextScheduled, setNextScheduled] = useState<string>('');

  useEffect(() => {
    // Calculate next scheduled time (06:00 tomorrow)
    const calculateNextScheduled = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(6, 0, 0, 0);
      setNextScheduled(tomorrow.toLocaleString());
    };

    calculateNextScheduled();
    const interval = setInterval(calculateNextScheduled, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  const sendTestEmail = async () => {
    setStatus('sending');
    setMessage('');

    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-cc9de453/send-low-stock-email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage('Email sent successfully! Check your inbox.');
        setLastSent(new Date().toLocaleString());
      } else {
        setStatus('error');
        setMessage(data.error || 'Failed to send email');
      }
    } catch (error) {
      setStatus('error');
      setMessage('Network error: ' + (error as Error).message);
    }

    // Reset status after 5 seconds
    setTimeout(() => {
      setStatus('idle');
    }, 5000);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Mail className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h2 className="text-gray-900">Low Stock Email Notifications</h2>
          <p className="text-gray-600 text-sm">Automated daily reports at 06:00</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Schedule Info */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-gray-600" />
            <p className="text-gray-700 font-medium text-sm">Schedule Information</p>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Next scheduled email:</span>
              <span className="text-gray-900 font-medium">{nextScheduled}</span>
            </div>
            {lastSent && (
              <div className="flex justify-between">
                <span className="text-gray-600">Last sent:</span>
                <span className="text-gray-900 font-medium">{lastSent}</span>
              </div>
            )}
          </div>
        </div>

        {/* Status Message */}
        {message && (
          <div className={`rounded-lg p-4 flex items-start gap-3 ${
            status === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
            {status === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            )}
            <p className={`text-sm ${status === 'success' ? 'text-green-800' : 'text-red-800'}`}>
              {message}
            </p>
          </div>
        )}

        {/* Test Button */}
        <button
          onClick={sendTestEmail}
          disabled={status === 'sending'}
          className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {status === 'sending' ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Sending Email...
            </>
          ) : (
            <>
              <Mail className="w-4 h-4" />
              Send Test Email Now
            </>
          )}
        </button>

        <p className="text-gray-500 text-xs text-center">
          This will send a low-stock report to the configured email address
        </p>
      </div>
    </div>
  );
}