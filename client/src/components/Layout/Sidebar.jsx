import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Megaphone,
  Palette,
  Zap,
  Search,
  Globe,
  BarChart3,
  Settings,
  LogOut,
  Bell,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import useAuthStore from '../../store/authStore';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/campaigns', label: 'Campaigns', icon: Megaphone },
  { path: '/creatives', label: 'Creative Studio', icon: Palette },
  { path: '/automation', label: 'Automation', icon: Zap },
  { path: '/competitors', label: 'Competitors', icon: Search },
  { path: '/landing-pages', label: 'Landing Pages', icon: Globe },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }) {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [unreadCount, setUnreadCount] = useState(3);

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-dark-700/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center shadow-lg shadow-brand-500/25 flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          {!collapsed && (
            <span className="text-lg font-bold gradient-text whitespace-nowrap">BreedAds</span>
          )}
        </div>
        {/* Mobile close */}
        <button
          onClick={onMobileClose}
          className="lg:hidden p-1.5 rounded-lg text-dark-400 hover:text-white hover:bg-dark-700/50 transition-colors"
        >
          <X size={18} />
        </button>
        {/* Desktop collapse */}
        <button
          onClick={onToggle}
          className="hidden lg:flex p-1.5 rounded-lg text-dark-400 hover:text-white hover:bg-dark-700/50 transition-colors"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onMobileClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative ${
                active
                  ? 'bg-gradient-to-r from-brand-600/20 to-purple-600/20 text-white border border-brand-500/20'
                  : 'text-dark-400 hover:text-white hover:bg-dark-700/50'
              }`}
              title={collapsed ? item.label : undefined}
            >
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-brand-400 to-purple-400 rounded-r-full" />
              )}
              <Icon
                size={20}
                className={`flex-shrink-0 ${
                  active ? 'text-brand-400' : 'text-dark-400 group-hover:text-white'
                }`}
              />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Notification bell */}
      <div className="px-3 py-2 border-t border-dark-700/50">
        <button
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-dark-400 hover:text-white hover:bg-dark-700/50 transition-all duration-200 w-full relative"
          title={collapsed ? 'Notifications' : undefined}
        >
          <div className="relative flex-shrink-0">
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-danger-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </div>
          {!collapsed && <span>Notifications</span>}
        </button>
      </div>

      {/* User section */}
      <div className="px-3 py-4 border-t border-dark-700/50">
        <div className="flex items-center gap-3 px-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.name || 'User'}
              </p>
              <p className="text-xs text-dark-400 truncate">
                {user?.email || 'user@example.com'}
              </p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-dark-400 hover:text-danger-400 hover:bg-danger-500/10 transition-all duration-200"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
        {collapsed && (
          <button
            onClick={handleLogout}
            className="flex items-center justify-center w-full mt-2 p-2 rounded-lg text-dark-400 hover:text-danger-400 hover:bg-danger-500/10 transition-all duration-200"
            title="Logout"
          >
            <LogOut size={16} />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-dark-900 border-r border-dark-700/50 transform transition-transform duration-300 ease-in-out lg:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 bg-dark-900 border-r border-dark-700/50 transition-all duration-300 ease-in-out ${
          collapsed ? 'lg:w-[72px]' : 'lg:w-64'
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
