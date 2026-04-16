const axios = require('axios');
const { PrismaClient } = require('@prisma/client');

const META_API_BASE = 'https://graph.facebook.com/v21.0';
const prisma = new PrismaClient();

let _settingsCache = null;
let _settingsCacheTime = 0;

async function getAppSettings() {
  const now = Date.now();
  if (_settingsCache && now - _settingsCacheTime < 300000) return _settingsCache;
  try {
    const settings = await prisma.appSettings.findUnique({ where: { id: 'app_settings' } });
    _settingsCache = settings;
    _settingsCacheTime = now;
    return settings;
  } catch { return null; }
}

async function getMetaAppId() {
  const s = await getAppSettings();
  return s?.metaAppId || process.env.META_APP_ID;
}

async function getMetaAppSecret() {
  const s = await getAppSettings();
  return s?.metaAppSecret || process.env.META_APP_SECRET;
}

/**
 * Create an axios instance for Meta API calls.
 */
function metaApi(accessToken) {
  return axios.create({
    baseURL: META_API_BASE,
    params: { access_token: accessToken },
    timeout: 30000,
  });
}

/**
 * Exchange an OAuth authorization code for an access token.
 */
async function exchangeCodeForToken(code, redirectUri) {
  const appId = await getMetaAppId();
  const appSecret = await getMetaAppSecret();
  const response = await axios.get(`${META_API_BASE}/oauth/access_token`, {
    params: { client_id: appId, client_secret: appSecret, redirect_uri: redirectUri, code },
  });
  return response.data;
}

/**
 * Exchange a short-lived token for a long-lived token.
 */
async function getLongLivedToken(shortLivedToken) {
  const appId = await getMetaAppId();
  const appSecret = await getMetaAppSecret();
  const response = await axios.get(`${META_API_BASE}/oauth/access_token`, {
    params: { grant_type: 'fb_exchange_token', client_id: appId, client_secret: appSecret, fb_exchange_token: shortLivedToken },
  });
  return response.data;
}

/**
 * Get all ad accounts accessible with the given token.
 */
async function getAdAccounts(accessToken) {
  const api = metaApi(accessToken);
  const response = await api.get('/me/adaccounts', {
    params: {
      fields: 'id,name,account_id,currency,timezone_name,account_status,business_name',
      limit: 100,
    },
  });
  return response.data.data || [];
}

/**
 * Get Pages the user administers. Each page has its own access_token
 * which is required for creating ad creatives that post from that page.
 */
async function getPages(accessToken) {
  const api = metaApi(accessToken);
  const response = await api.get('/me/accounts', {
    params: {
      fields: 'id,name,access_token,category,tasks',
      limit: 100,
    },
  });
  return response.data.data || [];
}

/**
 * Resolve an array of user-typed location strings into Meta's
 * geo_locations targeting spec: { countries: [...], regions: [...], cities: [...] }.
 *
 * Inputs:
 *  - 2-letter ISO country codes (e.g. "US", "TR") → countries[]
 *  - anything else → resolved via Graph /search?type=adgeolocation,
 *    then bucketed by result type (country / region / city).
 *
 * Falls back to { countries: ['US'] } when the list is empty or nothing resolves.
 */
async function resolveGeoLocations(api, locations) {
  const fallback = { countries: ['US'] };
  if (!Array.isArray(locations) || locations.length === 0) return fallback;

  const countries = new Set();
  const regions = [];
  const cities = [];

  for (const raw of locations) {
    if (!raw || typeof raw !== 'string') continue;
    const trimmed = raw.trim();
    if (!trimmed) continue;

    // Direct ISO country codes
    if (/^[A-Z]{2}$/.test(trimmed)) {
      countries.add(trimmed);
      continue;
    }

    try {
      const res = await api.get('/search', {
        params: {
          type: 'adgeolocation',
          q: trimmed,
          location_types: JSON.stringify(['country', 'region', 'city']),
          limit: 1,
        },
      });
      const top = res.data?.data?.[0];
      if (!top) continue;

      if (top.type === 'country') {
        countries.add(top.country_code || top.key);
      } else if (top.type === 'region') {
        regions.push({ key: String(top.key) });
      } else if (top.type === 'city') {
        cities.push({ key: String(top.key), radius: 10, distance_unit: 'mile' });
      }
    } catch (err) {
      // Swallow per-location failures; log for observability
      console.error(`[meta] geo resolve failed for "${trimmed}":`, err.response?.data?.error?.message || err.message);
    }
  }

  const out = {};
  if (countries.size) out.countries = [...countries];
  if (regions.length) out.regions = regions;
  if (cities.length) out.cities = cities;
  return Object.keys(out).length ? out : fallback;
}

/**
 * Upload a video to an ad account from a public URL. Meta returns
 * a video_id that can be used in object_story_spec.video_data.
 */
async function uploadVideoFromUrl(adAccount, videoUrl) {
  const api = metaApi(adAccount.accessToken);
  const response = await api.post(`/act_${adAccount.accountId}/advideos`, null, {
    params: { file_url: videoUrl },
  });
  return response.data.id;
}

/**
 * Upload an image by URL and get back an image_hash usable in creatives.
 * Preferred over passing image_url directly, because hashes persist in
 * the ad account's image library.
 */
async function uploadImageFromUrl(adAccount, imageUrl) {
  const api = metaApi(adAccount.accessToken);
  const response = await api.post(`/act_${adAccount.accountId}/adimages`, null, {
    params: { url: imageUrl },
  });
  // Meta returns images keyed by the source URL → pick the first hash
  const images = response.data?.images || {};
  const first = Object.values(images)[0];
  return first?.hash || null;
}

/**
 * Get all campaigns for an ad account.
 */
async function getCampaigns(adAccount) {
  const api = metaApi(adAccount.accessToken);
  const response = await api.get(`/act_${adAccount.accountId}/campaigns`, {
    params: {
      fields: 'id,name,objective,status,daily_budget,lifetime_budget,start_time,stop_time,created_time,updated_time,buying_type,special_ad_categories',
      limit: 100,
    },
  });
  return response.data.data || [];
}

/**
 * Create a campaign on Meta Ads.
 */
async function createCampaign(adAccount, campaign) {
  const objectiveMap = {
    AWARENESS: 'OUTCOME_AWARENESS',
    TRAFFIC: 'OUTCOME_TRAFFIC',
    ENGAGEMENT: 'OUTCOME_ENGAGEMENT',
    LEADS: 'OUTCOME_LEADS',
    APP_PROMOTION: 'OUTCOME_APP_PROMOTION',
    SALES: 'OUTCOME_SALES',
    CONVERSIONS: 'OUTCOME_SALES',
    VIDEO_VIEWS: 'OUTCOME_AWARENESS',
    MESSAGES: 'OUTCOME_ENGAGEMENT',
    STORE_TRAFFIC: 'OUTCOME_TRAFFIC',
  };

  const api = metaApi(adAccount.accessToken);
  const response = await api.post(`/act_${adAccount.accountId}/campaigns`, null, {
    params: {
      name: campaign.name,
      objective: objectiveMap[campaign.objective] || 'OUTCOME_TRAFFIC',
      status: 'PAUSED',
      special_ad_categories: '[]',
      daily_budget: campaign.budgetType === 'DAILY' ? Math.round(campaign.budget * 100) : undefined,
      lifetime_budget: campaign.budgetType === 'LIFETIME' ? Math.round(campaign.budget * 100) : undefined,
    },
  });

  return {
    platformCampaignId: response.data.id,
    data: response.data,
  };
}

/**
 * Update an existing campaign on Meta Ads.
 */
async function updateCampaign(adAccount, platformCampaignId, updates) {
  const api = metaApi(adAccount.accessToken);
  const response = await api.post(`/${platformCampaignId}`, null, {
    params: updates,
  });
  return response.data;
}

/**
 * Pause a campaign on Meta Ads.
 */
async function pauseCampaign(adAccount, platformCampaignId) {
  return updateCampaign(adAccount, platformCampaignId, { status: 'PAUSED' });
}

/**
 * Resume a campaign on Meta Ads.
 */
async function resumeCampaign(adAccount, platformCampaignId) {
  return updateCampaign(adAccount, platformCampaignId, { status: 'ACTIVE' });
}

/**
 * Delete a campaign on Meta Ads.
 */
async function deleteCampaign(adAccount, platformCampaignId) {
  return updateCampaign(adAccount, platformCampaignId, { status: 'DELETED' });
}

/**
 * Create an ad set on Meta Ads.
 */
async function createAdSet(adAccount, adSet) {
  const api = metaApi(adAccount.accessToken);

  const params = {
    name: adSet.name,
    campaign_id: adSet.platformCampaignId,
    status: 'PAUSED',
    optimization_goal: adSet.optimizationGoal || 'LINK_CLICKS',
    billing_event: 'IMPRESSIONS',
  };

  if (adSet.budget) params.daily_budget = Math.round(adSet.budget * 100);
  if (adSet.bidAmount) params.bid_amount = Math.round(adSet.bidAmount * 100);

  // Build targeting. IMPORTANT: geo_locations must be a structured
  // object { countries, regions, cities } — not a list of strings.
  const targeting = adSet.targeting || {};
  const geoLocations = await resolveGeoLocations(api, targeting.locations);

  const gendersMap = { all: [1, 2], male: [1], female: [2] };
  const genders = Array.isArray(targeting.genders)
    ? targeting.genders
    : gendersMap[targeting.gender] || [1, 2];

  const targetingSpec = {
    geo_locations: geoLocations,
    age_min: targeting.ageMin || 18,
    age_max: targeting.ageMax || 65,
    genders,
  };

  // Interests need Meta IDs; if the user typed plain strings, pass them as
  // flexible_spec interests-by-name so Meta can match them server-side.
  if (Array.isArray(targeting.interests) && targeting.interests.length) {
    const interestObjs = targeting.interests.map((i) =>
      typeof i === 'object' ? i : { name: String(i) }
    );
    targetingSpec.flexible_spec = [{ interests: interestObjs }];
  }

  if (Array.isArray(targeting.behaviors) && targeting.behaviors.length) {
    targetingSpec.behaviors = targeting.behaviors.map((b) =>
      typeof b === 'object' ? b : { name: String(b) }
    );
  }

  if (Array.isArray(targeting.customAudiences) && targeting.customAudiences.length) {
    targetingSpec.custom_audiences = targeting.customAudiences.map((id) =>
      typeof id === 'object' ? id : { id: String(id) }
    );
  }

  if (Array.isArray(targeting.excludedAudiences) && targeting.excludedAudiences.length) {
    targetingSpec.excluded_custom_audiences = targeting.excludedAudiences.map((id) =>
      typeof id === 'object' ? id : { id: String(id) }
    );
  }

  params.targeting = JSON.stringify(targetingSpec);

  // Placements
  if (adSet.placements && adSet.placements.automatic === false) {
    params.publisher_platforms = JSON.stringify(adSet.placements.platforms || ['facebook', 'instagram']);
    if (adSet.placements.positions) {
      params.facebook_positions = JSON.stringify(adSet.placements.positions.facebook || ['feed']);
      params.instagram_positions = JSON.stringify(adSet.placements.positions.instagram || ['stream']);
    }
  }

  // Schedule
  if (adSet.schedule?.startTime) params.start_time = adSet.schedule.startTime;
  if (adSet.schedule?.endTime) params.end_time = adSet.schedule.endTime;

  const response = await api.post(`/act_${adAccount.accountId}/adsets`, null, { params });
  return { id: response.data.id, data: response.data };
}

/**
 * Create an ad on Meta Ads.
 */
async function createAd(adAccount, ad) {
  const api = metaApi(adAccount.accessToken);

  const pageId = adAccount.pageId || process.env.META_PAGE_ID;
  if (!pageId) {
    throw new Error(
      'No Facebook Page linked to this ad account. Reconnect the Meta account so BreedAds can fetch your pages.'
    );
  }

  const creativeParams = { name: `${ad.name} Creative` };
  const ctaType = ad.callToAction || 'LEARN_MORE';

  if (ad.format === 'IMAGE' || ad.format === 'STORIES') {
    // Prefer uploading the image to get an image_hash (works for hosts
    // Meta can't fetch directly). Fall back to image_url.
    let imageHash = null;
    if (ad.imageUrl && /^https?:\/\//i.test(ad.imageUrl)) {
      try {
        imageHash = await uploadImageFromUrl(adAccount, ad.imageUrl);
      } catch (err) {
        console.error('[meta] image upload failed, falling back to image_url:', err.response?.data?.error?.message || err.message);
      }
    }

    const linkData = {
      link: ad.destinationUrl,
      message: ad.primaryText || '',
      name: ad.headline || '',
      description: ad.description || '',
      call_to_action: { type: ctaType, value: ad.destinationUrl ? { link: ad.destinationUrl } : undefined },
    };
    if (imageHash) linkData.image_hash = imageHash;
    else if (ad.imageUrl) linkData.image_url = ad.imageUrl;

    creativeParams.object_story_spec = JSON.stringify({
      page_id: pageId,
      link_data: linkData,
    });
  } else if (ad.format === 'VIDEO') {
    // If the user gave a video URL, upload it first to get a video_id.
    // Otherwise assume they passed an existing Meta video_id via videoUrl.
    let videoId = ad.videoId;
    if (!videoId && ad.videoUrl) {
      if (/^https?:\/\//i.test(ad.videoUrl)) {
        videoId = await uploadVideoFromUrl(adAccount, ad.videoUrl);
      } else {
        videoId = ad.videoUrl;
      }
    }

    creativeParams.object_story_spec = JSON.stringify({
      page_id: pageId,
      video_data: {
        video_id: videoId,
        title: ad.headline || '',
        message: ad.primaryText || '',
        link_description: ad.description || '',
        call_to_action: {
          type: ctaType,
          value: ad.destinationUrl ? { link: ad.destinationUrl } : undefined,
        },
      },
    });
  } else if (ad.format === 'CAROUSEL') {
    const rawCards = ad.creativeData?.cards || [];
    const childAttachments = [];
    for (const card of rawCards) {
      let imageHash = null;
      if (card.imageUrl && /^https?:\/\//i.test(card.imageUrl)) {
        try {
          imageHash = await uploadImageFromUrl(adAccount, card.imageUrl);
        } catch (err) {
          console.error('[meta] carousel card image upload failed:', err.message);
        }
      }
      const attachment = {
        link: card.link || ad.destinationUrl,
        name: card.headline || '',
        description: card.description || '',
      };
      if (imageHash) attachment.image_hash = imageHash;
      else if (card.imageUrl) attachment.image_url = card.imageUrl;
      childAttachments.push(attachment);
    }

    creativeParams.object_story_spec = JSON.stringify({
      page_id: pageId,
      link_data: {
        link: ad.destinationUrl,
        message: ad.primaryText || '',
        child_attachments: childAttachments,
      },
    });
  }

  const creativeResponse = await api.post(`/act_${adAccount.accountId}/adcreatives`, null, {
    params: creativeParams,
  });

  const adResponse = await api.post(`/act_${adAccount.accountId}/ads`, null, {
    params: {
      name: ad.name,
      adset_id: ad.platformAdSetId,
      creative: JSON.stringify({ creative_id: creativeResponse.data.id }),
      status: 'PAUSED',
    },
  });

  return { id: adResponse.data.id, creativeId: creativeResponse.data.id };
}

/**
 * Get campaign insights/reporting data from Meta.
 */
async function getCampaignInsights(adAccount, platformCampaignId, options = {}) {
  const api = metaApi(adAccount.accessToken);

  const params = {
    fields: 'date_start,date_stop,impressions,clicks,spend,conversions,ctr,cpc,cpm,reach,frequency,actions,action_values,cost_per_action_type',
    time_increment: 1, // daily breakdown
    limit: 100,
  };

  if (options.startDate && options.endDate) {
    params.time_range = JSON.stringify({
      since: options.startDate,
      until: options.endDate,
    });
  } else {
    // Default: last 30 days
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    params.time_range = JSON.stringify({
      since: start.toISOString().slice(0, 10),
      until: end.toISOString().slice(0, 10),
    });
  }

  const response = await api.get(`/${platformCampaignId}/insights`, { params });
  return response.data.data || [];
}

/**
 * Get ad set insights.
 */
async function getAdSetInsights(adAccount, platformAdSetId, options = {}) {
  const api = metaApi(adAccount.accessToken);
  const params = {
    fields: 'date_start,date_stop,impressions,clicks,spend,conversions,ctr,cpc,cpm,reach,frequency',
    time_increment: 1,
    limit: 100,
  };

  if (options.startDate && options.endDate) {
    params.time_range = JSON.stringify({
      since: options.startDate,
      until: options.endDate,
    });
  }

  const response = await api.get(`/${platformAdSetId}/insights`, { params });
  return response.data.data || [];
}

/**
 * Get ad-level insights.
 */
async function getAdInsights(adAccount, platformAdId, options = {}) {
  const api = metaApi(adAccount.accessToken);
  const params = {
    fields: 'date_start,date_stop,impressions,clicks,spend,conversions,ctr,cpc,actions,action_values',
    time_increment: 1,
    limit: 100,
  };

  if (options.startDate && options.endDate) {
    params.time_range = JSON.stringify({
      since: options.startDate,
      until: options.endDate,
    });
  }

  const response = await api.get(`/${platformAdId}/insights`, { params });
  return response.data.data || [];
}

async function getAdSets(adAccount, platformCampaignId) {
  const api = metaApi(adAccount.accessToken);
  const response = await api.get(`/${platformCampaignId}/adsets`, {
    params: {
      fields: 'id,name,status,daily_budget,lifetime_budget,bid_amount,bid_strategy,targeting,optimization_goal,billing_event,start_time,end_time',
      limit: 100,
    },
  });
  return response.data.data || [];
}

async function updateAdSet(adAccount, platformAdSetId, updates) {
  const api = metaApi(adAccount.accessToken);
  const response = await api.post(`/${platformAdSetId}`, null, { params: updates });
  return response.data;
}

async function deleteAdSet(adAccount, platformAdSetId) {
  return updateAdSet(adAccount, platformAdSetId, { status: 'DELETED' });
}

async function getAds(adAccount, platformAdSetId) {
  const api = metaApi(adAccount.accessToken);
  const response = await api.get(`/${platformAdSetId}/ads`, {
    params: {
      fields: 'id,name,status,creative{id,name,title,body,image_url,video_id,object_story_spec},created_time',
      limit: 100,
    },
  });
  return response.data.data || [];
}

async function updateAd(adAccount, platformAdId, updates) {
  const api = metaApi(adAccount.accessToken);
  const response = await api.post(`/${platformAdId}`, null, { params: updates });
  return response.data;
}

async function deleteAd(adAccount, platformAdId) {
  return updateAd(adAccount, platformAdId, { status: 'DELETED' });
}

async function getAccountInsights(adAccount, options = {}) {
  const api = metaApi(adAccount.accessToken);
  const params = {
    fields: 'date_start,date_stop,impressions,clicks,spend,conversions,ctr,cpc,cpm,reach,frequency,actions,action_values',
    time_increment: 1,
    limit: 100,
  };
  if (options.startDate && options.endDate) {
    params.time_range = JSON.stringify({ since: options.startDate, until: options.endDate });
  }
  const response = await api.get(`/act_${adAccount.accountId}/insights`, { params });
  return response.data.data || [];
}

module.exports = {
  exchangeCodeForToken,
  getLongLivedToken,
  getAdAccounts,
  getPages,
  getCampaigns,
  createCampaign,
  updateCampaign,
  pauseCampaign,
  resumeCampaign,
  deleteCampaign,
  createAdSet,
  createAd,
  getCampaignInsights,
  getAdSetInsights,
  getAdInsights,
  getAdSets,
  updateAdSet,
  deleteAdSet,
  getAds,
  updateAd,
  deleteAd,
  getAccountInsights,
  resolveGeoLocations,
  uploadVideoFromUrl,
  uploadImageFromUrl,
};
