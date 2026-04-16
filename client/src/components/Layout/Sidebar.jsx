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
  Users,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../../store/authStore';

function MetaBrandIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className="flex-shrink-0">
      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z" />
    </svg>
  );
}

function GoogleBrandIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="currentColor" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="currentColor" opacity="0.7" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="currentColor" opacity="0.5" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="currentColor" opacity="0.85" />
    </svg>
  );
}

const navSections = [
  {
    sectionKey: 'nav.sectionGeneral',
    items: [
      { path: '/', labelKey: 'nav.dashboard', icon: LayoutDashboard, exact: true },
      { path: '/campaigns', labelKey: 'nav.campaigns', icon: Megaphone, exact: true },
      { path: '/analytics', labelKey: 'nav.analytics', icon: BarChart3 },
    ],
  },
  {
    sectionKey: 'nav.sectionMeta',
    accent: 'meta',
    items: [
      { path: '/campaigns?platform=meta', labelKey: 'nav.metaCampaigns', icon: Megaphone, match: '/campaigns', matchQuery: { platform: 'meta' } },
      { path: '/meta/audiences', labelKey: 'nav.metaAudiences', icon: Users },
    ],
  },
  {
    sectionKey: 'nav.sectionGoogle',
    accent: 'google',
    items: [
      { path: '/campaigns?platform=google', labelKey: 'nav.googleCampaigns', icon: Megaphone, match: '/campaigns', matchQuery: { platform: 'google' } },
    ],
  },
  {
    sectionKey: 'nav.sectionTools',
    items: [
      { path: '/creatives', labelKey: 'nav.creativeStudio', icon: Palette },
      { path: '/automation', labelKey: 'nav.automation', icon: Zap },
      { path: '/competitors', labelKey: 'nav.competitors', icon: Search },
      { path: '/landing-pages', labelKey: 'nav.landingPages', icon: Globe },
      { path: '/settings', labelKey: 'nav.settings', icon: Settings },
    ],
  },
];

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }) {
  const { t } = useTranslation();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [unreadCount, setUnreadCount] = useState(3);

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  const currentQuery = new URLSearchParams(location.search);

  const isItemActive = (item) => {
    const matchPath = item.match || item.path.split('?')[0];

    if (item.exact || matchPath === '/') {
      if (location.pathname !== matchPath) return false;
      if (item.matchQuery) return false;
      // Plain /campaigns is active only when no platform query matches a branded section
      const platform = currentQuery.get('platform');
      if (matchPath === '/campaigns' && platform && (platform === 'meta' || platform === 'google')) return false;
      return true;
    }

    if (!location.pathname.startsWith(matchPath)) return false;

    if (item.matchQuery) {
      return Object.entries(item.matchQuery).every(([k, v]) => currentQuery.get(k) === v);
    }

    return true;
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
      <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
        {navSections.map((section) => {
          const accent = section.accent;
          const sectionIcon =
            accent === 'meta' ? <MetaBrandIcon size={12} /> : accent === 'google' ? <GoogleBrandIcon size={12} /> : null;
          const accentClass =
            accent === 'meta'
              ? 'text-[#1877F2]'
              : accent === 'google'
              ? 'text-amber-400'
              : 'text-dark-500';

          return (
            <div key={section.sectionKey} className="space-y-1">
              {!collapsed && (
                <div className={`flex items-center gap-1.5 px-3 pt-1 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${accentClass}`}>
                  {sectionIcon}
                  <span>{t(section.sectionKey)}</span>
                </div>
              )}
              {collapsed && accent && (
                <div className={`flex justify-center py-1 ${accentClass}`}>
                  {sectionIcon}
                </div>
              )}
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isItemActive(item);
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
                    title={collapsed ? t(item.labelKey) : undefined}
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
                    {!collapsed && <span>{t(item.labelKey)}</span>}
                  </NavLink>
                );
              })}
            </div>
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
          {!collapsed && <span>{t('common.notifications')}</span>}
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
