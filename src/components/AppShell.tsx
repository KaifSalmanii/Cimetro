import { Outlet, NavLink, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard, Users, ClipboardList, FolderKanban, FlaskConical,
  CheckCircle, MessageSquare, Settings, LogOut, Sparkles, Search,
} from 'lucide-react';

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/agents', label: 'Agents', icon: Users },
  { to: '/orders', label: 'Orders', icon: ClipboardList },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/research', label: 'Research', icon: FlaskConical },
  { to: '/approvals', label: 'Approvals', icon: CheckCircle },
  { to: '/reviews', label: 'Reviews', icon: Sparkles },
  { to: '/messages', label: 'Messages', icon: MessageSquare },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function AppShell() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-400 to-cyan-400 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-400 font-mono text-sm">Booting CIMETRO...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    if (location.pathname !== '/login') navigate('/login', { replace: true });
    return null;
  }

  const handleLogout = async () => {
    const m = await import('../lib/supabase');
    await m.default.auth.signOut();
    navigate('/login');
  };

  const initials = ((user?.email || 'CEO')).slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-[#1f1f2e] flex flex-col py-6 px-4 bg-[#0a0a12]/60 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-3 px-3 mb-8">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-400 to-cyan-400 grid place-items-center font-display font-bold text-black">C</div>
          <div>
            <div className="font-display font-bold text-lg leading-none">CIMETRO</div>
            <div className="text-[10px] text-gray-500 font-mono tracking-widest mt-0.5">AI · AGENT COMPANY</div>
          </div>
        </div>

        <nav className="flex-1 flex flex-col gap-1">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-violet-500/10 to-cyan-500/10 text-white border border-violet-500/20'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`
              }
            >
              <item.icon size={17} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-[#1f1f2e] pt-4 mt-4">
          <Link to="/settings" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 mb-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 grid place-items-center font-bold text-xs text-black">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{user?.user_metadata?.full_name || user?.email}</div>
              <div className="text-[10px] text-gray-500 font-mono">Founder · CEO</div>
            </div>
          </Link>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-red-300 hover:bg-red-500/10 transition-all">
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="border-b border-[#1f1f2e] px-8 py-4 flex items-center justify-between bg-[#0a0a12]/60 backdrop-blur-xl sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <Search size={15} className="text-gray-500" />
            <input
              placeholder="Search agents, orders, projects..."
              className="bg-transparent outline-none text-sm w-80 placeholder:text-gray-600"
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="badge badge-online">
              <span className="pulse-dot green" />
              COMPANY ONLINE
            </div>
            <div className="text-xs font-mono text-gray-500">{new Date().toLocaleDateString()}</div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto px-8 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
