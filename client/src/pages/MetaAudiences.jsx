import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Users,
  Plus,
  Trash2,
  RefreshCw,
  Link2,
  Sparkles,
  AlertTriangle,
  Calendar,
} from 'lucide-react';
import { metaAPI } from '../services/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';

const SUBTYPE_OPTIONS = [
  { value: 'CUSTOM', label: 'Custom (Rule-based)' },
  { value: 'WEBSITE', label: 'Website Visitors' },
  { value: 'APP', label: 'App Activity' },
  { value: 'ENGAGEMENT', label: 'Engagement' },
];

const COUNTRY_OPTIONS = [
  { value: 'US', label: 'United States' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'TR', label: 'Türkiye' },
  { value: 'DE', label: 'Germany' },
  { value: 'FR', label: 'France' },
  { value: 'ES', label: 'Spain' },
  { value: 'IT', label: 'Italy' },
  { value: 'CA', label: 'Canada' },
  { value: 'AU', label: 'Australia' },
  { value: 'BR', label: 'Brazil' },
  { value: 'MX', label: 'Mexico' },
  { value: 'IN', label: 'India' },
];

function formatCount(n) {
  if (n == null) return '—';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

function formatDate(ts) {
  if (!ts) return '—';
  const d = typeof ts === 'number' ? new Date(ts * 1000) : new Date(ts);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function deliveryStatusConfig(status) {
  const code = status?.code;
  if (code === 200) return { color: 'green', label: 'Ready' };
  if (code && code >= 400) return { color: 'red', label: status?.description || 'Error' };
  return { color: 'yellow', label: status?.description || 'Processing' };
}

function CreateCustomModal({ isOpen, onClose, onCreate, loading }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [subtype, setSubtype] = useState('CUSTOM');

  useEffect(() => {
    if (!isOpen) {
      setName('');
      setDescription('');
      setSubtype('CUSTOM');
    }
  }, [isOpen]);

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }
    onCreate({ name: name.trim(), description: description.trim(), subtype });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Custom Audience"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button icon={Plus} onClick={handleSubmit} loading={loading}>Create</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-dark-300 mb-1.5">Name *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Website visitors (last 30 days)"
            className="input-dark w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-dark-300 mb-1.5">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional notes about this audience"
            rows={3}
            className="input-dark w-full resize-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-dark-300 mb-1.5">Type</label>
          <select
            value={subtype}
            onChange={(e) => setSubtype(e.target.value)}
            className="input-dark w-full"
          >
            {SUBTYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <p className="text-xs text-dark-500 mt-1.5">
            Rule-based audiences (WEBSITE/APP/ENGAGEMENT) need additional pixel/SDK events. This creates the audience shell; Meta fills it as signals arrive.
          </p>
        </div>
      </div>
    </Modal>
  );
}

function CreateLookalikeModal({ isOpen, onClose, onCreate, loading, sourceAudiences }) {
  const [name, setName] = useState('');
  const [sourceAudienceId, setSourceAudienceId] = useState('');
  const [country, setCountry] = useState('US');
  const [ratio, setRatio] = useState(0.01);

  useEffect(() => {
    if (!isOpen) {
      setName('');
      setSourceAudienceId('');
      setCountry('US');
      setRatio(0.01);
    }
  }, [isOpen]);

  const handleSubmit = () => {
    if (!name.trim() || !sourceAudienceId) {
      toast.error('Name and source audience are required');
      return;
    }
    onCreate({ name: name.trim(), sourceAudienceId, country, ratio });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Lookalike Audience"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button icon={Sparkles} onClick={handleSubmit} loading={loading}>Create</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-dark-300 mb-1.5">Name *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. LAL 1% - US - from top customers"
            className="input-dark w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-dark-300 mb-1.5">Source Audience *</label>
          <select
            value={sourceAudienceId}
            onChange={(e) => setSourceAudienceId(e.target.value)}
            className="input-dark w-full"
          >
            <option value="">Select a source audience...</option>
            {sourceAudiences
              .filter((a) => a.subtype !== 'LOOKALIKE')
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({formatCount(a.approximate_count)})
                </option>
              ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1.5">Country</label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="input-dark w-full"
            >
              {COUNTRY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1.5">
              Size ({(ratio * 100).toFixed(0)}%)
            </label>
            <input
              type="range"
              min={1}
              max={10}
              step={1}
              value={ratio * 100}
              onChange={(e) => setRatio(Number(e.target.value) / 100)}
              className="w-full mt-3"
            />
            <p className="text-xs text-dark-500 mt-1">Smaller % = more similar to source</p>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default function MetaAudiences() {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [audiences, setAudiences] = useState([]);
  const [audiencesLoading, setAudiencesLoading] = useState(false);
  const [customModalOpen, setCustomModalOpen] = useState(false);
  const [lookalikeModalOpen, setLookalikeModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const fetchAccounts = useCallback(async () => {
    try {
      setAccountsLoading(true);
      const res = await metaAPI.accounts();
      const list = Array.isArray(res) ? res : res?.accounts || [];
      setAccounts(list);
      if (list.length > 0 && !selectedAccountId) {
        setSelectedAccountId(list[0].id);
      }
    } catch (err) {
      console.error('Failed to load Meta accounts:', err);
      toast.error('Failed to load Meta accounts');
    } finally {
      setAccountsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAudiences = useCallback(async () => {
    if (!selectedAccountId) return;
    try {
      setAudiencesLoading(true);
      const res = await metaAPI.audiences(selectedAccountId);
      setAudiences(Array.isArray(res) ? res : res?.data || []);
    } catch (err) {
      console.error('Failed to load audiences:', err);
      toast.error(err?.error || err?.message || 'Failed to load audiences');
      setAudiences([]);
    } finally {
      setAudiencesLoading(false);
    }
  }, [selectedAccountId]);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);
  useEffect(() => { fetchAudiences(); }, [fetchAudiences]);

  const handleCreateCustom = async (data) => {
    try {
      setCreating(true);
      await metaAPI.createAudience(selectedAccountId, data);
      toast.success('Audience created');
      setCustomModalOpen(false);
      await fetchAudiences();
    } catch (err) {
      console.error('Create audience failed:', err);
      toast.error(err?.error || err?.message || 'Failed to create audience');
    } finally {
      setCreating(false);
    }
  };

  const handleCreateLookalike = async (data) => {
    try {
      setCreating(true);
      await metaAPI.createLookalike(selectedAccountId, data);
      toast.success('Lookalike audience creation started. Meta will build it over several hours.');
      setLookalikeModalOpen(false);
      await fetchAudiences();
    } catch (err) {
      console.error('Create lookalike failed:', err);
      toast.error(err?.error || err?.message || 'Failed to create lookalike');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (audience) => {
    if (!window.confirm(`Delete audience "${audience.name}"? This cannot be undone.`)) return;
    try {
      setDeletingId(audience.id);
      await metaAPI.deleteAudience(selectedAccountId, audience.id);
      toast.success('Audience deleted');
      await fetchAudiences();
    } catch (err) {
      console.error('Delete audience failed:', err);
      toast.error(err?.error || err?.message || 'Failed to delete audience');
    } finally {
      setDeletingId(null);
    }
  };

  // No Meta accounts connected
  if (!accountsLoading && accounts.length === 0) {
    return (
      <div className="max-w-xl mx-auto mt-12">
        <Card>
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-2xl bg-[#1877F2]/10 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} className="text-[#1877F2]" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">No Meta Ad Account Connected</h2>
            <p className="text-dark-400 text-sm mb-6">
              Connect your Facebook / Instagram ad account in Settings to manage audiences from here.
            </p>
            <Button icon={Link2} onClick={() => navigate('/settings?tab=integrations')}>
              Go to Settings
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users size={24} className="text-[#1877F2]" />
            Meta Audiences
          </h1>
          <p className="text-dark-400 text-sm mt-1">
            Custom and lookalike audiences for your Meta ad accounts
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {accounts.length > 1 && (
            <select
              value={selectedAccountId || ''}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="input-dark text-sm"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.accountName || a.accountId}
                </option>
              ))}
            </select>
          )}
          <Button
            variant="secondary"
            icon={RefreshCw}
            onClick={fetchAudiences}
            loading={audiencesLoading}
          >
            Refresh
          </Button>
          <Button
            variant="secondary"
            icon={Sparkles}
            onClick={() => setLookalikeModalOpen(true)}
            disabled={!selectedAccountId || audiences.filter((a) => a.subtype !== 'LOOKALIKE').length === 0}
          >
            Lookalike
          </Button>
          <Button
            icon={Plus}
            onClick={() => setCustomModalOpen(true)}
            disabled={!selectedAccountId}
          >
            New Audience
          </Button>
        </div>
      </div>

      {/* Audiences list */}
      {audiencesLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-dark-700 rounded w-3/4" />
                <div className="h-3 bg-dark-700/60 rounded w-1/2" />
                <div className="h-8 bg-dark-700/40 rounded" />
              </div>
            </Card>
          ))}
        </div>
      ) : audiences.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <Users size={40} className="text-dark-500 mx-auto mb-3" />
            <p className="text-white font-medium mb-1">No audiences yet</p>
            <p className="text-dark-400 text-sm mb-4">
              Create your first custom audience to start targeting
            </p>
            <Button icon={Plus} onClick={() => setCustomModalOpen(true)}>
              Create Audience
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {audiences.map((a) => {
            const ds = deliveryStatusConfig(a.delivery_status);
            const isLookalike = a.subtype === 'LOOKALIKE';
            return (
              <Card key={a.id} hover>
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-white truncate">{a.name}</p>
                      {a.description && (
                        <p className="text-xs text-dark-400 mt-0.5 line-clamp-2">{a.description}</p>
                      )}
                    </div>
                    {isLookalike ? (
                      <Badge color="purple">Lookalike</Badge>
                    ) : (
                      <Badge color="blue">{a.subtype || 'Custom'}</Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-dark-400">
                    <Badge color={ds.color} dot>
                      {ds.label}
                    </Badge>
                    <span className="flex items-center gap-1">
                      <Users size={12} />
                      {formatCount(a.approximate_count)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      {formatDate(a.time_created)}
                    </span>
                  </div>

                  <div className="flex items-center justify-end pt-2 border-t border-dark-700/50">
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={Trash2}
                      loading={deletingId === a.id}
                      onClick={() => handleDelete(a)}
                      className="text-danger-400 hover:text-danger-300"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <CreateCustomModal
        isOpen={customModalOpen}
        onClose={() => setCustomModalOpen(false)}
        onCreate={handleCreateCustom}
        loading={creating}
      />

      <CreateLookalikeModal
        isOpen={lookalikeModalOpen}
        onClose={() => setLookalikeModalOpen(false)}
        onCreate={handleCreateLookalike}
        loading={creating}
        sourceAudiences={audiences}
      />
    </div>
  );
}
