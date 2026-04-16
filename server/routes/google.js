const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const googleAdsService = require('../services/googleAds');

const router = express.Router();
const prisma = new PrismaClient();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/google/callback';

// GET /api/google/callback — unauthenticated (Google redirects with no
// bearer token; we identify the user via the `state` parameter).
router.get('/callback', async (req, res, next) => {
  try {
    const { code, state: userId, error, error_description } = req.query;
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

    if (error) {
      return res.redirect(`${clientUrl}/settings?tab=accounts&google_error=${encodeURIComponent(error_description || error)}`);
    }
    if (!code) {
      return res.redirect(`${clientUrl}/settings?tab=accounts&google_error=missing_code`);
    }
    if (!userId) {
      return res.redirect(`${clientUrl}/settings?tab=accounts&google_error=missing_state`);
    }

    const tokenData = await googleAdsService.exchangeCodeForToken(code, GOOGLE_REDIRECT_URI);
    const customers = await googleAdsService.getAccessibleCustomers(tokenData.access_token);

    const savedAccounts = [];
    for (const customerId of customers) {
      const details = await googleAdsService.getCustomerDetails(tokenData.access_token, customerId);
      const tokenExpiresAt = tokenData.expires_in
        ? new Date(Date.now() + tokenData.expires_in * 1000)
        : null;

      const saved = await prisma.adAccount.upsert({
        where: {
          platform_accountId: { platform: 'GOOGLE', accountId: customerId },
        },
        update: {
          userId,
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token || undefined,
          tokenExpiresAt,
          accountName: details.descriptiveName || customerId,
          isActive: true,
        },
        create: {
          userId,
          platform: 'GOOGLE',
          accountId: customerId,
          accountName: details.descriptiveName || customerId,
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token || null,
          tokenExpiresAt,
          currency: details.currencyCode || 'USD',
          timezone: details.timeZone || 'UTC',
        },
      });
      savedAccounts.push(saved);
    }

    await prisma.notification.create({
      data: {
        userId,
        title: 'Google Ads Connected',
        message: `Successfully connected ${savedAccounts.length} Google Ads account(s).`,
        type: 'SUCCESS',
      },
    });

    res.redirect(`${clientUrl}/settings?tab=accounts&google=connected`);
  } catch (err) {
    console.error('[google] callback failed:', err.response?.data?.error || err);
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const msg = err.response?.data?.error_description || err.response?.data?.error?.message || err.message || 'unknown';
    res.redirect(`${clientUrl}/settings?tab=accounts&google_error=${encodeURIComponent(msg)}`);
  }
});

// All routes below require authentication
router.use(authenticate);

// GET /api/google/auth-url
router.get('/auth-url', (req, res) => {
  const scopes = encodeURIComponent('https://www.googleapis.com/auth/adwords');
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(GOOGLE_REDIRECT_URI)}&response_type=code&scope=${scopes}&access_type=offline&prompt=consent&state=${req.user.id}`;

  res.json({ authUrl });
});

// GET /api/google/accounts
router.get('/accounts', async (req, res, next) => {
  try {
    const accounts = await prisma.adAccount.findMany({
      where: { userId: req.user.id, platform: 'GOOGLE' },
      select: {
        id: true,
        accountId: true,
        accountName: true,
        isActive: true,
        currency: true,
        timezone: true,
        tokenExpiresAt: true,
        createdAt: true,
      },
    });

    res.json(accounts);
  } catch (err) {
    next(err);
  }
});

// POST /api/google/sync
router.post('/sync', async (req, res, next) => {
  try {
    const { accountId } = req.body;

    const adAccount = await prisma.adAccount.findFirst({
      where: { id: accountId, userId: req.user.id, platform: 'GOOGLE' },
    });
    if (!adAccount) {
      return res.status(404).json({ error: 'Google Ads account not found.' });
    }

    // Refresh token if needed
    const freshToken = await googleAdsService.ensureFreshToken(adAccount);

    const remoteCampaigns = await googleAdsService.getCampaigns(freshToken, adAccount.accountId);
    const synced = [];

    for (const remote of remoteCampaigns) {
      const statusMap = {
        ENABLED: 'ACTIVE',
        PAUSED: 'PAUSED',
        REMOVED: 'ARCHIVED',
      };

      const objectiveMap = {
        SEARCH: 'TRAFFIC',
        DISPLAY: 'AWARENESS',
        SHOPPING: 'SALES',
        VIDEO: 'VIDEO_VIEWS',
        PERFORMANCE_MAX: 'CONVERSIONS',
        SMART: 'CONVERSIONS',
        LOCAL: 'STORE_TRAFFIC',
        DISCOVERY: 'ENGAGEMENT',
      };

      const budgetMicros = remote.campaignBudget?.amountMicros || 0;

      const campaign = await prisma.campaign.upsert({
        where: {
          id: remote.localId || `google-sync-${remote.id}`,
        },
        update: {
          name: remote.name,
          status: statusMap[remote.status] || 'ACTIVE',
          budget: budgetMicros / 1000000,
        },
        create: {
          userId: req.user.id,
          adAccountId: adAccount.id,
          platform: 'GOOGLE',
          platformCampaignId: remote.id,
          name: remote.name,
          objective: objectiveMap[remote.advertisingChannelType] || 'TRAFFIC',
          status: statusMap[remote.status] || 'ACTIVE',
          budget: budgetMicros / 1000000,
          budgetType: remote.campaignBudget?.type === 'FIXED_CPA' ? 'LIFETIME' : 'DAILY',
          startDate: remote.startDate ? new Date(remote.startDate) : null,
          endDate: remote.endDate ? new Date(remote.endDate) : null,
        },
      });
      synced.push(campaign);
    }

    await prisma.notification.create({
      data: {
        userId: req.user.id,
        title: 'Google Ads Sync Complete',
        message: `Synced ${synced.length} campaigns from Google Ads.`,
        type: 'SUCCESS',
      },
    });

    res.json({ synced: synced.length, campaigns: synced });
  } catch (err) {
    next(err);
  }
});

// POST /api/google/campaigns/:id/publish
router.post('/campaigns/:id/publish', async (req, res, next) => {
  try {
    const campaign = await prisma.campaign.findFirst({
      where: { id: req.params.id, userId: req.user.id, platform: 'GOOGLE' },
      include: {
        adAccount: true,
        adSets: { include: { ads: true } },
      },
    });
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found.' });
    }

    const result = await googleAdsService.createCampaign(campaign.adAccount, campaign);

    // Publish ad groups (ad sets)
    for (const adSet of campaign.adSets) {
      const adGroupResult = await googleAdsService.createAdGroup(campaign.adAccount, {
        ...adSet,
        platformCampaignId: result.platformCampaignId,
      });

      await prisma.adSet.update({
        where: { id: adSet.id },
        data: { platformAdSetId: adGroupResult.id, status: 'ACTIVE' },
      });

      // Publish ads within ad group
      for (const ad of adSet.ads) {
        const adResult = await googleAdsService.createAd(campaign.adAccount, {
          ...ad,
          platformAdGroupId: adGroupResult.id,
        });

        await prisma.ad.update({
          where: { id: ad.id },
          data: { platformAdId: adResult.id, status: 'ACTIVE' },
        });
      }
    }

    const updated = await prisma.campaign.update({
      where: { id: campaign.id },
      data: {
        status: 'ACTIVE',
        platformCampaignId: result.platformCampaignId,
      },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// GET /api/google/insights/:campaignId
router.get('/insights/:campaignId', async (req, res, next) => {
  try {
    const campaign = await prisma.campaign.findFirst({
      where: { id: req.params.campaignId, userId: req.user.id, platform: 'GOOGLE' },
      include: { adAccount: true },
    });
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found.' });
    }
    if (!campaign.platformCampaignId) {
      return res.status(400).json({ error: 'Campaign has not been published to Google Ads.' });
    }

    const { startDate, endDate } = req.query;
    const freshToken = await googleAdsService.ensureFreshToken(campaign.adAccount);

    const insights = await googleAdsService.getCampaignMetrics(
      freshToken,
      campaign.adAccount.accountId,
      campaign.platformCampaignId,
      { startDate, endDate }
    );

    // Store insights
    for (const row of insights) {
      const date = new Date(row.date);
      await prisma.campaignAnalytics.upsert({
        where: {
          campaignId_date: {
            campaignId: campaign.id,
            date,
          },
        },
        update: {
          impressions: row.impressions,
          clicks: row.clicks,
          spend: row.costMicros / 1000000,
          conversions: row.conversions,
          revenue: row.conversionValue,
          ctr: row.impressions > 0 ? (row.clicks / row.impressions) * 100 : 0,
          cpc: row.clicks > 0 ? (row.costMicros / 1000000) / row.clicks : 0,
          cpm: row.impressions > 0 ? ((row.costMicros / 1000000) / row.impressions) * 1000 : 0,
          reach: row.impressions,
        },
        create: {
          campaignId: campaign.id,
          date,
          impressions: row.impressions,
          clicks: row.clicks,
          spend: row.costMicros / 1000000,
          conversions: row.conversions,
          revenue: row.conversionValue,
          ctr: row.impressions > 0 ? (row.clicks / row.impressions) * 100 : 0,
          cpc: row.clicks > 0 ? (row.costMicros / 1000000) / row.clicks : 0,
          cpm: row.impressions > 0 ? ((row.costMicros / 1000000) / row.impressions) * 1000 : 0,
          reach: row.impressions,
        },
      });
    }

    res.json({ insights, stored: insights.length });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
