const axios = require('axios');

const GOOGLE_ADS_API_BASE = 'https://googleads.googleapis.com/v17';
const GOOGLE_OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_DEVELOPER_TOKEN = process.env.GOOGLE_DEVELOPER_TOKEN;

/**
 * Create an axios instance for Google Ads API calls.
 */
function googleApi(accessToken, customerId) {
  return axios.create({
    baseURL: GOOGLE_ADS_API_BASE,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'developer-token': GOOGLE_DEVELOPER_TOKEN,
      'login-customer-id': customerId,
      'Content-Type': 'application/json',
    },
    timeout: 30000,
  });
}

/**
 * Exchange an OAuth authorization code for tokens.
 */
async function exchangeCodeForToken(code, redirectUri) {
  const response = await axios.post(GOOGLE_OAUTH_TOKEN_URL, {
    code,
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });
  return response.data;
}

/**
 * Refresh an access token using a refresh token.
 */
async function refreshAccessToken(refreshToken) {
  const response = await axios.post(GOOGLE_OAUTH_TOKEN_URL, {
    refresh_token: refreshToken,
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    grant_type: 'refresh_token',
  });
  return response.data;
}

/**
 * Ensure we have a fresh access token. Returns the access token string.
 */
async function ensureFreshToken(adAccount) {
  if (adAccount.tokenExpiresAt && new Date(adAccount.tokenExpiresAt) > new Date()) {
    return adAccount.accessToken;
  }

  if (!adAccount.refreshToken) {
    return adAccount.accessToken;
  }

  const tokenData = await refreshAccessToken(adAccount.refreshToken);

  // Update in DB would happen in calling code; for now return the new token
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  await prisma.adAccount.update({
    where: { id: adAccount.id },
    data: {
      accessToken: tokenData.access_token,
      tokenExpiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
    },
  });

  return tokenData.access_token;
}

/**
 * Get accessible customer IDs.
 */
async function getAccessibleCustomers(accessToken) {
  const response = await axios.get(`${GOOGLE_ADS_API_BASE}/customers:listAccessibleCustomers`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'developer-token': GOOGLE_DEVELOPER_TOKEN,
    },
  });

  // Response contains resourceNames like "customers/1234567890"
  return (response.data.resourceNames || []).map(name => name.replace('customers/', ''));
}

/**
 * Get customer details.
 */
async function getCustomerDetails(accessToken, customerId) {
  const api = googleApi(accessToken, customerId);
  const response = await api.post(`/customers/${customerId}/googleAds:searchStream`, {
    query: `SELECT customer.id, customer.descriptive_name, customer.currency_code, customer.time_zone FROM customer LIMIT 1`,
  });

  const results = response.data?.[0]?.results || [];
  if (results.length > 0) {
    const customer = results[0].customer;
    return {
      id: customer.id,
      descriptiveName: customer.descriptiveName,
      currencyCode: customer.currencyCode,
      timeZone: customer.timeZone,
    };
  }

  return { id: customerId, descriptiveName: customerId };
}

/**
 * Get campaigns for a Google Ads customer.
 */
async function getCampaigns(accessToken, customerId) {
  const api = googleApi(accessToken, customerId);
  const response = await api.post(`/customers/${customerId}/googleAds:searchStream`, {
    query: `
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        campaign.advertising_channel_type,
        campaign.start_date,
        campaign.end_date,
        campaign_budget.amount_micros,
        campaign_budget.type
      FROM campaign
      WHERE campaign.status != 'REMOVED'
      ORDER BY campaign.id
      LIMIT 100
    `,
  });

  const results = response.data?.[0]?.results || [];
  return results.map(row => ({
    id: row.campaign.id,
    name: row.campaign.name,
    status: row.campaign.status,
    advertisingChannelType: row.campaign.advertisingChannelType,
    startDate: row.campaign.startDate,
    endDate: row.campaign.endDate,
    campaignBudget: {
      amountMicros: row.campaignBudget?.amountMicros || 0,
      type: row.campaignBudget?.type,
    },
  }));
}

/**
 * Create a campaign on Google Ads.
 */
async function createCampaign(adAccount, campaign) {
  const accessToken = await ensureFreshToken(adAccount);
  const api = googleApi(accessToken, adAccount.accountId);

  const channelMap = {
    AWARENESS: 'DISPLAY',
    TRAFFIC: 'SEARCH',
    ENGAGEMENT: 'DISPLAY',
    LEADS: 'SEARCH',
    SALES: 'SHOPPING',
    CONVERSIONS: 'SEARCH',
    VIDEO_VIEWS: 'VIDEO',
    APP_PROMOTION: 'MULTI_CHANNEL',
    MESSAGES: 'SEARCH',
    STORE_TRAFFIC: 'LOCAL',
  };

  // First create a campaign budget
  const budgetResponse = await api.post(`/customers/${adAccount.accountId}/campaignBudgets:mutate`, {
    operations: [{
      create: {
        name: `${campaign.name} Budget`,
        amountMicros: Math.round(campaign.budget * 1000000).toString(),
        deliveryMethod: 'STANDARD',
        type: campaign.budgetType === 'DAILY' ? 'STANDARD' : 'FIXED_CPA',
      },
    }],
  });

  const budgetResourceName = budgetResponse.data.results[0].resourceName;

  // Then create the campaign
  const campaignResponse = await api.post(`/customers/${adAccount.accountId}/campaigns:mutate`, {
    operations: [{
      create: {
        name: campaign.name,
        advertisingChannelType: channelMap[campaign.objective] || 'SEARCH',
        status: 'PAUSED',
        campaignBudget: budgetResourceName,
        startDate: campaign.startDate ? new Date(campaign.startDate).toISOString().slice(0, 10).replace(/-/g, '') : undefined,
        endDate: campaign.endDate ? new Date(campaign.endDate).toISOString().slice(0, 10).replace(/-/g, '') : undefined,
        manualCpc: {},
      },
    }],
  });

  const campaignResourceName = campaignResponse.data.results[0].resourceName;
  const platformCampaignId = campaignResourceName.split('/').pop();

  return { platformCampaignId, resourceName: campaignResourceName };
}

/**
 * Create an ad group (ad set equivalent) on Google Ads.
 */
async function createAdGroup(adAccount, adSet) {
  const accessToken = await ensureFreshToken(adAccount);
  const api = googleApi(accessToken, adAccount.accountId);

  const response = await api.post(`/customers/${adAccount.accountId}/adGroups:mutate`, {
    operations: [{
      create: {
        name: adSet.name,
        campaign: `customers/${adAccount.accountId}/campaigns/${adSet.platformCampaignId}`,
        status: 'ENABLED',
        type: 'SEARCH_STANDARD',
        cpcBidMicros: adSet.bidAmount ? Math.round(adSet.bidAmount * 1000000).toString() : '1000000',
      },
    }],
  });

  const resourceName = response.data.results[0].resourceName;
  const id = resourceName.split('/').pop();

  return { id, resourceName };
}

/**
 * Create an ad on Google Ads.
 */
async function createAd(adAccount, ad) {
  const accessToken = await ensureFreshToken(adAccount);
  const api = googleApi(accessToken, adAccount.accountId);

  let adData;

  if (ad.format === 'RESPONSIVE_SEARCH' || ad.format === 'TEXT') {
    adData = {
      responsiveSearchAd: {
        headlines: [
          { text: ad.headline || 'Visit our site' },
          { text: ad.creativeData?.headline2 || ad.headline || 'Learn more today' },
          { text: ad.creativeData?.headline3 || 'Get started now' },
        ],
        descriptions: [
          { text: ad.description || 'Check out our products and services.' },
          { text: ad.creativeData?.description2 || ad.description || 'Quality service guaranteed.' },
        ],
        path1: ad.creativeData?.path1 || '',
        path2: ad.creativeData?.path2 || '',
      },
      finalUrls: [ad.destinationUrl || 'https://example.com'],
    };
  } else if (ad.format === 'RESPONSIVE_DISPLAY') {
    adData = {
      responsiveDisplayAd: {
        headlines: [{ text: ad.headline || 'Visit our site' }],
        longHeadline: { text: ad.creativeData?.longHeadline || ad.headline || 'Check out our amazing offer' },
        descriptions: [{ text: ad.description || 'Check out our products and services.' }],
        businessName: ad.creativeData?.businessName || 'Business',
        marketingImages: ad.imageUrl
          ? [{ asset: ad.imageUrl }]
          : [],
      },
      finalUrls: [ad.destinationUrl || 'https://example.com'],
    };
  } else {
    // Default to responsive search ad
    adData = {
      responsiveSearchAd: {
        headlines: [
          { text: ad.headline || 'Visit our site' },
          { text: 'Learn more today' },
          { text: 'Get started now' },
        ],
        descriptions: [
          { text: ad.description || 'Check out our products and services.' },
          { text: 'Quality service guaranteed.' },
        ],
      },
      finalUrls: [ad.destinationUrl || 'https://example.com'],
    };
  }

  const response = await api.post(`/customers/${adAccount.accountId}/adGroupAds:mutate`, {
    operations: [{
      create: {
        adGroup: `customers/${adAccount.accountId}/adGroups/${ad.platformAdGroupId}`,
        status: 'ENABLED',
        ad: adData,
      },
    }],
  });

  const resourceName = response.data.results[0].resourceName;
  const id = resourceName.split('/').pop();

  return { id, resourceName };
}

/**
 * Update a campaign status on Google Ads.
 */
async function updateCampaignStatus(adAccount, platformCampaignId, status) {
  const accessToken = await ensureFreshToken(adAccount);
  const api = googleApi(accessToken, adAccount.accountId);

  const response = await api.post(`/customers/${adAccount.accountId}/campaigns:mutate`, {
    operations: [{
      update: {
        resourceName: `customers/${adAccount.accountId}/campaigns/${platformCampaignId}`,
        status,
      },
      updateMask: 'status',
    }],
  });

  return response.data;
}

/**
 * Pause a campaign.
 */
async function pauseCampaign(adAccount, platformCampaignId) {
  return updateCampaignStatus(adAccount, platformCampaignId, 'PAUSED');
}

/**
 * Resume a campaign.
 */
async function resumeCampaign(adAccount, platformCampaignId) {
  return updateCampaignStatus(adAccount, platformCampaignId, 'ENABLED');
}

/**
 * Get campaign performance metrics.
 */
async function getCampaignMetrics(accessToken, customerId, platformCampaignId, options = {}) {
  const api = googleApi(accessToken, customerId);

  const startDate = options.startDate || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const endDate = options.endDate || new Date().toISOString().slice(0, 10);

  const response = await api.post(`/customers/${customerId}/googleAds:searchStream`, {
    query: `
      SELECT
        segments.date,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions,
        metrics.conversions_value,
        metrics.ctr,
        metrics.average_cpc,
        metrics.average_cpm
      FROM campaign
      WHERE campaign.id = ${platformCampaignId}
        AND segments.date BETWEEN '${startDate.replace(/-/g, '')}' AND '${endDate.replace(/-/g, '')}'
      ORDER BY segments.date ASC
    `,
  });

  const results = response.data?.[0]?.results || [];
  return results.map(row => ({
    date: row.segments.date.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'),
    impressions: parseInt(row.metrics.impressions || 0),
    clicks: parseInt(row.metrics.clicks || 0),
    costMicros: parseInt(row.metrics.costMicros || 0),
    conversions: parseFloat(row.metrics.conversions || 0),
    conversionValue: parseFloat(row.metrics.conversionsValue || 0),
    ctr: parseFloat(row.metrics.ctr || 0),
    averageCpc: parseInt(row.metrics.averageCpc || 0),
    averageCpm: parseInt(row.metrics.averageCpm || 0),
  }));
}

/**
 * Get account-level summary metrics.
 */
async function getAccountMetrics(accessToken, customerId, options = {}) {
  const api = googleApi(accessToken, customerId);

  const startDate = options.startDate || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const endDate = options.endDate || new Date().toISOString().slice(0, 10);

  const response = await api.post(`/customers/${customerId}/googleAds:searchStream`, {
    query: `
      SELECT
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions,
        metrics.conversions_value
      FROM customer
      WHERE segments.date BETWEEN '${startDate.replace(/-/g, '')}' AND '${endDate.replace(/-/g, '')}'
    `,
  });

  const results = response.data?.[0]?.results || [];
  if (results.length > 0) {
    const m = results[0].metrics;
    return {
      impressions: parseInt(m.impressions || 0),
      clicks: parseInt(m.clicks || 0),
      costMicros: parseInt(m.costMicros || 0),
      conversions: parseFloat(m.conversions || 0),
      conversionValue: parseFloat(m.conversionsValue || 0),
    };
  }
  return { impressions: 0, clicks: 0, costMicros: 0, conversions: 0, conversionValue: 0 };
}

module.exports = {
  exchangeCodeForToken,
  refreshAccessToken,
  ensureFreshToken,
  getAccessibleCustomers,
  getCustomerDetails,
  getCampaigns,
  createCampaign,
  createAdGroup,
  createAd,
  updateCampaignStatus,
  pauseCampaign,
  resumeCampaign,
  getCampaignMetrics,
  getAccountMetrics,
};
