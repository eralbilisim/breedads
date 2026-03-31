const axios = require('axios');

const META_API_BASE = 'https://graph.facebook.com/v21.0';
const META_APP_ID = process.env.META_APP_ID;
const META_APP_SECRET = process.env.META_APP_SECRET;

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
  const response = await axios.get(`${META_API_BASE}/oauth/access_token`, {
    params: {
      client_id: META_APP_ID,
      client_secret: META_APP_SECRET,
      redirect_uri: redirectUri,
      code,
    },
  });
  return response.data;
}

/**
 * Exchange a short-lived token for a long-lived token.
 */
async function getLongLivedToken(shortLivedToken) {
  const response = await axios.get(`${META_API_BASE}/oauth/access_token`, {
    params: {
      grant_type: 'fb_exchange_token',
      client_id: META_APP_ID,
      client_secret: META_APP_SECRET,
      fb_exchange_token: shortLivedToken,
    },
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

  if (adSet.budget) {
    params.daily_budget = Math.round(adSet.budget * 100);
  }
  if (adSet.bidAmount) {
    params.bid_amount = Math.round(adSet.bidAmount * 100);
  }

  // Build targeting
  const targeting = adSet.targeting || {};
  params.targeting = JSON.stringify({
    geo_locations: targeting.locations || { countries: ['US'] },
    age_min: targeting.ageMin || 18,
    age_max: targeting.ageMax || 65,
    genders: targeting.genders || [0],
    interests: targeting.interests || [],
    custom_audiences: targeting.customAudiences || [],
    excluded_custom_audiences: targeting.excludedAudiences || [],
  });

  // Placements
  if (adSet.placements) {
    const placements = adSet.placements;
    if (placements.automatic !== false) {
      // Automatic placements (default)
    } else {
      params.publisher_platforms = JSON.stringify(placements.platforms || ['facebook', 'instagram']);
      if (placements.positions) {
        params.facebook_positions = JSON.stringify(placements.positions.facebook || ['feed']);
        params.instagram_positions = JSON.stringify(placements.positions.instagram || ['stream']);
      }
    }
  }

  // Schedule
  if (adSet.schedule) {
    if (adSet.schedule.startTime) {
      params.start_time = adSet.schedule.startTime;
    }
    if (adSet.schedule.endTime) {
      params.end_time = adSet.schedule.endTime;
    }
  }

  const response = await api.post(`/act_${adAccount.accountId}/adsets`, null, { params });
  return { id: response.data.id, data: response.data };
}

/**
 * Create an ad on Meta Ads.
 */
async function createAd(adAccount, ad) {
  const api = metaApi(adAccount.accessToken);

  // First create the ad creative
  const creativeParams = {
    name: `${ad.name} Creative`,
  };

  if (ad.format === 'IMAGE' || ad.format === 'STORIES') {
    creativeParams.object_story_spec = JSON.stringify({
      page_id: adAccount.pageId || process.env.META_PAGE_ID,
      link_data: {
        image_url: ad.imageUrl,
        link: ad.destinationUrl,
        message: ad.primaryText || '',
        name: ad.headline || '',
        description: ad.description || '',
        call_to_action: {
          type: ad.callToAction || 'LEARN_MORE',
        },
      },
    });
  } else if (ad.format === 'VIDEO') {
    creativeParams.object_story_spec = JSON.stringify({
      page_id: adAccount.pageId || process.env.META_PAGE_ID,
      video_data: {
        video_id: ad.videoUrl,
        title: ad.headline || '',
        message: ad.primaryText || '',
        link_description: ad.description || '',
        call_to_action: {
          type: ad.callToAction || 'LEARN_MORE',
          value: { link: ad.destinationUrl },
        },
      },
    });
  } else if (ad.format === 'CAROUSEL') {
    const carouselCards = ad.creativeData?.cards || [];
    creativeParams.object_story_spec = JSON.stringify({
      page_id: adAccount.pageId || process.env.META_PAGE_ID,
      link_data: {
        message: ad.primaryText || '',
        child_attachments: carouselCards.map(card => ({
          link: card.link || ad.destinationUrl,
          image_url: card.imageUrl,
          name: card.headline || '',
          description: card.description || '',
        })),
      },
    });
  }

  const creativeResponse = await api.post(`/act_${adAccount.accountId}/adcreatives`, null, {
    params: creativeParams,
  });

  // Then create the ad
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

module.exports = {
  exchangeCodeForToken,
  getLongLivedToken,
  getAdAccounts,
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
};
