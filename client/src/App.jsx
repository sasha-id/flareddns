import { useState, useEffect } from 'react';

export default function App() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  async function checkStatus() {
    try {
      const res = await fetch('/api/auth/status');
      const data = await res.json();
      setStatus(data);
    } catch {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    checkStatus();
  }, []);

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setLoggingIn(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        await checkStatus();
      } else {
        setError('Invalid credentials');
      }
    } catch {
      setError('Login failed');
    } finally {
      setLoggingIn(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!status?.authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Flare<span className="text-cf-orange">DDNS</span>
            </h1>
            <p className="text-gray-500 mt-2">Sign in to continue</p>
          </div>
          <form onSubmit={handleLogin} className="bg-white shadow rounded-lg p-6 space-y-4">
            {error && (
              <div className="bg-red-50 text-red-700 px-4 py-2 rounded text-sm">{error}</div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cf-orange focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cf-orange focus:border-transparent"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loggingIn}
              className="w-full bg-cf-orange hover:bg-cf-orange-dark text-white font-medium py-2 px-4 rounded-md transition-colors disabled:opacity-50"
            >
              {loggingIn ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Flare<span className="text-cf-orange">DDNS</span>
        </h1>
        <p className="text-gray-500">
          {status.setupComplete ? 'Dashboard coming soon' : 'Setup required'}
        </p>
      </div>
    </div>
  );
}
