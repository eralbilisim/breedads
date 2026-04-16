import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Plus,
  Search,
  Filter,
  Play,
  Pause,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  DollarSign,
  MousePointerClick,
  Target,
  TrendingUp,
  Megaphone,
  SortAsc,
  CheckSquare,
  Square,
  CheckCheck,
  XCircle,
  Loader2,
  LayoutGrid,
} from 'lucide-react';
import { campaignsAPI } from '../services/api';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(num) {
  if (num == null || isNaN(num)) return '$0';
  if (num >= 1_000_000) return '$' + (num / 1_000_000).toFixed(2) + 'M';
  if (num >= 1_000) return '$' + (num / 1_000).toFixed(1) + 'K';
  return '$' + Number(num).toFixed(2);
}

function formatNumber(num) {
  if (num == null || isNaN(num)) return '0';
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return Number(num).toLocaleString();
}

function formatRoas(num) {
  if (num == null || isNaN(num)) return '0x';
  return Number(num).toFixed(2) + 'x';
}

const STATUS_CONFIG = {
  active: { color: 'green', label: 'Active' },
  paused: { color: 'yellow', label: 'Paused' },
  draft: { color: 'gray', label: 'Draft' },
  completed: { color: 'blue', label: 'Completed' },
  error: { color: 'red', label: 'Error' },
  archived: { color: 'gray', label: 'Archived' },
};

const PLATFORM_FILTERS = [
  { id: 'all', label: 'All Platforms' },
  { id: 'meta', label: 'Meta' },
  { id: 'google', label: 'Google' },
];

const STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'paused', label: 'Paused' },
  { id: 'draft', label: 'Draft' },
  { id: 'completed', label: 'Completed' },
];

const SORT_OPTIONS = [
  { id: 'createdAt', label: 'Date' },
  { id: 'name', label: 'Name' },
  { id: 'spend', label: 'Spend' },
  { id: 'conversions', label: 'Conversions' },
];

// ── Animation variants ──────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.2 },
  },
};

// ── Platform Icon ───────────────────────────────────────────────────────────

function PlatformIcon({ platform, size = 'md' }) {
  const sizeClasses = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm';
  if (platform === 'meta') {
    return (
      <div className={`${sizeClasses} rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20`}>
        M
      </div>
    );
  }
  return (
    <div className={`${sizeClasses} rounded-xl bg-gradient-to-br from-emerald-500 via-yellow-500 to-red-500 flex items-center justify-center font-bold text-white shadow-lg shadow-emerald-500/20`}>
      G
    </div>
  );
}

// ── Skeleton Card ───────────────────────────────────────────────────────────

function CampaignCardSkeleton() {
  return (
    <div className="bg-dark-800/50 backdrop-blur-sm border border-dark-700/50 rounded-2xl p-5 animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-dark-700" />
          <div className="space-y-2">
            <div className="h-4 w-32 bg-dark-700 rounded" />
            <div className="h-3 w-20 bg-dark-700/60 rounded" />
          </div>
        </div>
        <div className="h-5 w-16 bg-dark-700 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-dark-900/50 rounded-lg p-3">
            <div className="h-2.5 w-12 bg-dark-700/60 rounded mb-2" />
            <div className="h-4 w-16 bg-dark-700 rounded" />
          </div>
        ))}
      </div>
      <div className="h-2 w-full bg-dark-700/40 rounded-full mb-3" />
      <div className="flex items-center justify-between">
        <div className="h-3 w-24 bg-dark-700/60 rounded" />
        <div className="flex gap-2">
          <div className="w-8 h-8 rounded-lg bg-dark-700" />
          <div className="w-8 h-8 rounded-lg bg-dark-700" />
          <div className="w-8 h-8 rounded-lg bg-dark-700" />
        </div>
      </div>
    </div>
  );
}

// ── Campaign Card ───────────────────────────────────────────────────────────

function CampaignCard({ campaign, selected, onSelect, onToggleStatus, onEdit, onDelete, onClick }) {
  const status = STATUS_CONFIG[campaign.status] || STATUS_CONFIG.draft;
  const budgetUsed = campaign.budget > 0 ? Math.min(((campaign.spend || 0) / campaign.budget) * 100, 100) : 0;

  const handleAction = (e, action) => {
    e.stopPropagation();
    action();
  };

  return (
    <motion.div
      layout
      variants={itemVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={`relative bg-dark-800/50 backdrop-blur-sm border rounded-2xl p-5 transition-all duration-300 cursor-pointer group hover:bg-dark-800/70 hover:shadow-xl hover:shadow-black/20 ${
        selected
          ? 'border-brand-500/50 ring-1 ring-brand-500/30'
          : 'border-dark-700/50 hover:border-dark-600/50'
      }`}
      onClick={onClick}
    >
      {/* Selection checkbox */}
      <button
        className={`absolute top-3 right-3 p-1 rounded-md transition-all duration-200 ${
          selected
            ? 'text-brand-400 opacity-100'
            : 'text-dark-500 opacity-0 group-hover:opacity-100'
        }`}
        onClick={(e) => handleAction(e, () => onSelect(campaign._id || campaign.id))}
      >
        {selected ? <CheckSquare size={18} /> : <Square size={18} />}
      </button>

      {/* Header row */}
      <div className="flex items-start gap-3 mb-4">
        <PlatformIcon platform={campaign.platform} />
        <div className="flex-1 min-w-0 pr-6">
          <h3 className="text-sm font-semibold text-white truncate">{campaign.name}</h3>
          <p className="text-xs text-dark-400 capitalize mt-0.5">{campaign.objective || 'No objective'}</p>
        </div>
      </div>

      {/* Status badge */}
      <div className="mb-4">
        <Badge color={status.color} dot>{status.label}</Badge>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-2.5 mb-4">
        <div className="bg-dark-900/50 rounded-lg p-2.5">
          <div className="flex items-center gap-1.5 mb-1">
            <DollarSign size={12} className="text-dark-500" />
            <span className="text-[10px] uppercase tracking-wider text-dark-500 font-medium">Spend</span>
          </div>
          <p className="text-sm font-semibold text-white">{formatCurrency(campaign.spend)}</p>
        </div>
        <div className="bg-dark-900/50 rounded-lg p-2.5">
          <div className="flex items-center gap-1.5 mb-1">
            <MousePointerClick size={12} className="text-dark-500" />
            <span className="text-[10px] uppercase tracking-wider text-dark-500 font-medium">Clicks</span>
          </div>
          <p className="text-sm font-semibold text-white">{formatNumber(campaign.clicks)}</p>
        </div>
        <div className="bg-dark-900/50 rounded-lg p-2.5">
          <div className="flex items-center gap-1.5 mb-1">
            <Target size={12} className="text-dark-500" />
            <span className="text-[10px] uppercase tracking-wider text-dark-500 font-medium">Conversions</span>
          </div>
          <p className="text-sm font-semibold text-white">{formatNumber(campaign.conversions)}</p>
        </div>
        <div className="bg-dark-900/50 rounded-lg p-2.5">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp size={12} className="text-dark-500" />
            <span className="text-[10px] uppercase tracking-wider text-dark-500 font-medium">ROAS</span>
          </div>
          <p className={`text-sm font-semibold ${
            (campaign.roas || 0) >= 3 ? 'text-accent-400' : (campaign.roas || 0) >= 1 ? 'text-warning-400' : 'text-danger-400'
          }`}>
            {formatRoas(campaign.roas)}
          </p>
        </div>
      </div>

      {/* Budget progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] uppercase tracking-wider text-dark-500 font-medium">Budget Used</span>
          <span className="text-xs text-dark-400">{budgetUsed.toFixed(0)}%</span>
        </div>
        <div className="h-1.5 bg-dark-700/50 rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${
              budgetUsed >= 90 ? 'bg-danger-500' : budgetUsed >= 70 ? 'bg-warning-500' : 'bg-gradient-to-r from-brand-500 to-purple-500'
            }`}
            initial={{ width: 0 }}
            animate={{ width: `${budgetUsed}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-dark-700/30">
        <span className="text-[10px] text-dark-500">
          {formatCurrency(campaign.budget || 0)} budget
        </span>
        <div className="flex items-center gap-1">
          {campaign.status === 'active' ? (
            <button
              className="p-1.5 rounded-lg text-dark-400 hover:text-warning-400 hover:bg-warning-500/10 transition-all duration-200"
              title="Pause campaign"
              onClick={(e) => handleAction(e, () => onToggleStatus(campaign._id || campaign.id, 'pause'))}
            >
              <Pause size={14} />
            </button>
          ) : campaign.status === 'paused' ? (
            <button
              className="p-1.5 rounded-lg text-dark-400 hover:text-accent-400 hover:bg-accent-500/10 transition-all duration-200"
              title="Resume campaign"
              onClick={(e) => handleAction(e, () => onToggleStatus(campaign._id || campaign.id, 'resume'))}
            >
              <Play size={14} />
            </button>
          ) : null}
          <button
            className="p-1.5 rounded-lg text-dark-400 hover:text-white hover:bg-dark-700/50 transition-all duration-200"
            title="Edit campaign"
            onClick={(e) => handleAction(e, () => onEdit(campaign._id || campaign.id))}
          >
            <Pencil size={14} />
          </button>
          <button
            className="p-1.5 rounded-lg text-dark-400 hover:text-danger-400 hover:bg-danger-500/10 transition-all duration-200"
            title="Delete campaign"
            onClick={(e) => handleAction(e, () => onDelete(campaign))}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ── Empty State ─────────────────────────────────────────────────────────────

function EmptyState({ hasFilters, onClearFilters, onCreate }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20"
    >
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-500/20 to-purple-500/20 flex items-center justify-center mb-6">
        <Megaphone size={36} className="text-brand-400" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">
        {hasFilters ? 'No campaigns match your filters' : 'No campaigns yet'}
      </h3>
      <p className="text-sm text-dark-400 text-center max-w-md mb-6">
        {hasFilters
          ? 'Try adjusting your search or filters to find what you are looking for.'
          : 'Create your first advertising campaign to start reaching your audience across Meta and Google platforms.'}
      </p>
      {hasFilters ? (
        <Button variant="secondary" onClick={onClearFilters}>
          Clear Filters
        </Button>
      ) : (
        <Button icon={Plus} onClick={onCreate}>
          Create Your First Campaign
        </Button>
      )}
    </motion.div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function Campaigns() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Data state
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filter state (platform syncs with URL ?platform=)
  const urlPlatform = searchParams.get('platform');
  const [search, setSearch] = useState('');
  const [platform, setPlatform] = useState(
    urlPlatform === 'meta' || urlPlatform === 'google' ? urlPlatform : 'all'
  );

  // Sync platform state ↔ URL
  useEffect(() => {
    const p = searchParams.get('platform');
    const next = p === 'meta' || p === 'google' ? p : 'all';
    if (next !== platform) setPlatform(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const updatePlatform = (next) => {
    setPlatform(next);
    const params = new URLSearchParams(searchParams);
    if (next === 'all') params.delete('platform');
    else params.set('platform', next);
    setSearchParams(params, { replace: true });
  };
  const [status, setStatus] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [page, setPage] = useState(1);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const limit = 12;

  // Selection state
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  // Delete modal state
  const [deleteModal, setDeleteModal] = useState({ open: false, campaign: null });
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Bulk delete modal
  const [bulkDeleteModal, setBulkDeleteModal] = useState(false);

  // Search debounce
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch campaigns
  const fetchCampaigns = useCallback(async () => {
    try {
      setLoading(true);
      const params = { page, limit, sort: sortBy };
      if (debouncedSearch) params.search = debouncedSearch;
      if (platform !== 'all') params.platform = platform;
      if (status !== 'all') params.status = status;

      const response = await campaignsAPI.list(params);
      const data = response?.data || response?.campaigns || response || [];
      const list = Array.isArray(data) ? data : data.campaigns || [];
      setCampaigns(list);
      setTotalPages(response?.totalPages || response?.pagination?.pages || Math.ceil((response?.total || list.length) / limit) || 1);
      setTotalCount(response?.total || response?.pagination?.total || list.length);
    } catch (err) {
      console.error('Failed to fetch campaigns:', err);
      toast.error('Failed to load campaigns');
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, platform, status, sortBy]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [platform, status, sortBy]);

  // Clear selection on data change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [campaigns]);

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleToggleStatus = async (id, action) => {
    try {
      if (action === 'pause') {
        await campaignsAPI.pause(id);
        toast.success('Campaign paused');
      } else {
        await campaignsAPI.resume(id);
        toast.success('Campaign resumed');
      }
      fetchCampaigns();
    } catch (err) {
      toast.error(`Failed to ${action} campaign`);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.campaign) return;
    const id = deleteModal.campaign._id || deleteModal.campaign.id;
    try {
      setDeleteLoading(true);
      await campaignsAPI.delete(id);
      toast.success('Campaign deleted');
      setDeleteModal({ open: false, campaign: null });
      fetchCampaigns();
    } catch (err) {
      toast.error('Failed to delete campaign');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === campaigns.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(campaigns.map((c) => c._id || c.id)));
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedIds.size === 0) return;
    try {
      setBulkLoading(true);
      const ids = Array.from(selectedIds);
      if (action === 'delete') {
        await Promise.all(ids.map((id) => campaignsAPI.delete(id)));
        toast.success(`${ids.length} campaign(s) deleted`);
        setBulkDeleteModal(false);
      } else if (action === 'pause') {
        await Promise.all(ids.map((id) => campaignsAPI.pause(id)));
        toast.success(`${ids.length} campaign(s) paused`);
      } else if (action === 'resume') {
        await Promise.all(ids.map((id) => campaignsAPI.resume(id)));
        toast.success(`${ids.length} campaign(s) resumed`);
      }
      setSelectedIds(new Set());
      fetchCampaigns();
    } catch (err) {
      toast.error(`Bulk ${action} failed`);
    } finally {
      setBulkLoading(false);
    }
  };

  const clearFilters = () => {
    setSearch('');
    updatePlatform('all');
    setStatus('all');
    setSortBy('createdAt');
    setPage(1);
  };

  const pageTitle =
    platform === 'meta' ? 'Meta Campaigns' : platform === 'google' ? 'Google Campaigns' : 'Campaigns';
  const pageSubtitle =
    platform === 'meta'
      ? 'Manage your Facebook & Instagram ad campaigns'
      : platform === 'google'
      ? 'Manage your Google Ads campaigns'
      : 'Manage your advertising campaigns across all platforms';

  const hasFilters = search || platform !== 'all' || status !== 'all';

  const currentSort = SORT_OPTIONS.find((s) => s.id === sortBy);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{pageTitle}</h1>
          <p className="text-dark-400 text-sm mt-1">
            {pageSubtitle}
            {!loading && totalCount > 0 && (
              <span className="text-dark-500 ml-1">({totalCount} total)</span>
            )}
          </p>
        </div>
        <Button icon={Plus} onClick={() => navigate('/campaigns/new')}>
          New Campaign
        </Button>
      </div>

      {/* Filters row */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full lg:max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search campaigns..."
            className="w-full bg-dark-800 border border-dark-600 text-white placeholder-dark-400 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all duration-200"
          />
        </div>

        {/* Platform filter */}
        <div className="flex items-center gap-1 bg-dark-800/60 rounded-xl p-1 border border-dark-700/50">
          {PLATFORM_FILTERS.map((pf) => (
            <button
              key={pf.id}
              onClick={() => updatePlatform(pf.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 whitespace-nowrap ${
                platform === pf.id
                  ? 'bg-gradient-to-r from-brand-600 to-purple-600 text-white shadow-sm'
                  : 'text-dark-400 hover:text-white hover:bg-dark-700/50'
              }`}
            >
              {pf.label}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-1 bg-dark-800/60 rounded-xl p-1 border border-dark-700/50">
          {STATUS_FILTERS.map((sf) => (
            <button
              key={sf.id}
              onClick={() => setStatus(sf.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 whitespace-nowrap ${
                status === sf.id
                  ? 'bg-gradient-to-r from-brand-600 to-purple-600 text-white shadow-sm'
                  : 'text-dark-400 hover:text-white hover:bg-dark-700/50'
              }`}
            >
              {sf.label}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="relative">
          <button
            onClick={() => setShowSortDropdown(!showSortDropdown)}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-dark-400 hover:text-white bg-dark-800/60 border border-dark-700/50 rounded-xl transition-all duration-200 hover:border-dark-600/50"
          >
            <SortAsc size={14} />
            <span>{currentSort?.label || 'Sort'}</span>
          </button>
          <AnimatePresence>
            {showSortDropdown && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowSortDropdown(false)} />
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-1 z-20 w-40 bg-dark-800 border border-dark-700 rounded-xl shadow-2xl shadow-black/40 overflow-hidden"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => {
                        setSortBy(opt.id);
                        setShowSortDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-xs font-medium transition-colors ${
                        sortBy === opt.id
                          ? 'text-brand-400 bg-brand-500/10'
                          : 'text-dark-300 hover:text-white hover:bg-dark-700/50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Bulk actions */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-3 bg-brand-500/10 border border-brand-500/20 rounded-xl px-4 py-3">
              <button
                onClick={handleSelectAll}
                className="flex items-center gap-2 text-sm text-brand-400 hover:text-brand-300 transition-colors"
              >
                <CheckCheck size={16} />
                {selectedIds.size === campaigns.length ? 'Deselect All' : 'Select All'}
              </button>
              <span className="text-sm text-dark-400">
                {selectedIds.size} campaign{selectedIds.size > 1 ? 's' : ''} selected
              </span>
              <div className="flex-1" />
              <Button
                variant="ghost"
                size="sm"
                icon={Pause}
                loading={bulkLoading}
                onClick={() => handleBulkAction('pause')}
              >
                Pause
              </Button>
              <Button
                variant="ghost"
                size="sm"
                icon={Play}
                loading={bulkLoading}
                onClick={() => handleBulkAction('resume')}
              >
                Resume
              </Button>
              <Button
                variant="danger"
                size="sm"
                icon={Trash2}
                loading={bulkLoading}
                onClick={() => setBulkDeleteModal(true)}
              >
                Delete
              </Button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="p-1.5 text-dark-400 hover:text-white transition-colors"
              >
                <XCircle size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Campaign Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <CampaignCardSkeleton key={i} />
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <EmptyState
          hasFilters={hasFilters}
          onClearFilters={clearFilters}
          onCreate={() => navigate('/campaigns/new')}
        />
      ) : (
        <LayoutGroup>
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            <AnimatePresence mode="popLayout">
              {campaigns.map((campaign) => (
                <CampaignCard
                  key={campaign._id || campaign.id}
                  campaign={campaign}
                  selected={selectedIds.has(campaign._id || campaign.id)}
                  onSelect={handleSelect}
                  onToggleStatus={handleToggleStatus}
                  onEdit={(id) => navigate(`/campaigns/${id}`)}
                  onDelete={(c) => setDeleteModal({ open: true, campaign: c })}
                  onClick={() => navigate(`/campaigns/${campaign._id || campaign.id}`)}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        </LayoutGroup>
      )}

      {/* Pagination */}
      {!loading && campaigns.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-dark-400">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-dark-300 hover:text-white bg-dark-800/60 border border-dark-700/50 rounded-xl transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:border-dark-600/50"
            >
              <ChevronLeft size={16} />
              Previous
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`w-9 h-9 rounded-lg text-sm font-medium transition-all duration-200 ${
                      page === pageNum
                        ? 'bg-gradient-to-r from-brand-600 to-purple-600 text-white shadow-sm'
                        : 'text-dark-400 hover:text-white hover:bg-dark-700/50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-dark-300 hover:text-white bg-dark-800/60 border border-dark-700/50 rounded-xl transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:border-dark-600/50"
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, campaign: null })}
        title="Delete Campaign"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteModal({ open: false, campaign: null })}>
              Cancel
            </Button>
            <Button variant="danger" icon={Trash2} loading={deleteLoading} onClick={handleDelete}>
              Delete Campaign
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-dark-300 text-sm">
            Are you sure you want to delete <span className="text-white font-medium">{deleteModal.campaign?.name}</span>?
          </p>
          <p className="text-dark-400 text-xs">
            This action cannot be undone. All associated ad sets and ads will also be deleted.
          </p>
        </div>
      </Modal>

      {/* Bulk Delete Confirmation Modal */}
      <Modal
        isOpen={bulkDeleteModal}
        onClose={() => setBulkDeleteModal(false)}
        title="Delete Selected Campaigns"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setBulkDeleteModal(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              icon={Trash2}
              loading={bulkLoading}
              onClick={() => handleBulkAction('delete')}
            >
              Delete {selectedIds.size} Campaign{selectedIds.size > 1 ? 's' : ''}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-dark-300 text-sm">
            Are you sure you want to delete <span className="text-white font-medium">{selectedIds.size} campaign{selectedIds.size > 1 ? 's' : ''}</span>?
          </p>
          <p className="text-dark-400 text-xs">
            This action cannot be undone. All associated ad sets and ads will also be deleted.
          </p>
        </div>
      </Modal>
    </motion.div>
  );
}
