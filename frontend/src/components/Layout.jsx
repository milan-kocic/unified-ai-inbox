import React from 'react';
import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Inbox, Users, Settings, LogOut, Sun, Moon } from 'lucide-react';

function Sidebar() {
  const { logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const nav = [
    { path: '/', label: 'Inbox', icon: Inbox },
    { path: '/contacts', label: 'Kontakti', icon: Users },
    { path: '/settings', label: 'Podešavanja', icon: Settings },
  ];
  return (
    <aside className="hidden md:flex flex-col w-64 bg-card border-r border-border h-screen sticky top-0">
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold text-sm text-white">AI</div>
        <span className="font-bold text-lg text-text-primary">Unified Inbox</span>
      </div>
      <nav className="flex-1 px-3 space-y-1">
        {nav.map(n => {
          const active = location.pathname === n.path;
          const Icon = n.icon;
          return (
            <Link key={n.path} to={n.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-btn transition-colors ${active ? 'bg-blue-600/20 text-blue-500' : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'}`}>
              <Icon size={18} />
              <span className="font-medium">{n.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-border space-y-2">
        <button onClick={toggleTheme}
          className="flex items-center gap-3 px-4 py-2 text-text-secondary hover:text-text-primary w-full rounded-btn hover:bg-surface-hover transition-colors">
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          <span>{theme === 'dark' ? 'Svetla tema' : 'Tamna tema'}</span>
        </button>
        <button onClick={logout} className="flex items-center gap-3 px-4 py-2 text-text-secondary hover:text-text-primary w-full rounded-btn hover:bg-surface-hover transition-colors">
          <LogOut size={18} />
          <span>Odjavi se</span>
        </button>
      </div>
    </aside>
  );
}

function MobileNav() {
  const { logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const items = [
    { path: '/', icon: Inbox, label: 'Inbox' },
    { path: '/contacts', icon: Users, label: 'Kontakti' },
    { path: '/settings', icon: Settings, label: 'Podešavanja' },
  ];
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 flex justify-around py-2">
      {items.map(item => {
        const Icon = item.icon;
        return (
          <button key={item.path} onClick={() => navigate(item.path)}
            className={`flex flex-col items-center gap-1 p-2 min-w-[44px] ${location.pathname === item.path ? 'text-blue-500' : 'text-text-secondary'}`}>
            <Icon size={20} />
            <span className="text-[10px]">{item.label}</span>
          </button>
        );
      })}
      <button onClick={toggleTheme}
        className="flex flex-col items-center gap-1 p-2 min-w-[44px] text-text-secondary">
        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        <span className="text-[10px]">Tema</span>
      </button>
    </nav>
  );
}

export default function Layout() {
  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar />
      <main className="flex-1 min-h-screen pb-20 md:pb-0">
        <Outlet />
      </main>
      <MobileNav />
    </div>
  );
}
