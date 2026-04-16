const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const metaAdsService = require('../services/metaAds');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticate);

async function getMetaConfig() {
  try {
    const settings = await prisma.appSettings.findUnique({ where: { id: 'app_settings' } });
    return {
      appId: settings?.metaAppId || process.env.META_APP_ID,
      appSecret: settings?.metaAppSecret || process.env.META_APP_SECRET,
      redirectUri: settings?.metaRedirectUri || process.env.META_REDIRECT_URI || 'http://localhost:3001/api/meta/callback',
    };
  } catch {
    return {
      appId: process.env.META_APP_ID,
      appSecret: process.env.META_APP_SECRET,
      redirectUri: process.env.META_REDIRECT_URI || 'http://localhost:3001/api/meta/callback',
    };
  }
}

// GET /api/meta/auth-url
router.get('/auth-url', async (req, res) => {
  const config = await getMetaConfig();
  const scopes = [
    'ads_management',
    'ads_read',
    'business_management',
    'pages_show_list',
    'pages_read_engagement',
    'pages_manage_ads',
  ].join(',');
  const authUrl = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${config.appId}&redirect_uri=${encodeURIComponent(config.redirectUri)}&scope=${scopes}&response_type=code&state=${req.user.id}`;
  res.json({ authUrl });
});

// GET /api/meta/callback
router.get('/callback', async (req, res, next) => {
  try {
    const { code, state: userId } = req.query;

    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required.' });
    }

    // Exchange code for access token
    const config = await getMetaConfig();
    const tokenData = await metaAdsService.exchangeCodeForToken(code, config.redirectUri);

    // Get long-lived token
    const longLivedToken = await metaAdsService.getLongLivedToken(tokenData.access_token);

    // Get ad accounts and pages in parallel
    const [accounts, pages] = await Promise.all([
      metaAdsService.getAdAccounts(longLivedToken.access_token),
      metaAdsService.getPages(longLivedToken.access_token).catch((err) => {
        console.error('[meta] getPages failed:', err.response?.data?.error?.message || err.message);
        return [];
      }),
    ]);

    // Default page = first page the user administers. Users with multiple
    // pages can later change it via a page picker (future UI).
    const defaultPage = pages[0] || null;

    // Save each ad account
    const savedAccounts = [];
    for (const account of accounts) {
      const tokenExpiresAt = longLivedToken.expires_in
        ? new Date(Date.now() + longLivedToken.expires_in * 1000)
        : null;

      const saved = await prisma.adAccount.upsert({
        where: {
          platform_accountId: {
            platform: 'META',
            accountId: account.id,
          },
        },
        update: {
          accessToken: longLivedToken.access_token,
          tokenExpiresAt,
          accountName: account.name,
          isActive: true,
          pageId: defaultPage?.id || undefined,
          pageName: defaultPage?.name || undefined,
          pageAccessToken: defaultPage?.access_token || undefined,
        },
        create: {
          userId: userId || req.user.id,
          platform: 'META',
          accountId: account.id,
          accountName: account.name,
          accessToken: longLivedToken.access_token,
          tokenExpiresAt,
          currency: account.currency || 'USD',
          timezone: account.timezone_name || 'UTC',
          pageId: defaultPage?.id || null,
          pageName: defaultPage?.name || null,
          pageAccessToken: defaultPage?.access_token || null,
        },
      });
      savedAccounts.push(saved);
    }

    await prisma.notification.create({
      data: {
        userId: userId || req.user.id,
        title: 'Meta Ads Connected',
        message: `Successfully connected ${savedAccounts.length} Meta ad account(s).`,
        type: 'SUCCESS',
      },
    });

    // Redirect to frontend
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    res.redirect(`${clientUrl}/settings?meta=connected`);
  } catch (err) {
    next(err);
  }
});

// GET /api/meta/accounts
router.get('/accounts', async (req, res, next) => {
  try {
    const accounts = await prisma.adAccount.findMany({
      where: { userId: req.user.id, platform: 'META' },
      select: {
        id: true,
        accountId: true,
        accountName: true,
        isActive: true,
        currency: true,
        timezone: true,
        tokenExpiresAt: true,
        pageId: true,
        pageName: true,
        createdAt: true,
      },
    });

    res.json(accounts);
  } catch (err) {
    next(err);
  }
});

// POST /api/meta/accounts/:id/refresh-pages
// Refetches the connected user's Facebook Pages and updates this ad
// account's default page. Useful for accounts connected before the
// page field existed or when the user adds a new page.
router.post('/accounts/:id/refresh-pages', async (req, res, next) => {
  try {
    const adAccount = await prisma.adAccount.findFirst({
      where: { id: req.params.id, userId: req.user.id, platform: 'META' },
    });
    if (!adAccount) return res.status(404).json({ error: 'Ad account not found.' });

    const pages = await metaAdsService.getPages(adAccount.accessToken);
    const { pageId: preferred } = req.body || {};
    const chosen = preferred
      ? pages.find((p) => p.id === preferred) || pages[0]
      : pages[0];

    if (!chosen) {
      return res.status(400).json({
        error: 'No Facebook Page found. Make sure the connected user administers at least one page and the Meta app has pages_show_list / pages_read_engagement permissions.',
        pages: [],
      });
    }

    const updated = await prisma.adAccount.update({
      where: { id: adAccount.id },
      data: {
        pageId: chosen.id,
        pageName: chosen.name,
        pageAccessToken: chosen.access_token || null,
      },
      select: { id: true, pageId: true, pageName: true },
    });

    res.json({ account: updated, pages });
  } catch (err) {
    next(err);
  }
});

// POST /api/meta/sync
router.post('/sync', async (req, res, next) => {
  try {
    const { accountId } = req.body;

    const adAccount = await prisma.adAccount.findFirst({
      where: { id: accountId, userId: req.user.id, platform: 'META' },
    });
    if (!adAccount) {
      return res.status(404).json({ error: 'Meta ad account not found.' });
    }

    const remoteCampaigns = await metaAdsService.getCampaigns(adAccount);
    const synced = [];

    for (const remote of remoteCampaigns) {
      const objectiveMap = {
        OUTCOME_AWARENESS: 'AWARENESS',
        OUTCOME_TRAFFIC: 'TRAFFIC',
        OUTCOME_ENGAGEMENT: 'ENGAGEMENT',
        OUTCOME_LEADS: 'LEADS',
        OUTCOME_APP_PROMOTION: 'APP_PROMOTION',
        OUTCOME_SALES: 'SALES',
      };
      const statusMap = {
        ACTIVE: 'ACTIVE',
        PAUSED: 'PAUSED',
        DELETED: 'ARCHIVED',
        ARCHIVED: 'ARCHIVED',
      };

      const campaign = await prisma.campaign.upsert({
        where: {
          id: remote.localId || `meta-sync-${remote.id}`,
        },
        update: {
          name: remote.name,
          status: statusMap[remote.status] || 'ACTIVE',
          budget: parseFloat(remote.daily_budget || remote.lifetime_budget || 0) / 100,
          budgetType: remote.daily_budget ? 'DAILY' : 'LIFETIME',
        },
        create: {
          userId: req.user.id,
          adAccountId: adAccount.id,
          platform: 'META',
          platformCampaignId: remote.id,
          name: remote.name,
          objective: objectiveMap[remote.objective] || 'AWARENESS',
          status: statusMap[remote.status] || 'ACTIVE',
          budget: parseFloat(remote.daily_budget || remote.lifetime_budget || 0) / 100,
          budgetType: remote.daily_budget ? 'DAILY' : 'LIFETIME',
          startDate: remote.start_time ? new Date(remote.start_time) : null,
          endDate: remote.stop_time ? new Date(remote.stop_time) : null,
        },
      });
      synced.push(campaign);
    }

    await prisma.notification.create({
      data: {
        userId: req.user.id,
        title: 'Meta Sync Complete',
        message: `Synced ${synced.length} campaigns from Meta Ads.`,
        type: 'SUCCESS',
      },
    });

    res.json({ synced: synced.length, campaigns: synced });
  } catch (err) {
    next(err);
  }
});

// POST /api/meta/campaigns/:id/publish
router.post('/campaigns/:id/publish', async (req, res, next) => {
  try {
    const campaign = await prisma.campaign.findFirst({
      where: { id: req.params.id, userId: req.user.id, platform: 'META' },
      include: {
        adAccount: true,
        adSets: { include: { ads: true } },
      },
    });
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found.' });
    }

    const result = await metaAdsService.createCampaign(campaign.adAccount, campaign);

    // Publish ad sets
    for (const adSet of campaign.adSets) {
      const adSetResult = await metaAdsService.createAdSet(campaign.adAccount, {
        ...adSet,
        platformCampaignId: result.platformCampaignId,
      });

      await prisma.adSet.update({
        where: { id: adSet.id },
        data: { platformAdSetId: adSetResult.id, status: 'ACTIVE' },
      });

      // Publish ads within ad set
      for (const ad of adSet.ads) {
        const adResult = await metaAdsService.createAd(campaign.adAccount, {
          ...ad,
          platformAdSetId: adSetResult.id,
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

// POST /api/meta/campaigns/:id/update
router.post('/campaigns/:id/update', async (req, res, next) => {
  try {
    const campaign = await prisma.campaign.findFirst({
      where: { id: req.params.id, userId: req.user.id, platform: 'META' },
      include: { adAccount: true },
    });
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found.' });
    }
    if (!campaign.platformCampaignId) {
      return res.status(400).json({ error: 'Campaign has not been published to Meta yet.' });
    }

    await metaAdsService.updateCampaign(campaign.adAccount, campaign.platformCampaignId, {
      name: campaign.name,
      status: campaign.status === 'ACTIVE' ? 'ACTIVE' : 'PAUSED',
      daily_budget: campaign.budgetType === 'DAILY' ? Math.round(campaign.budget * 100) : undefined,
      lifetime_budget: campaign.budgetType === 'LIFETIME' ? Math.round(campaign.budget * 100) : undefined,
    });

    res.json({ message: 'Campaign updated on Meta.' });
  } catch (err) {
    next(err);
  }
});

// GET /api/meta/insights/:campaignId
router.get('/insights/:campaignId', async (req, res, next) => {
  try {
    const campaign = await prisma.campaign.findFirst({
      where: { id: req.params.campaignId, userId: req.user.id, platform: 'META' },
      include: { adAccount: true },
    });
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found.' });
    }
    if (!campaign.platformCampaignId) {
      return res.status(400).json({ error: 'Campaign has not been published to Meta.' });
    }

    const { startDate, endDate } = req.query;
    const insights = await metaAdsService.getCampaignInsights(
      campaign.adAccount,
      campaign.platformCampaignId,
      {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      }
    );

    // Store insights in our analytics table
    for (const row of insights) {
      const date = new Date(row.date_start);
      await prisma.campaignAnalytics.upsert({
        where: {
          campaignId_date: {
            campaignId: campaign.id,
            date,
          },
        },
        update: {
          impressions: parseInt(row.impressions || 0),
          clicks: parseInt(row.clicks || 0),
          spend: parseFloat(row.spend || 0),
          conversions: parseInt(row.actions?.find(a => a.action_type === 'offsite_conversion')?.value || 0),
          revenue: parseFloat(row.action_values?.find(a => a.action_type === 'offsite_conversion')?.value || 0),
          ctr: parseFloat(row.ctr || 0),
          cpc: parseFloat(row.cpc || 0),
          cpm: parseFloat(row.cpm || 0),
          reach: parseInt(row.reach || 0),
          frequency: parseFloat(row.frequency || 0),
        },
        create: {
          campaignId: campaign.id,
          date,
          impressions: parseInt(row.impressions || 0),
          clicks: parseInt(row.clicks || 0),
          spend: parseFloat(row.spend || 0),
          conversions: parseInt(row.actions?.find(a => a.action_type === 'offsite_conversion')?.value || 0),
          revenue: parseFloat(row.action_values?.find(a => a.action_type === 'offsite_conversion')?.value || 0),
          ctr: parseFloat(row.ctr || 0),
          cpc: parseFloat(row.cpc || 0),
          cpm: parseFloat(row.cpm || 0),
          reach: parseInt(row.reach || 0),
          frequency: parseFloat(row.frequency || 0),
        },
      });
    }

    res.json({ insights, stored: insights.length });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
