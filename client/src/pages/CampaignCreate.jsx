import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  Globe,
  Heart,
  UserPlus,
  ShoppingCart,
  Target,
  Play,
  MessageSquare,
  DollarSign,
  Calendar,
  MapPin,
  Tag,
  X,
  Upload,
  Image as ImageIcon,
  Video,
  Columns,
  Smartphone,
  Monitor,
  Zap,
  Link,
  Sparkles,
  Users,
  Search,
  Languages,
  Send,
  Save,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import { campaignsAPI } from '../services/api';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(num) {
  if (num == null || isNaN(num)) return '$0';
  return '$' + Number(num).toFixed(2);
}

// ── Constants ───────────────────────────────────────────────────────────────

const OBJECTIVES = [
  { id: 'awareness', label: 'Awareness', icon: Eye, description: 'Increase brand awareness and reach' },
  { id: 'traffic', label: 'Traffic', icon: Globe, description: 'Drive visitors to your website' },
  { id: 'engagement', label: 'Engagement', icon: Heart, description: 'Get more likes, comments, and shares' },
  { id: 'leads', label: 'Leads', icon: UserPlus, description: 'Collect lead information' },
  { id: 'sales', label: 'Sales', icon: ShoppingCart, description: 'Drive online sales and purchases' },
  { id: 'conversions', label: 'Conversions', icon: Target, description: 'Optimize for specific actions' },
  { id: 'video_views', label: 'Video Views', icon: Play, description: 'Get more views on your videos' },
  { id: 'messages', label: 'Messages', icon: MessageSquare, description: 'Start conversations with people' },
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

const AD_FORMATS = [
  { id: 'image', label: 'Single Image', icon: ImageIcon, description: 'A single image ad' },
  { id: 'video', label: 'Video', icon: Video, description: 'A video ad' },
  { id: 'carousel', label: 'Carousel', icon: Columns, description: 'Multiple scrollable images' },
  { id: 'stories', label: 'Stories', icon: Smartphone, description: 'Full-screen vertical format' },
];

const CURRENCIES = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
  { value: 'TRY', label: 'TRY (₺)' },
  { value: 'JPY', label: 'JPY (¥)' },
  { value: 'CAD', label: 'CAD ($)' },
  { value: 'AUD', label: 'AUD ($)' },
];

const MATCH_TYPES = [
  { value: 'broad', label: 'Broad Match' },
  { value: 'phrase', label: 'Phrase Match' },
  { value: 'exact', label: 'Exact Match' },
];

const DEVICE_OPTIONS = [
  { id: 'all', label: 'All Devices', icon: Monitor },
  { id: 'mobile', label: 'Mobile', icon: Smartphone },
  { id: 'desktop', label: 'Desktop', icon: Monitor },
];

const STEPS = [
  { num: 1, label: 'Platform & Objective' },
  { num: 2, label: 'Campaign Details' },
  { num: 3, label: 'Targeting' },
  { num: 4, label: 'Ad Creative' },
  { num: 5, label: 'Review & Launch' },
];

// ── Animation variants ──────────────────────────────────────────────────────

const stepVariants = {
  hidden: { opacity: 0, x: 30 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] } },
  exit: { opacity: 0, x: -30, transition: { duration: 0.2 } },
};

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

// ── Step Indicator ──────────────────────────────────────────────────────────

function StepIndicator({ currentStep, onStepClick }) {
  return (
    <div className="flex items-center justify-center gap-0 w-full max-w-2xl mx-auto mb-8">
      {STEPS.map((step, idx) => (
        <React.Fragment key={step.num}>
          <button
            onClick={() => onStepClick(step.num)}
            className="flex flex-col items-center gap-1.5 relative group"
          >
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                currentStep === step.num
                  ? 'bg-gradient-to-r from-brand-500 to-purple-500 text-white shadow-lg shadow-brand-500/30 scale-110'
                  : currentStep > step.num
                  ? 'bg-accent-500/20 text-accent-400 border border-accent-500/30'
                  : 'bg-dark-800 text-dark-500 border border-dark-700/50 hover:border-dark-600/50 hover:text-dark-400'
              }`}
            >
              {currentStep > step.num ? <Check size={16} /> : step.num}
            </div>
            <span
              className={`text-[10px] font-medium whitespace-nowrap transition-colors duration-200 hidden md:block ${
                currentStep === step.num
                  ? 'text-white'
                  : currentStep > step.num
                  ? 'text-accent-400'
                  : 'text-dark-500'
              }`}
            >
              {step.label}
            </span>
          </button>
          {idx < STEPS.length - 1 && (
            <div className="flex-1 mx-2 mb-5 md:mb-0">
              <div
                className={`h-0.5 rounded-full transition-all duration-500 ${
                  currentStep > step.num
                    ? 'bg-gradient-to-r from-accent-500/60 to-accent-500/30'
                    : 'bg-dark-700/50'
                }`}
              />
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ── Step 1: Platform & Objective ────────────────────────────────────────────

function Step1({ form, setForm }) {
  return (
    <motion.div key="step1" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="space-y-8">
      {/* Platform Selection */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-2">Choose Your Platform</h2>
        <p className="text-sm text-dark-400 mb-5">Select where you want to run your ads</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Meta Card */}
          <button
            onClick={() => setForm({ ...form, platform: 'meta' })}
            className={`relative overflow-hidden rounded-2xl p-6 border-2 transition-all duration-300 text-left group ${
              form.platform === 'meta'
                ? 'border-blue-500/50 bg-blue-500/10 shadow-lg shadow-blue-500/10'
                : 'border-dark-700/50 bg-dark-800/50 hover:border-dark-600/50 hover:bg-dark-800/70'
            }`}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-500/10 to-transparent rounded-bl-full" />
            <div className="relative">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold mb-4 transition-all duration-300 ${
                form.platform === 'meta'
                  ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                  : 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
              }`}>
                M
              </div>
              <h3 className="text-lg font-bold text-white mb-1">Meta</h3>
              <p className="text-sm text-dark-400">Facebook & Instagram</p>
              <div className="flex items-center gap-2 mt-3">
                <Badge color="blue">Facebook</Badge>
                <Badge color="purple">Instagram</Badge>
              </div>
            </div>
            {form.platform === 'meta' && (
              <div className="absolute top-3 right-3">
                <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                  <Check size={14} className="text-white" />
                </div>
              </div>
            )}
          </button>

          {/* Google Card */}
          <button
            onClick={() => setForm({ ...form, platform: 'google' })}
            className={`relative overflow-hidden rounded-2xl p-6 border-2 transition-all duration-300 text-left group ${
              form.platform === 'google'
                ? 'border-emerald-500/50 bg-emerald-500/10 shadow-lg shadow-emerald-500/10'
                : 'border-dark-700/50 bg-dark-800/50 hover:border-dark-600/50 hover:bg-dark-800/70'
            }`}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-emerald-500/10 via-yellow-500/5 to-transparent rounded-bl-full" />
            <div className="relative">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold mb-4 transition-all duration-300 ${
                form.platform === 'google'
                  ? 'bg-gradient-to-br from-emerald-500 via-yellow-500 to-red-500 text-white shadow-lg shadow-emerald-500/30'
                  : 'bg-gradient-to-br from-emerald-500 via-yellow-500 to-red-500 text-white'
              }`}>
                G
              </div>
              <h3 className="text-lg font-bold text-white mb-1">Google</h3>
              <p className="text-sm text-dark-400">Search, Display & YouTube</p>
              <div className="flex items-center gap-2 mt-3">
                <Badge color="green">Search</Badge>
                <Badge color="red">YouTube</Badge>
              </div>
            </div>
            {form.platform === 'google' && (
              <div className="absolute top-3 right-3">
                <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                  <Check size={14} className="text-white" />
                </div>
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Objective Selection */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-2">Select Your Objective</h2>
        <p className="text-sm text-dark-400 mb-5">What do you want to achieve?</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {OBJECTIVES.map((obj) => {
            const Icon = obj.icon;
            const isSelected = form.objective === obj.id;
            return (
              <button
                key={obj.id}
                onClick={() => setForm({ ...form, objective: obj.id })}
                className={`relative flex flex-col items-center gap-2.5 p-5 rounded-xl border transition-all duration-200 text-center group ${
                  isSelected
                    ? 'bg-brand-500/15 border-brand-500/30 text-brand-400'
                    : 'bg-dark-800/50 border-dark-700/50 text-dark-400 hover:border-dark-600/50 hover:text-dark-300 hover:bg-dark-800/70'
                }`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200 ${
                  isSelected ? 'bg-brand-500/20' : 'bg-dark-700/50 group-hover:bg-dark-700'
                }`}>
                  <Icon size={20} />
                </div>
                <span className="text-sm font-medium text-white">{obj.label}</span>
                <span className="text-[11px] text-dark-400 leading-tight">{obj.description}</span>
                {isSelected && (
                  <div className="absolute top-2 right-2">
                    <div className="w-5 h-5 rounded-full bg-brand-500 flex items-center justify-center">
                      <Check size={12} className="text-white" />
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

// ── Step 2: Campaign Details ────────────────────────────────────────────────

function Step2({ form, setForm }) {
  return (
    <motion.div key="step2" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="space-y-6 max-w-xl mx-auto">
      <div>
        <h2 className="text-lg font-semibold text-white mb-2">Campaign Details</h2>
        <p className="text-sm text-dark-400 mb-6">Configure budget and schedule for your campaign</p>
      </div>

      <Input
        label="Campaign Name"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        placeholder="e.g. Summer Sale Campaign 2026"
      />

      <div>
        <label className="block text-sm font-medium text-dark-300 mb-1.5">Budget Type</label>
        <div className="flex items-center gap-2 mb-4">
          {['daily', 'lifetime'].map((bt) => (
            <button
              key={bt}
              onClick={() => setForm({ ...form, budgetType: bt })}
              className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 capitalize ${
                form.budgetType === bt
                  ? 'bg-gradient-to-r from-brand-600 to-purple-600 text-white shadow-sm'
                  : 'bg-dark-800 text-dark-400 border border-dark-700/50 hover:text-white hover:border-dark-600/50'
              }`}
            >
              {bt} Budget
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label={`${form.budgetType === 'daily' ? 'Daily' : 'Total'} Budget`}
          type="number"
          icon={DollarSign}
          value={form.budget}
          onChange={(e) => setForm({ ...form, budget: e.target.value })}
          placeholder="0.00"
        />
        <Input
          label="Currency"
          type="select"
          value={form.currency}
          onChange={(e) => setForm({ ...form, currency: e.target.value })}
          options={CURRENCIES}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Start Date"
          type="date"
          icon={Calendar}
          value={form.startDate}
          onChange={(e) => setForm({ ...form, startDate: e.target.value })}
        />
        <Input
          label="End Date (Optional)"
          type="date"
          icon={Calendar}
          value={form.endDate}
          onChange={(e) => setForm({ ...form, endDate: e.target.value })}
        />
      </div>

      {/* Budget estimate */}
      {form.budget && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-brand-500/5 border border-brand-500/10 rounded-xl p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={14} className="text-brand-400" />
            <span className="text-xs font-medium text-brand-400">Budget Summary</span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-dark-400 text-xs">Daily Budget</p>
              <p className="text-white font-semibold">
                {form.budgetType === 'daily' ? formatCurrency(form.budget) : formatCurrency(form.budget / 30)}
              </p>
            </div>
            <div>
              <p className="text-dark-400 text-xs">Monthly Estimate</p>
              <p className="text-white font-semibold">
                {form.budgetType === 'daily' ? formatCurrency(form.budget * 30) : formatCurrency(form.budget)}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

// ── Step 3: Targeting ───────────────────────────────────────────────────────

function Step3Meta({ form, setForm }) {
  return (
    <motion.div key="step3-meta" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h2 className="text-lg font-semibold text-white mb-2">Audience Targeting</h2>
        <p className="text-sm text-dark-400 mb-6">Define who should see your ads on Meta</p>
      </div>

      {/* Age Range */}
      <div>
        <label className="block text-sm font-medium text-dark-300 mb-3">Age Range</label>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Min Age"
            type="number"
            value={form.targeting.ageMin}
            onChange={(e) =>
              setForm({
                ...form,
                targeting: { ...form.targeting, ageMin: parseInt(e.target.value) || 18 },
              })
            }
            min={13}
            max={65}
          />
          <Input
            label="Max Age"
            type="number"
            value={form.targeting.ageMax}
            onChange={(e) =>
              setForm({
                ...form,
                targeting: { ...form.targeting, ageMax: parseInt(e.target.value) || 65 },
              })
            }
            min={13}
            max={65}
          />
        </div>
      </div>

      {/* Gender */}
      <div>
        <label className="block text-sm font-medium text-dark-300 mb-2">Gender</label>
        <div className="flex items-center gap-2">
          {['all', 'male', 'female'].map((g) => (
            <button
              key={g}
              onClick={() =>
                setForm({
                  ...form,
                  targeting: { ...form.targeting, gender: g },
                })
              }
              className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 capitalize ${
                form.targeting.gender === g
                  ? 'bg-gradient-to-r from-brand-600 to-purple-600 text-white'
                  : 'bg-dark-800 text-dark-400 border border-dark-700/50 hover:text-white hover:border-dark-600/50'
              }`}
            >
              {g === 'all' ? 'All Genders' : g}
            </button>
          ))}
        </div>
      </div>

      {/* Locations */}
      <TagsInput
        label="Locations"
        value={form.targeting.locations}
        onChange={(locations) =>
          setForm({
            ...form,
            targeting: { ...form.targeting, locations },
          })
        }
        placeholder="Type a city or country and press Enter..."
      />

      {/* Interests */}
      <TagsInput
        label="Interests"
        value={form.targeting.interests}
        onChange={(interests) =>
          setForm({
            ...form,
            targeting: { ...form.targeting, interests },
          })
        }
        placeholder="e.g. Technology, Fitness, Travel..."
      />

      {/* Behaviors */}
      <TagsInput
        label="Behaviors"
        value={form.targeting.behaviors || []}
        onChange={(behaviors) =>
          setForm({
            ...form,
            targeting: { ...form.targeting, behaviors },
          })
        }
        placeholder="e.g. Online shoppers, Frequent travelers..."
      />

      {/* Custom Audiences */}
      <TagsInput
        label="Custom Audiences (Optional)"
        value={form.targeting.customAudiences || []}
        onChange={(customAudiences) =>
          setForm({
            ...form,
            targeting: { ...form.targeting, customAudiences },
          })
        }
        placeholder="Enter custom audience IDs..."
      />

      {/* Estimated reach */}
      <div className="bg-dark-800/50 border border-dark-700/50 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Users size={14} className="text-brand-400" />
          <span className="text-xs font-medium text-dark-300">Estimated Audience</span>
        </div>
        <p className="text-2xl font-bold text-white">
          {form.targeting.locations.length > 0 ? '1.2M - 3.5M' : '5M - 15M'}
        </p>
        <p className="text-xs text-dark-400 mt-1">people in your target audience</p>
      </div>
    </motion.div>
  );
}

function Step3Google({ form, setForm }) {
  return (
    <motion.div key="step3-google" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h2 className="text-lg font-semibold text-white mb-2">Targeting Settings</h2>
        <p className="text-sm text-dark-400 mb-6">Configure targeting for Google Ads</p>
      </div>

      {/* Keywords */}
      <TagsInput
        label="Keywords"
        value={form.targeting.keywords || []}
        onChange={(keywords) =>
          setForm({
            ...form,
            targeting: { ...form.targeting, keywords },
          })
        }
        placeholder="Enter keywords and press Enter..."
      />

      {/* Match Type */}
      <div>
        <label className="block text-sm font-medium text-dark-300 mb-2">Match Type</label>
        <div className="flex items-center gap-2">
          {MATCH_TYPES.map((mt) => (
            <button
              key={mt.value}
              onClick={() =>
                setForm({
                  ...form,
                  targeting: { ...form.targeting, matchType: mt.value },
                })
              }
              className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
                (form.targeting.matchType || 'broad') === mt.value
                  ? 'bg-gradient-to-r from-brand-600 to-purple-600 text-white'
                  : 'bg-dark-800 text-dark-400 border border-dark-700/50 hover:text-white hover:border-dark-600/50'
              }`}
            >
              {mt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Location */}
      <TagsInput
        label="Location Targeting"
        value={form.targeting.locations}
        onChange={(locations) =>
          setForm({
            ...form,
            targeting: { ...form.targeting, locations },
          })
        }
        placeholder="Type a location and press Enter..."
      />

      {/* Language */}
      <TagsInput
        label="Languages"
        value={form.targeting.languages || []}
        onChange={(languages) =>
          setForm({
            ...form,
            targeting: { ...form.targeting, languages },
          })
        }
        placeholder="e.g. English, Spanish..."
      />

      {/* Device Targeting */}
      <div>
        <label className="block text-sm font-medium text-dark-300 mb-2">Device Targeting</label>
        <div className="flex items-center gap-2">
          {DEVICE_OPTIONS.map((dev) => {
            const Icon = dev.icon;
            return (
              <button
                key={dev.id}
                onClick={() =>
                  setForm({
                    ...form,
                    targeting: { ...form.targeting, device: dev.id },
                  })
                }
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
                  (form.targeting.device || 'all') === dev.id
                    ? 'bg-gradient-to-r from-brand-600 to-purple-600 text-white'
                    : 'bg-dark-800 text-dark-400 border border-dark-700/50 hover:text-white hover:border-dark-600/50'
                }`}
              >
                <Icon size={16} />
                {dev.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Negative Keywords */}
      <TagsInput
        label="Negative Keywords (Optional)"
        value={form.targeting.negativeKeywords || []}
        onChange={(negativeKeywords) =>
          setForm({
            ...form,
            targeting: { ...form.targeting, negativeKeywords },
          })
        }
        placeholder="Keywords you want to exclude..."
      />
    </motion.div>
  );
}

// ── Step 4: Ad Creation ─────────────────────────────────────────────────────

function Step4({ form, setForm }) {
  const isGoogle = form.platform === 'google';

  return (
    <motion.div key="step4" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white mb-2">Create Your Ad</h2>
        <p className="text-sm text-dark-400 mb-6">Design the creative content for your campaign</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form side */}
        <div className="space-y-5">
          {/* Format selection */}
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Ad Format</label>
            <div className="grid grid-cols-2 gap-2">
              {AD_FORMATS.map((fmt) => {
                const Icon = fmt.icon;
                return (
                  <button
                    key={fmt.id}
                    onClick={() => setForm({ ...form, ad: { ...form.ad, format: fmt.id } })}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all duration-200 ${
                      form.ad.format === fmt.id
                        ? 'bg-brand-500/15 border-brand-500/30 text-brand-400'
                        : 'bg-dark-800 border-dark-700/50 text-dark-400 hover:border-dark-600/50'
                    }`}
                  >
                    <Icon size={16} />
                    <span className="text-xs font-medium">{fmt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Headlines - multiple for Google RSA */}
          {isGoogle ? (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-dark-300">Headlines (up to 3)</label>
              {(form.ad.headlines || ['', '', '']).map((hl, idx) => (
                <Input
                  key={idx}
                  value={hl}
                  onChange={(e) => {
                    const newHeadlines = [...(form.ad.headlines || ['', '', ''])];
                    newHeadlines[idx] = e.target.value;
                    setForm({ ...form, ad: { ...form.ad, headlines: newHeadlines } });
                  }}
                  placeholder={`Headline ${idx + 1} (max 30 chars)`}
                  maxLength={30}
                />
              ))}
            </div>
          ) : (
            <Input
              label="Headline"
              value={form.ad.headline}
              onChange={(e) => setForm({ ...form, ad: { ...form.ad, headline: e.target.value } })}
              placeholder="Write a catchy headline"
            />
          )}

          {/* Descriptions */}
          {isGoogle ? (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-dark-300">Descriptions (up to 2)</label>
              {(form.ad.descriptions || ['', '']).map((desc, idx) => (
                <Input
                  key={idx}
                  value={desc}
                  onChange={(e) => {
                    const newDescs = [...(form.ad.descriptions || ['', ''])];
                    newDescs[idx] = e.target.value;
                    setForm({ ...form, ad: { ...form.ad, descriptions: newDescs } });
                  }}
                  placeholder={`Description ${idx + 1} (max 90 chars)`}
                  maxLength={90}
                />
              ))}
            </div>
          ) : (
            <Input
              label="Description"
              value={form.ad.description}
              onChange={(e) => setForm({ ...form, ad: { ...form.ad, description: e.target.value } })}
              placeholder="Brief description of your offer"
            />
          )}

          {/* Primary Text (Meta only) */}
          {!isGoogle && (
            <Input
              label="Primary Text"
              type="textarea"
              value={form.ad.primaryText}
              onChange={(e) => setForm({ ...form, ad: { ...form.ad, primaryText: e.target.value } })}
              placeholder="Primary text appears above the media..."
              rows={3}
            />
          )}

          {/* CTA */}
          <Input
            label="Call to Action"
            type="select"
            value={form.ad.cta}
            onChange={(e) => setForm({ ...form, ad: { ...form.ad, cta: e.target.value } })}
            options={CTA_OPTIONS}
          />

          {/* Destination URL */}
          <Input
            label="Destination URL"
            icon={Link}
            value={form.ad.destinationUrl}
            onChange={(e) => setForm({ ...form, ad: { ...form.ad, destinationUrl: e.target.value } })}
            placeholder="https://example.com/landing-page"
          />

          {/* Media */}
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1.5">Media</label>
            <Input
              value={form.ad.mediaUrl}
              onChange={(e) => setForm({ ...form, ad: { ...form.ad, mediaUrl: e.target.value } })}
              placeholder="Paste image/video URL"
              icon={Link}
            />
            <div className="flex items-center gap-2 mt-2">
              <button className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-dark-400 bg-dark-800 border border-dark-700/50 rounded-lg hover:text-white hover:border-dark-600/50 transition-all">
                <Upload size={14} /> Upload File
              </button>
              <button className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-brand-400 bg-brand-500/10 border border-brand-500/20 rounded-lg hover:bg-brand-500/15 transition-all">
                <Sparkles size={14} /> AI Generate
              </button>
            </div>
          </div>
        </div>

        {/* Preview side */}
        <div>
          <label className="block text-sm font-medium text-dark-300 mb-3">Ad Preview</label>
          <div className="bg-dark-900/50 rounded-2xl border border-dark-700/30 overflow-hidden sticky top-6">
            {isGoogle ? (
              /* Google search ad preview */
              <div className="p-5">
                <div className="bg-white rounded-lg p-4">
                  <div className="flex items-center gap-1 mb-1">
                    <span className="text-[10px] font-medium bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">Ad</span>
                    <span className="text-xs text-green-700 truncate">{form.ad.destinationUrl || 'www.example.com'}</span>
                  </div>
                  <h4 className="text-blue-700 text-base font-medium mb-1 hover:underline cursor-pointer">
                    {(form.ad.headlines || [''])[0] || 'Your Headline Here'} | {(form.ad.headlines || ['', ''])[1] || 'Second Headline'}
                  </h4>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {(form.ad.descriptions || [''])[0] || 'Your ad description will appear here. Write compelling copy to attract clicks.'}
                  </p>
                </div>
                <p className="text-[10px] text-dark-500 text-center mt-3">Google Search Ad Preview</p>
              </div>
            ) : (
              /* Meta ad preview */
              <div>
                <div className="p-4 border-b border-dark-700/30">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-purple-500" />
                    <div>
                      <p className="text-xs font-semibold text-white">Your Brand</p>
                      <p className="text-[10px] text-dark-500">Sponsored</p>
                    </div>
                  </div>
                  {form.ad.primaryText && (
                    <p className="text-xs text-dark-300 mt-3 leading-relaxed">{form.ad.primaryText}</p>
                  )}
                </div>
                <div className="w-full aspect-square bg-dark-800 flex items-center justify-center max-h-64">
                  {form.ad.mediaUrl ? (
                    <img
                      src={form.ad.mediaUrl}
                      alt="Ad preview"
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <div className="text-center">
                      <ImageIcon size={40} className="text-dark-600 mx-auto mb-2" />
                      <p className="text-xs text-dark-500">Your media will appear here</p>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <p className="text-xs font-semibold text-white mb-0.5">
                    {form.ad.headline || 'Your Headline'}
                  </p>
                  <p className="text-[11px] text-dark-400">
                    {form.ad.description || 'Your description goes here'}
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-[10px] text-dark-500 truncate flex-1">
                      {form.ad.destinationUrl || 'example.com'}
                    </span>
                    <span className="inline-block px-3 py-1 bg-dark-700 text-dark-300 rounded text-[10px] font-medium capitalize ml-2 flex-shrink-0">
                      {(form.ad.cta || 'learn_more').replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-dark-500 text-center pb-3">Meta Ad Preview</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Step 5: Review & Launch ─────────────────────────────────────────────────

function Step5({ form }) {
  const objective = OBJECTIVES.find((o) => o.id === form.objective);
  const isGoogle = form.platform === 'google';

  const sections = [
    {
      title: 'Platform & Objective',
      items: [
        { label: 'Platform', value: form.platform === 'meta' ? 'Meta (Facebook/Instagram)' : 'Google Ads' },
        { label: 'Objective', value: objective?.label || form.objective || '-' },
      ],
    },
    {
      title: 'Campaign Details',
      items: [
        { label: 'Name', value: form.name || '-' },
        { label: 'Budget', value: `${formatCurrency(form.budget)} / ${form.budgetType}` },
        { label: 'Currency', value: form.currency },
        { label: 'Start Date', value: form.startDate || 'Not set' },
        { label: 'End Date', value: form.endDate || 'Ongoing' },
      ],
    },
    {
      title: 'Targeting',
      items: isGoogle
        ? [
            { label: 'Keywords', value: (form.targeting.keywords || []).join(', ') || 'None' },
            { label: 'Match Type', value: form.targeting.matchType || 'Broad' },
            { label: 'Locations', value: form.targeting.locations.join(', ') || 'All' },
            { label: 'Languages', value: (form.targeting.languages || []).join(', ') || 'All' },
            { label: 'Devices', value: form.targeting.device || 'All' },
          ]
        : [
            { label: 'Age Range', value: `${form.targeting.ageMin} - ${form.targeting.ageMax}` },
            { label: 'Gender', value: form.targeting.gender === 'all' ? 'All Genders' : form.targeting.gender },
            { label: 'Locations', value: form.targeting.locations.join(', ') || 'All' },
            { label: 'Interests', value: form.targeting.interests.join(', ') || 'None' },
            { label: 'Behaviors', value: (form.targeting.behaviors || []).join(', ') || 'None' },
          ],
    },
    {
      title: 'Ad Creative',
      items: [
        { label: 'Format', value: (AD_FORMATS.find((f) => f.id === form.ad.format)?.label || form.ad.format) },
        ...(isGoogle
          ? [
              { label: 'Headlines', value: (form.ad.headlines || []).filter(Boolean).join(' | ') || '-' },
              { label: 'Descriptions', value: (form.ad.descriptions || []).filter(Boolean).join(' | ') || '-' },
            ]
          : [
              { label: 'Headline', value: form.ad.headline || '-' },
              { label: 'Description', value: form.ad.description || '-' },
              { label: 'Primary Text', value: form.ad.primaryText ? (form.ad.primaryText.substring(0, 60) + (form.ad.primaryText.length > 60 ? '...' : '')) : '-' },
            ]),
        { label: 'CTA', value: CTA_OPTIONS.find((c) => c.value === form.ad.cta)?.label || form.ad.cta || '-' },
        { label: 'Destination URL', value: form.ad.destinationUrl || '-' },
      ],
    },
  ];

  return (
    <motion.div key="step5" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h2 className="text-lg font-semibold text-white mb-2">Review Your Campaign</h2>
        <p className="text-sm text-dark-400 mb-6">Review all settings before launching</p>
      </div>

      {sections.map((section) => (
        <Card key={section.title} header={section.title}>
          <div className="space-y-3">
            {section.items.map((item) => (
              <div key={item.label} className="flex items-start justify-between gap-4">
                <span className="text-xs text-dark-500 uppercase tracking-wider whitespace-nowrap">{item.label}</span>
                <span className="text-sm text-white text-right break-words">{item.value}</span>
              </div>
            ))}
          </div>
        </Card>
      ))}

      {/* Estimated reach/budget */}
      <div className="bg-gradient-to-r from-brand-500/10 to-purple-500/10 border border-brand-500/20 rounded-2xl p-6">
        <h4 className="text-sm font-semibold text-white mb-4">Campaign Estimates</h4>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-dark-400 mb-1">Est. Daily Reach</p>
            <p className="text-lg font-bold text-white">
              {form.budget ? `${Math.floor(Number(form.budget) * 150).toLocaleString()} - ${Math.floor(Number(form.budget) * 400).toLocaleString()}` : '-'}
            </p>
          </div>
          <div>
            <p className="text-xs text-dark-400 mb-1">Est. Daily Clicks</p>
            <p className="text-lg font-bold text-white">
              {form.budget ? `${Math.floor(Number(form.budget) * 2)} - ${Math.floor(Number(form.budget) * 8)}` : '-'}
            </p>
          </div>
          <div>
            <p className="text-xs text-dark-400 mb-1">Monthly Budget</p>
            <p className="text-lg font-bold text-white">
              {form.budget
                ? formatCurrency(form.budgetType === 'daily' ? Number(form.budget) * 30 : Number(form.budget))
                : '-'}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function CampaignCreate() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const [form, setForm] = useState({
    platform: 'meta',
    objective: '',
    name: '',
    budgetType: 'daily',
    budget: '',
    currency: 'USD',
    startDate: '',
    endDate: '',
    targeting: {
      ageMin: 18,
      ageMax: 65,
      gender: 'all',
      locations: [],
      interests: [],
      behaviors: [],
      customAudiences: [],
      keywords: [],
      matchType: 'broad',
      languages: [],
      device: 'all',
      negativeKeywords: [],
    },
    ad: {
      format: 'image',
      headline: '',
      headlines: ['', '', ''],
      description: '',
      descriptions: ['', ''],
      primaryText: '',
      cta: 'learn_more',
      destinationUrl: '',
      mediaUrl: '',
    },
  });

  const validateStep = (step) => {
    switch (step) {
      case 1:
        if (!form.platform) {
          toast.error('Please select a platform');
          return false;
        }
        if (!form.objective) {
          toast.error('Please select an objective');
          return false;
        }
        return true;
      case 2:
        if (!form.name.trim()) {
          toast.error('Please enter a campaign name');
          return false;
        }
        if (!form.budget || Number(form.budget) <= 0) {
          toast.error('Please enter a valid budget');
          return false;
        }
        return true;
      case 3:
        return true; // Targeting is optional
      case 4:
        return true; // Ad creative is optional for draft
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(Math.min(5, currentStep + 1));
    }
  };

  const handleBack = () => {
    setCurrentStep(Math.max(1, currentStep - 1));
  };

  const handleStepClick = (step) => {
    // Allow jumping to completed steps or the next available step
    if (step <= currentStep) {
      setCurrentStep(step);
    } else if (step === currentStep + 1 && validateStep(currentStep)) {
      setCurrentStep(step);
    }
  };

  const buildPayload = () => {
    const payload = {
      platform: form.platform,
      objective: form.objective,
      name: form.name,
      budgetType: form.budgetType,
      budget: parseFloat(form.budget) || 0,
      currency: form.currency,
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
      targeting: { ...form.targeting },
      ad: {
        format: form.ad.format,
        cta: form.ad.cta,
        destinationUrl: form.ad.destinationUrl,
        mediaUrl: form.ad.mediaUrl,
      },
    };

    if (form.platform === 'google') {
      payload.ad.headlines = (form.ad.headlines || []).filter(Boolean);
      payload.ad.descriptions = (form.ad.descriptions || []).filter(Boolean);
    } else {
      payload.ad.headline = form.ad.headline;
      payload.ad.description = form.ad.description;
      payload.ad.primaryText = form.ad.primaryText;
    }

    return payload;
  };

  const handleSaveDraft = async () => {
    if (!form.name.trim()) {
      toast.error('Please enter a campaign name');
      setCurrentStep(2);
      return;
    }
    try {
      setSaving(true);
      const payload = buildPayload();
      payload.status = 'draft';
      const response = await campaignsAPI.create(payload);
      toast.success('Campaign saved as draft');
      const id = response?.campaign?._id || response?.campaign?.id || response?._id || response?.id;
      navigate(id ? `/campaigns/${id}` : '/campaigns');
    } catch (err) {
      toast.error(err?.message || 'Failed to save campaign');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    // Validate all steps
    for (let step = 1; step <= 4; step++) {
      if (!validateStep(step)) {
        setCurrentStep(step);
        return;
      }
    }
    try {
      setPublishing(true);
      const payload = buildPayload();
      const response = await campaignsAPI.create(payload);
      const id = response?.campaign?._id || response?.campaign?.id || response?._id || response?.id;
      if (id) {
        try {
          await campaignsAPI.publish(id);
          toast.success('Campaign published successfully');
        } catch (pubErr) {
          toast.success('Campaign created. Publishing may take a moment.');
        }
        navigate(`/campaigns/${id}`);
      } else {
        toast.success('Campaign created');
        navigate('/campaigns');
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to create campaign');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/campaigns')}
            className="flex items-center gap-2 text-dark-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">Create Campaign</h1>
            <p className="text-dark-400 text-sm mt-0.5">Step {currentStep} of 5</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={Save}
            loading={saving}
            onClick={handleSaveDraft}
          >
            Save Draft
          </Button>
        </div>
      </div>

      {/* Step Indicator */}
      <StepIndicator currentStep={currentStep} onStepClick={handleStepClick} />

      {/* Step Content */}
      <AnimatePresence mode="wait">
        {currentStep === 1 && <Step1 form={form} setForm={setForm} />}
        {currentStep === 2 && <Step2 form={form} setForm={setForm} />}
        {currentStep === 3 && (
          form.platform === 'google'
            ? <Step3Google form={form} setForm={setForm} />
            : <Step3Meta form={form} setForm={setForm} />
        )}
        {currentStep === 4 && <Step4 form={form} setForm={setForm} />}
        {currentStep === 5 && <Step5 form={form} />}
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-dark-700/50">
        <div>
          {currentStep > 1 && (
            <Button variant="ghost" icon={ArrowLeft} onClick={handleBack}>
              Back
            </Button>
          )}
        </div>
        <div className="flex items-center gap-3">
          {currentStep < 5 ? (
            <Button iconRight={ArrowRight} onClick={handleNext}>
              Continue
            </Button>
          ) : (
            <>
              <Button
                variant="secondary"
                icon={Save}
                loading={saving}
                onClick={handleSaveDraft}
              >
                Save as Draft
              </Button>
              <Button
                icon={Send}
                loading={publishing}
                onClick={handlePublish}
              >
                Publish Campaign
              </Button>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
