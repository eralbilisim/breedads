import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('breedads_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    return Promise.reject(error.response?.data || error);
  }
);

// Auth
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getProfile: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
};

// Campaigns
export const campaignsAPI = {
  list: (params) => api.get('/campaigns', { params }),
  get: (id) => api.get(`/campaigns/${id}`),
  create: (data) => api.post('/campaigns', data),
  update: (id, data) => api.put(`/campaigns/${id}`, data),
  delete: (id) => api.delete(`/campaigns/${id}`),
  publish: (id) => api.post(`/campaigns/${id}/publish`),
  pause: (id) => api.post(`/campaigns/${id}/pause`),
  resume: (id) => api.post(`/campaigns/${id}/resume`),
  analytics: (id, params) => api.get(`/campaigns/${id}/analytics`, { params }),
};

// Ad Sets
export const adSetsAPI = {
  list: (campaignId, params) => api.get(`/campaigns/${campaignId}/adsets`, { params }),
  get: (campaignId, id) => api.get(`/campaigns/${campaignId}/adsets/${id}`),
  create: (campaignId, data) => api.post(`/campaigns/${campaignId}/adsets`, data),
  update: (campaignId, id, data) => api.put(`/campaigns/${campaignId}/adsets/${id}`, data),
  delete: (campaignId, id) => api.delete(`/campaigns/${campaignId}/adsets/${id}`),
};

// Ads
export const adsAPI = {
  list: (adSetId, params) => api.get(`/adsets/${adSetId}/ads`, { params }),
  get: (adSetId, id) => api.get(`/adsets/${adSetId}/ads/${id}`),
  create: (adSetId, data) => api.post(`/adsets/${adSetId}/ads`, data),
  update: (adSetId, id, data) => api.put(`/adsets/${adSetId}/ads/${id}`, data),
  delete: (adSetId, id) => api.delete(`/adsets/${adSetId}/ads/${id}`),
};

// Meta (Facebook/Instagram)
export const metaAPI = {
  authUrl: () => api.get('/integrations/meta/auth-url'),
  accounts: () => api.get('/integrations/meta/accounts'),
  sync: (accountId) => api.post(`/integrations/meta/sync/${accountId}`),
  insights: (accountId, params) => api.get(`/integrations/meta/insights/${accountId}`, { params }),
};

// Google Ads
export const googleAPI = {
  authUrl: () => api.get('/integrations/google/auth-url'),
  accounts: () => api.get('/integrations/google/accounts'),
  sync: (accountId) => api.post(`/integrations/google/sync/${accountId}`),
  insights: (accountId, params) => api.get(`/integrations/google/insights/${accountId}`, { params }),
};

// Automation
export const automationAPI = {
  list: (params) => api.get('/automation/rules', { params }),
  get: (id) => api.get(`/automation/rules/${id}`),
  create: (data) => api.post('/automation/rules', data),
  update: (id, data) => api.put(`/automation/rules/${id}`, data),
  delete: (id) => api.delete(`/automation/rules/${id}`),
  execute: (id) => api.post(`/automation/rules/${id}/execute`),
  logs: (id, params) => api.get(`/automation/rules/${id}/logs`, { params }),
};

// Creatives (AI)
export const creativesAPI = {
  list: (params) => api.get('/ai/creatives', { params }),
  generateImage: (data) => api.post('/ai/creatives/image', data),
  generateCopy: (data) => api.post('/ai/creatives/copy', data),
  generateVariants: (id, data) => api.post(`/ai/creatives/${id}/variants`, data),
  delete: (id) => api.delete(`/ai/creatives/${id}`),
};

// Competitors
export const competitorsAPI = {
  research: (data) => api.post('/competitors/research', data),
  list: (params) => api.get('/competitors', { params }),
  get: (id) => api.get(`/competitors/${id}`),
  analyze: (id) => api.post(`/competitors/${id}/analyze`),
  delete: (id) => api.delete(`/competitors/${id}`),
};

// Landing Pages
export const landingPagesAPI = {
  list: (params) => api.get('/landing-pages', { params }),
  get: (id) => api.get(`/landing-pages/${id}`),
  create: (data) => api.post('/landing-pages', data),
  update: (id, data) => api.put(`/landing-pages/${id}`, data),
  delete: (id) => api.delete(`/landing-pages/${id}`),
  generate: (data) => api.post('/landing-pages/generate', data),
  publish: (id) => api.post(`/landing-pages/${id}/publish`),
  analytics: (id, params) => api.get(`/landing-pages/${id}/analytics`, { params }),
};

// Analytics
export const analyticsAPI = {
  dashboard: (params) => api.get('/analytics/dashboard', { params }),
  platformComparison: (params) => api.get('/analytics/platform-comparison', { params }),
  trends: (params) => api.get('/analytics/trends', { params }),
  topCampaigns: (params) => api.get('/analytics/top-campaigns', { params }),
  aiInsights: (params) => api.get('/analytics/ai-insights', { params }),
};

// Notifications
export const notificationsAPI = {
  list: (params) => api.get('/notifications', { params }),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
  delete: (id) => api.delete(`/notifications/${id}`),
};

export default api;
