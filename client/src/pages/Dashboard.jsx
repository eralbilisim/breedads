import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  DollarSign,
  Eye,
  MousePointerClick,
  Target,
  Percent,
  Coins,
  TrendingUp,
  Megaphone,
  Plus,
  Sparkles,
  BarChart3,
  ArrowRight,
  Lightbulb,
  AlertTriangle,
  Zap,
  RefreshCw,
  Calendar,
  ExternalLink,
} from 'lucide-react';

import StatsCard from '../components/ui/StatsCard';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Table from '../components/ui/Table';
import { analyticsAPI } from '../services/api';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatNumber(num) {
  if (num == null || isNaN(num)) return '0';
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return num.toLocaleString();
}

function formatCurrency(num) {
  if (num == null || isNaN(num)) return '$0';
  if (num >= 1_000_000) return '$' + (num / 1_000_000).toFixed(2) + 'M';
  if (num >= 1_000) return '$' + (num / 1_000).toFixed(1) + 'K';
  return '$' + num.toFixed(2);
}

function formatPercent(num) {
  if (num == null || isNaN(num)) return '0%';
  return num.toFixed(2) + '%';
}

function formatRoas(num) {
  if (num == null || isNaN(num)) return '0x';
  return num.toFixed(2) + 'x';
}

const DATE_RANGES = [
  { label: '7D', value: '7d', days: 7 },
  { label: '14D', value: '14d', days: 14 },
  { label: '30D', value: '30d', days: 30 },
  { label: '90D', value: '90d', days: 90 },
];

// ── Animation Variants ───────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

// ── Custom Tooltip ───────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-dark-800 border border-dark-700 rounded-xl p-4 shadow-2xl shadow-black/40 min-w-[180px]">
      <p className="text-dark-400 text-xs font-medium mb-2">{label}</p>
      {payload.map((entry, idx) => (
        <div key={idx} className="flex items-center justify-between gap-4 py-1">
          <div className="flex items-center gap-2">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: entry.color }}
            />
            <span className="text-sm text-dark-300 capitalize">{entry.name}</span>
          </div>
          <span className="text-sm font-semibold text-white">
            {entry.name === 'spend'
              ? formatCurrency(entry.value)
              : formatNumber(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Skeleton Loaders ─────────────────────────────────────────────────────────

function StatsCardSkeleton() {
  return (
    <div className="bg-dark-800/50 backdrop-blur-sm border border-dark-700/50 rounded-2xl p-6 animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 rounded-xl bg-dark-700" />
        <div className="w-16 h-6 rounded-lg bg-dark-700" />
      </div>
      <div className="w-24 h-7 rounded bg-dark-700 mb-2" />
      <div className="w-32 h-4 rounded bg-dark-700/60" />
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="w-full h-[360px] flex items-end gap-2 p-4 animate-pulse">
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={i}
          className="flex-1 bg-dark-700/40 rounded-t"
          style={{ height: `${30 + Math.random() * 60}%` }}
        />
      ))}
    </div>
  );
}

// ── Insight Card ─────────────────────────────────────────────────────────────

const insightIcons = {
  improvement: { icon: TrendingUp, color: 'text-accent-400', bg: 'bg-accent-500/10' },
  warning: { icon: AlertTriangle, color: 'text-warning-400', bg: 'bg-warning-500/10' },
  opportunity: { icon: Lightbulb, color: 'text-brand-400', bg: 'bg-brand-500/10' },
  default: { icon: Zap, color: 'text-purple-400', bg: 'bg-purple-500/10' },
};

function normalizeInsights(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;

  const items = [];
  const { insights, recommendations, alerts } = payload;

  if (Array.isArray(alerts)) {
    alerts.forEach((a, i) => {
      items.push({
        id: `alert-${i}`,
        type: a.type === 'warning' ? 'warning' : a.type === 'success' ? 'success' : 'opportunity',
        title: a.type ? a.type.charAt(0).toUpperCase() + a.type.slice(1) : 'Alert',
        description: a.message || '',
      });
    });
  }

  if (typeof insights === 'string' && insights.trim()) {
    items.push({
      id: 'summary',
      type: 'opportunity',
      title: 'Summary',
      description: insights,
    });
  }

  if (Array.isArray(recommendations)) {
    recommendations.forEach((r, i) => {
      items.push({
        id: `rec-${i}`,
        type: 'opportunity',
        title: 'Recommendation',
        description: typeof r === 'string' ? r : r?.message || '',
      });
    });
  }

  return items;
}

function InsightItem({ insight }) {
  const config = insightIcons[insight.type] || insightIcons.default;
  const Icon = config.icon;
  return (
    <div className="flex gap-4 p-4 rounded-xl bg-dark-900/50 border border-dark-700/30 hover:border-dark-600/50 transition-all duration-200">
      <div className={`w-10 h-10 rounded-lg ${config.bg} flex items-center justify-center flex-shrink-0`}>
        <Icon size={18} className={config.color} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white mb-1">{insight.title}</p>
        <p className="text-xs text-dark-400 leading-relaxed">{insight.description}</p>
        {insight.action && (
          <button className="text-xs text-brand-400 hover:text-brand-300 mt-2 flex items-center gap-1 transition-colors">
            {insight.action} <ArrowRight size={12} />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Platform Card ────────────────────────────────────────────────────────────

function PlatformCard({ name, data, color, gradient }) {
  if (!data) return null;
  const metrics = [
    { label: 'Spend', value: formatCurrency(data.spend) },
    { label: 'Impressions', value: formatNumber(data.impressions) },
    { label: 'Clicks', value: formatNumber(data.clicks) },
    { label: 'Conversions', value: formatNumber(data.conversions) },
    { label: 'CTR', value: formatPercent(data.ctr) },
    { label: 'ROAS', value: formatRoas(data.roas) },
  ];
  return (
    <Card>
      <div className="flex items-center gap-3 mb-5">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center`}>
          <span className="text-lg font-bold text-white">
            {name === 'Meta' ? 'M' : 'G'}
          </span>
        </div>
        <div>
          <h3 className="text-base font-semibold text-white">{name} Ads</h3>
          <p className="text-xs text-dark-400">Performance overview</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {metrics.map((m) => (
          <div key={m.label} className="bg-dark-900/50 rounded-lg p-3">
            <p className="text-xs text-dark-400 mb-1">{m.label}</p>
            <p className={`text-sm font-semibold ${color}`}>{m.value}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── Status badge helper ──────────────────────────────────────────────────────

function campaignStatusBadge(status) {
  const map = {
    active: { color: 'green', label: 'Active' },
    paused: { color: 'yellow', label: 'Paused' },
    completed: { color: 'blue', label: 'Completed' },
    draft: { color: 'gray', label: 'Draft' },
    error: { color: 'red', label: 'Error' },
  };
  const cfg = map[status] || map.draft;
  return <Badge color={cfg.color} dot>{cfg.label}</Badge>;
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [trends, setTrends] = useState([]);
  const [insights, setInsights] = useState([]);
  const [dateRange, setDateRange] = useState('30d');
  const [trendsLoading, setTrendsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch dashboard data
  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [dashData, insightsData] = await Promise.allSettled([
        analyticsAPI.dashboard(),
        analyticsAPI.aiInsights(),
      ]);
      if (dashData.status === 'fulfilled') {
        setDashboard(dashData.value);
      }
      if (insightsData.status === 'fulfilled') {
        setInsights(normalizeInsights(insightsData.value));
      }
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch trends data
  const fetchTrends = useCallback(async (range) => {
    try {
      setTrendsLoading(true);
      const rangeDays = DATE_RANGES.find((r) => r.value === range)?.days || 30;
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - rangeDays * 86400000).toISOString().split('T')[0];
      const data = await analyticsAPI.trends({ startDate, endDate, metric: 'all' });
      setTrends(Array.isArray(data) ? data : data?.data || []);
    } catch (err) {
      console.error('Trends fetch error:', err);
    } finally {
      setTrendsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    fetchTrends(dateRange);
  }, [dateRange, fetchTrends]);

  const overview = dashboard?.overview || {};
  const recentCampaigns = dashboard?.recentCampaigns || [];
  const platformBreakdown = dashboard?.platformBreakdown || {};

  // Stats config
  const statsConfig = [
    {
      label: 'Total Spend',
      value: formatCurrency(overview.totalSpend),
      icon: DollarSign,
      color: 'brand',
      change: overview.spendChange,
      changeLabel: 'vs last period',
    },
    {
      label: 'Impressions',
      value: formatNumber(overview.totalImpressions),
      icon: Eye,
      color: 'blue',
      change: overview.impressionsChange,
      changeLabel: 'vs last period',
    },
    {
      label: 'Clicks',
      value: formatNumber(overview.totalClicks),
      icon: MousePointerClick,
      color: 'purple',
      change: overview.clicksChange,
      changeLabel: 'vs last period',
    },
    {
      label: 'Conversions',
      value: formatNumber(overview.totalConversions),
      icon: Target,
      color: 'green',
      change: overview.conversionsChange,
      changeLabel: 'vs last period',
    },
    {
      label: 'CTR',
      value: formatPercent(overview.avgCtr),
      icon: Percent,
      color: 'amber',
      change: overview.ctrChange,
      changeLabel: 'vs last period',
    },
    {
      label: 'CPC',
      value: formatCurrency(overview.avgCpc),
      icon: Coins,
      color: 'red',
      change: overview.cpcChange,
      changeLabel: 'vs last period',
    },
    {
      label: 'ROAS',
      value: formatRoas(overview.avgRoas),
      icon: TrendingUp,
      color: 'green',
      change: overview.roasChange,
      changeLabel: 'vs last period',
    },
    {
      label: 'Active Campaigns',
      value: overview.activeCampaigns?.toString() || '0',
      icon: Megaphone,
      color: 'brand',
      change: null,
    },
  ];

  // Table columns
  const campaignColumns = [
    {
      key: 'name',
      label: 'Campaign',
      render: (val, row) => (
        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white ${
              row.platform === 'meta'
                ? 'bg-gradient-to-br from-blue-500 to-blue-600'
                : 'bg-gradient-to-br from-emerald-500 to-emerald-600'
            }`}
          >
            {row.platform === 'meta' ? 'M' : 'G'}
          </div>
          <div>
            <p className="text-sm font-medium text-white">{val}</p>
            <p className="text-xs text-dark-400 capitalize">{row.objective || row.platform}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (val) => campaignStatusBadge(val),
    },
    {
      key: 'spend',
      label: 'Spend',
      render: (val) => <span className="text-white font-medium">{formatCurrency(val)}</span>,
    },
    {
      key: 'conversions',
      label: 'Conversions',
      render: (val) => <span className="text-white">{formatNumber(val)}</span>,
    },
    {
      key: 'roas',
      label: 'ROAS',
      render: (val) => (
        <span className={`font-medium ${val >= 3 ? 'text-accent-400' : val >= 1 ? 'text-warning-400' : 'text-danger-400'}`}>
          {formatRoas(val)}
        </span>
      ),
    },
  ];

  // Error state
  if (error && !dashboard) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertTriangle size={48} className="text-warning-400" />
        <p className="text-dark-400 text-lg">{error}</p>
        <Button icon={RefreshCw} onClick={fetchDashboard}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-dark-400 text-sm mt-1">
            Overview of your advertising performance
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            icon={RefreshCw}
            onClick={() => {
              fetchDashboard();
              fetchTrends(dateRange);
            }}
          >
            Refresh
          </Button>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={itemVariants} className="flex items-center gap-3 flex-wrap">
        <Button icon={Plus} onClick={() => navigate('/campaigns/new')}>
          New Campaign
        </Button>
        <Button variant="secondary" icon={Sparkles} onClick={() => navigate('/creatives')}>
          Generate Creative
        </Button>
        <Button variant="outline" icon={BarChart3} onClick={() => navigate('/analytics')}>
          View Reports
        </Button>
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {loading
            ? Array.from({ length: 8 }).map((_, i) => <StatsCardSkeleton key={i} />)
            : statsConfig.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.35 }}
                >
                  <StatsCard
                    label={stat.label}
                    value={stat.value}
                    change={stat.change}
                    changeLabel={stat.changeLabel}
                    icon={stat.icon}
                    color={stat.color}
                  />
                </motion.div>
              ))}
        </div>
      </motion.div>

      {/* Platform Comparison */}
      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <PlatformCard
            name="Meta"
            data={platformBreakdown.meta}
            color="text-blue-400"
            gradient="from-blue-500 to-blue-700"
          />
          <PlatformCard
            name="Google"
            data={platformBreakdown.google}
            color="text-emerald-400"
            gradient="from-emerald-500 to-emerald-700"
          />
        </div>
      </motion.div>

      {/* Performance Trend Chart */}
      <motion.div variants={itemVariants}>
        <Card
          header={
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-brand-500/10 flex items-center justify-center">
                  <BarChart3 size={18} className="text-brand-400" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">Performance Trend</h3>
                  <p className="text-xs text-dark-400">Spend, clicks, and conversions over time</p>
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
          {trendsLoading || loading ? (
            <ChartSkeleton />
          ) : trends.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[360px] text-dark-400">
              <Calendar size={40} className="mb-3 text-dark-500" />
              <p className="text-sm">No trend data available for this period</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={360}>
              <AreaChart data={trends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: '#1e293b' }}
                />
                <YAxis
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => formatNumber(v)}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#334155' }} />
                <Legend
                  wrapperStyle={{ paddingTop: 16 }}
                  formatter={(value) => (
                    <span className="text-xs text-dark-300 capitalize">{value}</span>
                  )}
                />
                <Area
                  type="monotone"
                  dataKey="spend"
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  fill="url(#gradSpend)"
                  dot={false}
                  activeDot={{ r: 5, fill: '#6366f1', stroke: '#1e293b', strokeWidth: 2 }}
                />
                <Area
                  type="monotone"
                  dataKey="clicks"
                  stroke="#8b5cf6"
                  strokeWidth={2.5}
                  fill="url(#gradClicks)"
                  dot={false}
                  activeDot={{ r: 5, fill: '#8b5cf6', stroke: '#1e293b', strokeWidth: 2 }}
                />
                <Area
                  type="monotone"
                  dataKey="conversions"
                  stroke="#06b6d4"
                  strokeWidth={2.5}
                  fill="url(#gradConversions)"
                  dot={false}
                  activeDot={{ r: 5, fill: '#06b6d4', stroke: '#1e293b', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>
      </motion.div>

      {/* Bottom Row: Recent Campaigns + AI Insights */}
      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* Recent Campaigns */}
          <div className="xl:col-span-2">
            <Card
              header={
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-white">Recent Campaigns</h3>
                  <button
                    onClick={() => navigate('/campaigns')}
                    className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 transition-colors"
                  >
                    View All <ExternalLink size={12} />
                  </button>
                </div>
              }
              padding={false}
            >
              <Table
                columns={campaignColumns}
                data={recentCampaigns}
                loading={loading}
                sortable={false}
                onRowClick={(row) => navigate(`/campaigns/${row.id || row._id}`)}
                emptyMessage="No campaigns found. Create your first campaign to get started."
              />
            </Card>
          </div>

          {/* AI Insights */}
          <div className="xl:col-span-1">
            <Card
              header={
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <Sparkles size={18} className="text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white">AI Insights</h3>
                    <p className="text-xs text-dark-400">Recommendations for you</p>
                  </div>
                </div>
              }
            >
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="animate-pulse flex gap-3 p-3 rounded-xl bg-dark-900/50">
                      <div className="w-10 h-10 rounded-lg bg-dark-700 flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-dark-700 rounded w-3/4" />
                        <div className="h-2 bg-dark-700/60 rounded w-full" />
                        <div className="h-2 bg-dark-700/60 rounded w-2/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : insights.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-dark-400">
                  <Lightbulb size={32} className="mb-2 text-dark-500" />
                  <p className="text-sm">No insights yet</p>
                  <p className="text-xs text-dark-500 mt-1">
                    Run campaigns to get AI-powered recommendations
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {insights.slice(0, 5).map((insight, i) => (
                    <InsightItem key={insight.id || i} insight={insight} />
                  ))}
                </div>
              )}
              {insights.length > 0 && (
                <button
                  onClick={() => navigate('/analytics?tab=ai-insights')}
                  className="w-full mt-4 py-2.5 text-xs text-brand-400 hover:text-brand-300 border border-dark-700/50 hover:border-dark-600/50 rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5"
                >
                  View All Insights <ArrowRight size={12} />
                </button>
              )}
            </Card>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
