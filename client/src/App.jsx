import { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Domains from './pages/Domains';
import Logs from './pages/Logs';
import Settings from './pages/Settings';
import SetupWizard from './pages/SetupWizard';

export default function App() {
  const [auth, setAuth] = useState({ authenticated: false, setupComplete: false, loading: true });
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/auth/status')
      .then(r => r.json())
      .then(data => setAuth({ ...data, loading: false }))
      .catch(() => setAuth(prev => ({ ...prev, loading: false })));
  }, []);

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        setPassword('');
        setAuth(prev => ({ ...prev, authenticated: true }));
      } else {
        setError('Invalid credentials');
      }
    } catch {
      setError('Connection failed');
    }
  }

  if (auth.loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!auth.authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <h1 className="text-2xl font-bold text-center mb-6">
            <span className="text-cf-orange">Flare</span>DDNS
          </h1>
          {error && <p role="alert" className="text-red-500 text-sm mb-4">{error}</p>}
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="text" placeholder="Username" value={username}
              onChange={e => setUsername(e.target.value)}
              aria-label="Username"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-cf-orange"
            />
            <input
              type="password" placeholder="Password" value={password}
              onChange={e => setPassword(e.target.value)}
              aria-label="Password"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-cf-orange"
            />
            <button type="submit" className="w-full py-2 bg-cf-orange text-white rounded-lg hover:bg-cf-orange-dark">
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!auth.setupComplete) {
    return <SetupWizard onComplete={() => setAuth(prev => ({ ...prev, setupComplete: true }))} />;
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/domains" element={<Domains />} />
        <Route path="/logs" element={<Logs />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}
