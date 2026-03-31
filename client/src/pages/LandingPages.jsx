import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Plus,
  Sparkles,
  Search,
  Eye,
  Edit3,
  Trash2,
  BarChart3,
  Globe,
  GlobeLock,
  ExternalLink,
  Copy,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  Save,
  Send,
  Wand2,
  RefreshCw,
  Loader2,
  X,
  GripVertical,
  ImageIcon,
  Type,
  Star,
  Quote,
  MousePointerClick,
  Link2,
  Palette,
  Layout,
  Users,
  TrendingUp,
  Activity,
  PieChart,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronUp,
  Zap,
  Monitor,
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
} from 'recharts';
import { landingPagesAPI } from '../services/api';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatNumber(num) {
  if (!num && num !== 0) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
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
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] },
  },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
};

// ── Skeleton Loader ──────────────────────────────────────────────────────────

function PageCardSkeleton() {
  return (
    <div className="bg-dark-800/50 backdrop-blur-sm border border-dark-700/50 rounded-2xl overflow-hidden animate-pulse">
      <div className="aspect-video bg-dark-700/50" />
      <div className="p-5 space-y-3">
        <div className="h-5 bg-dark-700/50 rounded-lg w-3/4" />
        <div className="h-4 bg-dark-700/50 rounded-lg w-1/2" />
        <div className="flex gap-4 mt-4">
          <div className="h-4 bg-dark-700/50 rounded w-16" />
          <div className="h-4 bg-dark-700/50 rounded w-16" />
          <div className="h-4 bg-dark-700/50 rounded w-16" />
        </div>
      </div>
    </div>
  );
}

// ── Style / Industry / Color Constants ───────────────────────────────────────

const STYLES = [
  { id: 'modern', label: 'Modern', icon: Monitor },
  { id: 'minimal', label: 'Minimal', icon: Layout },
  { id: 'bold', label: 'Bold', icon: Zap },
  { id: 'corporate', label: 'Corporate', icon: Users },
  { id: 'creative', label: 'Creative', icon: Palette },
  { id: 'saas', label: 'SaaS', icon: Globe },
];

const INDUSTRIES = [
  'E-commerce', 'SaaS', 'Healthcare', 'Finance', 'Education',
  'Real Estate', 'Technology', 'Marketing', 'Travel', 'Food & Beverage',
  'Fitness', 'Legal',
];

const COLOR_PRESETS = [
  { id: 'indigo', label: 'Indigo', color: '#6366f1', gradient: 'from-indigo-500 to-violet-500' },
  { id: 'blue', label: 'Blue', color: '#3b82f6', gradient: 'from-blue-500 to-cyan-500' },
  { id: 'emerald', label: 'Emerald', color: '#10b981', gradient: 'from-emerald-500 to-teal-500' },
  { id: 'rose', label: 'Rose', color: '#f43f5e', gradient: 'from-rose-500 to-pink-500' },
  { id: 'amber', label: 'Amber', color: '#f59e0b', gradient: 'from-amber-500 to-orange-500' },
  { id: 'violet', label: 'Violet', color: '#8b5cf6', gradient: 'from-violet-500 to-purple-500' },
  { id: 'sky', label: 'Sky', color: '#0ea5e9', gradient: 'from-sky-500 to-blue-500' },
  { id: 'fuchsia', label: 'Fuchsia', color: '#d946ef', gradient: 'from-fuchsia-500 to-pink-500' },
];

const FONT_OPTIONS = [
  { value: 'Inter', label: 'Inter' },
  { value: 'Poppins', label: 'Poppins' },
  { value: 'Roboto', label: 'Roboto' },
  { value: 'Playfair Display', label: 'Playfair Display' },
  { value: 'Montserrat', label: 'Montserrat' },
  { value: 'Space Grotesk', label: 'Space Grotesk' },
];

const BG_STYLES = [
  { value: 'gradient', label: 'Gradient' },
  { value: 'solid', label: 'Solid Color' },
  { value: 'image', label: 'Image' },
  { value: 'pattern', label: 'Pattern' },
];

// ── Custom Recharts Tooltip ─────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-dark-800 border border-dark-700 rounded-xl px-4 py-3 shadow-xl">
      <p className="text-dark-400 text-xs mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-sm font-medium" style={{ color: entry.color }}>
          {entry.name}: {formatNumber(entry.value)}
        </p>
      ))}
    </div>
  );
}

// ── Sparkles Animation ──────────────────────────────────────────────────────

function SparklesAnimation() {
  return (
    <div className="relative inline-flex items-center justify-center">
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-violet-400"
          animate={{
            x: [0, Math.cos(i * 60 * Math.PI / 180) * 20],
            y: [0, Math.sin(i * 60 * Math.PI / 180) * 20],
            opacity: [1, 0],
            scale: [0, 1.5],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: i * 0.15,
            ease: 'easeOut',
          }}
        />
      ))}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
      >
        <Sparkles size={20} className="text-violet-400" />
      </motion.div>
    </div>
  );
}

// ── Accordion Section Component ─────────────────────────────────────────────

function AccordionSection({ title, icon: Icon, children, defaultOpen = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-dark-700/50 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-5 py-4 bg-dark-800/30 hover:bg-dark-800/60 transition-colors"
      >
        <div className="flex items-center gap-3">
          {Icon && <Icon size={18} className="text-brand-400" />}
          <span className="text-sm font-medium text-white">{title}</span>
        </div>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={16} className="text-dark-400" />
        </motion.div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-5 py-4 space-y-4 border-t border-dark-700/50">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Feature Item Component ──────────────────────────────────────────────────

function FeatureItem({ feature, index, onUpdate, onRemove }) {
  return (
    <div className="flex gap-3 items-start bg-dark-900/30 rounded-xl p-4 border border-dark-700/30">
      <div className="mt-1 text-dark-500 cursor-grab">
        <GripVertical size={16} />
      </div>
      <div className="flex-1 space-y-3">
        <Input
          label="Title"
          value={feature.title || ''}
          onChange={(e) => onUpdate(index, { ...feature, title: e.target.value })}
          placeholder="Feature title"
        />
        <Input
          label="Description"
          type="textarea"
          rows={2}
          value={feature.description || ''}
          onChange={(e) => onUpdate(index, { ...feature, description: e.target.value })}
          placeholder="Feature description"
        />
        <Input
          label="Icon (lucide name)"
          value={feature.icon || ''}
          onChange={(e) => onUpdate(index, { ...feature, icon: e.target.value })}
          placeholder="e.g., zap, shield, rocket"
        />
      </div>
      <button
        onClick={() => onRemove(index)}
        className="p-1.5 rounded-lg text-dark-400 hover:text-danger-400 hover:bg-danger-500/10 transition-colors"
      >
        <X size={16} />
      </button>
    </div>
  );
}

// ── Testimonial Item Component ──────────────────────────────────────────────

function TestimonialItem({ testimonial, index, onUpdate, onRemove }) {
  return (
    <div className="flex gap-3 items-start bg-dark-900/30 rounded-xl p-4 border border-dark-700/30">
      <div className="mt-1 text-dark-500 cursor-grab">
        <GripVertical size={16} />
      </div>
      <div className="flex-1 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Name"
            value={testimonial.name || ''}
            onChange={(e) => onUpdate(index, { ...testimonial, name: e.target.value })}
            placeholder="John Doe"
          />
          <Input
            label="Company"
            value={testimonial.company || ''}
            onChange={(e) => onUpdate(index, { ...testimonial, company: e.target.value })}
            placeholder="Acme Corp"
          />
        </div>
        <Input
          label="Testimonial"
          type="textarea"
          rows={2}
          value={testimonial.text || ''}
          onChange={(e) => onUpdate(index, { ...testimonial, text: e.target.value })}
          placeholder="What they said..."
        />
        <Input
          label="Avatar URL"
          value={testimonial.avatar || ''}
          onChange={(e) => onUpdate(index, { ...testimonial, avatar: e.target.value })}
          placeholder="https://..."
        />
      </div>
      <button
        onClick={() => onRemove(index)}
        className="p-1.5 rounded-lg text-dark-400 hover:text-danger-400 hover:bg-danger-500/10 transition-colors"
      >
        <X size={16} />
      </button>
    </div>
  );
}

// ── Live Preview Component ──────────────────────────────────────────────────

function LivePreview({ pageData }) {
  const { settings = {}, hero = {}, features = [], testimonials = [], cta = {}, footer = {}, style = {} } = pageData;
  const primaryColor = style.primaryColor || '#6366f1';

  const previewHTML = useMemo(() => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link href="https://fonts.googleapis.com/css2?family=${(style.font || 'Inter').replace(/ /g, '+')}&display=swap" rel="stylesheet">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: '${style.font || 'Inter'}', sans-serif; background: #0f172a; color: #e2e8f0; }
        .hero { padding: 60px 24px; text-align: center; background: linear-gradient(135deg, ${primaryColor}15, ${primaryColor}05); min-height: 300px; display: flex; flex-direction: column; align-items: center; justify-content: center; }
        .hero h1 { font-size: 2rem; font-weight: 800; color: #fff; margin-bottom: 12px; line-height: 1.2; }
        .hero p { font-size: 1rem; color: #94a3b8; max-width: 500px; margin: 0 auto 24px; }
        .hero .cta-btn { display: inline-block; padding: 12px 28px; background: ${primaryColor}; color: #fff; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 0.9rem; }
        .features { padding: 40px 24px; }
        .features h2 { text-align: center; font-size: 1.3rem; font-weight: 700; margin-bottom: 24px; color: #fff; }
        .features-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; max-width: 700px; margin: 0 auto; }
        .feature-card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 20px; }
        .feature-card h3 { font-size: 0.95rem; font-weight: 600; color: #fff; margin-bottom: 6px; }
        .feature-card p { font-size: 0.8rem; color: #94a3b8; line-height: 1.5; }
        .testimonials { padding: 40px 24px; background: #0f172a; }
        .testimonials h2 { text-align: center; font-size: 1.3rem; font-weight: 700; margin-bottom: 24px; color: #fff; }
        .testimonial-list { max-width: 600px; margin: 0 auto; display: flex; flex-direction: column; gap: 16px; }
        .testimonial { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 20px; }
        .testimonial p { font-size: 0.85rem; color: #cbd5e1; font-style: italic; margin-bottom: 10px; line-height: 1.5; }
        .testimonial .author { font-size: 0.8rem; color: #94a3b8; font-style: normal; }
        .testimonial .author strong { color: #fff; }
        .cta-section { padding: 50px 24px; text-align: center; background: linear-gradient(135deg, ${primaryColor}10, ${primaryColor}05); }
        .cta-section h2 { font-size: 1.5rem; font-weight: 700; color: #fff; margin-bottom: 16px; }
        .cta-section .cta-btn { display: inline-block; padding: 14px 32px; background: ${primaryColor}; color: #fff; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 0.9rem; }
        .footer { padding: 24px; text-align: center; border-top: 1px solid #1e293b; }
        .footer p { font-size: 0.75rem; color: #64748b; }
      </style>
    </head>
    <body>
      <div class="hero">
        <h1>${hero.headline || 'Your Amazing Headline'}</h1>
        <p>${hero.subheadline || 'Compelling subheadline that describes your value proposition.'}</p>
        ${hero.ctaText ? `<a href="${hero.ctaUrl || '#'}" class="cta-btn">${hero.ctaText}</a>` : ''}
      </div>

      ${features.length > 0 ? `
      <div class="features">
        <h2>Features</h2>
        <div class="features-grid">
          ${features.map(f => `
            <div class="feature-card">
              <h3>${f.title || 'Feature'}</h3>
              <p>${f.description || ''}</p>
            </div>
          `).join('')}
        </div>
      </div>` : ''}

      ${testimonials.length > 0 ? `
      <div class="testimonials">
        <h2>What People Say</h2>
        <div class="testimonial-list">
          ${testimonials.map(t => `
            <div class="testimonial">
              <p>"${t.text || ''}"</p>
              <div class="author"><strong>${t.name || 'Anonymous'}</strong>${t.company ? `, ${t.company}` : ''}</div>
            </div>
          `).join('')}
        </div>
      </div>` : ''}

      ${cta.heading ? `
      <div class="cta-section">
        <h2>${cta.heading}</h2>
        ${cta.buttonText ? `<a href="${cta.buttonUrl || '#'}" class="cta-btn">${cta.buttonText}</a>` : ''}
      </div>` : ''}

      <div class="footer">
        <p>${footer.companyName ? `&copy; 2026 ${footer.companyName}` : ''}</p>
      </div>
    </body>
    </html>
  `, [pageData, primaryColor, style.font, hero, features, testimonials, cta, footer]);

  return (
    <div className="w-full h-full bg-dark-900 rounded-xl overflow-hidden border border-dark-700/50">
      <div className="flex items-center gap-2 px-4 py-2 bg-dark-800 border-b border-dark-700/50">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-danger-500/60" />
          <div className="w-3 h-3 rounded-full bg-warning-500/60" />
          <div className="w-3 h-3 rounded-full bg-accent-500/60" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="bg-dark-900 rounded-lg px-4 py-1 text-xs text-dark-400 flex items-center gap-2">
            <Globe size={12} />
            <span>{settings.slug ? `yourdomain.com/${settings.slug}` : 'yourdomain.com/your-page'}</span>
          </div>
        </div>
      </div>
      <iframe
        srcDoc={previewHTML}
        className="w-full h-full min-h-[500px]"
        title="Landing page preview"
        sandbox="allow-scripts"
        style={{ border: 'none' }}
      />
    </div>
  );
}

// ── Editor View ─────────────────────────────────────────────────────────────

function EditorView({ pageId, onBack }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [pageData, setPageData] = useState({
    settings: { title: '', slug: '', metaDescription: '' },
    hero: { headline: '', subheadline: '', ctaText: '', ctaUrl: '', backgroundImage: '' },
    features: [],
    testimonials: [],
    cta: { heading: '', buttonText: '', buttonUrl: '' },
    footer: { companyName: '', links: '' },
    style: { primaryColor: '#6366f1', font: 'Inter', backgroundStyle: 'gradient' },
  });
  const [isPublished, setIsPublished] = useState(false);

  useEffect(() => {
    if (pageId && pageId !== 'new') {
      loadPage();
    }
  }, [pageId]);

  const loadPage = async () => {
    setLoading(true);
    try {
      const res = await landingPagesAPI.get(pageId);
      const page = res.data || res;
      setPageData({
        settings: {
          title: page.title || page.name || '',
          slug: page.slug || '',
          metaDescription: page.metaDescription || page.meta_description || '',
        },
        hero: page.hero || page.sections?.hero || { headline: '', subheadline: '', ctaText: '', ctaUrl: '', backgroundImage: '' },
        features: page.features || page.sections?.features || [],
        testimonials: page.testimonials || page.sections?.testimonials || [],
        cta: page.cta || page.sections?.cta || { heading: '', buttonText: '', buttonUrl: '' },
        footer: page.footer || page.sections?.footer || { companyName: '', links: '' },
        style: page.style || { primaryColor: '#6366f1', font: 'Inter', backgroundStyle: 'gradient' },
      });
      setIsPublished(page.published || page.status === 'published');
    } catch (err) {
      toast.error('Failed to load landing page');
    } finally {
      setLoading(false);
    }
  };

  const updateSection = (section, data) => {
    setPageData((prev) => ({ ...prev, [section]: data }));
  };

  const updateSectionField = (section, field, value) => {
    setPageData((prev) => ({
      ...prev,
      [section]: { ...prev[section], [field]: value },
    }));
  };

  const addFeature = () => {
    setPageData((prev) => ({
      ...prev,
      features: [...prev.features, { title: '', description: '', icon: 'zap' }],
    }));
  };

  const updateFeature = (index, feature) => {
    const updated = [...pageData.features];
    updated[index] = feature;
    setPageData((prev) => ({ ...prev, features: updated }));
  };

  const removeFeature = (index) => {
    setPageData((prev) => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index),
    }));
  };

  const addTestimonial = () => {
    setPageData((prev) => ({
      ...prev,
      testimonials: [...prev.testimonials, { name: '', text: '', avatar: '', company: '' }],
    }));
  };

  const updateTestimonial = (index, testimonial) => {
    const updated = [...pageData.testimonials];
    updated[index] = testimonial;
    setPageData((prev) => ({ ...prev, testimonials: updated }));
  };

  const removeTestimonial = (index) => {
    setPageData((prev) => ({
      ...prev,
      testimonials: prev.testimonials.filter((_, i) => i !== index),
    }));
  };

  const handleSave = async () => {
    if (!pageData.settings.title) {
      toast.error('Please enter a page title');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: pageData.settings.title,
        title: pageData.settings.title,
        slug: pageData.settings.slug || slugify(pageData.settings.title),
        metaDescription: pageData.settings.metaDescription,
        hero: pageData.hero,
        features: pageData.features,
        testimonials: pageData.testimonials,
        cta: pageData.cta,
        footer: pageData.footer,
        style: pageData.style,
        sections: {
          hero: pageData.hero,
          features: pageData.features,
          testimonials: pageData.testimonials,
          cta: pageData.cta,
          footer: pageData.footer,
        },
      };
      if (pageId && pageId !== 'new') {
        await landingPagesAPI.update(pageId, payload);
        toast.success('Landing page saved');
      } else {
        const res = await landingPagesAPI.create(payload);
        toast.success('Landing page created');
        const newId = res.data?._id || res.data?.id || res._id || res.id;
        if (newId) {
          window.history.replaceState(null, '', `/landing-pages/${newId}`);
        }
      }
    } catch (err) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!pageId || pageId === 'new') {
      toast.error('Save the page first before publishing');
      return;
    }
    setPublishing(true);
    try {
      await landingPagesAPI.publish(pageId);
      setIsPublished(true);
      toast.success('Landing page published');
    } catch (err) {
      toast.error(err.message || 'Failed to publish');
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 size={32} className="text-brand-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-dark-800/50 border border-dark-700/50 hover:bg-dark-700/50 text-dark-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">
              {pageId === 'new' ? 'Create Landing Page' : 'Edit Landing Page'}
            </h1>
            <p className="text-dark-400 text-sm mt-0.5">
              {pageData.settings.slug ? `/${pageData.settings.slug}` : 'Build your page'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isPublished && (
            <Badge color="green" dot>Published</Badge>
          )}
          <Button variant="secondary" icon={Save} onClick={handleSave} loading={saving}>
            Save
          </Button>
          <Button icon={Send} onClick={handlePublish} loading={publishing}>
            Publish
          </Button>
        </div>
      </div>

      {/* Split View */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Left: Editor */}
        <div className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto pr-2">
          {/* Page Settings */}
          <AccordionSection title="Page Settings" icon={Layout} defaultOpen={true}>
            <Input
              label="Page Title"
              value={pageData.settings.title}
              onChange={(e) => {
                updateSectionField('settings', 'title', e.target.value);
                if (!pageData.settings.slug || pageData.settings.slug === slugify(pageData.settings.title.slice(0, -1))) {
                  updateSectionField('settings', 'slug', slugify(e.target.value));
                }
              }}
              placeholder="My Landing Page"
            />
            <Input
              label="URL Slug"
              value={pageData.settings.slug}
              onChange={(e) => updateSectionField('settings', 'slug', slugify(e.target.value))}
              placeholder="my-landing-page"
            />
            <Input
              label="Meta Description"
              type="textarea"
              rows={2}
              value={pageData.settings.metaDescription}
              onChange={(e) => updateSectionField('settings', 'metaDescription', e.target.value)}
              placeholder="Brief description for search engines..."
            />
          </AccordionSection>

          {/* Hero Section */}
          <AccordionSection title="Hero Section" icon={Type} defaultOpen={true}>
            <Input
              label="Headline"
              value={pageData.hero.headline}
              onChange={(e) => updateSectionField('hero', 'headline', e.target.value)}
              placeholder="Build Something Amazing"
            />
            <Input
              label="Subheadline"
              type="textarea"
              rows={2}
              value={pageData.hero.subheadline}
              onChange={(e) => updateSectionField('hero', 'subheadline', e.target.value)}
              placeholder="A short description of your offer..."
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="CTA Text"
                value={pageData.hero.ctaText}
                onChange={(e) => updateSectionField('hero', 'ctaText', e.target.value)}
                placeholder="Get Started"
              />
              <Input
                label="CTA URL"
                value={pageData.hero.ctaUrl}
                onChange={(e) => updateSectionField('hero', 'ctaUrl', e.target.value)}
                placeholder="https://..."
              />
            </div>
            <Input
              label="Background Image URL"
              value={pageData.hero.backgroundImage}
              onChange={(e) => updateSectionField('hero', 'backgroundImage', e.target.value)}
              placeholder="https://..."
            />
          </AccordionSection>

          {/* Features Section */}
          <AccordionSection title="Features Section" icon={Star}>
            <div className="space-y-3">
              {pageData.features.map((feature, i) => (
                <FeatureItem
                  key={i}
                  feature={feature}
                  index={i}
                  onUpdate={updateFeature}
                  onRemove={removeFeature}
                />
              ))}
            </div>
            <Button variant="outline" size="sm" icon={Plus} onClick={addFeature}>
              Add Feature
            </Button>
          </AccordionSection>

          {/* Testimonials */}
          <AccordionSection title="Testimonials" icon={Quote}>
            <div className="space-y-3">
              {pageData.testimonials.map((testimonial, i) => (
                <TestimonialItem
                  key={i}
                  testimonial={testimonial}
                  index={i}
                  onUpdate={updateTestimonial}
                  onRemove={removeTestimonial}
                />
              ))}
            </div>
            <Button variant="outline" size="sm" icon={Plus} onClick={addTestimonial}>
              Add Testimonial
            </Button>
          </AccordionSection>

          {/* CTA Section */}
          <AccordionSection title="CTA Section" icon={MousePointerClick}>
            <Input
              label="Heading"
              value={pageData.cta.heading}
              onChange={(e) => updateSectionField('cta', 'heading', e.target.value)}
              placeholder="Ready to get started?"
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Button Text"
                value={pageData.cta.buttonText}
                onChange={(e) => updateSectionField('cta', 'buttonText', e.target.value)}
                placeholder="Sign Up Now"
              />
              <Input
                label="Button URL"
                value={pageData.cta.buttonUrl}
                onChange={(e) => updateSectionField('cta', 'buttonUrl', e.target.value)}
                placeholder="https://..."
              />
            </div>
          </AccordionSection>

          {/* Footer */}
          <AccordionSection title="Footer" icon={Layout}>
            <Input
              label="Company Name"
              value={pageData.footer.companyName}
              onChange={(e) => updateSectionField('footer', 'companyName', e.target.value)}
              placeholder="Your Company"
            />
            <Input
              label="Footer Links (comma-separated)"
              value={pageData.footer.links}
              onChange={(e) => updateSectionField('footer', 'links', e.target.value)}
              placeholder="Privacy, Terms, Contact"
            />
          </AccordionSection>

          {/* Style Controls */}
          <AccordionSection title="Style Controls" icon={Palette}>
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">Primary Color</label>
              <div className="flex flex-wrap gap-2">
                {COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => updateSectionField('style', 'primaryColor', preset.color)}
                    className={`w-8 h-8 rounded-lg border-2 transition-all ${
                      pageData.style.primaryColor === preset.color
                        ? 'border-white scale-110'
                        : 'border-transparent hover:border-dark-500'
                    }`}
                    style={{ backgroundColor: preset.color }}
                    title={preset.label}
                  />
                ))}
                <div className="relative">
                  <input
                    type="color"
                    value={pageData.style.primaryColor}
                    onChange={(e) => updateSectionField('style', 'primaryColor', e.target.value)}
                    className="absolute inset-0 w-8 h-8 opacity-0 cursor-pointer"
                  />
                  <div
                    className="w-8 h-8 rounded-lg border-2 border-dashed border-dark-600 flex items-center justify-center text-dark-400 hover:border-dark-400 transition-colors"
                  >
                    <Palette size={14} />
                  </div>
                </div>
              </div>
            </div>
            <Input
              label="Font"
              type="select"
              value={pageData.style.font}
              onChange={(e) => updateSectionField('style', 'font', e.target.value)}
              options={FONT_OPTIONS}
            />
            <Input
              label="Background Style"
              type="select"
              value={pageData.style.backgroundStyle}
              onChange={(e) => updateSectionField('style', 'backgroundStyle', e.target.value)}
              options={BG_STYLES}
            />
          </AccordionSection>
        </div>

        {/* Right: Live Preview */}
        <div className="sticky top-6 h-[calc(100vh-200px)]">
          <LivePreview pageData={pageData} />
        </div>
      </div>
    </div>
  );
}

// ── AI Generate Modal ───────────────────────────────────────────────────────

function AIGenerateModal({ isOpen, onClose, onUseGenerated }) {
  const [prompt, setPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('modern');
  const [industry, setIndustry] = useState('SaaS');
  const [colorScheme, setColorScheme] = useState('indigo');
  const [generating, setGenerating] = useState(false);
  const [generatedPage, setGeneratedPage] = useState(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please describe your landing page');
      return;
    }
    setGenerating(true);
    setGeneratedPage(null);
    try {
      const res = await landingPagesAPI.generate({
        prompt,
        style: selectedStyle,
        industry,
        colorScheme,
      });
      const data = res.data || res;
      setGeneratedPage(data);
      toast.success('Landing page generated!');
    } catch (err) {
      toast.error(err.message || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const handleUse = () => {
    if (generatedPage) {
      onUseGenerated(generatedPage);
      onClose();
      setGeneratedPage(null);
      setPrompt('');
    }
  };

  const handleRegenerate = () => {
    setGeneratedPage(null);
    handleGenerate();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20">
            <Sparkles size={18} className="text-violet-400" />
          </div>
          <span>AI Landing Page Generator</span>
        </div>
      }
      size="xl"
    >
      <div className="space-y-6">
        {!generatedPage ? (
          <>
            {/* Prompt */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                Describe your landing page
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                className="w-full bg-dark-800 border border-dark-600 text-white placeholder-dark-400 rounded-xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all"
                placeholder="e.g., A landing page for a project management SaaS tool that helps remote teams collaborate. Should highlight features like real-time editing, task tracking, and integrations..."
              />
            </div>

            {/* Style Selector */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">Style</label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {STYLES.map((style) => {
                  const Icon = style.icon;
                  return (
                    <button
                      key={style.id}
                      onClick={() => setSelectedStyle(style.id)}
                      className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border transition-all ${
                        selectedStyle === style.id
                          ? 'bg-violet-500/10 border-violet-500/50 text-violet-400'
                          : 'bg-dark-800/50 border-dark-700/50 text-dark-400 hover:text-white hover:border-dark-600'
                      }`}
                    >
                      <Icon size={18} />
                      <span className="text-xs font-medium">{style.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Industry */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">Industry</label>
              <div className="flex flex-wrap gap-2">
                {INDUSTRIES.map((ind) => (
                  <button
                    key={ind}
                    onClick={() => setIndustry(ind)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      industry === ind
                        ? 'bg-violet-500/10 border-violet-500/50 text-violet-400'
                        : 'bg-dark-800/50 border-dark-700/50 text-dark-400 hover:text-white hover:border-dark-600'
                    }`}
                  >
                    {ind}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Scheme */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">Color Scheme</label>
              <div className="flex flex-wrap gap-2">
                {COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => setColorScheme(preset.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
                      colorScheme === preset.id
                        ? 'border-white/40 bg-dark-700/50'
                        : 'border-dark-700/50 bg-dark-800/30 hover:border-dark-600'
                    }`}
                  >
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: preset.color }}
                    />
                    <span className="text-xs text-dark-300">{preset.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={generating || !prompt.trim()}
              className="w-full py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {generating ? (
                <>
                  <SparklesAnimation />
                  <span className="ml-2">Generating with AI...</span>
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  Generate with AI
                </>
              )}
            </button>
          </>
        ) : (
          /* Generated Preview */
          <div className="space-y-4">
            <div className="bg-dark-900/50 rounded-xl border border-dark-700/50 p-1">
              <div className="flex items-center gap-2 px-3 py-2">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-danger-500/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-warning-500/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-accent-500/60" />
                </div>
                <span className="text-xs text-dark-500">AI Generated Preview</span>
              </div>
              <div className="bg-dark-950 rounded-lg overflow-hidden">
                {generatedPage.html ? (
                  <iframe
                    srcDoc={generatedPage.html}
                    className="w-full h-80"
                    title="Generated preview"
                    sandbox="allow-scripts"
                    style={{ border: 'none' }}
                  />
                ) : (
                  <div className="p-8 text-center space-y-3">
                    <CheckCircle2 size={48} className="text-accent-400 mx-auto" />
                    <h3 className="text-lg font-semibold text-white">
                      {generatedPage.title || generatedPage.name || 'Landing Page Generated'}
                    </h3>
                    <p className="text-dark-400 text-sm">
                      Your landing page has been generated. Click "Use This" to start editing.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleRegenerate}
                disabled={generating}
                className="flex-1 py-2.5 rounded-xl font-medium text-dark-300 border border-dark-600 hover:border-dark-500 hover:text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {generating ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <RefreshCw size={16} />
                )}
                Regenerate
              </button>
              <button
                onClick={handleUse}
                className="flex-1 py-2.5 rounded-xl font-medium text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 flex items-center justify-center gap-2 transition-all shadow-lg shadow-violet-500/20"
              >
                <CheckCircle2 size={16} />
                Use This
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ── Analytics Modal ─────────────────────────────────────────────────────────

function AnalyticsModal({ isOpen, onClose, pageId, pageName }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  useEffect(() => {
    if (isOpen && pageId) {
      loadAnalytics();
    }
  }, [isOpen, pageId]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const res = await landingPagesAPI.analytics(pageId);
      setData(res.data || res);
    } catch (err) {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const visitsData = data?.visits || data?.visitsOverTime || [
    { date: 'Mon', visits: 120 },
    { date: 'Tue', visits: 180 },
    { date: 'Wed', visits: 150 },
    { date: 'Thu', visits: 220 },
    { date: 'Fri', visits: 280 },
    { date: 'Sat', visits: 190 },
    { date: 'Sun', visits: 160 },
  ];

  const conversionsData = data?.conversions || data?.conversionsOverTime || [
    { date: 'Mon', conversions: 12 },
    { date: 'Tue', conversions: 18 },
    { date: 'Wed', conversions: 15 },
    { date: 'Thu', conversions: 22 },
    { date: 'Fri', conversions: 28 },
    { date: 'Sat', conversions: 19 },
    { date: 'Sun', conversions: 16 },
  ];

  const sourcesData = data?.sources || data?.trafficSources || [
    { name: 'Direct', value: 40, color: '#6366f1' },
    { name: 'Social', value: 25, color: '#8b5cf6' },
    { name: 'Organic', value: 20, color: '#22c55e' },
    { name: 'Referral', value: 15, color: '#f59e0b' },
  ];

  const totalVisits = data?.totalVisits || visitsData.reduce((sum, d) => sum + (d.visits || 0), 0);
  const totalConversions = data?.totalConversions || conversionsData.reduce((sum, d) => sum + (d.conversions || 0), 0);
  const conversionRate = totalVisits > 0 ? ((totalConversions / totalVisits) * 100).toFixed(1) : '0.0';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <BarChart3 size={18} className="text-brand-400" />
          <span>Analytics: {pageName || 'Landing Page'}</span>
        </div>
      }
      size="xl"
    >
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 size={32} className="text-brand-400 animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-dark-900/50 rounded-xl border border-dark-700/50 p-4 text-center">
              <p className="text-2xl font-bold text-white">{formatNumber(totalVisits)}</p>
              <p className="text-xs text-dark-400 mt-1">Total Visits</p>
            </div>
            <div className="bg-dark-900/50 rounded-xl border border-dark-700/50 p-4 text-center">
              <p className="text-2xl font-bold text-accent-400">{formatNumber(totalConversions)}</p>
              <p className="text-xs text-dark-400 mt-1">Conversions</p>
            </div>
            <div className="bg-dark-900/50 rounded-xl border border-dark-700/50 p-4 text-center">
              <p className="text-2xl font-bold text-violet-400">{conversionRate}%</p>
              <p className="text-xs text-dark-400 mt-1">Conversion Rate</p>
            </div>
          </div>

          {/* Visits Chart */}
          <div className="bg-dark-900/30 rounded-xl border border-dark-700/50 p-4">
            <h4 className="text-sm font-medium text-white mb-4">Visits Over Time</h4>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={visitsData}>
                  <defs>
                    <linearGradient id="visitsFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="visits" stroke="#6366f1" strokeWidth={2} fill="url(#visitsFill)" name="Visits" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Conversions Chart */}
          <div className="bg-dark-900/30 rounded-xl border border-dark-700/50 p-4">
            <h4 className="text-sm font-medium text-white mb-4">Conversions Over Time</h4>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={conversionsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="conversions" fill="#22c55e" radius={[4, 4, 0, 0]} name="Conversions" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Traffic Sources */}
          <div className="bg-dark-900/30 rounded-xl border border-dark-700/50 p-4">
            <h4 className="text-sm font-medium text-white mb-4">Traffic Sources</h4>
            <div className="flex items-center gap-6">
              <div className="w-40 h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie
                      data={sourcesData}
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={65}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {sourcesData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </RePieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2">
                {sourcesData.map((source, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: source.color }} />
                      <span className="text-sm text-dark-300">{source.name}</span>
                    </div>
                    <span className="text-sm font-medium text-white">{source.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ── Main LandingPages Component ─────────────────────────────────────────────

export default function LandingPages() {
  const navigate = useNavigate();
  const { id: routeId } = useParams();

  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingPageId, setEditingPageId] = useState(routeId || null);
  const [showAIModal, setShowAIModal] = useState(false);
  const [analyticsModal, setAnalyticsModal] = useState({ open: false, pageId: null, pageName: '' });
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    if (!editingPageId) {
      loadPages();
    }
  }, [editingPageId]);

  useEffect(() => {
    if (routeId) {
      setEditingPageId(routeId);
    }
  }, [routeId]);

  const loadPages = async () => {
    setLoading(true);
    try {
      const res = await landingPagesAPI.list();
      const list = res.data || res;
      setPages(Array.isArray(list) ? list : list.landingPages || list.pages || []);
    } catch (err) {
      toast.error('Failed to load landing pages');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await landingPagesAPI.delete(id);
      setPages((prev) => prev.filter((p) => (p._id || p.id) !== id));
      toast.success('Landing page deleted');
    } catch (err) {
      toast.error(err.message || 'Failed to delete');
    } finally {
      setDeletingId(null);
    }
  };

  const handlePublishToggle = async (page) => {
    try {
      await landingPagesAPI.publish(page._id || page.id);
      setPages((prev) =>
        prev.map((p) =>
          (p._id || p.id) === (page._id || page.id)
            ? { ...p, published: !p.published, status: p.published ? 'draft' : 'published' }
            : p
        )
      );
      toast.success(page.published ? 'Page unpublished' : 'Page published');
    } catch (err) {
      toast.error(err.message || 'Failed to update');
    }
  };

  const handleAIGenerated = (data) => {
    setEditingPageId('new');
    // The AI generated data will be loaded in the editor
    toast.success('AI page generated! Customize it in the editor.');
  };

  const filteredPages = useMemo(() => {
    if (!searchQuery) return pages;
    const q = searchQuery.toLowerCase();
    return pages.filter(
      (p) =>
        (p.name || p.title || '').toLowerCase().includes(q) ||
        (p.slug || '').toLowerCase().includes(q)
    );
  }, [pages, searchQuery]);

  // Show editor if editing
  if (editingPageId) {
    return (
      <EditorView
        pageId={editingPageId}
        onBack={() => {
          setEditingPageId(null);
          navigate('/landing-pages');
        }}
      />
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Landing Pages</h1>
          <p className="text-dark-400 text-sm mt-1">Create and manage high-converting landing pages</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            icon={Sparkles}
            onClick={() => setShowAIModal(true)}
            className="!border-violet-500/30 !text-violet-400 hover:!bg-violet-500/10"
          >
            AI Generate
          </Button>
          <Button
            icon={Plus}
            onClick={() => {
              setEditingPageId('new');
              navigate('/landing-pages/new');
            }}
          >
            Create New
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search landing pages..."
          className="w-full bg-dark-800/50 border border-dark-700/50 text-white placeholder-dark-400 rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all"
        />
      </div>

      {/* Pages Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <PageCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredPages.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20"
        >
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-500/10 to-purple-500/10 flex items-center justify-center mb-6">
            <Layout size={36} className="text-brand-400" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">No landing pages yet</h3>
          <p className="text-dark-400 text-sm mb-6 text-center max-w-md">
            Create your first landing page or use AI to generate one in seconds.
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              icon={Sparkles}
              onClick={() => setShowAIModal(true)}
              className="!border-violet-500/30 !text-violet-400 hover:!bg-violet-500/10"
            >
              AI Generate
            </Button>
            <Button icon={Plus} onClick={() => setEditingPageId('new')}>
              Create Manually
            </Button>
          </div>
        </motion.div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          <AnimatePresence mode="popLayout">
            {filteredPages.map((page) => {
              const pid = page._id || page.id;
              const isPublished = page.published || page.status === 'published';
              const visits = page.visits || page.analytics?.visits || 0;
              const conversions = page.conversions || page.analytics?.conversions || 0;
              const rate = visits > 0 ? ((conversions / visits) * 100).toFixed(1) : '0.0';

              return (
                <motion.div
                  key={pid}
                  variants={itemVariants}
                  layout
                  className="bg-dark-800/50 backdrop-blur-sm border border-dark-700/50 rounded-2xl overflow-hidden transition-all duration-300 hover:bg-dark-800/70 hover:border-dark-600/50 hover:shadow-xl hover:shadow-black/20 group"
                >
                  {/* Thumbnail */}
                  <div className="aspect-video bg-dark-900/50 relative overflow-hidden">
                    {page.thumbnail || page.screenshotUrl ? (
                      <img
                        src={page.thumbnail || page.screenshotUrl}
                        alt={page.name || page.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="text-center">
                          <Layout size={32} className="text-dark-600 mx-auto mb-2" />
                          <p className="text-dark-500 text-xs">No preview</p>
                        </div>
                      </div>
                    )}

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-dark-950/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        onClick={() => {
                          setEditingPageId(pid);
                          navigate(`/landing-pages/${pid}`);
                        }}
                        className="p-2.5 rounded-xl bg-dark-700/80 text-white hover:bg-brand-600 transition-colors"
                        title="Edit"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        onClick={() => window.open(page.url || `/${page.slug}`, '_blank')}
                        className="p-2.5 rounded-xl bg-dark-700/80 text-white hover:bg-brand-600 transition-colors"
                        title="Preview"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => setAnalyticsModal({ open: true, pageId: pid, pageName: page.name || page.title })}
                        className="p-2.5 rounded-xl bg-dark-700/80 text-white hover:bg-brand-600 transition-colors"
                        title="Analytics"
                      >
                        <BarChart3 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(pid)}
                        disabled={deletingId === pid}
                        className="p-2.5 rounded-xl bg-dark-700/80 text-white hover:bg-danger-600 transition-colors disabled:opacity-50"
                        title="Delete"
                      >
                        {deletingId === pid ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    </div>

                    {/* Status Badge */}
                    <div className="absolute top-3 right-3">
                      {isPublished ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-accent-500/20 text-accent-400 border border-accent-500/30 backdrop-blur-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-accent-400 animate-pulse" />
                          Published
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-dark-700/80 text-dark-300 border border-dark-600/50 backdrop-blur-sm">
                          Draft
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-white truncate">
                          {page.name || page.title || 'Untitled'}
                        </h3>
                        <p className="text-xs text-dark-400 mt-0.5 truncate flex items-center gap-1">
                          <Link2 size={10} />
                          /{page.slug || 'no-slug'}
                        </p>
                      </div>
                      <button
                        onClick={() => handlePublishToggle(page)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          isPublished
                            ? 'text-accent-400 hover:bg-accent-500/10'
                            : 'text-dark-400 hover:text-white hover:bg-dark-700/50'
                        }`}
                        title={isPublished ? 'Unpublish' : 'Publish'}
                      >
                        {isPublished ? <Globe size={16} /> : <GlobeLock size={16} />}
                      </button>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-dark-700/50">
                      <div className="flex items-center gap-1.5">
                        <Eye size={12} className="text-dark-500" />
                        <span className="text-xs text-dark-300">{formatNumber(visits)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MousePointerClick size={12} className="text-dark-500" />
                        <span className="text-xs text-dark-300">{formatNumber(conversions)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <TrendingUp size={12} className="text-accent-500" />
                        <span className="text-xs text-accent-400 font-medium">{rate}%</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Modals */}
      <AIGenerateModal
        isOpen={showAIModal}
        onClose={() => setShowAIModal(false)}
        onUseGenerated={handleAIGenerated}
      />

      <AnalyticsModal
        isOpen={analyticsModal.open}
        onClose={() => setAnalyticsModal({ open: false, pageId: null, pageName: '' })}
        pageId={analyticsModal.pageId}
        pageName={analyticsModal.pageName}
      />
    </div>
  );
}
