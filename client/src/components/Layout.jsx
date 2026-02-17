import { NavLink, Outlet } from 'react-router-dom';

const navLinks = [
  { to: '/', label: 'Dashboard' },
  { to: '/domains', label: 'Domains' },
  { to: '/logs', label: 'Logs' },
  { to: '/settings', label: 'Settings' },
];

export default function Layout() {
  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.reload();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center space-x-8">
              <span className="text-xl font-bold">
                <span className="text-cf-orange">Flare</span>DDNS
              </span>
              <div className="flex space-x-1">
                {navLinks.map(({ to, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === '/'}
                    className={({ isActive }) =>
                      `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        isActive
                          ? 'text-cf-orange bg-orange-50'
                          : 'text-gray-600 hover:text-cf-orange hover:bg-gray-50'
                      }`
                    }
                  >
                    {label}
                  </NavLink>
                ))}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>
    </div>
  );
}
