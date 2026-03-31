const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const aiService = require('../services/ai');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticate);

// GET /api/analytics/dashboard
router.get('/dashboard', async (req, res, next) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Get all campaigns for user
    const campaigns = await prisma.campaign.findMany({
      where: { userId: req.user.id },
      select: { id: true },
    });
    const campaignIds = campaigns.map(c => c.id);

    if (campaignIds.length === 0) {
      return res.json({
        totalSpend: 0,
        totalImpressions: 0,
        totalClicks: 0,
        totalConversions: 0,
        totalRevenue: 0,
        roas: 0,
        ctr: 0,
        cpc: 0,
        cpm: 0,
        activeCampaigns: 0,
        totalCampaigns: 0,
      });
    }

    const analytics = await prisma.campaignAnalytics.findMany({
      where: {
        campaignId: { in: campaignIds },
        date: { gte: startDate },
      },
    });

    const totals = analytics.reduce(
      (acc, row) => {
        acc.impressions += row.impressions;
        acc.clicks += row.clicks;
        acc.spend += row.spend;
        acc.conversions += row.conversions;
        acc.revenue += row.revenue;
        acc.reach += row.reach;
        return acc;
      },
      { impressions: 0, clicks: 0, spend: 0, conversions: 0, revenue: 0, reach: 0 }
    );

    const activeCampaigns = await prisma.campaign.count({
      where: { userId: req.user.id, status: 'ACTIVE' },
    });
    const totalCampaigns = campaignIds.length;

    res.json({
      totalSpend: Math.round(totals.spend * 100) / 100,
      totalImpressions: totals.impressions,
      totalClicks: totals.clicks,
      totalConversions: totals.conversions,
      totalRevenue: Math.round(totals.revenue * 100) / 100,
      totalReach: totals.reach,
      roas: totals.spend > 0 ? Math.round((totals.revenue / totals.spend) * 100) / 100 : 0,
      ctr: totals.impressions > 0 ? Math.round((totals.clicks / totals.impressions) * 10000) / 100 : 0,
      cpc: totals.clicks > 0 ? Math.round((totals.spend / totals.clicks) * 100) / 100 : 0,
      cpm: totals.impressions > 0 ? Math.round(((totals.spend / totals.impressions) * 1000) * 100) / 100 : 0,
      activeCampaigns,
      totalCampaigns,
      period: parseInt(days),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/platform-comparison
router.get('/platform-comparison', async (req, res, next) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const campaignsByPlatform = await prisma.campaign.findMany({
      where: { userId: req.user.id },
      select: { id: true, platform: true },
    });

    const platforms = {};
    for (const platform of ['META', 'GOOGLE']) {
      const ids = campaignsByPlatform
        .filter(c => c.platform === platform)
        .map(c => c.id);

      if (ids.length === 0) {
        platforms[platform] = {
          campaigns: 0,
          spend: 0,
          impressions: 0,
          clicks: 0,
          conversions: 0,
          revenue: 0,
          ctr: 0,
          cpc: 0,
          roas: 0,
        };
        continue;
      }

      const analytics = await prisma.campaignAnalytics.findMany({
        where: {
          campaignId: { in: ids },
          date: { gte: startDate },
        },
      });

      const totals = analytics.reduce(
        (acc, row) => {
          acc.impressions += row.impressions;
          acc.clicks += row.clicks;
          acc.spend += row.spend;
          acc.conversions += row.conversions;
          acc.revenue += row.revenue;
          return acc;
        },
        { impressions: 0, clicks: 0, spend: 0, conversions: 0, revenue: 0 }
      );

      platforms[platform] = {
        campaigns: ids.length,
        spend: Math.round(totals.spend * 100) / 100,
        impressions: totals.impressions,
        clicks: totals.clicks,
        conversions: totals.conversions,
        revenue: Math.round(totals.revenue * 100) / 100,
        ctr: totals.impressions > 0 ? Math.round((totals.clicks / totals.impressions) * 10000) / 100 : 0,
        cpc: totals.clicks > 0 ? Math.round((totals.spend / totals.clicks) * 100) / 100 : 0,
        roas: totals.spend > 0 ? Math.round((totals.revenue / totals.spend) * 100) / 100 : 0,
      };
    }

    res.json(platforms);
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/trends
router.get('/trends', async (req, res, next) => {
  try {
    const { days = 30, metric = 'spend', platform } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const campaignWhere = { userId: req.user.id };
    if (platform) campaignWhere.platform = platform;

    const campaigns = await prisma.campaign.findMany({
      where: campaignWhere,
      select: { id: true },
    });
    const campaignIds = campaigns.map(c => c.id);

    if (campaignIds.length === 0) {
      return res.json({ trends: [] });
    }

    const analytics = await prisma.campaignAnalytics.findMany({
      where: {
        campaignId: { in: campaignIds },
        date: { gte: startDate },
      },
      orderBy: { date: 'asc' },
    });

    // Group by date
    const grouped = {};
    for (const row of analytics) {
      const dateKey = row.date.toISOString().slice(0, 10);
      if (!grouped[dateKey]) {
        grouped[dateKey] = {
          date: dateKey,
          spend: 0,
          impressions: 0,
          clicks: 0,
          conversions: 0,
          revenue: 0,
          reach: 0,
        };
      }
      grouped[dateKey].spend += row.spend;
      grouped[dateKey].impressions += row.impressions;
      grouped[dateKey].clicks += row.clicks;
      grouped[dateKey].conversions += row.conversions;
      grouped[dateKey].revenue += row.revenue;
      grouped[dateKey].reach += row.reach;
    }

    // Calculate derived metrics
    const trends = Object.values(grouped).map(day => ({
      ...day,
      spend: Math.round(day.spend * 100) / 100,
      revenue: Math.round(day.revenue * 100) / 100,
      ctr: day.impressions > 0 ? Math.round((day.clicks / day.impressions) * 10000) / 100 : 0,
      cpc: day.clicks > 0 ? Math.round((day.spend / day.clicks) * 100) / 100 : 0,
      roas: day.spend > 0 ? Math.round((day.revenue / day.spend) * 100) / 100 : 0,
    }));

    res.json({ trends });
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/top-campaigns
router.get('/top-campaigns', async (req, res, next) => {
  try {
    const { days = 30, sortBy = 'roas', limit = 10, platform } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const campaignWhere = { userId: req.user.id };
    if (platform) campaignWhere.platform = platform;

    const campaigns = await prisma.campaign.findMany({
      where: campaignWhere,
      include: {
        analytics: {
          where: { date: { gte: startDate } },
        },
        adAccount: {
          select: { id: true, platform: true, accountName: true },
        },
      },
    });

    const ranked = campaigns.map(campaign => {
      const totals = campaign.analytics.reduce(
        (acc, row) => {
          acc.impressions += row.impressions;
          acc.clicks += row.clicks;
          acc.spend += row.spend;
          acc.conversions += row.conversions;
          acc.revenue += row.revenue;
          return acc;
        },
        { impressions: 0, clicks: 0, spend: 0, conversions: 0, revenue: 0 }
      );

      return {
        id: campaign.id,
        name: campaign.name,
        platform: campaign.platform,
        status: campaign.status,
        objective: campaign.objective,
        adAccount: campaign.adAccount,
        ...totals,
        spend: Math.round(totals.spend * 100) / 100,
        revenue: Math.round(totals.revenue * 100) / 100,
        ctr: totals.impressions > 0 ? Math.round((totals.clicks / totals.impressions) * 10000) / 100 : 0,
        cpc: totals.clicks > 0 ? Math.round((totals.spend / totals.clicks) * 100) / 100 : 0,
        roas: totals.spend > 0 ? Math.round((totals.revenue / totals.spend) * 100) / 100 : 0,
      };
    });

    // Sort
    const validSorts = ['roas', 'spend', 'conversions', 'clicks', 'impressions', 'revenue', 'ctr'];
    const sortKey = validSorts.includes(sortBy) ? sortBy : 'roas';
    ranked.sort((a, b) => b[sortKey] - a[sortKey]);

    res.json(ranked.slice(0, parseInt(limit)));
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/ai-insights
router.get('/ai-insights', async (req, res, next) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const campaigns = await prisma.campaign.findMany({
      where: { userId: req.user.id },
      include: {
        analytics: {
          where: { date: { gte: startDate } },
          orderBy: { date: 'asc' },
        },
        adAccount: { select: { platform: true, accountName: true } },
      },
    });

    if (campaigns.length === 0) {
      return res.json({
        insights: 'No campaigns found. Create your first campaign to receive AI-powered insights.',
        recommendations: [],
      });
    }

    // Build performance summary for AI
    const performanceSummary = campaigns.map(c => {
      const totals = c.analytics.reduce(
        (acc, row) => {
          acc.spend += row.spend;
          acc.impressions += row.impressions;
          acc.clicks += row.clicks;
          acc.conversions += row.conversions;
          acc.revenue += row.revenue;
          return acc;
        },
        { spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0 }
      );

      return {
        name: c.name,
        platform: c.platform,
        status: c.status,
        objective: c.objective,
        budget: c.budget,
        ...totals,
        roas: totals.spend > 0 ? totals.revenue / totals.spend : 0,
        ctr: totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0,
        cpc: totals.clicks > 0 ? totals.spend / totals.clicks : 0,
        daysWithData: c.analytics.length,
      };
    });

    const analysis = await aiService.analyzePerformance(performanceSummary);

    res.json(analysis);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
