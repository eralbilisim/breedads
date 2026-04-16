import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Image,
  Type,
  FlaskConical,
  LayoutGrid,
  Search,
  Trash2,
  Download,
  Copy,
  Sparkles,
  Wand2,
  RefreshCw,
  X,
  Check,
  Loader2,
  Eye,
  Film,
  FileText,
  Layers,
  CheckSquare,
  Square,
  XCircle,
  Maximize2,
  ArrowRight,
  Lightbulb,
  Palette,
  Monitor,
  Smartphone,
  MessageSquare,
  Target,
  Megaphone,
  ChevronDown,
  Zap,
} from 'lucide-react';
import { creativesAPI } from '../services/api';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Tabs from '../components/ui/Tabs';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Animation Variants ───────────────────────────────────────────────────────

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
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
};

// ── Skeleton Loader ──────────────────────────────────────────────────────────

function CreativeCardSkeleton() {
  return (
    <div className="bg-dark-800/50 backdrop-blur-sm border border-dark-700/50 rounded-2xl overflow-hidden animate-pulse">
      <div className="aspect-square bg-dark-700/50" />
      <div className="p-4 space-y-2">
        <div className="h-4 w-3/4 bg-dark-700 rounded" />
        <div className="flex gap-2">
          <div className="h-5 w-14 bg-dark-700 rounded-full" />
          <div className="h-5 w-16 bg-dark-700 rounded-full" />
        </div>
        <div className="h-3 w-1/2 bg-dark-700/60 rounded" />
      </div>
    </div>
  );
}

// ── Type Filter Config ───────────────────────────────────────────────────────

const TYPE_FILTERS = [
  { id: 'all', label: 'All', icon: LayoutGrid },
  { id: 'image', label: 'Image', icon: Image },
  { id: 'video', label: 'Video', icon: Film },
  { id: 'text', label: 'Text', icon: FileText },
  { id: 'carousel', label: 'Carousel', icon: Layers },
];

// ── Gallery Tab ──────────────────────────────────────────────────────────────

function GalleryTab() {
  const [creatives, setCreatives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [previewModal, setPreviewModal] = useState({ open: false, creative: null });
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchCreatives = useCallback(async () => {
    try {
      setLoading(true);
      const response = await creativesAPI.list();
      const list = Array.isArray(response) ? response : response?.data || response?.creatives || [];
      setCreatives(list);
    } catch (err) {
      console.error('Failed to fetch creatives:', err);
      toast.error('Failed to load creatives');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCreatives();
  }, [fetchCreatives]);

  const filtered = creatives.filter((c) => {
    const matchesSearch = !search || c.name?.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'all' || c.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    try {
      setDeleteLoading(true);
      await Promise.all(Array.from(selectedIds).map((id) => creativesAPI.delete(id)));
      toast.success(`${selectedIds.size} creative(s) deleted`);
      setSelectedIds(new Set());
      fetchCreatives();
    } catch (err) {
      toast.error('Failed to delete creatives');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await creativesAPI.delete(id);
      toast.success('Creative deleted');
      fetchCreatives();
    } catch (err) {
      toast.error('Failed to delete creative');
    }
  };

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center gap-3">
        <div className="relative flex-1 w-full lg:max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search creatives..."
            className="w-full bg-dark-800 border border-dark-600 text-white placeholder-dark-400 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all duration-200"
          />
        </div>
        <div className="flex items-center gap-1 bg-dark-800/60 rounded-xl p-1 border border-dark-700/50">
          {TYPE_FILTERS.map((tf) => (
            <button
              key={tf.id}
              onClick={() => setTypeFilter(tf.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 whitespace-nowrap ${
                typeFilter === tf.id
                  ? 'bg-gradient-to-r from-brand-600 to-purple-600 text-white shadow-sm'
                  : 'text-dark-400 hover:text-white hover:bg-dark-700/50'
              }`}
            >
              <tf.icon size={13} />
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk Actions */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-3 bg-brand-500/10 border border-brand-500/20 rounded-xl px-4 py-3">
              <span className="text-sm text-dark-300">
                {selectedIds.size} selected
              </span>
              <div className="flex-1" />
              <Button
                variant="danger"
                size="sm"
                icon={Trash2}
                loading={deleteLoading}
                onClick={handleBulkDelete}
              >
                Delete Selected
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

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <CreativeCardSkeleton key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-500/20 to-purple-500/20 flex items-center justify-center mb-6">
            <Image size={36} className="text-brand-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No creatives found</h3>
          <p className="text-sm text-dark-400 text-center max-w-md">
            {search || typeFilter !== 'all'
              ? 'Try adjusting your search or filters.'
              : 'Generate your first creative using the AI Image Generator or AI Copywriter tabs.'}
          </p>
        </div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >
          <AnimatePresence mode="popLayout">
            {filtered.map((creative) => {
              const id = creative._id || creative.id;
              const isSelected = selectedIds.has(id);
              return (
                <motion.div
                  key={id}
                  variants={itemVariants}
                  layout
                  className={`relative bg-dark-800/50 backdrop-blur-sm border rounded-2xl overflow-hidden group cursor-pointer transition-all duration-300 hover:bg-dark-800/70 hover:shadow-xl hover:shadow-black/20 ${
                    isSelected
                      ? 'border-brand-500/50 ring-1 ring-brand-500/30'
                      : 'border-dark-700/50 hover:border-dark-600/50'
                  }`}
                >
                  {/* Selection checkbox */}
                  <button
                    className={`absolute top-3 left-3 z-10 p-1 rounded-md transition-all duration-200 ${
                      isSelected
                        ? 'text-brand-400 opacity-100'
                        : 'text-white/70 opacity-0 group-hover:opacity-100'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelect(id);
                    }}
                  >
                    {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                  </button>

                  {/* Preview button */}
                  <button
                    className="absolute top-3 right-3 z-10 p-1.5 rounded-lg bg-black/40 backdrop-blur-sm text-white/70 hover:text-white opacity-0 group-hover:opacity-100 transition-all duration-200"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewModal({ open: true, creative });
                    }}
                  >
                    <Maximize2 size={14} />
                  </button>

                  {/* Image */}
                  <div
                    className="aspect-square bg-dark-900/50 flex items-center justify-center overflow-hidden"
                    onClick={() => setPreviewModal({ open: true, creative })}
                  >
                    {creative.imageUrl || creative.thumbnailUrl ? (
                      <img
                        src={creative.imageUrl || creative.thumbnailUrl}
                        alt={creative.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-dark-500">
                        {creative.type === 'video' ? <Film size={32} /> :
                         creative.type === 'text' ? <FileText size={32} /> :
                         creative.type === 'carousel' ? <Layers size={32} /> :
                         <Image size={32} />}
                        <span className="text-xs">{creative.type || 'Image'}</span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <h4 className="text-sm font-medium text-white truncate mb-2">
                      {creative.name || 'Untitled Creative'}
                    </h4>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge color={
                        creative.type === 'image' ? 'blue' :
                        creative.type === 'video' ? 'purple' :
                        creative.type === 'text' ? 'green' :
                        creative.type === 'carousel' ? 'yellow' : 'gray'
                      }>
                        {creative.type || 'image'}
                      </Badge>
                      {creative.aiGenerated && (
                        <Badge color="purple">
                          <Sparkles size={10} className="mr-0.5" />
                          AI
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-dark-500">{formatDate(creative.createdAt)}</span>
                      <button
                        className="p-1.5 rounded-lg text-dark-400 hover:text-danger-400 hover:bg-danger-500/10 transition-all duration-200 opacity-0 group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(id);
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Preview Modal */}
      <Modal
        isOpen={previewModal.open}
        onClose={() => setPreviewModal({ open: false, creative: null })}
        title={previewModal.creative?.name || 'Creative Preview'}
        size="xl"
      >
        <div className="space-y-4">
          {previewModal.creative?.imageUrl || previewModal.creative?.thumbnailUrl ? (
            <img
              src={previewModal.creative.imageUrl || previewModal.creative.thumbnailUrl}
              alt={previewModal.creative?.name}
              className="w-full rounded-xl"
            />
          ) : (
            <div className="aspect-video bg-dark-900/50 rounded-xl flex items-center justify-center">
              <span className="text-dark-500">No preview available</span>
            </div>
          )}
          {previewModal.creative?.copy && (
            <div className="bg-dark-900/50 rounded-xl p-4">
              <p className="text-sm text-dark-300 whitespace-pre-wrap">{previewModal.creative.copy}</p>
            </div>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            {previewModal.creative?.type && (
              <Badge color="blue">{previewModal.creative.type}</Badge>
            )}
            {previewModal.creative?.platform && (
              <Badge color="purple">{previewModal.creative.platform}</Badge>
            )}
            {previewModal.creative?.size && (
              <Badge color="gray">{previewModal.creative.size}</Badge>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ── AI Image Generator Tab ───────────────────────────────────────────────────

const SIZE_OPTIONS = [
  { value: '1024x1024', label: '1024 x 1024 (Square)' },
  { value: '1024x1792', label: '1024 x 1792 (Portrait)' },
  { value: '1792x1024', label: '1792 x 1024 (Landscape)' },
];

const STYLE_OPTIONS = [
  { value: 'vivid', label: 'Vivid' },
  { value: 'natural', label: 'Natural' },
];

const PLATFORM_OPTIONS = [
  { value: 'universal', label: 'Universal' },
  { value: 'meta_feed', label: 'Meta Feed' },
  { value: 'meta_stories', label: 'Meta Stories' },
  { value: 'google_display', label: 'Google Display' },
];

const PROMPT_SUGGESTIONS = [
  { label: 'Product Showcase', prompt: 'Professional product photography of a premium item on a clean white surface with soft studio lighting and subtle shadows' },
  { label: 'Lifestyle', prompt: 'Happy diverse group of friends using a product in a natural outdoor setting, warm golden hour lighting, candid lifestyle photography' },
  { label: 'Before/After', prompt: 'Split-screen comparison showing dramatic transformation results, clean modern design with clear dividing line' },
  { label: 'Testimonial Style', prompt: 'Professional headshot of a smiling satisfied customer with a clean background, space for quote text overlay' },
];

function AIImageGeneratorTab() {
  const [prompt, setPrompt] = useState('');
  const [size, setSize] = useState('1024x1024');
  const [style, setStyle] = useState('vivid');
  const [platform, setPlatform] = useState('universal');
  const [generating, setGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState(null);
  const [history, setHistory] = useState([]);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }
    try {
      setGenerating(true);
      const result = await creativesAPI.generateImage({ prompt, size, style, platform });
      const imageData = result?.data || result;
      setGeneratedImage(imageData);
      setHistory((prev) => [imageData, ...prev].slice(0, 10));
      toast.success('Image generated successfully!');
    } catch (err) {
      console.error('Image generation failed:', err);
      toast.error(err?.message || 'Failed to generate image');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = (url) => {
    if (!url) return;
    const link = document.createElement('a');
    link.href = url;
    link.download = `breedads-creative-${Date.now()}.png`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left: Settings Panel */}
      <div className="lg:col-span-1 space-y-5">
        <Card>
          <div className="space-y-5">
            {/* Prompt */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-dark-300">Prompt</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={5}
                placeholder="Describe your ideal ad creative... e.g., 'A sleek smartphone floating in mid-air with colorful app icons swirling around it, dark gradient background, professional product photography'"
                className="w-full bg-dark-800 border border-dark-600 text-white placeholder-dark-400 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all duration-200 resize-none"
              />
            </div>

            {/* Prompt Suggestions */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-dark-500 uppercase tracking-wider">Quick Ideas</label>
              <div className="flex flex-wrap gap-2">
                {PROMPT_SUGGESTIONS.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => setPrompt(s.prompt)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-dark-300 hover:text-white bg-dark-900/50 hover:bg-dark-700/50 border border-dark-700/50 hover:border-dark-600/50 rounded-lg transition-all duration-200"
                  >
                    <Lightbulb size={12} className="text-warning-400" />
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Size */}
            <Input
              label="Size"
              type="select"
              value={size}
              onChange={(e) => setSize(e.target.value)}
              options={SIZE_OPTIONS}
            />

            {/* Style */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-dark-300">Style</label>
              <div className="grid grid-cols-2 gap-2">
                {STYLE_OPTIONS.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setStyle(s.value)}
                    className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-all duration-200 ${
                      style === s.value
                        ? 'border-brand-500/50 bg-brand-500/10 text-brand-400'
                        : 'border-dark-700/50 bg-dark-900/30 text-dark-400 hover:text-white hover:border-dark-600/50'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Platform */}
            <Input
              label="Platform Optimization"
              type="select"
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              options={PLATFORM_OPTIONS}
            />

            {/* Generate Button */}
            <div className="relative">
              {generating && (
                <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-violet-500 rounded-xl opacity-75 animate-pulse blur-sm" />
              )}
              <Button
                className="w-full relative"
                icon={generating ? undefined : Sparkles}
                loading={generating}
                onClick={handleGenerate}
                disabled={!prompt.trim()}
              >
                {generating ? 'Generating...' : 'Generate Image'}
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Right: Preview & History */}
      <div className="lg:col-span-2 space-y-5">
        {/* Generated Image Preview */}
        <Card>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">Preview</h3>
              {generatedImage?.imageUrl && (
                <Button
                  variant="secondary"
                  size="sm"
                  icon={Download}
                  onClick={() => handleDownload(generatedImage.imageUrl)}
                >
                  Download
                </Button>
              )}
            </div>

            {generating ? (
              <div className="aspect-square max-h-[500px] bg-dark-900/50 rounded-xl flex flex-col items-center justify-center">
                <div className="relative">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center animate-pulse">
                    <Sparkles size={32} className="text-violet-400" />
                  </div>
                  <div className="absolute inset-0 rounded-2xl border-2 border-violet-500/30 animate-spin" style={{ animationDuration: '3s' }} />
                </div>
                <p className="text-sm text-dark-400 mt-4">Creating your masterpiece...</p>
                <p className="text-xs text-dark-500 mt-1">This may take 10-30 seconds</p>
              </div>
            ) : generatedImage?.imageUrl ? (
              <img
                src={generatedImage.imageUrl}
                alt="Generated creative"
                className="w-full rounded-xl"
              />
            ) : (
              <div className="aspect-square max-h-[500px] bg-dark-900/50 rounded-xl flex flex-col items-center justify-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 flex items-center justify-center mb-4">
                  <Wand2 size={32} className="text-dark-500" />
                </div>
                <p className="text-sm text-dark-400">Your AI-generated image will appear here</p>
                <p className="text-xs text-dark-500 mt-1">Enter a prompt and click Generate</p>
              </div>
            )}
          </div>
        </Card>

        {/* History */}
        {history.length > 0 && (
          <Card>
            <h3 className="text-base font-semibold text-white mb-4">Recent Generations</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {history.map((item, idx) => (
                <div
                  key={idx}
                  className="aspect-square rounded-xl overflow-hidden border border-dark-700/50 hover:border-dark-600/50 cursor-pointer transition-all duration-200 group"
                  onClick={() => setGeneratedImage(item)}
                >
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={`Generated ${idx + 1}`}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full bg-dark-900/50 flex items-center justify-center">
                      <Image size={20} className="text-dark-500" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

// ── AI Copywriter Tab ────────────────────────────────────────────────────────

const OBJECTIVE_OPTIONS = [
  { value: 'awareness', label: 'Brand Awareness' },
  { value: 'traffic', label: 'Traffic' },
  { value: 'engagement', label: 'Engagement' },
  { value: 'leads', label: 'Lead Generation' },
  { value: 'conversions', label: 'Conversions' },
  { value: 'sales', label: 'Sales' },
  { value: 'app_installs', label: 'App Installs' },
];

const TONE_OPTIONS = [
  { value: 'professional', label: 'Professional', icon: '💼' },
  { value: 'casual', label: 'Casual', icon: '😊' },
  { value: 'urgent', label: 'Urgent', icon: '🔥' },
  { value: 'friendly', label: 'Friendly', icon: '👋' },
  { value: 'luxury', label: 'Luxury', icon: '✨' },
  { value: 'fun', label: 'Fun', icon: '🎉' },
];

function CopyItem({ text, label, onUse }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Failed to copy');
    }
  };

  return (
    <div className="bg-dark-900/50 border border-dark-700/30 rounded-xl p-4 hover:border-dark-600/50 transition-all duration-200 group">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-dark-200 flex-1 leading-relaxed">{text}</p>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg text-dark-400 hover:text-white hover:bg-dark-700/50 transition-all duration-200"
            title="Copy"
          >
            {copied ? <Check size={14} className="text-accent-400" /> : <Copy size={14} />}
          </button>
          {onUse && (
            <button
              onClick={() => onUse(text)}
              className="p-1.5 rounded-lg text-dark-400 hover:text-brand-400 hover:bg-brand-500/10 transition-all duration-200"
              title="Use in Campaign"
            >
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>
      {label && <span className="text-[10px] uppercase tracking-wider text-dark-500 font-medium mt-2 inline-block">{label}</span>}
    </div>
  );
}

function AICopywriterTab() {
  const [form, setForm] = useState({
    platform: 'meta',
    objective: 'conversions',
    product: '',
    audience: '',
    tone: 'professional',
    brandVoice: '',
  });
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState(null);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleGenerate = async () => {
    if (!form.product.trim()) {
      toast.error('Please describe your product or service');
      return;
    }
    try {
      setGenerating(true);
      const response = await creativesAPI.generateCopy({
        platform: form.platform,
        objective: form.objective,
        product: form.product,
        audience: form.audience,
        tone: form.tone,
      });
      setResults(response?.data || response);
      toast.success('Ad copy generated!');
    } catch (err) {
      console.error('Copy generation failed:', err);
      toast.error(err?.message || 'Failed to generate copy');
    } finally {
      setGenerating(false);
    }
  };

  const handleUseInCampaign = (text) => {
    toast.success('Copied! Navigate to Campaigns to use this copy.');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: Form */}
      <div className="space-y-5">
        <Card>
          <div className="space-y-5">
            {/* Platform Toggle */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-dark-300">Platform</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'meta', label: 'Meta Ads', icon: MessageSquare },
                  { value: 'google', label: 'Google Ads', icon: Monitor },
                ].map((p) => (
                  <button
                    key={p.value}
                    onClick={() => handleChange('platform', p.value)}
                    className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border transition-all duration-200 ${
                      form.platform === p.value
                        ? 'border-brand-500/50 bg-brand-500/10 text-brand-400'
                        : 'border-dark-700/50 bg-dark-900/30 text-dark-400 hover:text-white hover:border-dark-600/50'
                    }`}
                  >
                    <p.icon size={16} />
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Objective */}
            <Input
              label="Campaign Objective"
              type="select"
              value={form.objective}
              onChange={(e) => handleChange('objective', e.target.value)}
              options={OBJECTIVE_OPTIONS}
            />

            {/* Product/Service */}
            <Input
              label="Product / Service Description"
              type="textarea"
              rows={3}
              value={form.product}
              onChange={(e) => handleChange('product', e.target.value)}
              placeholder="Describe your product, its key features and benefits..."
            />

            {/* Audience */}
            <Input
              label="Target Audience"
              type="textarea"
              rows={2}
              value={form.audience}
              onChange={(e) => handleChange('audience', e.target.value)}
              placeholder="e.g., Women aged 25-45 interested in fitness and healthy living..."
            />

            {/* Tone */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-dark-300">Tone</label>
              <div className="grid grid-cols-3 gap-2">
                {TONE_OPTIONS.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => handleChange('tone', t.value)}
                    className={`px-3 py-2.5 rounded-xl text-xs font-medium border transition-all duration-200 text-center ${
                      form.tone === t.value
                        ? 'border-brand-500/50 bg-brand-500/10 text-brand-400'
                        : 'border-dark-700/50 bg-dark-900/30 text-dark-400 hover:text-white hover:border-dark-600/50'
                    }`}
                  >
                    <span className="block text-base mb-0.5">{t.icon}</span>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Brand Voice */}
            <Input
              label="Brand Voice Notes (Optional)"
              type="textarea"
              rows={2}
              value={form.brandVoice}
              onChange={(e) => handleChange('brandVoice', e.target.value)}
              placeholder="Any specific brand guidelines, words to use/avoid, style notes..."
            />

            {/* Generate */}
            <div className="relative">
              {generating && (
                <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-violet-500 rounded-xl opacity-75 animate-pulse blur-sm" />
              )}
              <Button
                className="w-full relative"
                icon={generating ? undefined : Wand2}
                loading={generating}
                onClick={handleGenerate}
                disabled={!form.product.trim()}
              >
                {generating ? 'Generating Copy...' : 'Generate Copy'}
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Right: Results */}
      <div className="space-y-5">
        {generating ? (
          <Card>
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="animate-pulse bg-dark-900/50 rounded-xl p-4">
                  <div className="h-3 w-20 bg-dark-700/60 rounded mb-2" />
                  <div className="h-4 bg-dark-700 rounded w-full mb-1.5" />
                  <div className="h-4 bg-dark-700 rounded w-3/4" />
                </div>
              ))}
            </div>
          </Card>
        ) : results ? (
          <>
            {/* Headlines */}
            {results.headlines?.length > 0 && (
              <Card>
                <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                  <Type size={16} className="text-brand-400" />
                  Headlines
                </h3>
                <div className="space-y-2">
                  {results.headlines.map((h, i) => (
                    <CopyItem key={i} text={h} label={`Option ${i + 1}`} onUse={handleUseInCampaign} />
                  ))}
                </div>
              </Card>
            )}

            {/* Descriptions */}
            {results.descriptions?.length > 0 && (
              <Card>
                <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                  <FileText size={16} className="text-purple-400" />
                  Descriptions
                </h3>
                <div className="space-y-2">
                  {results.descriptions.map((d, i) => (
                    <CopyItem key={i} text={d} label={`Option ${i + 1}`} onUse={handleUseInCampaign} />
                  ))}
                </div>
              </Card>
            )}

            {/* Primary Text (Meta) */}
            {form.platform === 'meta' && results.primaryTexts?.length > 0 && (
              <Card>
                <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                  <MessageSquare size={16} className="text-blue-400" />
                  Primary Text
                </h3>
                <div className="space-y-2">
                  {results.primaryTexts.map((t, i) => (
                    <CopyItem key={i} text={t} label={`Option ${i + 1}`} onUse={handleUseInCampaign} />
                  ))}
                </div>
              </Card>
            )}

            {/* CTA */}
            {results.ctas?.length > 0 && (
              <Card>
                <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                  <Target size={16} className="text-accent-400" />
                  CTA Recommendations
                </h3>
                <div className="flex flex-wrap gap-2">
                  {results.ctas.map((cta, i) => (
                    <Badge key={i} color="green">{cta}</Badge>
                  ))}
                </div>
              </Card>
            )}

            {/* Re-generate */}
            <Button
              variant="secondary"
              icon={RefreshCw}
              className="w-full"
              onClick={handleGenerate}
              loading={generating}
            >
              Generate New Variations
            </Button>
          </>
        ) : (
          <Card>
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 flex items-center justify-center mb-4">
                <Type size={32} className="text-dark-500" />
              </div>
              <p className="text-sm text-dark-400">Your generated ad copy will appear here</p>
              <p className="text-xs text-dark-500 mt-1">Fill in the form and click Generate</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

// ── A/B Testing Tab ──────────────────────────────────────────────────────────

const VARIANT_TYPES = [
  { value: 'headlines', label: 'Headlines', icon: Type },
  { value: 'descriptions', label: 'Descriptions', icon: FileText },
  { value: 'images', label: 'Images', icon: Image },
  { value: 'full_ad', label: 'Full Ad', icon: Layers },
];

function ABTestingTab() {
  const [headline, setHeadline] = useState('');
  const [description, setDescription] = useState('');
  const [primaryText, setPrimaryText] = useState('');
  const [variantType, setVariantType] = useState('headlines');
  const [variantCount, setVariantCount] = useState(3);
  const [generating, setGenerating] = useState(false);
  const [variants, setVariants] = useState([]);

  const handleGenerate = async () => {
    if (!headline.trim()) {
      toast.error('Please enter the original headline');
      return;
    }
    try {
      setGenerating(true);
      const response = await creativesAPI.generateVariants({
        headline,
        description,
        primaryText,
        count: variantCount,
      });
      const data = response?.variants || response?.data || response;
      setVariants(Array.isArray(data) ? data : [data]);
      toast.success('Variants generated!');
    } catch (err) {
      console.error('Variant generation failed:', err);
      toast.error(err?.message || 'Failed to generate variants');
    } finally {
      setGenerating(false);
    }
  };

  const handleLaunchTest = () => {
    toast.success('A/B Test launched! You can monitor results in the Analytics tab.');
  };

  return (
    <div className="space-y-6">
      {/* Setup Section */}
      <Card>
        <div className="space-y-5">
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <FlaskConical size={18} className="text-violet-400" />
            A/B Test Setup
          </h3>

          {/* Original Ad Copy */}
          <Input
            label="Original Headline"
            placeholder="Enter the current ad headline..."
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            icon={Megaphone}
          />
          <Input
            label="Description (optional)"
            placeholder="Short description line..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Input
            label="Primary Text (optional)"
            placeholder="Longer ad body copy..."
            value={primaryText}
            onChange={(e) => setPrimaryText(e.target.value)}
          />

          {/* Variant Type */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-dark-300">Variant Type</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {VARIANT_TYPES.map((vt) => (
                <button
                  key={vt.value}
                  onClick={() => setVariantType(vt.value)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-200 ${
                    variantType === vt.value
                      ? 'border-brand-500/50 bg-brand-500/10 text-brand-400'
                      : 'border-dark-700/50 bg-dark-900/30 text-dark-400 hover:text-white hover:border-dark-600/50'
                  }`}
                >
                  <vt.icon size={20} />
                  <span className="text-xs font-medium">{vt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Count */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-dark-300">
              Number of Variants: <span className="text-white">{variantCount}</span>
            </label>
            <div className="flex items-center gap-2">
              {[2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setVariantCount(n)}
                  className={`w-12 h-10 rounded-xl text-sm font-medium border transition-all duration-200 ${
                    variantCount === n
                      ? 'border-brand-500/50 bg-brand-500/10 text-brand-400'
                      : 'border-dark-700/50 bg-dark-900/30 text-dark-400 hover:text-white hover:border-dark-600/50'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Generate */}
          <div className="relative">
            {generating && (
              <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-violet-500 rounded-xl opacity-75 animate-pulse blur-sm" />
            )}
            <Button
              className="w-full relative"
              icon={generating ? undefined : FlaskConical}
              loading={generating}
              onClick={handleGenerate}
              disabled={!headline.trim()}
            >
              {generating ? 'Generating Variants...' : `Generate ${variantCount} Variants`}
            </Button>
          </div>
        </div>
      </Card>

      {/* Variants Preview */}
      {variants.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-white">Generated Variants</h3>
            <Button icon={Zap} onClick={handleLaunchTest}>
              Launch A/B Test
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {variants.map((variant, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card hover>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge color="purple">Variant {String.fromCharCode(65 + idx)}</Badge>
                      <span className="text-xs text-dark-500">#{idx + 1}</span>
                    </div>

                    {variant.imageUrl && (
                      <img
                        src={variant.imageUrl}
                        alt={`Variant ${idx + 1}`}
                        className="w-full aspect-video object-cover rounded-lg"
                      />
                    )}

                    {variant.headline && (
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-dark-500 font-medium">Headline</span>
                        <p className="text-sm font-medium text-white mt-0.5">{variant.headline}</p>
                      </div>
                    )}

                    {variant.description && (
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-dark-500 font-medium">Description</span>
                        <p className="text-sm text-dark-300 mt-0.5">{variant.description}</p>
                      </div>
                    )}

                    {variant.primaryText && (
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-dark-500 font-medium">Primary Text</span>
                        <p className="text-sm text-dark-300 mt-0.5">{variant.primaryText}</p>
                      </div>
                    )}

                    {variant.cta && (
                      <Badge color="green">{variant.cta}</Badge>
                    )}
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {variants.length === 0 && !generating && (
        <Card>
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 flex items-center justify-center mb-4">
              <FlaskConical size={32} className="text-dark-500" />
            </div>
            <p className="text-sm text-dark-400">Your A/B test variants will appear here</p>
            <p className="text-xs text-dark-500 mt-1">Select a campaign, choose variant type, and generate</p>
          </div>
        </Card>
      )}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

const TABS = [
  { id: 'gallery', label: 'Gallery', icon: LayoutGrid },
  { id: 'image_gen', label: 'AI Image Generator', icon: Image },
  { id: 'copywriter', label: 'AI Copywriter', icon: Type },
  { id: 'ab_testing', label: 'A/B Testing', icon: FlaskConical },
];

export default function Creatives() {
  const [activeTab, setActiveTab] = useState('gallery');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            Creative Studio
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20 text-xs font-medium text-violet-400">
              <Sparkles size={12} />
              AI-Powered
            </span>
          </h1>
          <p className="text-dark-400 text-sm mt-1">
            Generate and manage ad creatives with AI
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={TABS}
        activeTab={activeTab}
        onChange={setActiveTab}
        variant="pills"
      />

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'gallery' && <GalleryTab />}
          {activeTab === 'image_gen' && <AIImageGeneratorTab />}
          {activeTab === 'copywriter' && <AICopywriterTab />}
          {activeTab === 'ab_testing' && <ABTestingTab />}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
