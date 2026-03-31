import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  GitCompare,
  Sparkles,
  Calendar,
  Filter,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Lightbulb,
  AlertTriangle,
  Zap,
  ArrowRight,
  Target,
  Eye,
  MousePointerClick,
  DollarSign,
  Percent,
  Coins,
  Award,
  Download,
} from 'lucide-react';

import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Table from '../components/ui/Table';
import Tabs from '../components/ui/Tabs';
import StatsCard from '../components/ui/StatsCard';
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

function formatMetricValue(metric, value) {
  switch (metric) {
    case 'spend':
    case 'cpc':
      return formatCurrency(value);
    case 'ctr':
      return formatPercent(value);
    case 'roas':
      return formatRoas(value);
    case 'impressions':
    case 'clicks':
    case 'conversions':
      return formatNumber(value);
    default:
      return formatNumber(value);
  }
}

const CHART_COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6'];

const METRIC_OPTIONS = [
  { value: 'spend', label: 'Spend', icon: DollarSign },
  { value: 'impressions', label: 'Impressions', icon: Eye },
  { value: 'clicks', label: 'Clicks', icon: MousePointerClick },
  { value: 'conversions', label: 'Conversions', icon: Target },
  { value: 'ctr', label: 'CTR', icon: Percent },
  { value: 'cpc', label: 'CPC', icon: Coins },
  { value: 'roas', label: 'ROAS', icon: TrendingUp },
];

const PLATFORM_OPTIONS = [
  { value: 'all', label: 'All Platforms' },
  { value: 'meta', label: 'Meta' },
  { value: 'google', label: 'Google' },
];

// ── Animation Variants ───────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

const tabContentVariants = {
  initial: { opacity: 0, x: 10 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, x: -10, transition: { duration: 0.15 } },
};

// ── Custom Tooltip ───────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label, metricKey }) {
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
            {formatMetricValue(metricKey || entry.dataKey, entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

function PieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  return (
    <div className="bg-dark-800 border border-dark-700 rounded-xl p-3 shadow-2xl shadow-black/40">
      <div className="flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-full" style={{ background: entry.payload.fill }} />
        <span className="text-sm text-dark-300">{entry.name}</span>
      </div>
      <p className="text-sm font-semibold text-white mt-1">{entry.value} campaigns</p>
    </div>
  );
}

// ── Chart Skeleton ───────────────────────────────────────────────────────────

function ChartSkeleton({ height = 360 }) {
  return (
    <div className="animate-pulse" style={{ height }}>
      <div className="w-full h-full flex items-end gap-2 p-4">
        {Array.from({ length: 16 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 bg-dark-700/40 rounded-t"
            style={{ height: `${25 + Math.random() * 65}%` }}
          />
        ))}
      </div>
    </div>
  );
}

// ── Select Component ─────────────────────────────────────────────────────────

function Select({ options, value, onChange, icon: Icon, className = '' }) {
  return (
    <div className={`relative ${className}`}>
      {Icon && (
        <Icon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400 pointer-events-none" />
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`appearance-none bg-dark-800 border border-dark-600 text-white text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all duration-200 pr-8 py-2 ${
          Icon ? 'pl-9' : 'pl-3'
        }`}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 pointer-events-none"
      />
    </div>
  );
}

// ── Insight Type Icons ───────────────────────────────────────────────────────

const insightTypeConfig = {
  improvement: {
    icon: TrendingUp,
    color: 'text-accent-400',
    bg: 'bg-accent-500/10',
    border: 'border-accent-500/20',
    badgeColor: 'green',
    label: 'Improvement',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-warning-400',
    bg: 'bg-warning-500/10',
    border: 'border-warning-500/20',
    badgeColor: 'yellow',
    label: 'Warning',
  },
  opportunity: {
    icon: Lightbulb,
    color: 'text-brand-400',
    bg: 'bg-brand-500/10',
    border: 'border-brand-500/20',
    badgeColor: 'blue',
    label: 'Opportunity',
  },
  default: {
    icon: Zap,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    badgeColor: 'purple',
    label: 'Insight',
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// OVERVIEW TAB
// ══════════════════════════════════════════════════════════════════════════════

function OverviewTab() {
  const [metric, setMetric] = useState('spend');
  const [platform, setPlatform] = useState('all');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [trends, setTrends] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [trendsData, dashData] = await Promise.allSettled([
        analyticsAPI.trends({ startDate, endDate, metric, platform: platform === 'all' ? undefined : platform }),
        analyticsAPI.dashboard(),
      ]);
      if (trendsData.status === 'fulfilled') {
        setTrends(Array.isArray(trendsData.value) ? trendsData.value : trendsData.value?.data || []);
      }
      if (dashData.status === 'fulfilled') {
        setDashboard(dashData.value);
      }
    } catch (err) {
      console.error('Overview fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, metric, platform]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const overview = dashboard?.overview || {};

  const summaryStats = [
    { label: 'Total Spend', value: formatCurrency(overview.totalSpend), icon: DollarSign, color: 'brand' },
    { label: 'Impressions', value: formatNumber(overview.totalImpressions), icon: Eye, color: 'blue' },
    { label: 'Clicks', value: formatNumber(overview.totalClicks), icon: MousePointerClick, color: 'purple' },
    { label: 'Conversions', value: formatNumber(overview.totalConversions), icon: Target, color: 'green' },
  ];

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      {/* Controls */}
      <motion.div variants={itemVariants}>
        <Card>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-dark-400" />
              <span className="text-xs text-dark-400 font-medium">Date Range</span>
            </div>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-dark-800 border border-dark-600 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all"
            />
            <span className="text-dark-500 text-sm">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-dark-800 border border-dark-600 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all"
            />
            <div className="border-l border-dark-700 pl-4 ml-2 flex items-center gap-3">
              <Select
                options={METRIC_OPTIONS}
                value={metric}
                onChange={setMetric}
                icon={BarChart3}
              />
              <Select
                options={PLATFORM_OPTIONS}
                value={platform}
                onChange={setPlatform}
                icon={Filter}
              />
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Summary Stats */}
      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {summaryStats.map((stat) => (
            <StatsCard key={stat.label} label={stat.label} value={stat.value} icon={stat.icon} color={stat.color} />
          ))}
        </div>
      </motion.div>

      {/* Main Chart */}
      <motion.div variants={itemVariants}>
        <Card
          header={
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">
                {METRIC_OPTIONS.find((m) => m.value === metric)?.label || 'Metric'} Over Time
              </h3>
              <Badge color="blue">
                {platform === 'all' ? 'All Platforms' : platform === 'meta' ? 'Meta' : 'Google'}
              </Badge>
            </div>
          }
        >
          {loading ? (
            <ChartSkeleton />
          ) : trends.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[360px] text-dark-400">
              <BarChart3 size={40} className="mb-3 text-dark-500" />
              <p className="text-sm">No data available for the selected range</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={360}>
              <AreaChart data={trends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradOverviewMetric" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
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
                  tickFormatter={(v) => formatMetricValue(metric, v)}
                />
                <Tooltip content={<ChartTooltip metricKey={metric} />} cursor={{ stroke: '#334155' }} />
                <Area
                  type="monotone"
                  dataKey={metric}
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  fill="url(#gradOverviewMetric)"
                  dot={false}
                  activeDot={{ r: 5, fill: '#6366f1', stroke: '#0f172a', strokeWidth: 2 }}
                  name={METRIC_OPTIONS.find((m) => m.value === metric)?.label}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>
      </motion.div>
    </motion.div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PERFORMANCE TAB
// ══════════════════════════════════════════════════════════════════════════════

function PerformanceTab() {
  const [metric, setMetric] = useState('roas');
  const [platform, setPlatform] = useState('all');
  const [topCampaigns, setTopCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await analyticsAPI.topCampaigns({
        metric,
        platform: platform === 'all' ? undefined : platform,
        limit: 10,
      });
      setTopCampaigns(Array.isArray(data) ? data : data?.campaigns || []);
    } catch (err) {
      console.error('Performance fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [metric, platform]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Derive objective breakdown from campaigns
  const objectiveBreakdown = React.useMemo(() => {
    const counts = {};
    topCampaigns.forEach((c) => {
      const obj = c.objective || 'Other';
      counts[obj] = (counts[obj] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [topCampaigns]);

  // Bar chart data (top 10)
  const barChartData = topCampaigns.slice(0, 10).map((c) => ({
    name: c.name?.length > 20 ? c.name.slice(0, 20) + '...' : c.name,
    [metric]: c[metric] || 0,
  }));

  const campaignColumns = [
    {
      key: 'name',
      label: 'Campaign',
      render: (val, row) => (
        <div className="flex items-center gap-3">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white ${
              row.platform === 'meta'
                ? 'bg-gradient-to-br from-blue-500 to-blue-600'
                : 'bg-gradient-to-br from-emerald-500 to-emerald-600'
            }`}
          >
            {row.platform === 'meta' ? 'M' : 'G'}
          </div>
          <span className="text-sm font-medium text-white">{val}</span>
        </div>
      ),
    },
    {
      key: 'objective',
      label: 'Objective',
      render: (val) => <span className="text-dark-300 capitalize text-xs">{val || '-'}</span>,
    },
    {
      key: 'spend',
      label: 'Spend',
      render: (val) => <span className="text-white">{formatCurrency(val)}</span>,
    },
    {
      key: 'impressions',
      label: 'Impressions',
      render: (val) => formatNumber(val),
    },
    {
      key: 'clicks',
      label: 'Clicks',
      render: (val) => formatNumber(val),
    },
    {
      key: 'conversions',
      label: 'Conversions',
      render: (val) => formatNumber(val),
    },
    {
      key: 'ctr',
      label: 'CTR',
      render: (val) => formatPercent(val),
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

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      {/* Controls */}
      <motion.div variants={itemVariants}>
        <Card>
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm text-dark-400">Sort by</span>
            <Select options={METRIC_OPTIONS} value={metric} onChange={setMetric} icon={BarChart3} />
            <Select options={PLATFORM_OPTIONS} value={platform} onChange={setPlatform} icon={Filter} />
          </div>
        </Card>
      </motion.div>

      {/* Top Campaigns Table */}
      <motion.div variants={itemVariants}>
        <Card
          header={
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Award size={18} className="text-brand-400" />
                <h3 className="text-base font-semibold text-white">
                  Top Campaigns by {METRIC_OPTIONS.find((m) => m.value === metric)?.label}
                </h3>
              </div>
              <Badge color="purple">{topCampaigns.length} campaigns</Badge>
            </div>
          }
          padding={false}
        >
          <Table columns={campaignColumns} data={topCampaigns} loading={loading} emptyMessage="No campaign data available" />
        </Card>
      </motion.div>

      {/* Charts Row */}
      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Bar Chart */}
          <div className="lg:col-span-2">
            <Card header={<h3 className="text-base font-semibold text-white">Top 10 Comparison</h3>}>
              {loading ? (
                <ChartSkeleton height={320} />
              ) : barChartData.length === 0 ? (
                <div className="flex items-center justify-center h-[320px] text-dark-400 text-sm">
                  No data
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={barChartData} margin={{ top: 10, right: 10, left: 0, bottom: 60 }}>
                    <defs>
                      <linearGradient id="gradBar" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity={1} />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0.6} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: '#64748b', fontSize: 10 }}
                      tickLine={false}
                      axisLine={{ stroke: '#1e293b' }}
                      angle={-35}
                      textAnchor="end"
                      interval={0}
                    />
                    <YAxis
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => formatMetricValue(metric, v)}
                    />
                    <Tooltip content={<ChartTooltip metricKey={metric} />} cursor={{ fill: 'rgba(99,102,241,0.08)' }} />
                    <Bar
                      dataKey={metric}
                      fill="url(#gradBar)"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={48}
                      name={METRIC_OPTIONS.find((m) => m.value === metric)?.label}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>

          {/* Pie Chart */}
          <div>
            <Card header={<h3 className="text-base font-semibold text-white">By Objective</h3>}>
              {loading ? (
                <ChartSkeleton height={320} />
              ) : objectiveBreakdown.length === 0 ? (
                <div className="flex items-center justify-center h-[320px] text-dark-400 text-sm">
                  No data
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie
                      data={objectiveBreakdown}
                      cx="50%"
                      cy="45%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={4}
                      dataKey="value"
                      stroke="none"
                    >
                      {objectiveBreakdown.map((_, idx) => (
                        <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                    <Legend
                      wrapperStyle={{ paddingTop: 16 }}
                      formatter={(value) => (
                        <span className="text-xs text-dark-300 capitalize">{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PLATFORM COMPARISON TAB
// ══════════════════════════════════════════════════════════════════════════════

function PlatformComparisonTab() {
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await analyticsAPI.platformComparison();
        setComparison(data);
      } catch (err) {
        console.error('Platform comparison fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const meta = comparison?.meta || {};
  const google = comparison?.google || {};

  // Side-by-side bar chart data
  const comparisonMetrics = [
    { name: 'Spend', meta: meta.spend || 0, google: google.spend || 0, format: 'currency' },
    { name: 'Impressions', meta: meta.impressions || 0, google: google.impressions || 0, format: 'number' },
    { name: 'Clicks', meta: meta.clicks || 0, google: google.clicks || 0, format: 'number' },
    { name: 'Conversions', meta: meta.conversions || 0, google: google.conversions || 0, format: 'number' },
    { name: 'CTR (%)', meta: meta.ctr || 0, google: google.ctr || 0, format: 'percent' },
    { name: 'ROAS', meta: meta.roas || 0, google: google.roas || 0, format: 'roas' },
  ];

  // Radar chart data: normalize values to 0-100 scale for comparison
  const radarData = React.useMemo(() => {
    const metrics = [
      { key: 'spend', label: 'Spend' },
      { key: 'impressions', label: 'Impressions' },
      { key: 'clicks', label: 'Clicks' },
      { key: 'conversions', label: 'Conversions' },
      { key: 'ctr', label: 'CTR' },
      { key: 'roas', label: 'ROAS' },
    ];
    return metrics.map((m) => {
      const metaVal = meta[m.key] || 0;
      const googleVal = google[m.key] || 0;
      const max = Math.max(metaVal, googleVal, 1);
      return {
        metric: m.label,
        Meta: Math.round((metaVal / max) * 100),
        Google: Math.round((googleVal / max) * 100),
      };
    });
  }, [meta, google]);

  // Determine recommendation
  const recommendation = React.useMemo(() => {
    if (!comparison) return null;
    const metaRoas = meta.roas || 0;
    const googleRoas = google.roas || 0;
    if (metaRoas > googleRoas && metaRoas > 0) {
      return {
        platform: 'Meta',
        text: `Meta Ads is outperforming Google Ads with a ROAS of ${formatRoas(metaRoas)} vs ${formatRoas(googleRoas)}. Consider shifting more budget to Meta for better returns.`,
        color: 'text-blue-400',
      };
    } else if (googleRoas > metaRoas && googleRoas > 0) {
      return {
        platform: 'Google',
        text: `Google Ads is outperforming Meta Ads with a ROAS of ${formatRoas(googleRoas)} vs ${formatRoas(metaRoas)}. Consider increasing Google Ads investment.`,
        color: 'text-emerald-400',
      };
    }
    return {
      platform: 'Both',
      text: 'Both platforms are performing similarly. Continue A/B testing to find the best strategy for your campaigns.',
      color: 'text-brand-400',
    };
  }, [comparison, meta, google]);

  // Metric cards for comparison
  function ComparisonRow({ label, metaVal, googleVal, format }) {
    const formatFn =
      format === 'currency'
        ? formatCurrency
        : format === 'percent'
        ? formatPercent
        : format === 'roas'
        ? formatRoas
        : formatNumber;
    const metaWins = metaVal > googleVal;
    const googleWins = googleVal > metaVal;
    // For some metrics (CPC), lower is better - but we'll keep it simple for spend/conversions context
    return (
      <div className="grid grid-cols-3 gap-4 items-center py-3 border-b border-dark-700/30 last:border-0">
        <div className={`text-right font-semibold text-sm ${metaWins ? 'text-blue-400' : 'text-dark-300'}`}>
          {formatFn(metaVal)}
        </div>
        <div className="text-center text-xs text-dark-400 font-medium">{label}</div>
        <div className={`text-left font-semibold text-sm ${googleWins ? 'text-emerald-400' : 'text-dark-300'}`}>
          {formatFn(googleVal)}
        </div>
      </div>
    );
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      {/* Head-to-Head Comparison */}
      <motion.div variants={itemVariants}>
        <Card
          header={
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">Head-to-Head Comparison</h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-xs text-dark-300">Meta</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-xs text-dark-300">Google</span>
                </div>
              </div>
            </div>
          }
        >
          {loading ? (
            <div className="animate-pulse space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-8 bg-dark-700/40 rounded" />
              ))}
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-3 gap-4 pb-3 border-b border-dark-700/50 mb-2">
                <div className="text-right">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center ml-auto mb-1">
                    <span className="text-sm font-bold text-white">M</span>
                  </div>
                  <span className="text-xs text-dark-400">Meta Ads</span>
                </div>
                <div className="text-center text-xs text-dark-500 pt-3">VS</div>
                <div className="text-left">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center mb-1">
                    <span className="text-sm font-bold text-white">G</span>
                  </div>
                  <span className="text-xs text-dark-400">Google Ads</span>
                </div>
              </div>
              {comparisonMetrics.map((m) => (
                <ComparisonRow
                  key={m.name}
                  label={m.name}
                  metaVal={m.meta}
                  googleVal={m.google}
                  format={m.format}
                />
              ))}
            </div>
          )}
        </Card>
      </motion.div>

      {/* Charts Row */}
      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Side-by-side Bar Chart */}
          <Card header={<h3 className="text-base font-semibold text-white">Metrics Comparison</h3>}>
            {loading ? (
              <ChartSkeleton height={340} />
            ) : (
              <ResponsiveContainer width="100%" height={340}>
                <BarChart
                  data={comparisonMetrics}
                  margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis
                    dataKey="name"
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
                  <Tooltip
                    content={<ChartTooltip />}
                    cursor={{ fill: 'rgba(99,102,241,0.06)' }}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: 12 }}
                    formatter={(value) => (
                      <span className="text-xs text-dark-300">{value}</span>
                    )}
                  />
                  <Bar dataKey="meta" name="Meta" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="google" name="Google" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          {/* Radar Chart */}
          <Card header={<h3 className="text-base font-semibold text-white">Performance Radar</h3>}>
            {loading ? (
              <ChartSkeleton height={340} />
            ) : (
              <ResponsiveContainer width="100%" height={340}>
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                  <PolarGrid stroke="#334155" />
                  <PolarAngleAxis
                    dataKey="metric"
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                  />
                  <PolarRadiusAxis
                    angle={30}
                    domain={[0, 100]}
                    tick={{ fill: '#475569', fontSize: 10 }}
                    tickCount={5}
                  />
                  <Radar
                    name="Meta"
                    dataKey="Meta"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                  <Radar
                    name="Google"
                    dataKey="Google"
                    stroke="#10b981"
                    fill="#10b981"
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: 12 }}
                    formatter={(value) => (
                      <span className="text-xs text-dark-300">{value}</span>
                    )}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '12px',
                      color: '#f1f5f9',
                      fontSize: '12px',
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>
      </motion.div>

      {/* Recommendation */}
      {recommendation && !loading && (
        <motion.div variants={itemVariants}>
          <Card>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center flex-shrink-0">
                <Lightbulb size={20} className="text-brand-400" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white mb-1">AI Recommendation</h4>
                <p className="text-sm text-dark-300 leading-relaxed">{recommendation.text}</p>
              </div>
            </div>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// AI INSIGHTS TAB
// ══════════════════════════════════════════════════════════════════════════════

function AIInsightsTab() {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const fetchInsights = useCallback(async () => {
    try {
      setLoading(true);
      const data = await analyticsAPI.aiInsights();
      setInsights(Array.isArray(data) ? data : data?.insights || []);
    } catch (err) {
      console.error('AI Insights fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      const data = await analyticsAPI.aiInsights({ refresh: true });
      setInsights(Array.isArray(data) ? data : data?.insights || []);
    } catch (err) {
      console.error('Generate insights error:', err);
    } finally {
      setGenerating(false);
    }
  };

  const toggleExpanded = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  function ConfidenceBar({ level }) {
    const pct = typeof level === 'number' ? level : level === 'high' ? 90 : level === 'medium' ? 60 : 30;
    const color =
      pct >= 80 ? 'bg-accent-500' : pct >= 50 ? 'bg-warning-500' : 'bg-danger-500';
    return (
      <div className="flex items-center gap-2 mt-2">
        <span className="text-xs text-dark-400">Confidence</span>
        <div className="flex-1 h-1.5 bg-dark-700 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
        </div>
        <span className="text-xs text-dark-400">{pct}%</span>
      </div>
    );
  }

  function InsightCard({ insight, index }) {
    const config = insightTypeConfig[insight.type] || insightTypeConfig.default;
    const Icon = config.icon;
    const isExpanded = expandedId === (insight.id || index);

    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
      >
        <div
          className={`bg-dark-900/50 border rounded-xl transition-all duration-200 ${
            isExpanded ? `${config.border} border-opacity-100` : 'border-dark-700/30 hover:border-dark-600/50'
          }`}
        >
          <button
            className="w-full text-left p-5 focus:outline-none"
            onClick={() => toggleExpanded(insight.id || index)}
          >
            <div className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-lg ${config.bg} flex items-center justify-center flex-shrink-0`}>
                <Icon size={18} className={config.color} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge color={config.badgeColor}>{config.label}</Badge>
                </div>
                <h4 className="text-sm font-semibold text-white mb-1">{insight.title}</h4>
                <p className="text-xs text-dark-400 leading-relaxed line-clamp-2">
                  {insight.description}
                </p>
                <ConfidenceBar level={insight.confidence} />
              </div>
              <div className="flex-shrink-0 pt-1">
                {isExpanded ? (
                  <ChevronUp size={16} className="text-dark-400" />
                ) : (
                  <ChevronDown size={16} className="text-dark-400" />
                )}
              </div>
            </div>
          </button>

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-5 pb-5 pt-0">
                  <div className="border-t border-dark-700/30 pt-4 ml-14">
                    {insight.details && (
                      <div className="mb-4">
                        <h5 className="text-xs font-semibold text-dark-300 uppercase tracking-wider mb-2">Details</h5>
                        <p className="text-sm text-dark-300 leading-relaxed">{insight.details}</p>
                      </div>
                    )}
                    {insight.suggestedAction && (
                      <div className="bg-brand-500/5 border border-brand-500/10 rounded-lg p-4">
                        <h5 className="text-xs font-semibold text-brand-400 uppercase tracking-wider mb-2">
                          Suggested Action
                        </h5>
                        <p className="text-sm text-dark-300 leading-relaxed">
                          {insight.suggestedAction}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-3"
                          iconRight={ArrowRight}
                        >
                          Apply Suggestion
                        </Button>
                      </div>
                    )}
                    {insight.action && !insight.suggestedAction && (
                      <div className="bg-brand-500/5 border border-brand-500/10 rounded-lg p-4">
                        <h5 className="text-xs font-semibold text-brand-400 uppercase tracking-wider mb-2">
                          Suggested Action
                        </h5>
                        <p className="text-sm text-dark-300 leading-relaxed">{insight.action}</p>
                      </div>
                    )}
                    {insight.affectedCampaigns && insight.affectedCampaigns.length > 0 && (
                      <div className="mt-4">
                        <h5 className="text-xs font-semibold text-dark-300 uppercase tracking-wider mb-2">
                          Affected Campaigns
                        </h5>
                        <div className="flex flex-wrap gap-2">
                          {insight.affectedCampaigns.map((c, i) => (
                            <Badge key={i} color="gray">{typeof c === 'string' ? c : c.name}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      {/* Header */}
      <motion.div variants={itemVariants}>
        <Card>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Sparkles size={20} className="text-purple-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">AI-Powered Insights</h3>
                <p className="text-xs text-dark-400">
                  Machine learning analysis of your campaign data
                </p>
              </div>
            </div>
            <Button
              icon={RefreshCw}
              loading={generating}
              onClick={handleGenerate}
              variant="secondary"
              size="sm"
            >
              {generating ? 'Analyzing...' : 'Generate New Insights'}
            </Button>
          </div>
        </Card>
      </motion.div>

      {/* Insights List */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse bg-dark-800/50 border border-dark-700/50 rounded-xl p-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-dark-700 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-dark-700 rounded w-16" />
                  <div className="h-4 bg-dark-700 rounded w-2/3" />
                  <div className="h-3 bg-dark-700/60 rounded w-full" />
                  <div className="h-3 bg-dark-700/60 rounded w-4/5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : insights.length === 0 ? (
        <motion.div variants={itemVariants}>
          <Card>
            <div className="flex flex-col items-center justify-center py-12 text-dark-400">
              <Sparkles size={48} className="mb-4 text-dark-500" />
              <p className="text-base font-medium text-white mb-2">No insights available</p>
              <p className="text-sm text-dark-400 text-center max-w-md mb-6">
                Generate AI insights by clicking the button above. The AI will analyze your
                campaign performance and provide actionable recommendations.
              </p>
              <Button icon={Sparkles} onClick={handleGenerate} loading={generating}>
                Generate Insights
              </Button>
            </div>
          </Card>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {insights.map((insight, i) => (
            <InsightCard key={insight.id || i} insight={insight} index={i} />
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN ANALYTICS COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

const ANALYTICS_TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'performance', label: 'Performance', icon: TrendingUp },
  { id: 'platform-comparison', label: 'Platform Comparison', icon: GitCompare },
  { id: 'ai-insights', label: 'AI Insights', icon: Sparkles },
];

export default function Analytics() {
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('tab') || 'overview';
  });

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    const url = new URL(window.location);
    url.searchParams.set('tab', tabId);
    window.history.replaceState({}, '', url);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab />;
      case 'performance':
        return <PerformanceTab />;
      case 'platform-comparison':
        return <PlatformComparisonTab />;
      case 'ai-insights':
        return <AIInsightsTab />;
      default:
        return <OverviewTab />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <p className="text-dark-400 text-sm mt-1">
            Deep dive into your advertising performance data
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={ANALYTICS_TABS}
        activeTab={activeTab}
        onChange={handleTabChange}
        variant="pills"
      />

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          variants={tabContentVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          {renderTabContent()}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
