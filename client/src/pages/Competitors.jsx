import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import {
  Search,
  Plus,
  Trash2,
  Eye,
  Brain,
  Globe,
  ExternalLink,
  ArrowLeft,
  Loader2,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Target,
  BarChart3,
  Calendar,
  RefreshCw,
  Shield,
  Crosshair,
  ChevronRight,
  Image,
  FileText,
  Film,
  Layers,
  Clock,
  Users,
  DollarSign,
  Megaphone,
  CheckCircle2,
  XCircle,
  Zap,
  ArrowRight,
} from 'lucide-react';
import { competitorsAPI } from '../services/api';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import StatsCard from '../components/ui/StatsCard';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatNumber(num) {
  if (num == null || isNaN(num)) return '0';
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return Number(num).toLocaleString();
}

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
    transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

// ── Chart Colors ─────────────────────────────────────────────────────────────

const PIE_COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444'];

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-dark-800 border border-dark-700 rounded-xl p-3 shadow-2xl shadow-black/40">
      <div className="flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-full" style={{ background: payload[0].payload.fill }} />
        <span className="text-sm text-dark-300">{payload[0].name}</span>
        <span className="text-sm font-semibold text-white ml-2">{payload[0].value}</span>
      </div>
    </div>
  );
}

// ── Skeleton Loader ──────────────────────────────────────────────────────────

function ResearchCardSkeleton() {
  return (
    <div className="bg-dark-800/50 backdrop-blur-sm border border-dark-700/50 rounded-2xl p-6 animate-pulse">
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-dark-700" />
          <div className="space-y-2">
            <div className="h-5 w-36 bg-dark-700 rounded" />
            <div className="h-3 w-48 bg-dark-700/60 rounded" />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="h-5 w-14 bg-dark-700 rounded-full" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-dark-900/50 rounded-lg p-3">
            <div className="h-2.5 w-12 bg-dark-700/60 rounded mb-2" />
            <div className="h-5 w-10 bg-dark-700 rounded" />
          </div>
        ))}
      </div>
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

// ── New Research Modal ────────────────────────────────────────────────────────

function NewResearchModal({ isOpen, onClose, onSubmit }) {
  const [form, setForm] = useState({
    competitorName: '',
    domain: '',
    platform: 'both',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!form.competitorName.trim()) {
      toast.error('Please enter a competitor name');
      return;
    }
    try {
      setSubmitting(true);
      await onSubmit(form);
      setForm({ competitorName: '', domain: '', platform: 'both' });
      onClose();
    } catch (err) {
      // error handled by parent
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="New Competitor Research"
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button icon={Search} loading={submitting} onClick={handleSubmit}>
            Start Research
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <Input
          label="Competitor Name"
          placeholder="e.g., Competitor Inc."
          value={form.competitorName}
          onChange={(e) => setForm((p) => ({ ...p, competitorName: e.target.value }))}
          icon={Megaphone}
        />
        <Input
          label="Domain URL"
          placeholder="e.g., competitor.com"
          value={form.domain}
          onChange={(e) => setForm((p) => ({ ...p, domain: e.target.value }))}
          icon={Globe}
        />
        <div className="space-y-2">
          <label className="block text-sm font-medium text-dark-300">Platform</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 'meta', label: 'Meta' },
              { value: 'google', label: 'Google' },
              { value: 'both', label: 'Both' },
            ].map((p) => (
              <button
                key={p.value}
                onClick={() => setForm((prev) => ({ ...prev, platform: p.value }))}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-all duration-200 ${
                  form.platform === p.value
                    ? 'border-brand-500/50 bg-brand-500/10 text-brand-400'
                    : 'border-dark-700/50 bg-dark-900/30 text-dark-400 hover:text-white hover:border-dark-600/50'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-dark-900/30 rounded-xl p-4 border border-dark-700/30">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={14} className="text-violet-400" />
            <span className="text-xs font-medium text-dark-300">AI-Powered Research</span>
          </div>
          <p className="text-xs text-dark-500 leading-relaxed">
            Our AI will analyze your competitor&apos;s ad library, creative strategies, messaging themes,
            and provide actionable insights to help you compete effectively.
          </p>
        </div>
      </div>
    </Modal>
  );
}

// ── Detail View ──────────────────────────────────────────────────────────────

function DetailView({ report, onBack, onAnalyze, onDelete }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(report?.aiAnalysis || null);

  const handleAnalyze = async () => {
    const id = report._id || report.id;
    try {
      setAnalyzing(true);
      const result = await competitorsAPI.analyze(id);
      const data = result?.data || result?.analysis || result;
      setAnalysis(data);
      toast.success('AI analysis complete!');
      if (onAnalyze) onAnalyze();
    } catch (err) {
      console.error('Analysis failed:', err);
      toast.error(err?.message || 'Failed to generate analysis');
    } finally {
      setAnalyzing(false);
    }
  };

  // Format breakdown for pie chart
  const formatBreakdown = useMemo(() => {
    const breakdown = report?.formatBreakdown || report?.adFormats || {};
    return Object.entries(breakdown).map(([name, value], idx) => ({
      name,
      value: typeof value === 'number' ? value : (value?.count || 0),
      fill: PIE_COLORS[idx % PIE_COLORS.length],
    })).filter((d) => d.value > 0);
  }, [report]);

  const topCreatives = report?.topCreatives || report?.ads || [];
  const strategy = report?.strategy || {};
  const timeline = report?.timeline || report?.adTimeline || [];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      {/* Back & Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 rounded-xl text-dark-400 hover:text-white hover:bg-dark-700/50 transition-all duration-200"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-xl font-bold text-white">{report?.competitorName || report?.name || 'Competitor'}</h2>
            <div className="flex items-center gap-2 mt-1">
              {report?.domain && (
                <a
                  href={`https://${report.domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-brand-400 hover:text-brand-300 flex items-center gap-1 transition-colors"
                >
                  {report.domain}
                  <ExternalLink size={12} />
                </a>
              )}
              {report?.platform && (
                <Badge color={report.platform === 'meta' ? 'blue' : report.platform === 'google' ? 'green' : 'purple'}>
                  {report.platform === 'both' ? 'Meta + Google' : report.platform}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={Trash2}
            onClick={() => onDelete(report)}
          >
            Delete
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard
          label="Total Ads Found"
          value={formatNumber(report?.totalAds || report?.adsFound || 0)}
          icon={Megaphone}
          color="brand"
        />
        <StatsCard
          label="Active Ads"
          value={formatNumber(report?.activeAds || 0)}
          icon={Zap}
          color="green"
        />
        <StatsCard
          label="Ad Formats Used"
          value={(report?.formatsUsed || formatBreakdown.length || 0).toString()}
          icon={Layers}
          color="purple"
        />
      </div>

      {/* Ad Format Breakdown */}
      {formatBreakdown.length > 0 && (
        <Card>
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <BarChart3 size={16} className="text-brand-400" />
            Ad Count & Format Breakdown
          </h3>
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="w-full md:w-1/2 h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={formatBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {formatBreakdown.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                  <Legend
                    formatter={(value) => <span className="text-xs text-dark-300 capitalize">{value}</span>}
                    wrapperStyle={{ paddingTop: 8 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full md:w-1/2 grid grid-cols-2 gap-2">
              {formatBreakdown.map((item) => (
                <div key={item.name} className="bg-dark-900/50 rounded-lg p-3 flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: item.fill }} />
                  <div>
                    <p className="text-xs text-dark-400 capitalize">{item.name}</p>
                    <p className="text-sm font-semibold text-white">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Top Creatives Gallery */}
      {topCreatives.length > 0 && (
        <Card>
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <Image size={16} className="text-purple-400" />
            Top Creatives
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {topCreatives.map((creative, idx) => (
              <div
                key={creative.id || idx}
                className="bg-dark-900/50 border border-dark-700/30 rounded-xl overflow-hidden hover:border-dark-600/50 transition-all duration-200"
              >
                {creative.imageUrl || creative.thumbnailUrl ? (
                  <img
                    src={creative.imageUrl || creative.thumbnailUrl}
                    alt={`Creative ${idx + 1}`}
                    className="w-full aspect-video object-cover"
                  />
                ) : (
                  <div className="w-full aspect-video bg-dark-800 flex items-center justify-center">
                    <Image size={24} className="text-dark-600" />
                  </div>
                )}
                <div className="p-3 space-y-2">
                  {creative.headline && (
                    <p className="text-sm font-medium text-white line-clamp-2">{creative.headline}</p>
                  )}
                  {creative.description && (
                    <p className="text-xs text-dark-400 line-clamp-2">{creative.description}</p>
                  )}
                  <div className="flex items-center gap-2">
                    {creative.format && <Badge color="blue">{creative.format}</Badge>}
                    {creative.platform && <Badge color="purple">{creative.platform}</Badge>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Ad Strategy Analysis */}
      <Card>
        <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
          <Target size={16} className="text-accent-400" />
          Ad Strategy Analysis
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Most Used Formats */}
          <div className="bg-dark-900/50 rounded-xl p-4 border border-dark-700/30">
            <h4 className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Layers size={13} />
              Most Used Ad Formats
            </h4>
            {strategy.formats?.length > 0 ? (
              <div className="space-y-2">
                {strategy.formats.map((f, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-sm text-dark-200 capitalize">{f.name || f}</span>
                    {f.percentage != null && (
                      <span className="text-xs text-dark-500">{f.percentage}%</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-dark-500">
                {formatBreakdown.length > 0
                  ? formatBreakdown.map((d) => d.name).join(', ')
                  : 'No format data available'}
              </p>
            )}
          </div>

          {/* Common Messaging Themes */}
          <div className="bg-dark-900/50 rounded-xl p-4 border border-dark-700/30">
            <h4 className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <FileText size={13} />
              Common Messaging Themes
            </h4>
            {strategy.themes?.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {strategy.themes.map((theme, i) => (
                  <Badge key={i} color="purple">{theme}</Badge>
                ))}
              </div>
            ) : (
              <p className="text-xs text-dark-500">Analysis pending</p>
            )}
          </div>

          {/* Target Audience */}
          <div className="bg-dark-900/50 rounded-xl p-4 border border-dark-700/30">
            <h4 className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Users size={13} />
              Target Audience Insights
            </h4>
            {strategy.audience ? (
              <p className="text-xs text-dark-300 leading-relaxed">{strategy.audience}</p>
            ) : (
              <p className="text-xs text-dark-500">No audience data available yet</p>
            )}
          </div>

          {/* Budget Estimation */}
          <div className="bg-dark-900/50 rounded-xl p-4 border border-dark-700/30">
            <h4 className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <DollarSign size={13} />
              Budget Estimation
            </h4>
            {strategy.budgetEstimate ? (
              <p className="text-sm font-medium text-white">{strategy.budgetEstimate}</p>
            ) : (
              <p className="text-xs text-dark-500">Insufficient data for estimation</p>
            )}
          </div>
        </div>
      </Card>

      {/* AI Analysis Section */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <Brain size={16} className="text-violet-400" />
            AI Strategic Analysis
          </h3>
          {!analysis && (
            <div className="relative">
              {analyzing && (
                <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-violet-500 rounded-xl opacity-75 animate-pulse blur-sm" />
              )}
              <Button
                size="sm"
                icon={analyzing ? undefined : Sparkles}
                loading={analyzing}
                onClick={handleAnalyze}
                className="relative bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400"
              >
                {analyzing ? 'Analyzing...' : 'Generate AI Analysis'}
              </Button>
            </div>
          )}
        </div>

        {analyzing ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center">
                <Brain size={32} className="text-violet-400 animate-pulse" />
              </div>
              <div className="absolute inset-0 rounded-2xl border-2 border-violet-500/30 animate-spin" style={{ animationDuration: '3s' }} />
            </div>
            <p className="text-sm text-dark-400 mt-4">AI is analyzing competitor strategies...</p>
            <p className="text-xs text-dark-500 mt-1">This may take a moment</p>
          </div>
        ) : analysis ? (
          <div className="space-y-5">
            {/* Strengths */}
            {analysis.strengths && (
              <div className="bg-accent-500/5 border border-accent-500/20 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-accent-400 mb-2 flex items-center gap-2">
                  <CheckCircle2 size={14} />
                  Strengths
                </h4>
                {Array.isArray(analysis.strengths) ? (
                  <ul className="space-y-1.5">
                    {analysis.strengths.map((s, i) => (
                      <li key={i} className="text-sm text-dark-300 flex items-start gap-2">
                        <ChevronRight size={14} className="text-accent-400 mt-0.5 flex-shrink-0" />
                        {s}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-dark-300">{analysis.strengths}</p>
                )}
              </div>
            )}

            {/* Weaknesses */}
            {analysis.weaknesses && (
              <div className="bg-danger-500/5 border border-danger-500/20 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-danger-400 mb-2 flex items-center gap-2">
                  <AlertTriangle size={14} />
                  Weaknesses
                </h4>
                {Array.isArray(analysis.weaknesses) ? (
                  <ul className="space-y-1.5">
                    {analysis.weaknesses.map((w, i) => (
                      <li key={i} className="text-sm text-dark-300 flex items-start gap-2">
                        <ChevronRight size={14} className="text-danger-400 mt-0.5 flex-shrink-0" />
                        {w}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-dark-300">{analysis.weaknesses}</p>
                )}
              </div>
            )}

            {/* Opportunities */}
            {analysis.opportunities && (
              <div className="bg-brand-500/5 border border-brand-500/20 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-brand-400 mb-2 flex items-center gap-2">
                  <Lightbulb size={14} />
                  Opportunities
                </h4>
                {Array.isArray(analysis.opportunities) ? (
                  <ul className="space-y-1.5">
                    {analysis.opportunities.map((o, i) => (
                      <li key={i} className="text-sm text-dark-300 flex items-start gap-2">
                        <ChevronRight size={14} className="text-brand-400 mt-0.5 flex-shrink-0" />
                        {o}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-dark-300">{analysis.opportunities}</p>
                )}
              </div>
            )}

            {/* Counter Strategies */}
            {analysis.counterStrategies && (
              <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-purple-400 mb-2 flex items-center gap-2">
                  <Shield size={14} />
                  Recommended Counter-Strategies
                </h4>
                {Array.isArray(analysis.counterStrategies) ? (
                  <ul className="space-y-1.5">
                    {analysis.counterStrategies.map((c, i) => (
                      <li key={i} className="text-sm text-dark-300 flex items-start gap-2">
                        <ChevronRight size={14} className="text-purple-400 mt-0.5 flex-shrink-0" />
                        {c}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-dark-300">{analysis.counterStrategies}</p>
                )}
              </div>
            )}

            {/* Suggested Ad Angles */}
            {analysis.suggestedAngles && (
              <div className="bg-warning-500/5 border border-warning-500/20 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-warning-400 mb-2 flex items-center gap-2">
                  <Crosshair size={14} />
                  Suggested Ad Angles to Compete
                </h4>
                {Array.isArray(analysis.suggestedAngles) ? (
                  <ul className="space-y-1.5">
                    {analysis.suggestedAngles.map((a, i) => (
                      <li key={i} className="text-sm text-dark-300 flex items-start gap-2">
                        <ChevronRight size={14} className="text-warning-400 mt-0.5 flex-shrink-0" />
                        {a}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-dark-300">{analysis.suggestedAngles}</p>
                )}
              </div>
            )}

            {/* Refresh analysis */}
            <Button
              variant="secondary"
              icon={RefreshCw}
              size="sm"
              className="w-full"
              onClick={handleAnalyze}
              loading={analyzing}
            >
              Regenerate Analysis
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 flex items-center justify-center mb-4">
              <Brain size={28} className="text-dark-500" />
            </div>
            <p className="text-sm text-dark-400">Click the button above to generate an AI strategic analysis</p>
            <p className="text-xs text-dark-500 mt-1">Includes strengths, weaknesses, opportunities, and counter-strategies</p>
          </div>
        )}
      </Card>

      {/* Ad Timeline */}
      {timeline.length > 0 && (
        <Card>
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <Clock size={16} className="text-cyan-400" />
            Ad Timeline
          </h3>
          <div className="space-y-1 max-h-[400px] overflow-y-auto">
            {timeline.map((item, idx) => (
              <div
                key={idx}
                className="flex gap-4 p-3 rounded-xl hover:bg-dark-900/50 transition-colors"
              >
                <div className="flex-shrink-0 mt-0.5">
                  <div className={`w-8 h-8 rounded-full ${item.type === 'start' ? 'bg-accent-500/10' : 'bg-danger-500/10'} flex items-center justify-center`}>
                    {item.type === 'start' ? (
                      <Zap size={14} className="text-accent-400" />
                    ) : (
                      <XCircle size={14} className="text-danger-400" />
                    )}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-dark-500">{formatDate(item.date)}</span>
                    <Badge color={item.type === 'start' ? 'green' : 'red'}>
                      {item.type === 'start' ? 'Started' : 'Stopped'}
                    </Badge>
                  </div>
                  <p className="text-sm text-dark-200 mt-0.5">{item.adName || item.description || `Ad campaign ${item.type}`}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </motion.div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function Competitors() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [newResearchModal, setNewResearchModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ open: false, report: null });
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      const response = await competitorsAPI.list();
      const data = Array.isArray(response) ? response : response?.data || response?.reports || [];
      setReports(data);
    } catch (err) {
      console.error('Failed to fetch reports:', err);
      toast.error('Failed to load competitor reports');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const filteredReports = useMemo(() => {
    if (!search) return reports;
    const s = search.toLowerCase();
    return reports.filter(
      (r) =>
        r.competitorName?.toLowerCase().includes(s) ||
        r.name?.toLowerCase().includes(s) ||
        r.domain?.toLowerCase().includes(s)
    );
  }, [reports, search]);

  const handleNewResearch = async (form) => {
    try {
      await competitorsAPI.research({
        competitorName: form.competitorName,
        platform: form.platform,
        domain: form.domain,
      });
      toast.success('Research started! Results will appear shortly.');
      fetchReports();
    } catch (err) {
      toast.error(err?.message || 'Failed to start research');
      throw err;
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.report) return;
    const id = deleteModal.report._id || deleteModal.report.id;
    try {
      setDeleteLoading(true);
      await competitorsAPI.delete(id);
      toast.success('Research report deleted');
      setDeleteModal({ open: false, report: null });
      if (selectedReport && (selectedReport._id || selectedReport.id) === id) {
        setSelectedReport(null);
      }
      fetchReports();
    } catch (err) {
      toast.error('Failed to delete report');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleViewDetail = async (report) => {
    const id = report._id || report.id;
    try {
      const detail = await competitorsAPI.get(id);
      setSelectedReport(detail?.data || detail);
    } catch (err) {
      // Fallback to available data
      setSelectedReport(report);
    }
  };

  // If viewing a detail
  if (selectedReport) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6"
      >
        <DetailView
          report={selectedReport}
          onBack={() => setSelectedReport(null)}
          onAnalyze={fetchReports}
          onDelete={(r) => setDeleteModal({ open: true, report: r })}
        />

        {/* Delete Modal */}
        <Modal
          isOpen={deleteModal.open}
          onClose={() => setDeleteModal({ open: false, report: null })}
          title="Delete Research Report"
          size="sm"
          footer={
            <>
              <Button variant="ghost" onClick={() => setDeleteModal({ open: false, report: null })}>
                Cancel
              </Button>
              <Button variant="danger" icon={Trash2} loading={deleteLoading} onClick={handleDelete}>
                Delete Report
              </Button>
            </>
          }
        >
          <div className="space-y-3">
            <p className="text-dark-300 text-sm">
              Are you sure you want to delete this research report for{' '}
              <span className="text-white font-medium">{deleteModal.report?.competitorName || deleteModal.report?.name}</span>?
            </p>
            <p className="text-dark-400 text-xs">This action cannot be undone.</p>
          </div>
        </Modal>
      </motion.div>
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
          <h1 className="text-2xl font-bold text-white">Competitor Research</h1>
          <p className="text-dark-400 text-sm mt-1">
            Research and analyze competitor ad strategies with AI
          </p>
        </div>
        <Button icon={Plus} onClick={() => setNewResearchModal(true)}>
          New Research
        </Button>
      </motion.div>

      {/* Search */}
      <motion.div variants={itemVariants}>
        <div className="relative max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search competitors..."
            className="w-full bg-dark-800 border border-dark-600 text-white placeholder-dark-400 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all duration-200"
          />
        </div>
      </motion.div>

      {/* Reports List */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <ResearchCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredReports.length === 0 ? (
        <motion.div
          variants={itemVariants}
          className="flex flex-col items-center justify-center py-20"
        >
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-500/20 to-purple-500/20 flex items-center justify-center mb-6">
            <Search size={36} className="text-brand-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">
            {search ? 'No competitors match your search' : 'No competitor research yet'}
          </h3>
          <p className="text-sm text-dark-400 text-center max-w-md mb-6">
            {search
              ? 'Try adjusting your search terms.'
              : 'Start your first competitor research to discover their ad strategies and find opportunities to outperform them.'}
          </p>
          {!search && (
            <Button icon={Plus} onClick={() => setNewResearchModal(true)}>
              Start Your First Research
            </Button>
          )}
        </motion.div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 lg:grid-cols-2 gap-4"
        >
          {filteredReports.map((report) => {
            const id = report._id || report.id;
            const name = report.competitorName || report.name || 'Unknown';
            return (
              <motion.div
                key={id}
                variants={itemVariants}
                className="bg-dark-800/50 backdrop-blur-sm border border-dark-700/50 rounded-2xl p-6 transition-all duration-300 hover:bg-dark-800/70 hover:border-dark-600/50 hover:shadow-xl hover:shadow-black/20 group"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500/20 to-purple-500/20 flex items-center justify-center">
                      <span className="text-lg font-bold text-brand-400">
                        {name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">{name}</h3>
                      {report.domain && (
                        <p className="text-xs text-dark-400 flex items-center gap-1 mt-0.5">
                          <Globe size={11} />
                          {report.domain}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {(report.platform === 'meta' || report.platform === 'both') && (
                      <Badge color="blue">Meta</Badge>
                    )}
                    {(report.platform === 'google' || report.platform === 'both') && (
                      <Badge color="green">Google</Badge>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="bg-dark-900/50 rounded-lg p-2.5 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-dark-500 font-medium mb-1">Total Ads</p>
                    <p className="text-sm font-semibold text-white">{formatNumber(report.totalAds || report.adsFound || 0)}</p>
                  </div>
                  <div className="bg-dark-900/50 rounded-lg p-2.5 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-dark-500 font-medium mb-1">Active</p>
                    <p className="text-sm font-semibold text-accent-400">{formatNumber(report.activeAds || 0)}</p>
                  </div>
                  <div className="bg-dark-900/50 rounded-lg p-2.5 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-dark-500 font-medium mb-1">Formats</p>
                    <p className="text-sm font-semibold text-purple-400">{report.formatsUsed || 0}</p>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-dark-700/30">
                  <span className="text-[10px] text-dark-500">
                    Researched {formatDate(report.createdAt || report.researchDate)}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      className="p-1.5 rounded-lg text-dark-400 hover:text-white hover:bg-dark-700/50 transition-all duration-200"
                      title="View Detail"
                      onClick={() => handleViewDetail(report)}
                    >
                      <Eye size={14} />
                    </button>
                    <button
                      className="p-1.5 rounded-lg text-dark-400 hover:text-violet-400 hover:bg-violet-500/10 transition-all duration-200"
                      title="AI Analysis"
                      onClick={() => handleViewDetail(report)}
                    >
                      <Brain size={14} />
                    </button>
                    <button
                      className="p-1.5 rounded-lg text-dark-400 hover:text-danger-400 hover:bg-danger-500/10 transition-all duration-200"
                      title="Delete"
                      onClick={() => setDeleteModal({ open: true, report })}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* New Research Modal */}
      <NewResearchModal
        isOpen={newResearchModal}
        onClose={() => setNewResearchModal(false)}
        onSubmit={handleNewResearch}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, report: null })}
        title="Delete Research Report"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteModal({ open: false, report: null })}>
              Cancel
            </Button>
            <Button variant="danger" icon={Trash2} loading={deleteLoading} onClick={handleDelete}>
              Delete Report
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-dark-300 text-sm">
            Are you sure you want to delete this research report for{' '}
            <span className="text-white font-medium">{deleteModal.report?.competitorName || deleteModal.report?.name}</span>?
          </p>
          <p className="text-dark-400 text-xs">This action cannot be undone.</p>
        </div>
      </Modal>
    </motion.div>
  );
}
