import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
} from 'recharts';
import {
  ArrowLeft,
  DollarSign,
  MousePointerClick,
  Target,
  TrendingUp,
  Play,
  Pause,
  Send,
  Pencil,
  Check,
  X,
  Plus,
  Trash2,
  Settings,
  BarChart3,
  Layers,
  Image as ImageIcon,
  Calendar,
  Globe,
  Users,
  MapPin,
  Tag,
  Video,
  Columns,
  Smartphone,
  Monitor,
  AlertTriangle,
  Eye,
  MessageSquare,
  ExternalLink,
  ChevronDown,
  Upload,
  Loader2,
  Copy,
  Heart,
  Link,
  Type,
  FileText,
} from 'lucide-react';
import { campaignsAPI, adSetsAPI, adsAPI } from '../services/api';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import StatsCard from '../components/ui/StatsCard';
import Tabs from '../components/ui/Tabs';
import Input from '../components/ui/Input';
import Table from '../components/ui/Table';

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

function formatPercent(num) {
  if (num == null || isNaN(num)) return '0%';
  return Number(num).toFixed(2) + '%';
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

const STATUS_CONFIG = {
  active: { color: 'green', label: 'Active' },
  paused: { color: 'yellow', label: 'Paused' },
  draft: { color: 'gray', label: 'Draft' },
  completed: { color: 'blue', label: 'Completed' },
  error: { color: 'red', label: 'Error' },
};

const AD_FORMATS = [
  { id: 'image', label: 'Image', icon: ImageIcon },
  { id: 'video', label: 'Video', icon: Video },
  { id: 'carousel', label: 'Carousel', icon: Columns },
  { id: 'stories', label: 'Stories', icon: Smartphone },
];

const CTA_OPTIONS = [
  { value: 'learn_more', label: 'Learn More' },
  { value: 'shop_now', label: 'Shop Now' },
  { value: 'sign_up', label: 'Sign Up' },
  { value: 'book_now', label: 'Book Now' },
  { value: 'contact_us', label: 'Contact Us' },
  { value: 'download', label: 'Download' },
  { value: 'get_offer', label: 'Get Offer' },
  { value: 'get_quote', label: 'Get Quote' },
  { value: 'subscribe', label: 'Subscribe' },
  { value: 'apply_now', label: 'Apply Now' },
];

const BID_STRATEGIES = [
  { value: 'lowest_cost', label: 'Lowest Cost' },
  { value: 'cost_cap', label: 'Cost Cap' },
  { value: 'bid_cap', label: 'Bid Cap' },
  { value: 'target_cost', label: 'Target Cost' },
];

const PLACEMENT_OPTIONS = [
  { id: 'feed', label: 'Feed' },
  { id: 'stories', label: 'Stories' },
  { id: 'reels', label: 'Reels' },
  { id: 'explore', label: 'Explore' },
  { id: 'search', label: 'Search' },
  { id: 'marketplace', label: 'Marketplace' },
  { id: 'right_column', label: 'Right Column' },
  { id: 'instant_articles', label: 'Instant Articles' },
];

const DATE_RANGES = [
  { label: '7D', value: '7d', days: 7 },
  { label: '14D', value: '14d', days: 14 },
  { label: '30D', value: '30d', days: 30 },
  { label: '90D', value: '90d', days: 90 },
];

// ── Animation Variants ──────────────────────────────────────────────────────

const fadeVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } },
};

// ── Chart Tooltip ───────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-dark-800 border border-dark-700 rounded-xl p-4 shadow-2xl shadow-black/40 min-w-[180px]">
      <p className="text-dark-400 text-xs font-medium mb-2">{label}</p>
      {payload.map((entry, idx) => (
        <div key={idx} className="flex items-center justify-between gap-4 py-1">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: entry.color }} />
            <span className="text-sm text-dark-300 capitalize">{entry.name}</span>
          </div>
          <span className="text-sm font-semibold text-white">
            {entry.name === 'spend' || entry.name === 'cpc'
              ? formatCurrency(entry.value)
              : entry.name === 'ctr'
              ? formatPercent(entry.value)
              : entry.name === 'roas'
              ? formatRoas(entry.value)
              : formatNumber(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Tags Input Component ────────────────────────────────────────────────────

function TagsInput({ value = [], onChange, placeholder = 'Type and press Enter...', label }) {
  const [inputVal, setInputVal] = useState('');
  const inputRef = useRef(null);

  const handleKeyDown = (e) => {
    if ((e.key === 'Enter' || e.key === ',') && inputVal.trim()) {
      e.preventDefault();
      const newTag = inputVal.trim();
      if (!value.includes(newTag)) {
        onChange([...value, newTag]);
      }
      setInputVal('');
    } else if (e.key === 'Backspace' && !inputVal && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  const removeTag = (idx) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-1.5">
      {label && <label className="block text-sm font-medium text-dark-300">{label}</label>}
      <div
        className="flex flex-wrap items-center gap-1.5 min-h-[42px] bg-dark-800 border border-dark-600 rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-brand-500/50 focus-within:border-brand-500 transition-all duration-200 cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((tag, idx) => (
          <span
            key={idx}
            className="inline-flex items-center gap-1 px-2 py-0.5 bg-brand-500/15 text-brand-400 rounded-md text-xs font-medium"
          >
            {tag}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(idx);
              }}
              className="hover:text-white transition-colors"
            >
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[100px] bg-transparent text-white text-sm placeholder-dark-400 outline-none"
        />
      </div>
    </div>
  );
}

// ── Platform Icon ───────────────────────────────────────────────────────────

function PlatformBadge({ platform }) {
  if (platform === 'meta') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-500/15 text-blue-400 border border-blue-500/20">
        <span className="w-4 h-4 rounded bg-blue-500 flex items-center justify-center text-[10px] font-bold text-white">M</span>
        Meta
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
      <span className="w-4 h-4 rounded bg-gradient-to-br from-emerald-500 via-yellow-500 to-red-500 flex items-center justify-center text-[10px] font-bold text-white">G</span>
      Google
    </span>
  );
}

// ── Loading state ───────────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-dark-700" />
        <div className="space-y-2 flex-1">
          <div className="h-6 w-48 bg-dark-700 rounded" />
          <div className="h-4 w-32 bg-dark-700/60 rounded" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-dark-800/50 border border-dark-700/50 rounded-2xl p-6">
            <div className="w-12 h-12 rounded-xl bg-dark-700 mb-4" />
            <div className="h-6 w-20 bg-dark-700 rounded mb-2" />
            <div className="h-4 w-24 bg-dark-700/60 rounded" />
          </div>
        ))}
      </div>
      <div className="bg-dark-800/50 border border-dark-700/50 rounded-2xl p-6 h-[400px]" />
    </div>
  );
}

// ── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ campaign, analytics }) {
  const [dateRange, setDateRange] = useState('30d');
  const [chartData, setChartData] = useState([]);
  const [chartLoading, setChartLoading] = useState(false);
  const id = campaign._id || campaign.id;

  const fetchChartData = useCallback(async () => {
    try {
      setChartLoading(true);
      const days = DATE_RANGES.find((r) => r.value === dateRange)?.days || 30;
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
      const data = await campaignsAPI.analytics(id, { startDate, endDate });
      setChartData(Array.isArray(data) ? data : data?.daily || data?.data || []);
    } catch (err) {
      console.error('Failed to fetch chart data:', err);
    } finally {
      setChartLoading(false);
    }
  }, [id, dateRange]);

  useEffect(() => {
    fetchChartData();
  }, [fetchChartData]);

  const stats = analytics || campaign.analytics || campaign;

  return (
    <motion.div variants={fadeVariants} initial="hidden" animate="visible" className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          label="Total Spend"
          value={formatCurrency(stats.spend || stats.totalSpend)}
          icon={DollarSign}
          color="brand"
          change={stats.spendChange}
          changeLabel="vs last period"
        />
        <StatsCard
          label="Clicks"
          value={formatNumber(stats.clicks || stats.totalClicks)}
          icon={MousePointerClick}
          color="purple"
          change={stats.clicksChange}
          changeLabel="vs last period"
        />
        <StatsCard
          label="Conversions"
          value={formatNumber(stats.conversions || stats.totalConversions)}
          icon={Target}
          color="green"
          change={stats.conversionsChange}
          changeLabel="vs last period"
        />
        <StatsCard
          label="ROAS"
          value={formatRoas(stats.roas || stats.avgRoas)}
          icon={TrendingUp}
          color="amber"
          change={stats.roasChange}
          changeLabel="vs last period"
        />
      </div>

      {/* Performance Chart */}
      <Card
        header={
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-brand-500/10 flex items-center justify-center">
                <BarChart3 size={18} className="text-brand-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Performance Trend</h3>
                <p className="text-xs text-dark-400">Last {DATE_RANGES.find((r) => r.value === dateRange)?.days || 30} days</p>
              </div>
            </div>
            <div className="flex items-center gap-1 bg-dark-900/50 rounded-xl p-1">
              {DATE_RANGES.map((range) => (
                <button
                  key={range.value}
                  onClick={() => setDateRange(range.value)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                    dateRange === range.value
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'text-dark-400 hover:text-white hover:bg-dark-700/50'
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>
        }
      >
        {chartLoading ? (
          <div className="w-full h-[320px] flex items-end gap-2 p-4 animate-pulse">
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className="flex-1 bg-dark-700/40 rounded-t" style={{ height: `${30 + Math.random() * 60}%` }} />
            ))}
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[320px] text-dark-400">
            <Calendar size={36} className="mb-3 text-dark-500" />
            <p className="text-sm">No performance data available yet</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradSpend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradClicks" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradConversions" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#1e293b' }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => formatNumber(v)} />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#334155' }} />
              <Legend wrapperStyle={{ paddingTop: 16 }} formatter={(value) => <span className="text-xs text-dark-300 capitalize">{value}</span>} />
              <Area type="monotone" dataKey="spend" stroke="#6366f1" strokeWidth={2.5} fill="url(#gradSpend)" dot={false} activeDot={{ r: 5, fill: '#6366f1', stroke: '#1e293b', strokeWidth: 2 }} />
              <Area type="monotone" dataKey="clicks" stroke="#8b5cf6" strokeWidth={2.5} fill="url(#gradClicks)" dot={false} activeDot={{ r: 5, fill: '#8b5cf6', stroke: '#1e293b', strokeWidth: 2 }} />
              <Area type="monotone" dataKey="conversions" stroke="#06b6d4" strokeWidth={2.5} fill="url(#gradConversions)" dot={false} activeDot={{ r: 5, fill: '#06b6d4', stroke: '#1e293b', strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Campaign Info */}
      <Card header="Campaign Information">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">Objective</p>
              <p className="text-sm text-white capitalize">{campaign.objective || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">Budget</p>
              <p className="text-sm text-white">
                {formatCurrency(campaign.budget)}{' '}
                <span className="text-dark-400 text-xs">({campaign.budgetType || 'daily'})</span>
              </p>
            </div>
            <div>
              <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">Date Range</p>
              <p className="text-sm text-white">
                {formatDate(campaign.startDate)} - {formatDate(campaign.endDate) || 'Ongoing'}
              </p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">Platform</p>
              <PlatformBadge platform={campaign.platform} />
            </div>
            <div>
              <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">Targeting</p>
              <div className="flex flex-wrap gap-1.5">
                {campaign.targeting?.locations?.map((loc, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-dark-700/50 text-dark-300 rounded-md text-xs">
                    <MapPin size={10} /> {loc}
                  </span>
                ))}
                {campaign.targeting?.interests?.map((int, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-brand-500/10 text-brand-400 rounded-md text-xs">
                    <Tag size={10} /> {int}
                  </span>
                ))}
                {(!campaign.targeting?.locations?.length && !campaign.targeting?.interests?.length) && (
                  <span className="text-sm text-dark-400">No targeting configured</span>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">Created</p>
              <p className="text-sm text-white">{formatDate(campaign.createdAt)}</p>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

// ── Ad Sets Tab ─────────────────────────────────────────────────────────────

function AdSetsTab({ campaign, onRefresh }) {
  const campaignId = campaign._id || campaign.id;
  const [adSets, setAdSets] = useState(campaign.adSets || []);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAdSet, setEditingAdSet] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ open: false, adSet: null });
  const [deleteLoading, setDeleteLoading] = useState(false);

  const defaultForm = {
    name: '',
    budget: '',
    bidStrategy: 'lowest_cost',
    targeting: {
      ageMin: 18,
      ageMax: 65,
      gender: 'all',
      locations: [],
      interests: [],
    },
    placements: ['feed'],
  };

  const [form, setForm] = useState(defaultForm);

  const fetchAdSets = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adSetsAPI.list(campaignId);
      const data = Array.isArray(response) ? response : response?.data || response?.adSets || [];
      setAdSets(data);
    } catch (err) {
      console.error('Failed to fetch ad sets:', err);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    fetchAdSets();
  }, [fetchAdSets]);

  const openCreate = () => {
    setEditingAdSet(null);
    setForm(defaultForm);
    setModalOpen(true);
  };

  const openEdit = (adSet) => {
    setEditingAdSet(adSet);
    setForm({
      name: adSet.name || '',
      budget: adSet.budget?.toString() || '',
      bidStrategy: adSet.bidStrategy || 'lowest_cost',
      targeting: {
        ageMin: adSet.targeting?.ageMin || 18,
        ageMax: adSet.targeting?.ageMax || 65,
        gender: adSet.targeting?.gender || 'all',
        locations: adSet.targeting?.locations || [],
        interests: adSet.targeting?.interests || [],
      },
      placements: adSet.placements || ['feed'],
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Ad set name is required');
      return;
    }
    try {
      setSaving(true);
      const payload = {
        ...form,
        budget: parseFloat(form.budget) || 0,
      };
      if (editingAdSet) {
        await adSetsAPI.update(campaignId, editingAdSet._id || editingAdSet.id, payload);
        toast.success('Ad set updated');
      } else {
        await adSetsAPI.create(campaignId, payload);
        toast.success('Ad set created');
      }
      setModalOpen(false);
      fetchAdSets();
      onRefresh?.();
    } catch (err) {
      toast.error(editingAdSet ? 'Failed to update ad set' : 'Failed to create ad set');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.adSet) return;
    try {
      setDeleteLoading(true);
      await adSetsAPI.delete(campaignId, deleteModal.adSet._id || deleteModal.adSet.id);
      toast.success('Ad set deleted');
      setDeleteModal({ open: false, adSet: null });
      fetchAdSets();
      onRefresh?.();
    } catch (err) {
      toast.error('Failed to delete ad set');
    } finally {
      setDeleteLoading(false);
    }
  };

  const togglePlacement = (id) => {
    setForm((prev) => ({
      ...prev,
      placements: prev.placements.includes(id)
        ? prev.placements.filter((p) => p !== id)
        : [...prev.placements, id],
    }));
  };

  return (
    <motion.div variants={fadeVariants} initial="hidden" animate="visible" className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-dark-400">{adSets.length} ad set{adSets.length !== 1 ? 's' : ''}</p>
        <Button icon={Plus} size="sm" onClick={openCreate}>
          Add Ad Set
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-dark-800/50 border border-dark-700/50 rounded-2xl p-5 animate-pulse">
              <div className="flex justify-between mb-3">
                <div className="h-5 w-40 bg-dark-700 rounded" />
                <div className="h-5 w-16 bg-dark-700 rounded-full" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="h-4 bg-dark-700/60 rounded" />
                <div className="h-4 bg-dark-700/60 rounded" />
                <div className="h-4 bg-dark-700/60 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : adSets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-dark-700/50 flex items-center justify-center mb-4">
            <Layers size={28} className="text-dark-400" />
          </div>
          <p className="text-dark-400 text-sm mb-4">No ad sets configured yet</p>
          <Button icon={Plus} size="sm" onClick={openCreate}>
            Create First Ad Set
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {adSets.map((adSet) => {
            const st = STATUS_CONFIG[adSet.status] || STATUS_CONFIG.draft;
            return (
              <motion.div
                key={adSet._id || adSet.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-dark-800/50 border border-dark-700/50 rounded-2xl p-5 hover:bg-dark-800/70 hover:border-dark-600/50 transition-all duration-300"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="text-sm font-semibold text-white">{adSet.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge color={st.color} dot>{st.label}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      className="p-1.5 rounded-lg text-dark-400 hover:text-white hover:bg-dark-700/50 transition-all"
                      onClick={() => openEdit(adSet)}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      className="p-1.5 rounded-lg text-dark-400 hover:text-danger-400 hover:bg-danger-500/10 transition-all"
                      onClick={() => setDeleteModal({ open: true, adSet })}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-dark-900/50 rounded-lg p-2.5">
                    <p className="text-[10px] uppercase tracking-wider text-dark-500 mb-1">Budget</p>
                    <p className="text-sm font-medium text-white">{formatCurrency(adSet.budget)}</p>
                  </div>
                  <div className="bg-dark-900/50 rounded-lg p-2.5">
                    <p className="text-[10px] uppercase tracking-wider text-dark-500 mb-1">Bid Strategy</p>
                    <p className="text-sm font-medium text-white capitalize">{(adSet.bidStrategy || '-').replace(/_/g, ' ')}</p>
                  </div>
                  <div className="bg-dark-900/50 rounded-lg p-2.5">
                    <p className="text-[10px] uppercase tracking-wider text-dark-500 mb-1">Targeting</p>
                    <p className="text-sm font-medium text-white">
                      {adSet.targeting?.ageMin || 18}-{adSet.targeting?.ageMax || 65},{' '}
                      {(adSet.targeting?.gender || 'all') === 'all' ? 'All' : adSet.targeting?.gender}
                    </p>
                  </div>
                  <div className="bg-dark-900/50 rounded-lg p-2.5">
                    <p className="text-[10px] uppercase tracking-wider text-dark-500 mb-1">Ads</p>
                    <p className="text-sm font-medium text-white">{adSet.adsCount || adSet.ads?.length || 0}</p>
                  </div>
                </div>
                {(adSet.targeting?.locations?.length > 0 || adSet.targeting?.interests?.length > 0) && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {adSet.targeting?.locations?.map((loc, i) => (
                      <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-dark-700/50 text-dark-300 rounded-md text-xs">
                        <MapPin size={10} /> {loc}
                      </span>
                    ))}
                    {adSet.targeting?.interests?.map((int, i) => (
                      <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-brand-500/10 text-brand-400 rounded-md text-xs">
                        <Tag size={10} /> {int}
                      </span>
                    ))}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Ad Set Create/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingAdSet ? 'Edit Ad Set' : 'Create Ad Set'}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button loading={saving} onClick={handleSave}>
              {editingAdSet ? 'Update' : 'Create'} Ad Set
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <Input
            label="Ad Set Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Enter ad set name"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Budget"
              type="number"
              icon={DollarSign}
              value={form.budget}
              onChange={(e) => setForm({ ...form, budget: e.target.value })}
              placeholder="0.00"
            />
            <Input
              label="Bid Strategy"
              type="select"
              value={form.bidStrategy}
              onChange={(e) => setForm({ ...form, bidStrategy: e.target.value })}
              options={BID_STRATEGIES}
            />
          </div>

          <div className="border-t border-dark-700/50 pt-5">
            <h4 className="text-sm font-semibold text-white mb-4">Targeting</h4>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <Input
                label="Min Age"
                type="number"
                value={form.targeting.ageMin}
                onChange={(e) =>
                  setForm({ ...form, targeting: { ...form.targeting, ageMin: parseInt(e.target.value) || 18 } })
                }
                min={13}
                max={65}
              />
              <Input
                label="Max Age"
                type="number"
                value={form.targeting.ageMax}
                onChange={(e) =>
                  setForm({ ...form, targeting: { ...form.targeting, ageMax: parseInt(e.target.value) || 65 } })
                }
                min={13}
                max={65}
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-dark-300 mb-1.5">Gender</label>
              <div className="flex items-center gap-2">
                {['all', 'male', 'female'].map((g) => (
                  <button
                    key={g}
                    onClick={() => setForm({ ...form, targeting: { ...form.targeting, gender: g } })}
                    className={`px-4 py-2 text-xs font-medium rounded-lg transition-all duration-200 capitalize ${
                      form.targeting.gender === g
                        ? 'bg-gradient-to-r from-brand-600 to-purple-600 text-white'
                        : 'bg-dark-700/50 text-dark-400 hover:text-white hover:bg-dark-700'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-4">
              <TagsInput
                label="Locations"
                value={form.targeting.locations}
                onChange={(locations) => setForm({ ...form, targeting: { ...form.targeting, locations } })}
                placeholder="Type a location and press Enter..."
              />
            </div>
            <TagsInput
              label="Interests"
              value={form.targeting.interests}
              onChange={(interests) => setForm({ ...form, targeting: { ...form.targeting, interests } })}
              placeholder="Type an interest and press Enter..."
            />
          </div>

          <div className="border-t border-dark-700/50 pt-5">
            <h4 className="text-sm font-semibold text-white mb-3">Placements</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {PLACEMENT_OPTIONS.map((pl) => (
                <button
                  key={pl.id}
                  onClick={() => togglePlacement(pl.id)}
                  className={`px-3 py-2 text-xs font-medium rounded-lg border transition-all duration-200 ${
                    form.placements.includes(pl.id)
                      ? 'bg-brand-500/15 text-brand-400 border-brand-500/30'
                      : 'bg-dark-800 text-dark-400 border-dark-700/50 hover:border-dark-600/50 hover:text-dark-300'
                  }`}
                >
                  {pl.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete modal */}
      <Modal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, adSet: null })}
        title="Delete Ad Set"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteModal({ open: false, adSet: null })}>Cancel</Button>
            <Button variant="danger" icon={Trash2} loading={deleteLoading} onClick={handleDelete}>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-dark-300 text-sm">
          Are you sure you want to delete <span className="text-white font-medium">{deleteModal.adSet?.name}</span>? This will also remove all ads within this ad set.
        </p>
      </Modal>
    </motion.div>
  );
}

// ── Ads Tab ─────────────────────────────────────────────────────────────────

function AdsTab({ campaign, onRefresh }) {
  const campaignId = campaign._id || campaign.id;
  const adSets = campaign.adSets || [];
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ open: false, ad: null, adSetId: null });
  const [deleteLoading, setDeleteLoading] = useState(false);

  const defaultAdForm = {
    adSetId: adSets[0]?._id || adSets[0]?.id || '',
    format: 'image',
    name: '',
    headline: '',
    description: '',
    primaryText: '',
    cta: 'learn_more',
    destinationUrl: '',
    mediaUrl: '',
  };

  const [adForm, setAdForm] = useState(defaultAdForm);

  const fetchAds = useCallback(async () => {
    try {
      setLoading(true);
      const allAds = [];
      for (const adSet of adSets) {
        try {
          const asId = adSet._id || adSet.id;
          const response = await adsAPI.list(asId);
          const data = Array.isArray(response) ? response : response?.data || response?.ads || [];
          allAds.push(...data.map((a) => ({ ...a, adSetId: asId, adSetName: adSet.name })));
        } catch {
          /* skip errored ad sets */
        }
      }
      setAds(allAds);
    } catch (err) {
      console.error('Failed to fetch ads:', err);
    } finally {
      setLoading(false);
    }
  }, [adSets]);

  useEffect(() => {
    if (adSets.length > 0) {
      fetchAds();
    }
  }, [fetchAds, adSets.length]);

  const handleCreate = async () => {
    if (!adForm.name.trim()) {
      toast.error('Ad name is required');
      return;
    }
    if (!adForm.adSetId) {
      toast.error('Please select an ad set');
      return;
    }
    try {
      setSaving(true);
      await adsAPI.create(adForm.adSetId, adForm);
      toast.success('Ad created');
      setModalOpen(false);
      setModalStep(1);
      setAdForm(defaultAdForm);
      fetchAds();
      onRefresh?.();
    } catch (err) {
      toast.error('Failed to create ad');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAd = async () => {
    if (!deleteModal.ad) return;
    try {
      setDeleteLoading(true);
      const adSetId = deleteModal.adSetId || deleteModal.ad.adSetId;
      await adsAPI.delete(adSetId, deleteModal.ad._id || deleteModal.ad.id);
      toast.success('Ad deleted');
      setDeleteModal({ open: false, ad: null, adSetId: null });
      fetchAds();
      onRefresh?.();
    } catch (err) {
      toast.error('Failed to delete ad');
    } finally {
      setDeleteLoading(false);
    }
  };

  const formatBadge = (format) => {
    const map = {
      image: { color: 'blue', label: 'Image' },
      video: { color: 'purple', label: 'Video' },
      carousel: { color: 'green', label: 'Carousel' },
      stories: { color: 'yellow', label: 'Stories' },
    };
    const cfg = map[format] || map.image;
    return <Badge color={cfg.color}>{cfg.label}</Badge>;
  };

  return (
    <motion.div variants={fadeVariants} initial="hidden" animate="visible" className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-dark-400">{ads.length} ad{ads.length !== 1 ? 's' : ''}</p>
        <Button icon={Plus} size="sm" onClick={() => {
          setAdForm({ ...defaultAdForm, adSetId: adSets[0]?._id || adSets[0]?.id || '' });
          setModalStep(1);
          setModalOpen(true);
        }} disabled={adSets.length === 0}>
          Add Ad
        </Button>
      </div>

      {adSets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-dark-700/50 flex items-center justify-center mb-4">
            <Layers size={28} className="text-dark-400" />
          </div>
          <p className="text-dark-400 text-sm">Create an ad set first before adding ads</p>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-dark-800/50 border border-dark-700/50 rounded-2xl p-5 animate-pulse">
              <div className="w-full h-36 bg-dark-700 rounded-xl mb-3" />
              <div className="h-4 w-32 bg-dark-700 rounded mb-2" />
              <div className="h-3 w-full bg-dark-700/60 rounded" />
            </div>
          ))}
        </div>
      ) : ads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-dark-700/50 flex items-center justify-center mb-4">
            <ImageIcon size={28} className="text-dark-400" />
          </div>
          <p className="text-dark-400 text-sm mb-4">No ads created yet</p>
          <Button icon={Plus} size="sm" onClick={() => {
            setAdForm({ ...defaultAdForm, adSetId: adSets[0]?._id || adSets[0]?.id || '' });
            setModalStep(1);
            setModalOpen(true);
          }}>
            Create First Ad
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ads.map((ad) => {
            const adStatus = STATUS_CONFIG[ad.status] || STATUS_CONFIG.draft;
            return (
              <motion.div
                key={ad._id || ad.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-dark-800/50 border border-dark-700/50 rounded-2xl overflow-hidden hover:bg-dark-800/70 hover:border-dark-600/50 transition-all duration-300 group"
              >
                {/* Media preview */}
                <div className="relative w-full h-40 bg-dark-900/50 flex items-center justify-center overflow-hidden">
                  {ad.mediaUrl || ad.imageUrl ? (
                    <img
                      src={ad.mediaUrl || ad.imageUrl}
                      alt={ad.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center text-dark-500">
                      <ImageIcon size={32} />
                      <span className="text-xs mt-1">No preview</span>
                    </div>
                  )}
                  <div className="absolute top-2 left-2">
                    {formatBadge(ad.format)}
                  </div>
                  <div className="absolute top-2 right-2">
                    <Badge color={adStatus.color} dot>{adStatus.label}</Badge>
                  </div>
                </div>
                <div className="p-4">
                  <h4 className="text-sm font-semibold text-white truncate">{ad.name}</h4>
                  {ad.headline && (
                    <p className="text-xs text-dark-300 mt-1 truncate">{ad.headline}</p>
                  )}
                  {ad.adSetName && (
                    <p className="text-[10px] text-dark-500 mt-1">Ad Set: {ad.adSetName}</p>
                  )}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-dark-700/30">
                    <span className="text-[10px] text-dark-500 capitalize">{(ad.cta || '').replace(/_/g, ' ')}</span>
                    <div className="flex items-center gap-1">
                      <button
                        className="p-1.5 rounded-lg text-dark-400 hover:text-danger-400 hover:bg-danger-500/10 transition-all opacity-0 group-hover:opacity-100"
                        onClick={() => setDeleteModal({ open: true, ad, adSetId: ad.adSetId })}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Ad Creation Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setModalStep(1); }}
        title={`Create Ad - Step ${modalStep} of 4`}
        size="lg"
        footer={
          <>
            {modalStep > 1 && (
              <Button variant="ghost" onClick={() => setModalStep(modalStep - 1)}>
                Back
              </Button>
            )}
            <div className="flex-1" />
            {modalStep < 4 ? (
              <Button onClick={() => setModalStep(modalStep + 1)}>
                Next
              </Button>
            ) : (
              <Button loading={saving} onClick={handleCreate}>
                Create Ad
              </Button>
            )}
          </>
        }
      >
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2, 3, 4].map((step) => (
            <React.Fragment key={step}>
              <button
                onClick={() => setModalStep(step)}
                className={`w-8 h-8 rounded-full text-xs font-medium flex items-center justify-center transition-all duration-200 ${
                  modalStep === step
                    ? 'bg-gradient-to-r from-brand-600 to-purple-600 text-white'
                    : modalStep > step
                    ? 'bg-accent-500/20 text-accent-400'
                    : 'bg-dark-700 text-dark-400'
                }`}
              >
                {modalStep > step ? <Check size={14} /> : step}
              </button>
              {step < 4 && (
                <div className={`w-8 h-0.5 rounded-full ${modalStep > step ? 'bg-accent-500/40' : 'bg-dark-700'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Format */}
          {modalStep === 1 && (
            <motion.div key="step1" variants={fadeVariants} initial="hidden" animate="visible" exit="exit" className="space-y-4">
              <p className="text-sm text-dark-400 mb-4">Choose an ad format</p>
              {adSets.length > 1 && (
                <Input
                  label="Ad Set"
                  type="select"
                  value={adForm.adSetId}
                  onChange={(e) => setAdForm({ ...adForm, adSetId: e.target.value })}
                  options={adSets.map((as) => ({ value: as._id || as.id, label: as.name }))}
                />
              )}
              <div className="grid grid-cols-2 gap-3">
                {AD_FORMATS.map((fmt) => {
                  const Icon = fmt.icon;
                  return (
                    <button
                      key={fmt.id}
                      onClick={() => setAdForm({ ...adForm, format: fmt.id })}
                      className={`flex flex-col items-center gap-2 p-5 rounded-xl border transition-all duration-200 ${
                        adForm.format === fmt.id
                          ? 'bg-brand-500/15 border-brand-500/30 text-brand-400'
                          : 'bg-dark-800 border-dark-700/50 text-dark-400 hover:border-dark-600/50 hover:text-dark-300'
                      }`}
                    >
                      <Icon size={24} />
                      <span className="text-sm font-medium">{fmt.label}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Step 2: Content */}
          {modalStep === 2 && (
            <motion.div key="step2" variants={fadeVariants} initial="hidden" animate="visible" exit="exit" className="space-y-4">
              <Input
                label="Ad Name"
                value={adForm.name}
                onChange={(e) => setAdForm({ ...adForm, name: e.target.value })}
                placeholder="Enter a name for this ad"
              />
              <Input
                label="Headline"
                value={adForm.headline}
                onChange={(e) => setAdForm({ ...adForm, headline: e.target.value })}
                placeholder="Write a catchy headline"
              />
              <Input
                label="Description"
                value={adForm.description}
                onChange={(e) => setAdForm({ ...adForm, description: e.target.value })}
                placeholder="Brief description"
              />
              {campaign.platform === 'meta' && (
                <Input
                  label="Primary Text"
                  type="textarea"
                  value={adForm.primaryText}
                  onChange={(e) => setAdForm({ ...adForm, primaryText: e.target.value })}
                  placeholder="Primary text appears above the media"
                  rows={3}
                />
              )}
              <Input
                label="Call to Action"
                type="select"
                value={adForm.cta}
                onChange={(e) => setAdForm({ ...adForm, cta: e.target.value })}
                options={CTA_OPTIONS}
              />
              <Input
                label="Destination URL"
                icon={Link}
                value={adForm.destinationUrl}
                onChange={(e) => setAdForm({ ...adForm, destinationUrl: e.target.value })}
                placeholder="https://example.com/landing-page"
              />
            </motion.div>
          )}

          {/* Step 3: Media */}
          {modalStep === 3 && (
            <motion.div key="step3" variants={fadeVariants} initial="hidden" animate="visible" exit="exit" className="space-y-4">
              <p className="text-sm text-dark-400 mb-2">Upload media or enter a URL</p>
              <Input
                label="Media URL"
                icon={Link}
                value={adForm.mediaUrl}
                onChange={(e) => setAdForm({ ...adForm, mediaUrl: e.target.value })}
                placeholder="https://example.com/image.jpg"
              />
              <div className="text-center text-xs text-dark-500 my-2">or</div>
              <div className="border-2 border-dashed border-dark-700/50 rounded-xl p-8 flex flex-col items-center justify-center hover:border-dark-600/50 transition-colors cursor-pointer">
                <Upload size={32} className="text-dark-500 mb-3" />
                <p className="text-sm text-dark-400 mb-1">Drag and drop or click to upload</p>
                <p className="text-xs text-dark-500">PNG, JPG, MP4 up to 10MB</p>
              </div>
              {adForm.mediaUrl && (
                <div className="mt-4">
                  <p className="text-xs text-dark-400 mb-2">Preview</p>
                  <div className="w-full h-48 rounded-xl bg-dark-900/50 overflow-hidden">
                    <img
                      src={adForm.mediaUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Step 4: Preview */}
          {modalStep === 4 && (
            <motion.div key="step4" variants={fadeVariants} initial="hidden" animate="visible" exit="exit" className="space-y-4">
              <p className="text-sm text-dark-400 mb-4">Review your ad before creating</p>
              <div className="bg-dark-900/50 rounded-xl border border-dark-700/30 overflow-hidden max-w-sm mx-auto">
                {/* Preview card */}
                <div className="p-3 border-b border-dark-700/30">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-dark-700" />
                    <div>
                      <p className="text-xs font-medium text-white">Your Brand</p>
                      <p className="text-[10px] text-dark-500">Sponsored</p>
                    </div>
                  </div>
                  {adForm.primaryText && (
                    <p className="text-xs text-dark-300 mt-2">{adForm.primaryText}</p>
                  )}
                </div>
                <div className="w-full h-48 bg-dark-800 flex items-center justify-center">
                  {adForm.mediaUrl ? (
                    <img src={adForm.mediaUrl} alt="Ad" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                  ) : (
                    <ImageIcon size={32} className="text-dark-600" />
                  )}
                </div>
                <div className="p-3">
                  <p className="text-xs font-semibold text-white">{adForm.headline || 'Your Headline'}</p>
                  <p className="text-[10px] text-dark-400 mt-0.5">{adForm.description || 'Your description'}</p>
                  {adForm.destinationUrl && (
                    <p className="text-[10px] text-dark-500 mt-1 truncate">{adForm.destinationUrl}</p>
                  )}
                  <div className="mt-2">
                    <span className="inline-block px-3 py-1 bg-dark-700 text-dark-300 rounded text-[10px] font-medium capitalize">
                      {(adForm.cta || 'learn_more').replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
              </div>
              <div className="bg-dark-900/30 rounded-lg p-3 mt-4">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-dark-500">Name:</span> <span className="text-white">{adForm.name || '-'}</span></div>
                  <div><span className="text-dark-500">Format:</span> <span className="text-white capitalize">{adForm.format}</span></div>
                  <div><span className="text-dark-500">CTA:</span> <span className="text-white capitalize">{(adForm.cta || '').replace(/_/g, ' ')}</span></div>
                  <div><span className="text-dark-500">URL:</span> <span className="text-white truncate">{adForm.destinationUrl || '-'}</span></div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Modal>

      {/* Delete modal */}
      <Modal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, ad: null, adSetId: null })}
        title="Delete Ad"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteModal({ open: false, ad: null, adSetId: null })}>Cancel</Button>
            <Button variant="danger" icon={Trash2} loading={deleteLoading} onClick={handleDeleteAd}>Delete</Button>
          </>
        }
      >
        <p className="text-dark-300 text-sm">
          Are you sure you want to delete <span className="text-white font-medium">{deleteModal.ad?.name}</span>?
        </p>
      </Modal>
    </motion.div>
  );
}

// ── Analytics Tab ───────────────────────────────────────────────────────────

function AnalyticsTab({ campaign }) {
  const id = campaign._id || campaign.id;
  const [dateRange, setDateRange] = useState('30d');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeMetrics, setActiveMetrics] = useState(['spend', 'clicks', 'conversions']);

  const METRIC_OPTIONS = [
    { id: 'spend', label: 'Spend', color: '#6366f1' },
    { id: 'clicks', label: 'Clicks', color: '#8b5cf6' },
    { id: 'conversions', label: 'Conversions', color: '#06b6d4' },
    { id: 'impressions', label: 'Impressions', color: '#f59e0b' },
    { id: 'ctr', label: 'CTR', color: '#22c55e' },
    { id: 'cpc', label: 'CPC', color: '#ef4444' },
    { id: 'roas', label: 'ROAS', color: '#ec4899' },
  ];

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const days = DATE_RANGES.find((r) => r.value === dateRange)?.days || 30;
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
      const response = await campaignsAPI.analytics(id, { startDate, endDate, detailed: true });
      setData(Array.isArray(response) ? response : response?.daily || response?.data || []);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setLoading(false);
    }
  }, [id, dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleMetric = (metricId) => {
    setActiveMetrics((prev) =>
      prev.includes(metricId)
        ? prev.filter((m) => m !== metricId)
        : [...prev, metricId]
    );
  };

  const tableColumns = [
    { key: 'date', label: 'Date', sortable: true },
    { key: 'impressions', label: 'Impressions', render: (v) => formatNumber(v) },
    { key: 'clicks', label: 'Clicks', render: (v) => formatNumber(v) },
    { key: 'ctr', label: 'CTR', render: (v) => formatPercent(v) },
    { key: 'spend', label: 'Spend', render: (v) => <span className="text-white font-medium">{formatCurrency(v)}</span> },
    { key: 'conversions', label: 'Conv.', render: (v) => formatNumber(v) },
    { key: 'cpc', label: 'CPC', render: (v) => formatCurrency(v) },
    { key: 'roas', label: 'ROAS', render: (v) => (
      <span className={`font-medium ${(v || 0) >= 3 ? 'text-accent-400' : (v || 0) >= 1 ? 'text-warning-400' : 'text-danger-400'}`}>
        {formatRoas(v)}
      </span>
    ) },
  ];

  return (
    <motion.div variants={fadeVariants} initial="hidden" animate="visible" className="space-y-6">
      {/* Date range + metric toggles */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-1 bg-dark-800/60 rounded-xl p-1 border border-dark-700/50">
          {DATE_RANGES.map((range) => (
            <button
              key={range.value}
              onClick={() => setDateRange(range.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                dateRange === range.value
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-dark-400 hover:text-white hover:bg-dark-700/50'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {METRIC_OPTIONS.map((metric) => (
            <button
              key={metric.id}
              onClick={() => toggleMetric(metric.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all duration-200 ${
                activeMetrics.includes(metric.id)
                  ? 'border-opacity-30 text-opacity-100'
                  : 'border-dark-700/50 text-dark-500 hover:text-dark-300'
              }`}
              style={
                activeMetrics.includes(metric.id)
                  ? { borderColor: metric.color + '50', color: metric.color, backgroundColor: metric.color + '15' }
                  : {}
              }
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: activeMetrics.includes(metric.id) ? metric.color : '#475569' }}
              />
              {metric.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <Card>
        {loading ? (
          <div className="w-full h-[360px] flex items-end gap-2 p-4 animate-pulse">
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className="flex-1 bg-dark-700/40 rounded-t" style={{ height: `${30 + Math.random() * 60}%` }} />
            ))}
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[360px] text-dark-400">
            <BarChart3 size={36} className="mb-3 text-dark-500" />
            <p className="text-sm">No analytics data available</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={360}>
            <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#1e293b' }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#334155' }} />
              <Legend wrapperStyle={{ paddingTop: 16 }} formatter={(value) => <span className="text-xs text-dark-300 capitalize">{value}</span>} />
              {METRIC_OPTIONS.filter((m) => activeMetrics.includes(m.id)).map((metric) => (
                <Line
                  key={metric.id}
                  type="monotone"
                  dataKey={metric.id}
                  stroke={metric.color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5, fill: metric.color, stroke: '#1e293b', strokeWidth: 2 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Daily Breakdown Table */}
      <Card header="Daily Breakdown" padding={false}>
        <Table
          columns={tableColumns}
          data={data}
          loading={loading}
          sortable
          emptyMessage="No analytics data available for this period"
        />
      </Card>
    </motion.div>
  );
}

// ── Settings Tab ────────────────────────────────────────────────────────────

function SettingsTab({ campaign, onRefresh }) {
  const navigate = useNavigate();
  const id = campaign._id || campaign.id;
  const [form, setForm] = useState({
    name: campaign.name || '',
    objective: campaign.objective || '',
    budget: campaign.budget?.toString() || '',
    budgetType: campaign.budgetType || 'daily',
    startDate: campaign.startDate ? campaign.startDate.split('T')[0] : '',
    endDate: campaign.endDate ? campaign.endDate.split('T')[0] : '',
  });
  const [saving, setSaving] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Campaign name is required');
      return;
    }
    try {
      setSaving(true);
      await campaignsAPI.update(id, {
        ...form,
        budget: parseFloat(form.budget) || 0,
      });
      toast.success('Campaign settings updated');
      onRefresh?.();
    } catch (err) {
      toast.error('Failed to update campaign');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCampaign = async () => {
    try {
      setDeleteLoading(true);
      await campaignsAPI.delete(id);
      toast.success('Campaign deleted');
      navigate('/campaigns');
    } catch (err) {
      toast.error('Failed to delete campaign');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <motion.div variants={fadeVariants} initial="hidden" animate="visible" className="space-y-6 max-w-2xl">
      <Card header="Campaign Settings">
        <div className="space-y-5">
          <Input
            label="Campaign Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Campaign name"
          />
          <Input
            label="Objective"
            type="select"
            value={form.objective}
            onChange={(e) => setForm({ ...form, objective: e.target.value })}
            options={[
              { value: 'awareness', label: 'Awareness' },
              { value: 'traffic', label: 'Traffic' },
              { value: 'engagement', label: 'Engagement' },
              { value: 'leads', label: 'Leads' },
              { value: 'sales', label: 'Sales' },
              { value: 'conversions', label: 'Conversions' },
            ]}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Budget"
              type="number"
              icon={DollarSign}
              value={form.budget}
              onChange={(e) => setForm({ ...form, budget: e.target.value })}
              placeholder="0.00"
            />
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1.5">Budget Type</label>
              <div className="flex items-center gap-2">
                {['daily', 'lifetime'].map((bt) => (
                  <button
                    key={bt}
                    onClick={() => setForm({ ...form, budgetType: bt })}
                    className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 capitalize ${
                      form.budgetType === bt
                        ? 'bg-gradient-to-r from-brand-600 to-purple-600 text-white'
                        : 'bg-dark-700/50 text-dark-400 hover:text-white hover:bg-dark-700'
                    }`}
                  >
                    {bt}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Date"
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            />
            <Input
              label="End Date"
              type="date"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
            />
          </div>
          <div className="pt-3">
            <Button loading={saving} onClick={handleSave}>
              Save Changes
            </Button>
          </div>
        </div>
      </Card>

      {/* Danger zone */}
      <Card className="border-danger-500/20">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-danger-500/10 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={20} className="text-danger-400" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-white mb-1">Danger Zone</h4>
            <p className="text-xs text-dark-400 mb-4">
              Deleting this campaign is permanent. All ad sets, ads, and analytics data will be lost.
            </p>
            <Button variant="danger" icon={Trash2} size="sm" onClick={() => setDeleteModalOpen(true)}>
              Delete Campaign
            </Button>
          </div>
        </div>
      </Card>

      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete Campaign"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteModalOpen(false)}>Cancel</Button>
            <Button variant="danger" icon={Trash2} loading={deleteLoading} onClick={handleDeleteCampaign}>
              Delete Forever
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-dark-300 text-sm">
            Are you sure you want to permanently delete <span className="text-white font-medium">{campaign.name}</span>?
          </p>
          <p className="text-dark-400 text-xs">
            This action cannot be undone. All ad sets, ads, and associated analytics data will be permanently removed.
          </p>
        </div>
      </Modal>
    </motion.div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function CampaignDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [actionLoading, setActionLoading] = useState('');
  const nameInputRef = useRef(null);

  const fetchCampaign = useCallback(async () => {
    try {
      setLoading(true);
      const data = await campaignsAPI.get(id);
      const campaign = data?.campaign || data;
      setCampaign(campaign);
      setNameInput(campaign.name || '');
    } catch (err) {
      console.error('Failed to fetch campaign:', err);
      toast.error('Failed to load campaign');
      navigate('/campaigns');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchCampaign();
  }, [fetchCampaign]);

  useEffect(() => {
    if (editingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [editingName]);

  const handleNameSave = async () => {
    if (!nameInput.trim()) {
      setNameInput(campaign.name);
      setEditingName(false);
      return;
    }
    if (nameInput === campaign.name) {
      setEditingName(false);
      return;
    }
    try {
      await campaignsAPI.update(id, { name: nameInput });
      setCampaign((prev) => ({ ...prev, name: nameInput }));
      toast.success('Campaign name updated');
    } catch (err) {
      toast.error('Failed to update name');
      setNameInput(campaign.name);
    }
    setEditingName(false);
  };

  const handleAction = async (action) => {
    try {
      setActionLoading(action);
      if (action === 'publish') {
        await campaignsAPI.publish(id);
        toast.success('Campaign published');
      } else if (action === 'pause') {
        await campaignsAPI.pause(id);
        toast.success('Campaign paused');
      } else if (action === 'resume') {
        await campaignsAPI.resume(id);
        toast.success('Campaign resumed');
      }
      fetchCampaign();
    } catch (err) {
      toast.error(`Failed to ${action} campaign`);
    } finally {
      setActionLoading('');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <button className="flex items-center gap-2 text-dark-400 hover:text-white transition-colors" onClick={() => navigate('/campaigns')}>
          <ArrowLeft size={18} />
          <span className="text-sm">Back to Campaigns</span>
        </button>
        <DetailSkeleton />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertTriangle size={48} className="text-warning-400 mb-4" />
        <p className="text-dark-400">Campaign not found</p>
        <Button variant="secondary" className="mt-4" onClick={() => navigate('/campaigns')}>
          Back to Campaigns
        </Button>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[campaign.status] || STATUS_CONFIG.draft;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'adsets', label: 'Ad Sets', icon: Layers, count: campaign.adSets?.length },
    { id: 'ads', label: 'Ads', icon: ImageIcon },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Back button */}
      <button
        className="flex items-center gap-2 text-dark-400 hover:text-white transition-colors"
        onClick={() => navigate('/campaigns')}
      >
        <ArrowLeft size={18} />
        <span className="text-sm">Back to Campaigns</span>
      </button>

      {/* Campaign header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold text-white shadow-lg ${
              campaign.platform === 'meta'
                ? 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-blue-500/20'
                : 'bg-gradient-to-br from-emerald-500 via-yellow-500 to-red-500 shadow-emerald-500/20'
            }`}
          >
            {campaign.platform === 'meta' ? 'M' : 'G'}
          </div>
          <div>
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  ref={nameInputRef}
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleNameSave();
                    if (e.key === 'Escape') {
                      setNameInput(campaign.name);
                      setEditingName(false);
                    }
                  }}
                  onBlur={handleNameSave}
                  className="bg-dark-800 border border-brand-500 text-white rounded-lg px-3 py-1.5 text-xl font-bold focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                />
                <button
                  onClick={handleNameSave}
                  className="p-1.5 rounded-lg text-accent-400 hover:bg-accent-500/10 transition-all"
                >
                  <Check size={16} />
                </button>
                <button
                  onClick={() => {
                    setNameInput(campaign.name);
                    setEditingName(false);
                  }}
                  className="p-1.5 rounded-lg text-dark-400 hover:bg-dark-700/50 transition-all"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group">
                <h1 className="text-xl font-bold text-white">{campaign.name}</h1>
                <button
                  onClick={() => setEditingName(true)}
                  className="p-1 rounded text-dark-500 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Pencil size={14} />
                </button>
              </div>
            )}
            <div className="flex items-center gap-2 mt-1">
              <PlatformBadge platform={campaign.platform} />
              <Badge color={statusCfg.color} dot>{statusCfg.label}</Badge>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {campaign.status === 'active' && (
            <Button
              variant="secondary"
              size="sm"
              icon={Pause}
              loading={actionLoading === 'pause'}
              onClick={() => handleAction('pause')}
            >
              Pause
            </Button>
          )}
          {campaign.status === 'paused' && (
            <Button
              variant="secondary"
              size="sm"
              icon={Play}
              loading={actionLoading === 'resume'}
              onClick={() => handleAction('resume')}
            >
              Resume
            </Button>
          )}
          {(campaign.status === 'draft' || campaign.status === 'paused') && (
            <Button
              size="sm"
              icon={Send}
              loading={actionLoading === 'publish'}
              onClick={() => handleAction('publish')}
            >
              Publish
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Tab content */}
      <AnimatePresence mode="wait">
        {activeTab === 'overview' && <OverviewTab key="overview" campaign={campaign} analytics={campaign.analytics} />}
        {activeTab === 'adsets' && <AdSetsTab key="adsets" campaign={campaign} onRefresh={fetchCampaign} />}
        {activeTab === 'ads' && <AdsTab key="ads" campaign={campaign} onRefresh={fetchCampaign} />}
        {activeTab === 'analytics' && <AnalyticsTab key="analytics" campaign={campaign} />}
        {activeTab === 'settings' && <SettingsTab key="settings" campaign={campaign} onRefresh={fetchCampaign} />}
      </AnimatePresence>
    </motion.div>
  );
}
