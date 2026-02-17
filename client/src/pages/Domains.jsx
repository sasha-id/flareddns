import { useState, useEffect, useCallback, useRef } from 'react';

export default function Domains() {
  const [records, setRecords] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ zoneId: '', subdomain: '', type: 'A', content: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const zoneInitRef = useRef(false);

  const fetchData = useCallback(async () => {
    try {
      const [recordsRes, zonesRes] = await Promise.all([
        fetch('/api/records'),
        fetch('/api/zones'),
      ]);
      if (!recordsRes.ok || !zonesRes.ok) throw new Error('Failed to load data');
      setRecords(await recordsRes.json());
      const z = await zonesRes.json();
      setZones(z);
      if (!zoneInitRef.current && z.length > 0) {
        zoneInitRef.current = true;
        setForm(prev => ({ ...prev, zoneId: z[0].id }));
      }
    } catch {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleSyncZones() {
    setSyncing(true);
    try {
      const res = await fetch('/api/zones/sync', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to sync zones');
      setZones(await res.json());
    } catch {
      setError('Failed to sync zones');
    } finally {
      setSyncing(false);
    }
  }

  async function handleToggleProxy(record) {
    try {
      const res = await fetch(`/api/records/${record.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proxied: !record.proxied }),
      });
      if (res.ok) fetchData();
    } catch {
      setError('Failed to update proxy status');
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this record?')) return;
    try {
      const res = await fetch(`/api/records/${id}`, { method: 'DELETE' });
      if (res.ok) fetchData();
    } catch {
      setError('Failed to delete record');
    }
  }

  async function handleAdd(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const zone = zones.find(z => z.id === form.zoneId);
    if (!zone) {
      setError('Please select a zone');
      setSubmitting(false);
      return;
    }
    const name = form.subdomain
      ? `${form.subdomain}.${zone.name}`
      : zone.name;

    try {
      const res = await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          zoneId: form.zoneId,
          name,
          type: form.type,
          content: form.content,
          proxied: false,
          ttl: 1,
        }),
      });
      if (res.ok) {
        setForm(prev => ({ ...prev, subdomain: '', content: '' }));
        setShowForm(false);
        fetchData();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to add record');
      }
    } catch {
      setError('Failed to add record');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading records...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Domain Manager</h1>
        <div className="flex space-x-3">
          <button
            onClick={handleSyncZones}
            disabled={syncing}
            className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            {syncing ? 'Syncing...' : 'Sync Zones'}
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 text-sm bg-cf-orange text-white rounded-lg hover:bg-cf-orange-dark"
          >
            {showForm ? 'Cancel' : 'Add Record'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
          <button onClick={() => setError('')} className="ml-2 font-medium underline">Dismiss</button>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleAdd} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Add DNS Record</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Zone</label>
              <select
                value={form.zoneId}
                onChange={e => setForm(prev => ({ ...prev, zoneId: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-cf-orange"
                required
              >
                {zones.map(z => (
                  <option key={z.id} value={z.id}>{z.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subdomain</label>
              <input
                type="text"
                value={form.subdomain}
                onChange={e => setForm(prev => ({ ...prev, subdomain: e.target.value }))}
                placeholder="e.g. home"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-cf-orange"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={form.type}
                onChange={e => setForm(prev => ({ ...prev, type: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-cf-orange"
              >
                <option value="A">A (IPv4)</option>
                <option value="AAAA">AAAA (IPv6)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">IP Address</label>
              <input
                type="text"
                value={form.content}
                onChange={e => setForm(prev => ({ ...prev, content: e.target.value }))}
                placeholder={form.type === 'A' ? '1.2.3.4' : '2001:db8::1'}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-cf-orange"
                required
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 text-sm bg-cf-orange text-white rounded-lg hover:bg-cf-orange-dark disabled:opacity-50"
          >
            {submitting ? 'Adding...' : 'Add Record'}
          </button>
        </form>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {records.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No DNS records managed yet. Add a record or use the dyndns2 update endpoint.
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hostname</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP Address</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Proxy</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Zone</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {records.map(record => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{record.name}</td>
                  <td className="px-4 py-3">
                    <span className="inline-block px-2 py-0.5 text-xs font-mono bg-gray-100 rounded">
                      {record.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-gray-700">{record.content}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleToggleProxy(record)}
                      title={record.proxied ? 'Proxied (click to disable)' : 'DNS only (click to proxy)'}
                      className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium transition-colors ${
                        record.proxied
                          ? 'bg-cf-orange text-white hover:bg-cf-orange-dark'
                          : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                      }`}
                    >
                      {record.proxied ? 'Proxied' : 'DNS Only'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{record.zone_name}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(record.id)}
                      className="text-sm text-red-600 hover:text-red-800 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
