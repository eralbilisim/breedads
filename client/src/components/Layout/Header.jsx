import React, { useState, useRef, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  Search,
  Bell,
  Menu,
  ChevronRight,
  Check,
  Trash2,
  User,
  Settings,
  LogOut,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../../store/authStore';

export default function Header({ onMenuClick }) {
  const { t, i18n } = useTranslation();
  const location = useLocation();

  const routeLabels = {
    '/': t('nav.dashboard'),
    '/campaigns': t('nav.campaigns'),
    '/campaigns/new': t('campaigns.newCampaign'),
    '/creatives': t('nav.creativeStudio'),
    '/automation': t('nav.automation'),
    '/competitors': t('nav.competitors'),
    '/landing-pages': t('nav.landingPages'),
    '/analytics': t('nav.analytics'),
    '/settings': t('nav.settings'),
  };

  function getBreadcrumbs(pathname) {
    const parts = pathname.split('/').filter(Boolean);
    const crumbs = [{ label: t('common.home'), path: '/' }];

    let currentPath = '';
    for (const part of parts) {
      currentPath += `/${part}`;
      const label = routeLabels[currentPath] || part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, ' ');
      crumbs.push({ label, path: currentPath });
    }
    return crumbs;
  }
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const notifRef = useRef(null);
  const userRef = useRef(null);

  const breadcrumbs = getBreadcrumbs(location.pathname);

  const [notifications, setNotifications] = useState([
    { id: 1, title: 'Campaign "Summer Sale" published', time: '5 min ago', read: false, type: 'success' },
    { id: 2, title: 'Budget alert: Campaign nearing limit', time: '1 hour ago', read: false, type: 'warning' },
    { id: 3, title: 'New competitor activity detected', time: '3 hours ago', read: false, type: 'info' },
  ]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
  };

  const deleteNotification = (id) => {
    setNotifications(notifications.filter((n) => n.id !== id));
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
      if (userRef.current && !userRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <header className="sticky top-0 z-20 bg-dark-950/80 backdrop-blur-xl border-b border-dark-700/50">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        {/* Left: Hamburger + Breadcrumbs */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-700/50 transition-colors"
          >
            <Menu size={20} />
          </button>
          <nav className="hidden sm:flex items-center gap-1 text-sm">
            {breadcrumbs.map((crumb, i) => (
              <React.Fragment key={crumb.path}>
                {i > 0 && <ChevronRight size={14} className="text-dark-500 mx-1" />}
                {i === breadcrumbs.length - 1 ? (
                  <span className="text-white font-medium">{crumb.label}</span>
                ) : (
                  <Link
                    to={crumb.path}
                    className="text-dark-400 hover:text-white transition-colors"
                  >
                    {crumb.label}
                  </Link>
                )}
              </React.Fragment>
            ))}
          </nav>
        </div>

        {/* Right: Search + Notifications + User */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="hidden md:flex items-center relative">
            <Search size={16} className="absolute left-3 text-dark-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('header.searchPlaceholder')}
              className="bg-dark-800/50 border border-dark-700/50 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all duration-200 w-64 focus:w-80"
            />
          </div>

          {/* Language Toggle */}
          <button
            onClick={() => {
              const newLang = i18n.language === 'tr' ? 'en' : 'tr';
              i18n.changeLanguage(newLang);
            }}
            className="p-2 rounded-xl text-dark-400 hover:text-white hover:bg-dark-700/50 transition-colors text-sm font-medium"
            title={t('settings.language')}
          >
            {i18n.language === 'tr' ? 'TR' : 'EN'}
          </button>

          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowUserMenu(false);
              }}
              className="relative p-2 rounded-xl text-dark-400 hover:text-white hover:bg-dark-700/50 transition-colors"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-danger-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-dark-800 border border-dark-700 rounded-xl shadow-2xl shadow-black/40 animate-slideDown overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-dark-700">
                  <h3 className="text-sm font-semibold text-white">{t('common.notifications')}</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-xs text-brand-400 hover:text-brand-300 transition-colors flex items-center gap-1"
                    >
                      <Check size={12} /> {t('common.markAllRead')}
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-dark-400 text-sm">
                      {t('common.noNotifications')}
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={`flex items-start gap-3 px-4 py-3 hover:bg-dark-700/50 transition-colors border-b border-dark-700/50 last:border-0 ${
                          !notif.read ? 'bg-dark-700/20' : ''
                        }`}
                      >
                        <div
                          className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                            notif.type === 'success'
                              ? 'bg-accent-400'
                              : notif.type === 'warning'
                              ? 'bg-warning-400'
                              : 'bg-brand-400'
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white leading-snug">{notif.title}</p>
                          <p className="text-xs text-dark-400 mt-0.5">{notif.time}</p>
                        </div>
                        <button
                          onClick={() => deleteNotification(notif.id)}
                          className="p-1 rounded text-dark-500 hover:text-danger-400 transition-colors flex-shrink-0"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Menu */}
          <div className="relative" ref={userRef}>
            <button
              onClick={() => {
                setShowUserMenu(!showUserMenu);
                setShowNotifications(false);
              }}
              className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-dark-700/50 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <span className="hidden md:block text-sm text-dark-300 max-w-[100px] truncate">
                {user?.name || 'User'}
              </span>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-dark-800 border border-dark-700 rounded-xl shadow-2xl shadow-black/40 animate-slideDown overflow-hidden">
                <div className="px-4 py-3 border-b border-dark-700">
                  <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                  <p className="text-xs text-dark-400 truncate">{user?.email}</p>
                </div>
                <div className="py-1">
                  <Link
                    to="/settings"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-dark-300 hover:text-white hover:bg-dark-700/50 transition-colors"
                  >
                    <User size={16} />
                    {t('common.profile')}
                  </Link>
                  <Link
                    to="/settings"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-dark-300 hover:text-white hover:bg-dark-700/50 transition-colors"
                  >
                    <Settings size={16} />
                    {t('common.settings')}
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-danger-400 hover:bg-danger-500/10 transition-colors w-full"
                  >
                    <LogOut size={16} />
                    {t('common.signOut')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
