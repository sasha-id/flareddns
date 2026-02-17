import { useState, useEffect } from 'react';

export default function Settings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [newToken, setNewToken] = useState('');
  const [tokenStatus, setTokenStatus] = useState('');
  const [tokenSaving, setTokenSaving] = useState(false);

  const [rateLimitWindow, setRateLimitWindow] = useState('');
  const [rateLimitMax, setRateLimitMax] = useState('');
  const [rateStatus, setRateStatus] = useState('');
  const [rateSaving, setRateSaving] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then(r => {
        if (!r.ok) throw new Error('Failed to load settings');
        return r.json();
      })
      .then(data => {
        setSettings(data);
        setRateLimitWindow(String(data.rateLimitWindow));
        setRateLimitMax(String(data.rateLimitMax));
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  async function handleTokenSave(e) {
    e.preventDefault();
    if (!newToken.trim()) return;
    setTokenSaving(true);
    setTokenStatus('');
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cfApiToken: newToken.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update token');
      }
      setTokenStatus('Token updated successfully');
      setNewToken('');
      setSettings(prev => ({ ...prev, hasToken: true, cfApiToken: '********' }));
    } catch (err) {
      setTokenStatus(err.message);
    } finally {
      setTokenSaving(false);
    }
  }

  async function handleRateSave(e) {
    e.preventDefault();
    setRateSaving(true);
    setRateStatus('');
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rateLimitWindow: parseInt(rateLimitWindow, 10),
          rateLimitMax: parseInt(rateLimitMax, 10),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update rate limits');
      }
      setRateStatus('Rate limits updated successfully');
    } catch (err) {
      setRateStatus(err.message);
    } finally {
      setRateSaving(false);
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading settings...</div>;
  }

  if (error) {
    return <div className="text-center py-12 text-red-500">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">Settings</h2>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-md font-semibold text-gray-700 mb-4">Cloudflare API Token</h3>
        <p className="text-sm text-gray-500 mb-3">
          Status: {settings.hasToken ? (
            <span className="text-green-600 font-medium">Configured ({settings.cfApiToken})</span>
          ) : (
            <span className="text-red-500 font-medium">Not configured</span>
          )}
        </p>
        <form onSubmit={handleTokenSave} className="flex items-end gap-3">
          <div className="flex-1">
            <label htmlFor="cf-token" className="block text-sm text-gray-600 mb-1">New Token</label>
            <input
              id="cf-token"
              type="password"
              value={newToken}
              onChange={e => setNewToken(e.target.value)}
              placeholder="Enter new Cloudflare API token"
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cf-orange"
            />
          </div>
          <button
            type="submit"
            disabled={tokenSaving || !newToken.trim()}
            className="px-4 py-2 bg-cf-orange text-white text-sm rounded-lg hover:bg-cf-orange-dark disabled:opacity-50"
          >
            {tokenSaving ? 'Validating...' : 'Validate & Save'}
          </button>
        </form>
        {tokenStatus && (
          <p className={`text-sm mt-2 ${tokenStatus.includes('success') ? 'text-green-600' : 'text-red-500'}`}>
            {tokenStatus}
          </p>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-md font-semibold text-gray-700 mb-4">Rate Limit Configuration</h3>
        <form onSubmit={handleRateSave} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="rate-window" className="block text-sm text-gray-600 mb-1">Window (ms)</label>
              <input
                id="rate-window"
                type="number"
                min="1000"
                value={rateLimitWindow}
                onChange={e => setRateLimitWindow(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cf-orange"
              />
            </div>
            <div>
              <label htmlFor="rate-max" className="block text-sm text-gray-600 mb-1">Max Requests</label>
              <input
                id="rate-max"
                type="number"
                min="1"
                value={rateLimitMax}
                onChange={e => setRateLimitMax(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cf-orange"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={rateSaving}
            className="px-4 py-2 bg-cf-orange text-white text-sm rounded-lg hover:bg-cf-orange-dark disabled:opacity-50"
          >
            {rateSaving ? 'Saving...' : 'Save Rate Limits'}
          </button>
        </form>
        {rateStatus && (
          <p className={`text-sm mt-2 ${rateStatus.includes('success') ? 'text-green-600' : 'text-red-500'}`}>
            {rateStatus}
          </p>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-md font-semibold text-gray-700 mb-4">DDNS Users</h3>
        {settings.ddnsUsers.length === 0 ? (
          <p className="text-sm text-gray-500">No DDNS users configured.</p>
        ) : (
          <ul className="space-y-1 mb-3">
            {settings.ddnsUsers.map(u => (
              <li key={u.username} className="text-sm text-gray-700 flex items-center gap-2">
                <span className="w-2 h-2 bg-green-400 rounded-full" />
                {u.username}
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-gray-400">
          DDNS users are configured via the <code className="bg-gray-100 px-1 rounded">DDNS_USERS</code> environment variable.
        </p>
      </div>
    </div>
  );
}
