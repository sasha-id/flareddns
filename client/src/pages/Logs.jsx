import { useState, useEffect, useCallback, useRef } from 'react';

const BADGE_COLORS = {
  good: 'bg-green-100 text-green-700',
  nochg: 'bg-blue-100 text-blue-700',
  badauth: 'bg-red-100 text-red-700',
  nohost: 'bg-orange-100 text-orange-700',
  abuse: 'bg-red-100 text-red-700',
  notfqdn: 'bg-orange-100 text-orange-700',
  dnserr: 'bg-red-100 text-red-700',
  911: 'bg-red-100 text-red-700',
};

function getBadgeClass(response) {
  if (!response) return 'bg-gray-100 text-gray-700';
  const key = response.split(' ')[0];
  return BADGE_COLORS[key] || 'bg-gray-100 text-gray-700';
}

function formatTime(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleString();
}

export default function Logs() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [hostname, setHostname] = useState('');
  const [response, setResponse] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const limit = 50;
  const intervalRef = useRef(null);

  const fetchLogs = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (hostname.trim()) params.set('hostname', hostname.trim());
    if (response.trim()) params.set('response', response.trim());

    try {
      const res = await fetch(`/api/logs?${params}`);
      if (!res.ok) throw new Error('Failed to fetch logs');
      const data = await res.json();
      setLogs(data.logs || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch {
      // silently fail on refresh
    } finally {
      setLoading(false);
    }
  }, [page, hostname, response]);

  useEffect(() => {
    setLoading(true);
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchLogs, 10000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh, fetchLogs]);

  function handleFilter(e) {
    e.preventDefault();
    setPage(1);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Update Log</h1>
          <p className="text-sm text-gray-500 mt-1">{total} total entries</p>
        </div>
        <button
          onClick={() => setAutoRefresh(prev => !prev)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            autoRefresh
              ? 'bg-green-100 text-green-700 hover:bg-green-200'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
        </button>
      </div>

      <form onSubmit={handleFilter} className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="Filter by hostname..."
          value={hostname}
          onChange={e => setHostname(e.target.value)}
          aria-label="Filter by hostname"
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cf-orange"
        />
        <input
          type="text"
          placeholder="Filter by response..."
          value={response}
          onChange={e => setResponse(e.target.value)}
          aria-label="Filter by response"
          className="w-40 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cf-orange"
        />
        <button type="submit" className="px-4 py-2 bg-cf-orange text-white rounded-lg text-sm hover:bg-cf-orange-dark transition-colors">
          Filter
        </button>
      </form>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Time</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Hostname</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">IP</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Source IP</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">User</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Response</th>
              </tr>
            </thead>
            <tbody>
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500">Loading...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500">No log entries found.</td>
                </tr>
              ) : logs.map((log, i) => (
                <tr key={log.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{formatTime(log.timestamp)}</td>
                  <td className="px-4 py-2.5 font-mono text-gray-900">{log.hostname || '—'}</td>
                  <td className="px-4 py-2.5 font-mono text-gray-700">{log.ip || '—'}</td>
                  <td className="px-4 py-2.5 font-mono text-gray-700">{log.source_ip || '—'}</td>
                  <td className="px-4 py-2.5 text-gray-700">{log.username || '—'}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${getBadgeClass(log.response)}`}>
                      {log.response || '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
