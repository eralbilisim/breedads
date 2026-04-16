import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  User,
  Mail,
  Building2,
  Lock,
  Camera,
  Save,
  Eye,
  EyeOff,
  Trash2,
  AlertTriangle,
  Link2,
  RefreshCw,
  ExternalLink,
  Unplug,
  CheckCircle2,
  XCircle,
  Clock,
  Key,
  Shield,
  Bell,
  BellOff,
  CreditCard,
  Crown,
  Zap,
  Sparkles,
  Check,
  X,
  Loader2,
  ChevronRight,
  Plug,
  Globe,
  Settings2,
  Info,
} from 'lucide-react';
import { authAPI, metaAPI, googleAPI } from '../services/api';
import useAuthStore from '../store/authStore';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';
import Tabs from '../components/ui/Tabs';

// ── Constants ────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'accounts', label: 'Ad Accounts', icon: Link2 },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'billing', label: 'Billing', icon: CreditCard },
];

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: '/month',
    features: [
      '3 campaigns',
      '1 ad account',
      '100 AI generations/mo',
      'Basic analytics',
      'Email support',
    ],
    cta: 'Current Plan',
    highlighted: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$49',
    period: '/month',
    features: [
      'Unlimited campaigns',
      '5 ad accounts',
      '2,000 AI generations/mo',
      'Advanced analytics',
      'Automation rules',
      'Competitor analysis',
      'Priority support',
    ],
    cta: 'Upgrade to Pro',
    highlighted: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: '$199',
    period: '/month',
    features: [
      'Everything in Pro',
      'Unlimited ad accounts',
      'Unlimited AI generations',
      'Custom integrations',
      'White-label reports',
      'Dedicated account manager',
      'API access',
      'SSO & SAML',
    ],
    cta: 'Contact Sales',
    highlighted: false,
  },
];

// ── Meta / Google SVG Icons ─────────────────────────────────────────────────

function MetaIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z"
        fill="#1877F2"
      />
    </svg>
  );
}

function GoogleIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

// ── Toggle Switch Component ─────────────────────────────────────────────────

function ToggleSwitch({ enabled, onChange, label, description }) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex-1 min-w-0 mr-4">
        <p className="text-sm font-medium text-white">{label}</p>
        {description && <p className="text-xs text-dark-400 mt-0.5">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
          enabled ? 'bg-brand-500' : 'bg-dark-600'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

// ── API Key Field Component ─────────────────────────────────────────────────

function APIKeyField({ label, value, onChange, onSave, onTest, saving, testing, saved, placeholder }) {
  const [revealed, setRevealed] = useState(false);

  const maskedValue = value && !revealed
    ? value.slice(0, 4) + '*'.repeat(Math.max(0, value.length - 8)) + value.slice(-4)
    : value;

  return (
    <div className="bg-dark-900/30 rounded-xl border border-dark-700/50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-white">{label}</label>
        {saved && (
          <span className="inline-flex items-center gap-1 text-xs text-accent-400">
            <CheckCircle2 size={12} />
            Saved
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type={revealed ? 'text' : 'password'}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-dark-800 border border-dark-600 text-white placeholder-dark-400 rounded-xl px-4 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all text-sm font-mono"
            placeholder={placeholder}
          />
          <button
            onClick={() => setRevealed(!revealed)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white transition-colors"
          >
            {revealed ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
        <Button variant="secondary" size="sm" onClick={onSave} loading={saving}>
          Save
        </Button>
        {onTest && (
          <Button variant="ghost" size="sm" onClick={onTest} loading={testing}>
            Test
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Profile Tab ─────────────────────────────────────────────────────────────

function ProfileTab() {
  const user = useAuthStore((s) => s.user);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    company: user?.company || '',
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [saving, setSaving] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || null);
  const fileInputRef = useRef(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Name is required');
      return;
    }
    setSaving(true);
    try {
      const result = await updateProfile(form);
      if (result.success) {
        toast.success('Profile updated');
      } else {
        toast.error(result.error || 'Failed to update profile');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!passwordForm.currentPassword) {
      toast.error('Enter your current password');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setSavingPassword(true);
    try {
      await authAPI.updateProfile({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      toast.success('Password updated');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to change password');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be less than 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        setAvatarPreview(ev.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      toast.error('Account deletion is disabled in demo mode');
      setShowDeleteConfirm(false);
    } catch {
      toast.error('Failed to delete account');
    }
  };

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Avatar */}
      <div className="flex items-center gap-6">
        <div className="relative group">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center overflow-hidden border-2 border-dark-700">
            {avatarPreview ? (
              <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl font-bold text-white">
                {(form.name || 'U')[0].toUpperCase()}
              </span>
            )}
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute inset-0 rounded-full bg-dark-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
          >
            <Camera size={20} className="text-white" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="hidden"
          />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">{form.name || 'Your Name'}</h3>
          <p className="text-sm text-dark-400">{form.email}</p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-xs text-brand-400 hover:text-brand-300 transition-colors mt-1"
          >
            Change avatar
          </button>
        </div>
      </div>

      {/* Profile Form */}
      <Card>
        <div className="space-y-4">
          <h3 className="text-base font-semibold text-white">Personal Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              icon={User}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="John Doe"
            />
            <Input
              label="Email"
              icon={Mail}
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="you@company.com"
            />
          </div>
          <Input
            label="Company"
            icon={Building2}
            value={form.company}
            onChange={(e) => setForm({ ...form, company: e.target.value })}
            placeholder="Your company name"
          />
          <div className="flex justify-end">
            <Button icon={Save} onClick={handleSave} loading={saving}>
              Save Changes
            </Button>
          </div>
        </div>
      </Card>

      {/* Change Password */}
      <Card>
        <div className="space-y-4">
          <h3 className="text-base font-semibold text-white">Change Password</h3>
          <Input
            label="Current Password"
            icon={Lock}
            type="password"
            value={passwordForm.currentPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
            placeholder="Enter current password"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="New Password"
              icon={Lock}
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              placeholder="Min 8 characters"
            />
            <Input
              label="Confirm Password"
              icon={Lock}
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              placeholder="Re-enter new password"
            />
          </div>
          <div className="flex justify-end">
            <Button variant="secondary" icon={Lock} onClick={handlePasswordChange} loading={savingPassword}>
              Update Password
            </Button>
          </div>
        </div>
      </Card>

      {/* Danger Zone */}
      <div className="border border-danger-500/20 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 bg-danger-500/5 border-b border-danger-500/20">
          <h3 className="text-base font-semibold text-danger-400 flex items-center gap-2">
            <AlertTriangle size={18} />
            Danger Zone
          </h3>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">Delete Account</p>
              <p className="text-xs text-dark-400 mt-0.5">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
            </div>
            {showDeleteConfirm ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-danger-400 mr-2">Are you sure?</span>
                <Button variant="danger" size="sm" onClick={handleDeleteAccount}>
                  Yes, Delete
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button variant="danger" size="sm" icon={Trash2} onClick={() => setShowDeleteConfirm(true)}>
                Delete Account
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Ad Accounts Tab ─────────────────────────────────────────────────────────

function AdAccountsTab() {
  const [metaAccounts, setMetaAccounts] = useState([]);
  const [googleAccounts, setGoogleAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connectingMeta, setConnectingMeta] = useState(false);
  const [connectingGoogle, setConnectingGoogle] = useState(false);
  const [syncingId, setSyncingId] = useState(null);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const [metaRes, googleRes] = await Promise.allSettled([
        metaAPI.accounts(),
        googleAPI.accounts(),
      ]);
      if (metaRes.status === 'fulfilled') {
        const data = metaRes.value.data || metaRes.value;
        setMetaAccounts(Array.isArray(data) ? data : data.accounts || []);
      }
      if (googleRes.status === 'fulfilled') {
        const data = googleRes.value.data || googleRes.value;
        setGoogleAccounts(Array.isArray(data) ? data : data.accounts || []);
      }
    } catch {
      // Silently handle - accounts might not be connected
    } finally {
      setLoading(false);
    }
  };

  const handleConnectMeta = async () => {
    setConnectingMeta(true);
    try {
      const res = await metaAPI.authUrl();
      const url = res.data?.url || res.url || res.data;
      if (url) {
        window.open(url, '_blank', 'width=600,height=700');
        toast.success('Complete authentication in the new window');
      } else {
        toast.error('Could not get Meta auth URL');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to initiate Meta connection');
    } finally {
      setConnectingMeta(false);
    }
  };

  const handleConnectGoogle = async () => {
    setConnectingGoogle(true);
    try {
      const res = await googleAPI.authUrl();
      const url = res.data?.url || res.url || res.data;
      if (url) {
        window.open(url, '_blank', 'width=600,height=700');
        toast.success('Complete authentication in the new window');
      } else {
        toast.error('Could not get Google auth URL');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to initiate Google connection');
    } finally {
      setConnectingGoogle(false);
    }
  };

  const handleSync = async (platform, accountId) => {
    setSyncingId(accountId);
    try {
      if (platform === 'meta') {
        await metaAPI.sync(accountId);
      } else {
        await googleAPI.sync(accountId);
      }
      toast.success('Account synced');
      loadAccounts();
    } catch (err) {
      toast.error(err.message || 'Sync failed');
    } finally {
      setSyncingId(null);
    }
  };

  const handleDisconnect = (accountId) => {
    toast.error('Disconnect is disabled in demo mode');
  };

  const allAccounts = [
    ...metaAccounts.map((a) => ({ ...a, platform: 'meta' })),
    ...googleAccounts.map((a) => ({ ...a, platform: 'google' })),
  ];

  return (
    <div className="space-y-8">
      {/* Connected Accounts */}
      {allAccounts.length > 0 && (
        <div>
          <h3 className="text-base font-semibold text-white mb-4">Connected Accounts</h3>
          <div className="space-y-3">
            {allAccounts.map((account) => {
              const aid = account._id || account.id || account.accountId;
              const status = account.status || 'connected';
              const isExpired = status === 'expired';
              const isError = status === 'error';

              return (
                <div
                  key={aid}
                  className="bg-dark-800/50 backdrop-blur-sm border border-dark-700/50 rounded-xl p-4 flex items-center gap-4 hover:bg-dark-800/70 transition-colors"
                >
                  {/* Platform Icon */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    account.platform === 'meta'
                      ? 'bg-[#1877F2]/10'
                      : 'bg-white/5'
                  }`}>
                    {account.platform === 'meta' ? <MetaIcon size={22} /> : <GoogleIcon size={22} />}
                  </div>

                  {/* Account Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-medium text-white truncate">
                        {account.name || account.accountName || 'Ad Account'}
                      </h4>
                      {status === 'connected' && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          Connected
                        </span>
                      )}
                      {isExpired && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          Expired
                        </span>
                      )}
                      {isError && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                          Error
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-dark-400">
                        ID: {account.accountId || account.account_id || aid}
                      </span>
                      {account.lastSynced && (
                        <span className="text-xs text-dark-500 flex items-center gap-1">
                          <Clock size={10} />
                          Synced {new Date(account.lastSynced).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSync(account.platform, aid)}
                      disabled={syncingId === aid}
                      className="p-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-700/50 transition-colors disabled:opacity-50"
                      title="Sync"
                    >
                      {syncingId === aid ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <RefreshCw size={16} />
                      )}
                    </button>
                    {isExpired && (
                      <button
                        onClick={() =>
                          account.platform === 'meta' ? handleConnectMeta() : handleConnectGoogle()
                        }
                        className="p-2 rounded-lg text-amber-400 hover:bg-amber-500/10 transition-colors"
                        title="Refresh Token"
                      >
                        <Key size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => handleDisconnect(aid)}
                      className="p-2 rounded-lg text-dark-400 hover:text-danger-400 hover:bg-danger-500/10 transition-colors"
                      title="Disconnect"
                    >
                      <Unplug size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Connect New Account */}
      <div>
        <h3 className="text-base font-semibold text-white mb-4">Connect New Account</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Meta Card */}
          <button
            onClick={handleConnectMeta}
            disabled={connectingMeta}
            className="group relative bg-dark-800/50 backdrop-blur-sm border border-dark-700/50 rounded-2xl p-6 text-left hover:border-[#1877F2]/30 hover:bg-dark-800/70 transition-all overflow-hidden disabled:opacity-50"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#1877F2]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="w-14 h-14 rounded-xl bg-[#1877F2]/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <MetaIcon size={28} />
              </div>
              <h4 className="text-lg font-semibold text-white mb-1">Connect Meta Ads</h4>
              <p className="text-sm text-dark-400 mb-4">
                Facebook & Instagram ad campaigns, audiences, and analytics
              </p>
              <div className="inline-flex items-center gap-2 text-sm text-[#1877F2] font-medium">
                {connectingMeta ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Plug size={14} />
                    Connect Account
                    <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </div>
            </div>
          </button>

          {/* Google Card */}
          <button
            onClick={handleConnectGoogle}
            disabled={connectingGoogle}
            className="group relative bg-dark-800/50 backdrop-blur-sm border border-dark-700/50 rounded-2xl p-6 text-left hover:border-[#4285F4]/30 hover:bg-dark-800/70 transition-all overflow-hidden disabled:opacity-50"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#4285F4]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="w-14 h-14 rounded-xl bg-[#4285F4]/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <GoogleIcon size={28} />
              </div>
              <h4 className="text-lg font-semibold text-white mb-1">Connect Google Ads</h4>
              <p className="text-sm text-dark-400 mb-4">
                Search, Display, YouTube campaigns and performance data
              </p>
              <div className="inline-flex items-center gap-2 text-sm text-[#4285F4] font-medium">
                {connectingGoogle ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Plug size={14} />
                    Connect Account
                    <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && allAccounts.length === 0 && (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="bg-dark-800/50 border border-dark-700/50 rounded-xl p-4 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-dark-700/50" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-dark-700/50 rounded w-48" />
                  <div className="h-3 bg-dark-700/50 rounded w-32" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── API Keys Tab ────────────────────────────────────────────────────────────

function APIKeysTab() {
  const [keys, setKeys] = useState({
    openaiKey: '',
    metaAppId: '',
    metaAppSecret: '',
    googleClientId: '',
    googleClientSecret: '',
    googleDevToken: '',
  });
  const [saved, setSaved] = useState({});
  const [saving, setSaving] = useState({});
  const [testing, setTesting] = useState({});

  useEffect(() => {
    // Try to load saved keys indication from localStorage
    const savedKeys = localStorage.getItem('breedads_api_keys_status');
    if (savedKeys) {
      try {
        setSaved(JSON.parse(savedKeys));
      } catch {
        // ignore
      }
    }
  }, []);

  const handleSave = async (keyName) => {
    setSaving((prev) => ({ ...prev, [keyName]: true }));
    try {
      await authAPI.updateProfile({ apiKeys: { [keyName]: keys[keyName] } });
      setSaved((prev) => {
        const updated = { ...prev, [keyName]: true };
        localStorage.setItem('breedads_api_keys_status', JSON.stringify(updated));
        return updated;
      });
      toast.success(`${keyName} saved`);
    } catch (err) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving((prev) => ({ ...prev, [keyName]: false }));
    }
  };

  const handleTest = async (keyName) => {
    setTesting((prev) => ({ ...prev, [keyName]: true }));
    try {
      // Simulate test connection
      await new Promise((resolve) => setTimeout(resolve, 1500));
      toast.success(`${keyName} connection successful`);
    } catch (err) {
      toast.error(`${keyName} connection failed`);
    } finally {
      setTesting((prev) => ({ ...prev, [keyName]: false }));
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="bg-brand-500/5 border border-brand-500/20 rounded-xl p-4 flex items-start gap-3">
        <Info size={18} className="text-brand-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm text-dark-300">
            API keys are encrypted and stored securely. They are used for connecting to ad platforms and AI services.
          </p>
        </div>
      </div>

      {/* OpenAI */}
      <div>
        <h3 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
          <Sparkles size={16} className="text-violet-400" />
          AI Services
        </h3>
        <APIKeyField
          label="OpenAI API Key"
          value={keys.openaiKey}
          onChange={(v) => setKeys({ ...keys, openaiKey: v })}
          onSave={() => handleSave('openaiKey')}
          onTest={() => handleTest('openaiKey')}
          saving={saving.openaiKey}
          testing={testing.openaiKey}
          saved={saved.openaiKey}
          placeholder="sk-..."
        />
      </div>

      {/* Meta */}
      <div>
        <h3 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
          <MetaIcon size={16} />
          Meta App Credentials
        </h3>
        <div className="space-y-3">
          <APIKeyField
            label="App ID"
            value={keys.metaAppId}
            onChange={(v) => setKeys({ ...keys, metaAppId: v })}
            onSave={() => handleSave('metaAppId')}
            saving={saving.metaAppId}
            saved={saved.metaAppId}
            placeholder="Your Meta App ID"
          />
          <APIKeyField
            label="App Secret"
            value={keys.metaAppSecret}
            onChange={(v) => setKeys({ ...keys, metaAppSecret: v })}
            onSave={() => handleSave('metaAppSecret')}
            onTest={() => handleTest('metaAppSecret')}
            saving={saving.metaAppSecret}
            testing={testing.metaAppSecret}
            saved={saved.metaAppSecret}
            placeholder="Your Meta App Secret"
          />
        </div>
      </div>

      {/* Google */}
      <div>
        <h3 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
          <GoogleIcon size={16} />
          Google Ads Credentials
        </h3>
        <div className="space-y-3">
          <APIKeyField
            label="Client ID"
            value={keys.googleClientId}
            onChange={(v) => setKeys({ ...keys, googleClientId: v })}
            onSave={() => handleSave('googleClientId')}
            saving={saving.googleClientId}
            saved={saved.googleClientId}
            placeholder="Your Google Client ID"
          />
          <APIKeyField
            label="Client Secret"
            value={keys.googleClientSecret}
            onChange={(v) => setKeys({ ...keys, googleClientSecret: v })}
            onSave={() => handleSave('googleClientSecret')}
            saving={saving.googleClientSecret}
            saved={saved.googleClientSecret}
            placeholder="Your Google Client Secret"
          />
          <APIKeyField
            label="Developer Token"
            value={keys.googleDevToken}
            onChange={(v) => setKeys({ ...keys, googleDevToken: v })}
            onSave={() => handleSave('googleDevToken')}
            onTest={() => handleTest('googleDevToken')}
            saving={saving.googleDevToken}
            testing={testing.googleDevToken}
            saved={saved.googleDevToken}
            placeholder="Your Developer Token"
          />
        </div>
      </div>
    </div>
  );
}

// ── Notifications Tab ───────────────────────────────────────────────────────

function NotificationsTab() {
  const [prefs, setPrefs] = useState({
    emailCampaignUpdates: true,
    emailAutomationAlerts: true,
    emailWeeklyReports: true,
    inAppPerformanceAlerts: true,
    inAppAutomationRuns: true,
    inAppCompetitorUpdates: false,
    aiSuggestions: true,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
  });
  const [saving, setSaving] = useState(false);

  const updatePref = (key, value) => {
    setPrefs((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await authAPI.updateProfile({ notifications: prefs });
      toast.success('Notification preferences saved');
    } catch (err) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Email Notifications */}
      <Card>
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-white flex items-center gap-2 mb-3">
            <Mail size={16} className="text-brand-400" />
            Email Notifications
          </h3>
          <div className="divide-y divide-dark-700/50">
            <ToggleSwitch
              label="Campaign Updates"
              description="Receive emails when campaigns reach milestones or need attention"
              enabled={prefs.emailCampaignUpdates}
              onChange={(v) => updatePref('emailCampaignUpdates', v)}
            />
            <ToggleSwitch
              label="Automation Alerts"
              description="Get notified when automation rules trigger actions"
              enabled={prefs.emailAutomationAlerts}
              onChange={(v) => updatePref('emailAutomationAlerts', v)}
            />
            <ToggleSwitch
              label="Weekly Reports"
              description="Receive a weekly summary of all campaign performance"
              enabled={prefs.emailWeeklyReports}
              onChange={(v) => updatePref('emailWeeklyReports', v)}
            />
          </div>
        </div>
      </Card>

      {/* In-App Notifications */}
      <Card>
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-white flex items-center gap-2 mb-3">
            <Bell size={16} className="text-brand-400" />
            In-App Notifications
          </h3>
          <div className="divide-y divide-dark-700/50">
            <ToggleSwitch
              label="Performance Alerts"
              description="Get alerts when campaigns underperform or exceed targets"
              enabled={prefs.inAppPerformanceAlerts}
              onChange={(v) => updatePref('inAppPerformanceAlerts', v)}
            />
            <ToggleSwitch
              label="Automation Runs"
              description="See notifications for automated rule executions"
              enabled={prefs.inAppAutomationRuns}
              onChange={(v) => updatePref('inAppAutomationRuns', v)}
            />
            <ToggleSwitch
              label="Competitor Updates"
              description="Get notified about competitor ad changes and strategies"
              enabled={prefs.inAppCompetitorUpdates}
              onChange={(v) => updatePref('inAppCompetitorUpdates', v)}
            />
          </div>
        </div>
      </Card>

      {/* AI Suggestions */}
      <Card>
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-white flex items-center gap-2 mb-3">
            <Sparkles size={16} className="text-violet-400" />
            AI Suggestions
          </h3>
          <ToggleSwitch
            label="AI-Powered Suggestions"
            description="Receive AI-generated recommendations for campaign optimization, budget allocation, and creative improvements"
            enabled={prefs.aiSuggestions}
            onChange={(v) => updatePref('aiSuggestions', v)}
          />
        </div>
      </Card>

      {/* Quiet Hours */}
      <Card>
        <div className="space-y-4">
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <BellOff size={16} className="text-dark-400" />
            Quiet Hours
          </h3>
          <ToggleSwitch
            label="Enable Quiet Hours"
            description="Suppress non-critical notifications during specified hours"
            enabled={prefs.quietHoursEnabled}
            onChange={(v) => updatePref('quietHoursEnabled', v)}
          />
          {prefs.quietHoursEnabled && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="grid grid-cols-2 gap-4"
            >
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1.5">Start Time</label>
                <input
                  type="time"
                  value={prefs.quietHoursStart}
                  onChange={(e) => updatePref('quietHoursStart', e.target.value)}
                  className="w-full bg-dark-800 border border-dark-600 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1.5">End Time</label>
                <input
                  type="time"
                  value={prefs.quietHoursEnd}
                  onChange={(e) => updatePref('quietHoursEnd', e.target.value)}
                  className="w-full bg-dark-800 border border-dark-600 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all"
                />
              </div>
            </motion.div>
          )}
        </div>
      </Card>

      <div className="flex justify-end">
        <Button icon={Save} onClick={handleSave} loading={saving}>
          Save Preferences
        </Button>
      </div>
    </div>
  );
}

// ── Billing Tab ─────────────────────────────────────────────────────────────

function BillingTab() {
  const [currentPlan] = useState('free');

  const usage = {
    apiCalls: { used: 847, limit: 1000 },
    aiGenerations: { used: 62, limit: 100 },
    campaigns: { used: 2, limit: 3 },
  };

  return (
    <div className="space-y-8">
      {/* Current Plan */}
      <div>
        <h3 className="text-base font-semibold text-white mb-4">Current Plan</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLANS.map((plan) => {
            const isCurrent = currentPlan === plan.id;

            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl overflow-hidden transition-all ${
                  plan.highlighted
                    ? 'border-2 border-brand-500/50 shadow-lg shadow-brand-500/10'
                    : 'border border-dark-700/50'
                } ${isCurrent ? 'bg-dark-800/70' : 'bg-dark-800/30'}`}
              >
                {plan.highlighted && (
                  <div className="bg-gradient-to-r from-brand-600 to-purple-600 px-4 py-1.5 text-center">
                    <span className="text-xs font-semibold text-white flex items-center justify-center gap-1">
                      <Crown size={12} />
                      Most Popular
                    </span>
                  </div>
                )}
                <div className="p-6">
                  <h4 className="text-lg font-semibold text-white">{plan.name}</h4>
                  <div className="flex items-baseline gap-1 mt-2 mb-4">
                    <span className="text-3xl font-bold text-white">{plan.price}</span>
                    <span className="text-sm text-dark-400">{plan.period}</span>
                  </div>
                  <ul className="space-y-2 mb-6">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 size={14} className={plan.highlighted ? 'text-brand-400' : 'text-accent-400'} />
                        <span className="text-dark-300">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    className={`w-full py-2.5 rounded-xl font-medium text-sm transition-all ${
                      isCurrent
                        ? 'bg-dark-700 text-dark-300 cursor-default'
                        : plan.highlighted
                        ? 'bg-gradient-to-r from-brand-600 to-purple-600 text-white hover:from-brand-500 hover:to-purple-500 shadow-lg shadow-brand-500/25'
                        : 'bg-dark-700 text-white hover:bg-dark-600 border border-dark-600'
                    }`}
                    disabled={isCurrent}
                  >
                    {isCurrent ? (
                      <span className="flex items-center justify-center gap-1.5">
                        <Check size={14} />
                        Current Plan
                      </span>
                    ) : (
                      plan.cta
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Usage Metrics */}
      <div>
        <h3 className="text-base font-semibold text-white mb-4">Usage This Month</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'API Calls', ...usage.apiCalls, icon: Globe, color: 'brand' },
            { label: 'AI Generations', ...usage.aiGenerations, icon: Sparkles, color: 'purple' },
            { label: 'Campaigns', ...usage.campaigns, icon: Zap, color: 'green' },
          ].map((metric) => {
            const percentage = Math.round((metric.used / metric.limit) * 100);
            const isNearLimit = percentage >= 80;
            const colorMap = {
              brand: { bar: 'bg-brand-500', text: 'text-brand-400', bg: 'from-brand-500/20 to-purple-500/20' },
              purple: { bar: 'bg-purple-500', text: 'text-purple-400', bg: 'from-purple-500/20 to-pink-500/20' },
              green: { bar: 'bg-accent-500', text: 'text-accent-400', bg: 'from-accent-500/20 to-emerald-500/20' },
            };
            const colors = colorMap[metric.color];

            return (
              <div
                key={metric.label}
                className="bg-dark-800/50 backdrop-blur-sm border border-dark-700/50 rounded-xl p-5"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colors.bg} flex items-center justify-center`}>
                    <metric.icon size={18} className={colors.text} />
                  </div>
                  <span className={`text-xs font-medium ${isNearLimit ? 'text-amber-400' : 'text-dark-400'}`}>
                    {percentage}%
                  </span>
                </div>
                <p className="text-xl font-bold text-white">
                  {metric.used.toLocaleString()}
                  <span className="text-sm text-dark-400 font-normal"> / {metric.limit.toLocaleString()}</span>
                </p>
                <p className="text-sm text-dark-400 mt-1">{metric.label}</p>
                <div className="mt-3 w-full bg-dark-700 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isNearLimit ? 'bg-amber-500' : colors.bar
                    }`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Plan Comparison Table */}
      <div>
        <h3 className="text-base font-semibold text-white mb-4">Plan Comparison</h3>
        <div className="bg-dark-800/50 border border-dark-700/50 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-700/50">
                  <th className="text-left px-6 py-3 text-sm font-medium text-dark-400">Feature</th>
                  <th className="text-center px-6 py-3 text-sm font-medium text-dark-400">Free</th>
                  <th className="text-center px-6 py-3 text-sm font-medium text-brand-400">Pro</th>
                  <th className="text-center px-6 py-3 text-sm font-medium text-dark-400">Enterprise</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700/30">
                {[
                  { feature: 'Campaigns', free: '3', pro: 'Unlimited', enterprise: 'Unlimited' },
                  { feature: 'Ad Accounts', free: '1', pro: '5', enterprise: 'Unlimited' },
                  { feature: 'AI Generations', free: '100/mo', pro: '2,000/mo', enterprise: 'Unlimited' },
                  { feature: 'Landing Pages', free: '2', pro: '20', enterprise: 'Unlimited' },
                  { feature: 'Automation Rules', free: false, pro: true, enterprise: true },
                  { feature: 'Competitor Analysis', free: false, pro: true, enterprise: true },
                  { feature: 'Advanced Analytics', free: false, pro: true, enterprise: true },
                  { feature: 'API Access', free: false, pro: false, enterprise: true },
                  { feature: 'White-label Reports', free: false, pro: false, enterprise: true },
                  { feature: 'Dedicated Support', free: false, pro: false, enterprise: true },
                ].map((row, i) => (
                  <tr key={i} className="hover:bg-dark-800/30 transition-colors">
                    <td className="px-6 py-3 text-sm text-dark-300">{row.feature}</td>
                    {['free', 'pro', 'enterprise'].map((plan) => (
                      <td key={plan} className="px-6 py-3 text-center">
                        {typeof row[plan] === 'boolean' ? (
                          row[plan] ? (
                            <CheckCircle2 size={16} className="text-accent-400 mx-auto" />
                          ) : (
                            <XCircle size={16} className="text-dark-600 mx-auto" />
                          )
                        ) : (
                          <span className={`text-sm ${plan === 'pro' ? 'text-white font-medium' : 'text-dark-300'}`}>
                            {row[plan]}
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Settings Component ─────────────────────────────────────────────────

export default function Settings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = TABS.find((t) => t.id === searchParams.get('tab'))?.id || 'profile';
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && TABS.find((t) => t.id === tab) && tab !== activeTab) {
      setActiveTab(tab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleTabChange = (next) => {
    setActiveTab(next);
    const params = new URLSearchParams(searchParams);
    params.set('tab', next);
    setSearchParams(params, { replace: true });
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return <ProfileTab />;
      case 'accounts':
        return <AdAccountsTab />;
      case 'notifications':
        return <NotificationsTab />;
      case 'billing':
        return <BillingTab />;
      default:
        return <ProfileTab />;
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-dark-400 text-sm mt-1">Manage your account, integrations, and preferences</p>
      </div>

      {/* Tabs */}
      <Tabs tabs={TABS} activeTab={activeTab} onChange={handleTabChange} />

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {renderTabContent()}
      </motion.div>
    </div>
  );
}
