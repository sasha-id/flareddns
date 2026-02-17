import { useState, useEffect, useRef } from 'react';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef(null);

  function fetchDashboard() {
    fetch('/api/dashboard')
      .then(r => {
        if (!r.ok) throw new Error('Failed to fetch dashboard');
        return r.json();
      })
      .then(d => {
        setData(d);
        setError('');
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }

  useEffect(() => {
    fetchDashboard();
    intervalRef.current = setInterval(fetchDashboard, 30000);
    return () => clearInterval(intervalRef.current);
  }, []);

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading dashboard...</div>;
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 mb-4">{error}</p>
        <button onClick={fetchDashboard} className="px-4 py-2 bg-cf-orange text-white rounded-lg hover:bg-cf-orange-dark">
          Retry
        </button>
      </div>
    );
  }

  const { records, stats } = data;

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Dashboard</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Active Hostnames" value={stats.activeHostnames} />
        <StatCard label="Updates Today" value={stats.totalToday} />
        <StatCard label="Successful" value={stats.successfulToday} />
        <StatCard label="Last Update" value={formatTimestamp(stats.lastUpdate)} small />
      </div>

      <h3 className="text-md font-semibold text-gray-700 mb-3">Hostname Records</h3>

      {records.length === 0 ? (
        <p className="text-gray-500 text-sm">No DNS records yet. Records will appear after the first DDNS update.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {records.map(record => (
            <RecordCard key={`${record.name}-${record.type}`} record={record} />
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, small }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`font-bold text-gray-900 ${small ? 'text-sm mt-1' : 'text-2xl mt-1'}`}>
        {value}
      </p>
    </div>
  );
}

function RecordCard({ record }) {
  const proxied = !!record.proxied;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-gray-900 truncate" title={record.name}>
          {record.name}
        </h4>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
          proxied
            ? 'bg-cf-orange text-white'
            : 'bg-gray-100 text-gray-600'
        }`}>
          {proxied ? 'Proxied' : 'DNS only'}
        </span>
      </div>
      <div className="space-y-1 text-sm text-gray-600">
        <p><span className="text-gray-400">IP:</span> {record.content}</p>
        <p><span className="text-gray-400">Type:</span> {record.type}</p>
        <p><span className="text-gray-400">Updated:</span> {formatTimestamp(record.last_updated)}</p>
      </div>
    </div>
  );
}

function formatTimestamp(ts) {
  if (!ts) return 'Never';
  try {
    const date = new Date(ts);
    return date.toLocaleString();
  } catch {
    return ts;
  }
}
