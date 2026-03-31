import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Plus,
  Search,
  Play,
  Pause,
  Pencil,
  Trash2,
  Zap,
  TrendingUp,
  Clock,
  DollarSign,
  Calendar,
  Brain,
  Activity,
  Bell,
  RefreshCw,
  Copy,
  Sparkles,
  Target,
  ChevronRight,
  Check,
  X,
  Loader2,
  History,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MoreHorizontal,
  Settings2,
  ArrowRight,
  Shield,
  Power,
} from 'lucide-react';
import { automationAPI } from '../services/api';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import StatsCard from '../components/ui/StatsCard';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return 'Never';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatRelative(dateStr) {
  if (!dateStr) return 'Never';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now - d;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(dateStr);
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

// ── Trigger & Action Config ──────────────────────────────────────────────────

const TRIGGER_TYPES = [
  { value: 'performance', label: 'Performance Threshold', icon: TrendingUp, color: 'text-blue-400', bg: 'bg-blue-500/10', desc: 'When metric crosses threshold' },
  { value: 'schedule', label: 'Schedule', icon: Clock, color: 'text-purple-400', bg: 'bg-purple-500/10', desc: 'At specific times/days' },
  { value: 'budget', label: 'Budget Limit', icon: DollarSign, color: 'text-warning-400', bg: 'bg-warning-500/10', desc: 'When budget reaches limit' },
  { value: 'time_based', label: 'Time Based', icon: Calendar, color: 'text-accent-400', bg: 'bg-accent-500/10', desc: 'At specific date/time' },
  { value: 'ai_recommendation', label: 'AI Recommendation', icon: Brain, color: 'text-violet-400', bg: 'bg-violet-500/10', desc: 'When AI suggests action' },
  { value: 'metric_change', label: 'Metric Change', icon: Activity, color: 'text-cyan-400', bg: 'bg-cyan-500/10', desc: 'When metric changes by %' },
];

const ACTION_TYPES = [
  { value: 'pause_campaign', label: 'Pause Campaign', icon: Pause, color: 'text-warning-400', bg: 'bg-warning-500/10' },
  { value: 'resume_campaign', label: 'Resume Campaign', icon: Play, color: 'text-accent-400', bg: 'bg-accent-500/10' },
  { value: 'adjust_budget', label: 'Adjust Budget', icon: DollarSign, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { value: 'adjust_bid', label: 'Adjust Bid', icon: Target, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  { value: 'send_notification', label: 'Send Notification', icon: Bell, color: 'text-pink-400', bg: 'bg-pink-500/10' },
  { value: 'change_status', label: 'Change Status', icon: RefreshCw, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  { value: 'duplicate_campaign', label: 'Duplicate Campaign', icon: Copy, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  { value: 'ai_optimize', label: 'AI Optimize', icon: Sparkles, color: 'text-violet-400', bg: 'bg-violet-500/10' },
];

const METRIC_OPTIONS = [
  { value: 'cpc', label: 'CPC' },
  { value: 'cpm', label: 'CPM' },
  { value: 'ctr', label: 'CTR' },
  { value: 'cpa', label: 'CPA' },
  { value: 'roas', label: 'ROAS' },
  { value: 'spend', label: 'Spend' },
  { value: 'conversions', label: 'Conversions' },
  { value: 'impressions', label: 'Impressions' },
  { value: 'clicks', label: 'Clicks' },
];

const OPERATOR_OPTIONS = [
  { value: 'gt', label: 'Greater than (>)' },
  { value: 'lt', label: 'Less than (<)' },
  { value: 'eq', label: 'Equal to (=)' },
  { value: 'gte', label: 'Greater or equal (>=)' },
  { value: 'lte', label: 'Less or equal (<=)' },
];

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const TIMEFRAME_OPTIONS = [
  { value: '1h', label: 'Last 1 hour' },
  { value: '6h', label: 'Last 6 hours' },
  { value: '24h', label: 'Last 24 hours' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
];

// ── Toggle Switch ────────────────────────────────────────────────────────────

function ToggleSwitch({ enabled, onChange, disabled = false }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onChange(!enabled);
      }}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
        enabled ? 'bg-accent-500' : 'bg-dark-600'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 shadow-sm ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

// ── Skeleton Loader ──────────────────────────────────────────────────────────

function RuleCardSkeleton() {
  return (
    <div className="bg-dark-800/50 backdrop-blur-sm border border-dark-700/50 rounded-2xl p-5 animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="space-y-2">
          <div className="h-5 w-40 bg-dark-700 rounded" />
          <div className="h-3 w-56 bg-dark-700/60 rounded" />
        </div>
        <div className="h-6 w-11 bg-dark-700 rounded-full" />
      </div>
      <div className="flex gap-2 mb-4">
        <div className="h-5 w-20 bg-dark-700 rounded-full" />
        <div className="h-5 w-16 bg-dark-700 rounded-full" />
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

// ── Rule Summary (plain English) ─────────────────────────────────────────────

function buildRuleSummary(trigger, action) {
  let triggerText = 'something happens';
  let actionText = 'do something';

  if (trigger.type === 'performance') {
    const opMap = { gt: 'greater than', lt: 'less than', eq: 'equal to', gte: 'greater or equal to', lte: 'less or equal to' };
    const op = opMap[trigger.operator] || trigger.operator;
    triggerText = `${(trigger.metric || 'CPC').toUpperCase()} is ${op} ${trigger.value || '0'}`;
  } else if (trigger.type === 'schedule') {
    const days = trigger.days?.join(', ') || 'every day';
    triggerText = `it is ${trigger.time || '09:00'} on ${days}`;
  } else if (trigger.type === 'budget') {
    triggerText = `budget usage reaches ${trigger.percentage || 80}%`;
  } else if (trigger.type === 'time_based') {
    triggerText = `date/time is ${trigger.datetime || 'specified'}`;
  } else if (trigger.type === 'ai_recommendation') {
    triggerText = `AI confidence exceeds ${trigger.confidence || 80}%`;
  } else if (trigger.type === 'metric_change') {
    triggerText = `${(trigger.metric || 'CPC').toUpperCase()} changes by ${trigger.percentage || 10}% in ${trigger.timeframe || '24h'}`;
  }

  const actionConfig = ACTION_TYPES.find((a) => a.value === action.type);
  if (actionConfig) {
    actionText = actionConfig.label.toLowerCase();
    if (action.type === 'adjust_budget' && action.adjustPercent) {
      actionText += ` by ${action.adjustPercent > 0 ? '+' : ''}${action.adjustPercent}%`;
    }
    if (action.type === 'adjust_bid' && action.adjustValue) {
      actionText += ` to $${action.adjustValue}`;
    }
    if (action.type === 'send_notification' && action.message) {
      actionText += `: "${action.message}"`;
    }
  }

  return `When ${triggerText}, ${actionText}`;
}

// ── Create/Edit Rule Modal ───────────────────────────────────────────────────

function RuleModal({ isOpen, onClose, rule, onSave }) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    trigger: { type: 'performance', metric: 'cpc', operator: 'gt', value: '', days: [], time: '09:00', percentage: 80, datetime: '', confidence: 80, timeframe: '24h' },
    action: { type: 'pause_campaign', adjustPercent: 10, adjustValue: '', message: '' },
    campaignId: '',
    isActive: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (rule) {
      setForm({
        name: rule.name || '',
        description: rule.description || '',
        trigger: {
          type: rule.trigger?.type || 'performance',
          metric: rule.trigger?.metric || 'cpc',
          operator: rule.trigger?.operator || 'gt',
          value: rule.trigger?.value || '',
          days: rule.trigger?.days || [],
          time: rule.trigger?.time || '09:00',
          percentage: rule.trigger?.percentage || 80,
          datetime: rule.trigger?.datetime || '',
          confidence: rule.trigger?.confidence || 80,
          timeframe: rule.trigger?.timeframe || '24h',
        },
        action: {
          type: rule.action?.type || 'pause_campaign',
          adjustPercent: rule.action?.adjustPercent || 10,
          adjustValue: rule.action?.adjustValue || '',
          message: rule.action?.message || '',
        },
        campaignId: rule.campaignId || '',
        isActive: rule.isActive !== false,
      });
    } else {
      setForm({
        name: '',
        description: '',
        trigger: { type: 'performance', metric: 'cpc', operator: 'gt', value: '', days: [], time: '09:00', percentage: 80, datetime: '', confidence: 80, timeframe: '24h' },
        action: { type: 'pause_campaign', adjustPercent: 10, adjustValue: '', message: '' },
        campaignId: '',
        isActive: true,
      });
    }
  }, [rule, isOpen]);

  const handleTriggerChange = (field, value) => {
    setForm((prev) => ({ ...prev, trigger: { ...prev.trigger, [field]: value } }));
  };

  const handleActionChange = (field, value) => {
    setForm((prev) => ({ ...prev, action: { ...prev.action, [field]: value } }));
  };

  const toggleDay = (day) => {
    setForm((prev) => {
      const days = prev.trigger.days || [];
      const next = days.includes(day) ? days.filter((d) => d !== day) : [...days, day];
      return { ...prev, trigger: { ...prev.trigger, days: next } };
    });
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error('Please enter a rule name');
      return;
    }
    try {
      setSaving(true);
      await onSave(form);
      onClose();
    } catch (err) {
      // error handled by parent
    } finally {
      setSaving(false);
    }
  };

  const summary = buildRuleSummary(form.trigger, form.action);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={rule ? 'Edit Rule' : 'Create Automation Rule'}
      size="xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button icon={rule ? Check : Plus} loading={saving} onClick={handleSubmit}>
            {rule ? 'Update Rule' : 'Create Rule'}
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {/* Name & Description */}
        <div className="space-y-4">
          <Input
            label="Rule Name"
            placeholder="e.g., Pause high CPC campaigns"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          />
          <Input
            label="Description (Optional)"
            type="textarea"
            rows={2}
            placeholder="Describe what this rule does..."
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
          />
        </div>

        {/* Trigger Section */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-white flex items-center gap-2">
            <Zap size={14} className="text-warning-400" />
            Trigger
          </h4>

          {/* Trigger Type */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {TRIGGER_TYPES.map((tt) => (
              <button
                key={tt.value}
                onClick={() => handleTriggerChange('type', tt.value)}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 ${
                  form.trigger.type === tt.value
                    ? 'border-brand-500/50 bg-brand-500/10'
                    : 'border-dark-700/50 bg-dark-900/30 hover:border-dark-600/50'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg ${tt.bg} flex items-center justify-center flex-shrink-0`}>
                  <tt.icon size={16} className={tt.color} />
                </div>
                <div className="text-left min-w-0">
                  <p className={`text-xs font-medium truncate ${form.trigger.type === tt.value ? 'text-white' : 'text-dark-300'}`}>
                    {tt.label}
                  </p>
                  <p className="text-[10px] text-dark-500 truncate">{tt.desc}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Trigger-specific fields */}
          <div className="bg-dark-900/30 rounded-xl p-4 space-y-3 border border-dark-700/30">
            {form.trigger.type === 'performance' && (
              <>
                <Input
                  label="Metric"
                  type="select"
                  value={form.trigger.metric}
                  onChange={(e) => handleTriggerChange('metric', e.target.value)}
                  options={METRIC_OPTIONS}
                />
                <Input
                  label="Operator"
                  type="select"
                  value={form.trigger.operator}
                  onChange={(e) => handleTriggerChange('operator', e.target.value)}
                  options={OPERATOR_OPTIONS}
                />
                <Input
                  label="Value"
                  type="number"
                  placeholder="e.g., 2.50"
                  value={form.trigger.value}
                  onChange={(e) => handleTriggerChange('value', e.target.value)}
                  icon={DollarSign}
                />
              </>
            )}

            {form.trigger.type === 'schedule' && (
              <>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-dark-300">Days of Week</label>
                  <div className="flex gap-2">
                    {DAYS_OF_WEEK.map((day) => (
                      <button
                        key={day}
                        onClick={() => toggleDay(day)}
                        className={`w-10 h-10 rounded-lg text-xs font-medium transition-all duration-200 ${
                          form.trigger.days?.includes(day)
                            ? 'bg-brand-500/20 border-brand-500/50 text-brand-400 border'
                            : 'bg-dark-800 border-dark-700/50 text-dark-400 hover:text-white border'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
                <Input
                  label="Time"
                  type="time"
                  value={form.trigger.time}
                  onChange={(e) => handleTriggerChange('time', e.target.value)}
                />
              </>
            )}

            {form.trigger.type === 'budget' && (
              <>
                <Input
                  label="Budget Percentage"
                  type="number"
                  placeholder="e.g., 80"
                  value={form.trigger.percentage}
                  onChange={(e) => handleTriggerChange('percentage', e.target.value)}
                />
                <Input
                  label="Comparison"
                  type="select"
                  value={form.trigger.operator || 'gte'}
                  onChange={(e) => handleTriggerChange('operator', e.target.value)}
                  options={OPERATOR_OPTIONS}
                />
              </>
            )}

            {form.trigger.type === 'time_based' && (
              <Input
                label="Date & Time"
                type="datetime-local"
                value={form.trigger.datetime}
                onChange={(e) => handleTriggerChange('datetime', e.target.value)}
              />
            )}

            {form.trigger.type === 'ai_recommendation' && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-dark-300">
                  AI Confidence Threshold: <span className="text-white">{form.trigger.confidence}%</span>
                </label>
                <input
                  type="range"
                  min={50}
                  max={99}
                  value={form.trigger.confidence}
                  onChange={(e) => handleTriggerChange('confidence', parseInt(e.target.value))}
                  className="w-full accent-brand-500"
                />
                <div className="flex justify-between text-[10px] text-dark-500">
                  <span>50%</span>
                  <span>99%</span>
                </div>
              </div>
            )}

            {form.trigger.type === 'metric_change' && (
              <>
                <Input
                  label="Metric"
                  type="select"
                  value={form.trigger.metric}
                  onChange={(e) => handleTriggerChange('metric', e.target.value)}
                  options={METRIC_OPTIONS}
                />
                <Input
                  label="Percentage Change (%)"
                  type="number"
                  placeholder="e.g., 20"
                  value={form.trigger.percentage}
                  onChange={(e) => handleTriggerChange('percentage', e.target.value)}
                />
                <Input
                  label="Timeframe"
                  type="select"
                  value={form.trigger.timeframe}
                  onChange={(e) => handleTriggerChange('timeframe', e.target.value)}
                  options={TIMEFRAME_OPTIONS}
                />
              </>
            )}
          </div>
        </div>

        {/* Action Section */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-white flex items-center gap-2">
            <ArrowRight size={14} className="text-brand-400" />
            Action
          </h4>

          {/* Action Type */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {ACTION_TYPES.map((at) => (
              <button
                key={at.value}
                onClick={() => handleActionChange('type', at.value)}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all duration-200 ${
                  form.action.type === at.value
                    ? 'border-brand-500/50 bg-brand-500/10'
                    : 'border-dark-700/50 bg-dark-900/30 hover:border-dark-600/50'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg ${at.bg} flex items-center justify-center`}>
                  <at.icon size={16} className={at.color} />
                </div>
                <span className={`text-[10px] font-medium text-center ${form.action.type === at.value ? 'text-white' : 'text-dark-400'}`}>
                  {at.label}
                </span>
              </button>
            ))}
          </div>

          {/* Action-specific fields */}
          <div className="bg-dark-900/30 rounded-xl p-4 space-y-3 border border-dark-700/30">
            {form.action.type === 'adjust_budget' && (
              <Input
                label="Adjustment Percentage (%)"
                type="number"
                placeholder="e.g., 20 for +20%, -20 for -20%"
                value={form.action.adjustPercent}
                onChange={(e) => handleActionChange('adjustPercent', e.target.value)}
              />
            )}

            {form.action.type === 'adjust_bid' && (
              <Input
                label="New Bid Value ($)"
                type="number"
                placeholder="e.g., 1.50"
                value={form.action.adjustValue}
                onChange={(e) => handleActionChange('adjustValue', e.target.value)}
                icon={DollarSign}
              />
            )}

            {form.action.type === 'send_notification' && (
              <Input
                label="Notification Message"
                type="textarea"
                rows={2}
                placeholder="Enter the alert message..."
                value={form.action.message}
                onChange={(e) => handleActionChange('message', e.target.value)}
              />
            )}

            {(form.action.type === 'pause_campaign' || form.action.type === 'resume_campaign' || form.action.type === 'change_status' || form.action.type === 'duplicate_campaign' || form.action.type === 'ai_optimize') && (
              <p className="text-xs text-dark-500">
                No additional configuration needed for this action type.
              </p>
            )}
          </div>
        </div>

        {/* Campaign Selector */}
        <Input
          label="Apply to Campaign (Optional)"
          placeholder="Enter campaign ID to restrict this rule to a specific campaign..."
          value={form.campaignId}
          onChange={(e) => setForm((p) => ({ ...p, campaignId: e.target.value }))}
        />

        {/* Rule Summary */}
        <div className="bg-gradient-to-r from-brand-500/5 to-purple-500/5 border border-brand-500/20 rounded-xl p-4">
          <p className="text-[10px] uppercase tracking-wider text-brand-400 font-semibold mb-1.5">Rule Preview</p>
          <p className="text-sm text-dark-200 leading-relaxed">{summary}</p>
        </div>
      </div>
    </Modal>
  );
}

// ── Logs Modal ───────────────────────────────────────────────────────────────

function LogsModal({ isOpen, onClose, ruleId, ruleName }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    if (!isOpen || !ruleId) return;
    const fetchLogs = async () => {
      try {
        setLoading(true);
        const response = await automationAPI.logs(ruleId);
        const data = Array.isArray(response) ? response : response?.data || response?.logs || [];
        setLogs(data);
      } catch (err) {
        console.error('Failed to fetch logs:', err);
        toast.error('Failed to load automation logs');
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [isOpen, ruleId]);

  const filteredLogs = statusFilter === 'all' ? logs : logs.filter((l) => l.status === statusFilter);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Logs: ${ruleName || 'Automation Rule'}`}
      size="lg"
    >
      <div className="space-y-4">
        {/* Filter */}
        <div className="flex items-center gap-1 bg-dark-800/60 rounded-xl p-1 border border-dark-700/50 w-fit">
          {['all', 'success', 'failure'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 capitalize ${
                statusFilter === s
                  ? 'bg-gradient-to-r from-brand-600 to-purple-600 text-white shadow-sm'
                  : 'text-dark-400 hover:text-white hover:bg-dark-700/50'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Timeline */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="animate-pulse flex gap-4">
                <div className="w-8 h-8 rounded-full bg-dark-700 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-dark-700 rounded w-1/4" />
                  <div className="h-4 bg-dark-700 rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <History size={32} className="text-dark-500 mb-3" />
            <p className="text-sm text-dark-400">No logs found</p>
          </div>
        ) : (
          <div className="space-y-1 max-h-[400px] overflow-y-auto">
            {filteredLogs.map((log, idx) => (
              <div
                key={log.id || idx}
                className="flex gap-4 p-3 rounded-xl hover:bg-dark-900/50 transition-colors"
              >
                <div className="flex-shrink-0 mt-0.5">
                  {log.status === 'success' ? (
                    <div className="w-8 h-8 rounded-full bg-accent-500/10 flex items-center justify-center">
                      <CheckCircle2 size={16} className="text-accent-400" />
                    </div>
                  ) : log.status === 'failure' ? (
                    <div className="w-8 h-8 rounded-full bg-danger-500/10 flex items-center justify-center">
                      <XCircle size={16} className="text-danger-400" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-dark-700/50 flex items-center justify-center">
                      <AlertCircle size={16} className="text-dark-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs text-dark-500">{formatDate(log.executedAt || log.createdAt)}</span>
                    <Badge color={log.status === 'success' ? 'green' : log.status === 'failure' ? 'red' : 'gray'}>
                      {log.status || 'unknown'}
                    </Badge>
                  </div>
                  <p className="text-sm text-dark-200">{log.action || log.message || 'Rule executed'}</p>
                  {log.details && (
                    <p className="text-xs text-dark-500 mt-0.5">{log.details}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function Automation() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [ruleModal, setRuleModal] = useState({ open: false, rule: null });
  const [logsModal, setLogsModal] = useState({ open: false, ruleId: null, ruleName: '' });
  const [deleteModal, setDeleteModal] = useState({ open: false, rule: null });
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [executingId, setExecutingId] = useState(null);

  const fetchRules = useCallback(async () => {
    try {
      setLoading(true);
      const response = await automationAPI.list();
      const data = Array.isArray(response) ? response : response?.data || response?.rules || [];
      setRules(data);
    } catch (err) {
      console.error('Failed to fetch rules:', err);
      toast.error('Failed to load automation rules');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  // Stats
  const stats = useMemo(() => {
    const active = rules.filter((r) => r.isActive !== false).length;
    const totalExec = rules.reduce((sum, r) => sum + (r.runCount || r.executionCount || 0), 0);
    const successCount = rules.reduce((sum, r) => sum + (r.successCount || 0), 0);
    const rate = totalExec > 0 ? Math.round((successCount / totalExec) * 100) : 100;
    return { active, totalExec, actionsToday: rules.reduce((sum, r) => sum + (r.actionsToday || 0), 0), rate };
  }, [rules]);

  // Sort: active first, then inactive
  const sortedRules = useMemo(() => {
    let filtered = rules;
    if (search) {
      const s = search.toLowerCase();
      filtered = rules.filter(
        (r) => r.name?.toLowerCase().includes(s) || r.description?.toLowerCase().includes(s)
      );
    }
    return [...filtered].sort((a, b) => {
      if ((a.isActive !== false) === (b.isActive !== false)) return 0;
      return a.isActive !== false ? -1 : 1;
    });
  }, [rules, search]);

  const handleToggleActive = async (rule) => {
    const id = rule._id || rule.id;
    const newState = rule.isActive === false;
    try {
      await automationAPI.update(id, { ...rule, isActive: newState });
      toast.success(newState ? 'Rule activated' : 'Rule deactivated');
      fetchRules();
    } catch (err) {
      toast.error('Failed to update rule');
    }
  };

  const handleExecute = async (id) => {
    try {
      setExecutingId(id);
      await automationAPI.execute(id);
      toast.success('Rule executed successfully');
      fetchRules();
    } catch (err) {
      toast.error(err?.message || 'Failed to execute rule');
    } finally {
      setExecutingId(null);
    }
  };

  const handleSaveRule = async (form) => {
    try {
      if (ruleModal.rule) {
        const id = ruleModal.rule._id || ruleModal.rule.id;
        await automationAPI.update(id, form);
        toast.success('Rule updated');
      } else {
        await automationAPI.create(form);
        toast.success('Rule created');
      }
      fetchRules();
    } catch (err) {
      toast.error(err?.message || 'Failed to save rule');
      throw err;
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.rule) return;
    const id = deleteModal.rule._id || deleteModal.rule.id;
    try {
      setDeleteLoading(true);
      await automationAPI.delete(id);
      toast.success('Rule deleted');
      setDeleteModal({ open: false, rule: null });
      fetchRules();
    } catch (err) {
      toast.error('Failed to delete rule');
    } finally {
      setDeleteLoading(false);
    }
  };

  const getTriggerConfig = (type) => TRIGGER_TYPES.find((t) => t.value === type) || TRIGGER_TYPES[0];
  const getActionConfig = (type) => ACTION_TYPES.find((a) => a.value === type) || ACTION_TYPES[0];

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
          <h1 className="text-2xl font-bold text-white">Automation</h1>
          <p className="text-dark-400 text-sm mt-1">
            Set up automated rules to optimize your campaigns
          </p>
        </div>
        <Button icon={Plus} onClick={() => setRuleModal({ open: true, rule: null })}>
          Create Rule
        </Button>
      </motion.div>

      {/* Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard label="Active Rules" value={stats.active.toString()} icon={Zap} color="brand" />
        <StatsCard label="Total Executions" value={stats.totalExec.toString()} icon={Activity} color="blue" />
        <StatsCard label="Actions Today" value={stats.actionsToday.toString()} icon={Clock} color="purple" />
        <StatsCard label="Success Rate" value={`${stats.rate}%`} icon={Shield} color="green" />
      </motion.div>

      {/* Search */}
      <motion.div variants={itemVariants}>
        <div className="relative max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search rules..."
            className="w-full bg-dark-800 border border-dark-600 text-white placeholder-dark-400 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all duration-200"
          />
        </div>
      </motion.div>

      {/* Rules List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <RuleCardSkeleton key={i} />
          ))}
        </div>
      ) : sortedRules.length === 0 ? (
        <motion.div
          variants={itemVariants}
          className="flex flex-col items-center justify-center py-20"
        >
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-500/20 to-purple-500/20 flex items-center justify-center mb-6">
            <Zap size={36} className="text-brand-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">
            {search ? 'No rules match your search' : 'No automation rules yet'}
          </h3>
          <p className="text-sm text-dark-400 text-center max-w-md mb-6">
            {search
              ? 'Try adjusting your search terms.'
              : 'Create your first automation rule to let the system optimize your campaigns automatically.'}
          </p>
          {!search && (
            <Button icon={Plus} onClick={() => setRuleModal({ open: true, rule: null })}>
              Create Your First Rule
            </Button>
          )}
        </motion.div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {sortedRules.map((rule) => {
            const id = rule._id || rule.id;
            const isActive = rule.isActive !== false;
            const triggerConf = getTriggerConfig(rule.trigger?.type);
            const actionConf = getActionConfig(rule.action?.type);
            const TriggerIcon = triggerConf.icon;
            const ActionIcon = actionConf.icon;

            return (
              <motion.div
                key={id}
                variants={itemVariants}
                className={`bg-dark-800/50 backdrop-blur-sm border rounded-2xl p-5 transition-all duration-300 hover:bg-dark-800/70 hover:shadow-xl hover:shadow-black/20 group ${
                  isActive ? 'border-dark-700/50 hover:border-dark-600/50' : 'border-dark-700/30 opacity-70'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0 mr-3">
                    <h3 className="text-sm font-semibold text-white truncate">{rule.name || 'Unnamed Rule'}</h3>
                    {rule.description && (
                      <p className="text-xs text-dark-400 mt-0.5 line-clamp-2">{rule.description}</p>
                    )}
                  </div>
                  <ToggleSwitch enabled={isActive} onChange={() => handleToggleActive(rule)} />
                </div>

                {/* Badges */}
                <div className="flex items-center gap-2 flex-wrap mb-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${triggerConf.bg} ${triggerConf.color} border-transparent`}>
                    <TriggerIcon size={11} />
                    {triggerConf.label}
                  </span>
                  <ChevronRight size={12} className="text-dark-600" />
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${actionConf.bg} ${actionConf.color} border-transparent`}>
                    <ActionIcon size={11} />
                    {actionConf.label}
                  </span>
                </div>

                {/* Summary */}
                {rule.trigger && rule.action && (
                  <p className="text-xs text-dark-500 mb-4 bg-dark-900/30 rounded-lg p-2.5 border border-dark-700/20">
                    {buildRuleSummary(rule.trigger, rule.action)}
                  </p>
                )}

                {/* Meta info */}
                <div className="flex items-center justify-between pt-3 border-t border-dark-700/30">
                  <div className="flex items-center gap-3 text-[10px] text-dark-500">
                    <span>Last run: {formatRelative(rule.lastRun || rule.lastExecutedAt)}</span>
                    {(rule.runCount != null || rule.executionCount != null) && (
                      <span>{rule.runCount || rule.executionCount || 0} runs</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      className="p-1.5 rounded-lg text-dark-400 hover:text-white hover:bg-dark-700/50 transition-all duration-200"
                      title="Edit"
                      onClick={() => setRuleModal({ open: true, rule })}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      className="p-1.5 rounded-lg text-dark-400 hover:text-accent-400 hover:bg-accent-500/10 transition-all duration-200"
                      title="Run Now"
                      onClick={() => handleExecute(id)}
                      disabled={executingId === id}
                    >
                      {executingId === id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Play size={14} />
                      )}
                    </button>
                    <button
                      className="p-1.5 rounded-lg text-dark-400 hover:text-blue-400 hover:bg-blue-500/10 transition-all duration-200"
                      title="View Logs"
                      onClick={() => setLogsModal({ open: true, ruleId: id, ruleName: rule.name })}
                    >
                      <History size={14} />
                    </button>
                    <button
                      className="p-1.5 rounded-lg text-dark-400 hover:text-danger-400 hover:bg-danger-500/10 transition-all duration-200"
                      title="Delete"
                      onClick={() => setDeleteModal({ open: true, rule })}
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

      {/* Create/Edit Rule Modal */}
      <RuleModal
        isOpen={ruleModal.open}
        onClose={() => setRuleModal({ open: false, rule: null })}
        rule={ruleModal.rule}
        onSave={handleSaveRule}
      />

      {/* Logs Modal */}
      <LogsModal
        isOpen={logsModal.open}
        onClose={() => setLogsModal({ open: false, ruleId: null, ruleName: '' })}
        ruleId={logsModal.ruleId}
        ruleName={logsModal.ruleName}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, rule: null })}
        title="Delete Automation Rule"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteModal({ open: false, rule: null })}>
              Cancel
            </Button>
            <Button variant="danger" icon={Trash2} loading={deleteLoading} onClick={handleDelete}>
              Delete Rule
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-dark-300 text-sm">
            Are you sure you want to delete <span className="text-white font-medium">{deleteModal.rule?.name}</span>?
          </p>
          <p className="text-dark-400 text-xs">
            This action cannot be undone. All associated logs will also be deleted.
          </p>
        </div>
      </Modal>
    </motion.div>
  );
}
