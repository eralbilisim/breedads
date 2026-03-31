const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const metaAdsService = require('../services/metaAds');
const googleAdsService = require('../services/googleAds');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticate);

// GET /api/campaigns - list all campaigns with filters
router.get(
  '/',
  [
    query('platform').optional().isIn(['META', 'GOOGLE']),
    query('status').optional().isIn(['DRAFT', 'PENDING', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED', 'ERROR']),
    query('search').optional().trim(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('sort').optional().isIn(['createdAt', 'updatedAt', 'name', 'budget', 'status']),
    query('order').optional().isIn(['asc', 'desc']),
  ],
  async (req, res, next) => {
    try {
      const { platform, status, search, page = 1, limit = 20, sort = 'createdAt', order = 'desc' } = req.query;

      const where = { userId: req.user.id };
      if (platform) where.platform = platform;
      if (status) where.status = status;
      if (search) {
        where.name = { contains: search, mode: 'insensitive' };
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const take = parseInt(limit);

      const [campaigns, total] = await Promise.all([
        prisma.campaign.findMany({
          where,
          skip,
          take,
          orderBy: { [sort]: order },
          include: {
            adAccount: {
              select: { id: true, platform: true, accountName: true },
            },
            _count: {
              select: { adSets: true, analytics: true },
            },
            analytics: {
              orderBy: { date: 'desc' },
              take: 1,
            },
          },
        }),
        prisma.campaign.count({ where }),
      ]);

      res.json({
        campaigns,
        pagination: {
          page: parseInt(page),
          limit: take,
          total,
          totalPages: Math.ceil(total / take),
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/campaigns/:id
router.get('/:id', async (req, res, next) => {
  try {
    const campaign = await prisma.campaign.findFirst({
      where: { id: req.params.id, userId: req.user.id },
      include: {
        adAccount: {
          select: { id: true, platform: true, accountName: true, accountId: true },
        },
        adSets: {
          include: {
            ads: true,
            _count: { select: { ads: true } },
          },
        },
        analytics: {
          orderBy: { date: 'desc' },
          take: 30,
        },
      },
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found.' });
    }

    res.json(campaign);
  } catch (err) {
    next(err);
  }
});

// POST /api/campaigns
router.post(
  '/',
  [
    body('adAccountId').notEmpty().withMessage('Ad account is required'),
    body('name').trim().notEmpty().withMessage('Campaign name is required'),
    body('objective').isIn([
      'AWARENESS', 'TRAFFIC', 'ENGAGEMENT', 'LEADS',
      'APP_PROMOTION', 'SALES', 'CONVERSIONS', 'VIDEO_VIEWS',
      'MESSAGES', 'STORE_TRAFFIC',
    ]).withMessage('Valid campaign objective is required'),
    body('budget').isFloat({ min: 0.01 }).withMessage('Budget must be greater than 0'),
    body('budgetType').optional().isIn(['DAILY', 'LIFETIME']),
    body('startDate').optional().isISO8601(),
    body('endDate').optional().isISO8601(),
    body('targeting').optional().isObject(),
    body('settings').optional().isObject(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg, errors: errors.array() });
      }

      const { adAccountId, name, objective, budget, budgetType, startDate, endDate, targeting, settings } = req.body;

      // Verify ad account belongs to user
      const adAccount = await prisma.adAccount.findFirst({
        where: { id: adAccountId, userId: req.user.id },
      });
      if (!adAccount) {
        return res.status(404).json({ error: 'Ad account not found.' });
      }

      const campaign = await prisma.campaign.create({
        data: {
          userId: req.user.id,
          adAccountId,
          platform: adAccount.platform,
          name,
          objective,
          budget: parseFloat(budget),
          budgetType: budgetType || 'DAILY',
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
          targeting: targeting || null,
          settings: settings || null,
        },
        include: {
          adAccount: {
            select: { id: true, platform: true, accountName: true },
          },
        },
      });

      res.status(201).json(campaign);
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/campaigns/:id
router.put(
  '/:id',
  [
    body('name').optional().trim().notEmpty(),
    body('objective').optional().isIn([
      'AWARENESS', 'TRAFFIC', 'ENGAGEMENT', 'LEADS',
      'APP_PROMOTION', 'SALES', 'CONVERSIONS', 'VIDEO_VIEWS',
      'MESSAGES', 'STORE_TRAFFIC',
    ]),
    body('budget').optional().isFloat({ min: 0.01 }),
    body('budgetType').optional().isIn(['DAILY', 'LIFETIME']),
    body('startDate').optional().isISO8601(),
    body('endDate').optional().isISO8601(),
    body('targeting').optional().isObject(),
    body('settings').optional().isObject(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg, errors: errors.array() });
      }

      const existing = await prisma.campaign.findFirst({
        where: { id: req.params.id, userId: req.user.id },
      });
      if (!existing) {
        return res.status(404).json({ error: 'Campaign not found.' });
      }

      const { name, objective, budget, budgetType, startDate, endDate, targeting, settings, status } = req.body;
      const updateData = {};

      if (name !== undefined) updateData.name = name;
      if (objective !== undefined) updateData.objective = objective;
      if (budget !== undefined) updateData.budget = parseFloat(budget);
      if (budgetType !== undefined) updateData.budgetType = budgetType;
      if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null;
      if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;
      if (targeting !== undefined) updateData.targeting = targeting;
      if (settings !== undefined) updateData.settings = settings;
      if (status !== undefined) updateData.status = status;

      const campaign = await prisma.campaign.update({
        where: { id: req.params.id },
        data: updateData,
        include: {
          adAccount: {
            select: { id: true, platform: true, accountName: true },
          },
          adSets: {
            include: { ads: true },
          },
        },
      });

      res.json(campaign);
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/campaigns/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const existing = await prisma.campaign.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Campaign not found.' });
    }

    await prisma.campaign.delete({ where: { id: req.params.id } });
    res.json({ message: 'Campaign deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

// POST /api/campaigns/:id/publish
router.post('/:id/publish', async (req, res, next) => {
  try {
    const campaign = await prisma.campaign.findFirst({
      where: { id: req.params.id, userId: req.user.id },
      include: {
        adAccount: true,
        adSets: { include: { ads: true } },
      },
    });
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found.' });
    }

    if (campaign.adSets.length === 0) {
      return res.status(400).json({ error: 'Campaign must have at least one ad set before publishing.' });
    }

    let result;
    try {
      if (campaign.platform === 'META') {
        result = await metaAdsService.createCampaign(campaign.adAccount, campaign);
      } else if (campaign.platform === 'GOOGLE') {
        result = await googleAdsService.createCampaign(campaign.adAccount, campaign);
      }
    } catch (platformErr) {
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: { status: 'ERROR' },
      });

      await prisma.notification.create({
        data: {
          userId: req.user.id,
          title: 'Campaign Publish Failed',
          message: `Failed to publish "${campaign.name}": ${platformErr.message}`,
          type: 'ERROR',
          data: { campaignId: campaign.id },
        },
      });

      return res.status(500).json({ error: `Failed to publish to ${campaign.platform}: ${platformErr.message}` });
    }

    const updated = await prisma.campaign.update({
      where: { id: campaign.id },
      data: {
        status: 'ACTIVE',
        platformCampaignId: result?.platformCampaignId || null,
      },
      include: {
        adAccount: { select: { id: true, platform: true, accountName: true } },
      },
    });

    await prisma.notification.create({
      data: {
        userId: req.user.id,
        title: 'Campaign Published',
        message: `"${campaign.name}" is now live on ${campaign.platform}.`,
        type: 'SUCCESS',
        data: { campaignId: campaign.id },
      },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// POST /api/campaigns/:id/pause
router.post('/:id/pause', async (req, res, next) => {
  try {
    const campaign = await prisma.campaign.findFirst({
      where: { id: req.params.id, userId: req.user.id },
      include: { adAccount: true },
    });
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found.' });
    }

    if (campaign.platformCampaignId) {
      try {
        if (campaign.platform === 'META') {
          await metaAdsService.pauseCampaign(campaign.adAccount, campaign.platformCampaignId);
        } else if (campaign.platform === 'GOOGLE') {
          await googleAdsService.pauseCampaign(campaign.adAccount, campaign.platformCampaignId);
        }
      } catch (platformErr) {
        console.error('Platform pause error:', platformErr.message);
      }
    }

    const updated = await prisma.campaign.update({
      where: { id: campaign.id },
      data: { status: 'PAUSED' },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// POST /api/campaigns/:id/resume
router.post('/:id/resume', async (req, res, next) => {
  try {
    const campaign = await prisma.campaign.findFirst({
      where: { id: req.params.id, userId: req.user.id },
      include: { adAccount: true },
    });
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found.' });
    }

    if (campaign.platformCampaignId) {
      try {
        if (campaign.platform === 'META') {
          await metaAdsService.resumeCampaign(campaign.adAccount, campaign.platformCampaignId);
        } else if (campaign.platform === 'GOOGLE') {
          await googleAdsService.resumeCampaign(campaign.adAccount, campaign.platformCampaignId);
        }
      } catch (platformErr) {
        console.error('Platform resume error:', platformErr.message);
      }
    }

    const updated = await prisma.campaign.update({
      where: { id: campaign.id },
      data: { status: 'ACTIVE' },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// GET /api/campaigns/:id/analytics
router.get('/:id/analytics', async (req, res, next) => {
  try {
    const campaign = await prisma.campaign.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found.' });
    }

    const { startDate, endDate } = req.query;
    const where = { campaignId: campaign.id };
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const analytics = await prisma.campaignAnalytics.findMany({
      where,
      orderBy: { date: 'asc' },
    });

    // Compute summary
    const summary = analytics.reduce(
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

    summary.ctr = summary.impressions > 0 ? (summary.clicks / summary.impressions) * 100 : 0;
    summary.cpc = summary.clicks > 0 ? summary.spend / summary.clicks : 0;
    summary.cpm = summary.impressions > 0 ? (summary.spend / summary.impressions) * 1000 : 0;
    summary.roas = summary.spend > 0 ? summary.revenue / summary.spend : 0;

    res.json({ summary, daily: analytics });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
