const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const { authenticate } = require('../middleware/auth');
const aiService = require('../services/ai');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticate);

// GET /api/competitors
router.get('/', async (req, res, next) => {
  try {
    const { platform, search, page = 1, limit = 20 } = req.query;
    const where = { userId: req.user.id };

    if (platform) where.platform = platform;
    if (search) {
      where.competitorName = { contains: search, mode: 'insensitive' };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [reports, total] = await Promise.all([
      prisma.competitorReport.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.competitorReport.count({ where }),
    ]);

    res.json({
      reports,
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
});

// GET /api/competitors/:id
router.get('/:id', async (req, res, next) => {
  try {
    const report = await prisma.competitorReport.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!report) {
      return res.status(404).json({ error: 'Competitor report not found.' });
    }
    res.json(report);
  } catch (err) {
    next(err);
  }
});

// POST /api/competitors/research
router.post(
  '/research',
  [
    body('competitorName').trim().notEmpty().withMessage('Competitor name is required'),
    body('platform').isIn(['META', 'GOOGLE']).withMessage('Platform must be META or GOOGLE'),
    body('domain').optional().trim(),
    body('country').optional().trim(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg, errors: errors.array() });
      }

      const { competitorName, platform, domain, country = 'US' } = req.body;

      let adsData = { ads: [], totalCount: 0 };
      let topCreatives = [];

      if (platform === 'META') {
        // Query Meta Ad Library API
        try {
          const metaToken = process.env.META_AD_LIBRARY_TOKEN || process.env.META_APP_ID;
          const adLibraryUrl = 'https://graph.facebook.com/v21.0/ads_archive';
          const response = await axios.get(adLibraryUrl, {
            params: {
              access_token: metaToken,
              search_terms: competitorName,
              ad_reached_countries: country,
              ad_type: 'ALL',
              fields: 'id,ad_creation_time,ad_creative_bodies,ad_creative_link_captions,ad_creative_link_titles,ad_delivery_start_time,ad_delivery_stop_time,page_id,page_name,impressions,spend',
              limit: 50,
            },
          });

          const rawAds = response.data?.data || [];
          adsData = {
            ads: rawAds.map(ad => ({
              id: ad.id,
              createdAt: ad.ad_creation_time,
              body: ad.ad_creative_bodies?.[0] || '',
              caption: ad.ad_creative_link_captions?.[0] || '',
              title: ad.ad_creative_link_titles?.[0] || '',
              startDate: ad.ad_delivery_start_time,
              endDate: ad.ad_delivery_stop_time,
              pageId: ad.page_id,
              pageName: ad.page_name,
              impressions: ad.impressions,
              spend: ad.spend,
            })),
            totalCount: rawAds.length,
          };

          topCreatives = rawAds.slice(0, 5).map(ad => ({
            title: ad.ad_creative_link_titles?.[0] || 'Untitled',
            body: ad.ad_creative_bodies?.[0] || '',
            caption: ad.ad_creative_link_captions?.[0] || '',
          }));
        } catch (apiErr) {
          console.error('Meta Ad Library API error:', apiErr.message);
          adsData = {
            ads: [],
            totalCount: 0,
            error: 'Could not fetch from Meta Ad Library. Token may be missing or invalid.',
          };
        }
      } else if (platform === 'GOOGLE') {
        // Use Google Ads Transparency Center (public scraping approach)
        try {
          const transparencyUrl = `https://adstransparency.google.com/anji/advertiser/${encodeURIComponent(competitorName)}`;
          adsData = {
            ads: [],
            totalCount: 0,
            source: 'google_transparency',
            searchUrl: transparencyUrl,
            note: 'Google Ads Transparency API requires manual integration. Search URL provided for reference.',
          };
        } catch (apiErr) {
          console.error('Google Transparency error:', apiErr.message);
          adsData = { ads: [], totalCount: 0, error: apiErr.message };
        }
      }

      const report = await prisma.competitorReport.create({
        data: {
          userId: req.user.id,
          competitorName,
          platform,
          domain: domain || null,
          data: adsData,
          adCount: adsData.totalCount,
          topCreatives: topCreatives.length > 0 ? topCreatives : null,
        },
      });

      res.status(201).json(report);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/competitors/:id/analyze
router.post('/:id/analyze', async (req, res, next) => {
  try {
    const report = await prisma.competitorReport.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!report) {
      return res.status(404).json({ error: 'Competitor report not found.' });
    }

    const analysis = await aiService.analyzeCompetitor({
      competitorName: report.competitorName,
      platform: report.platform,
      domain: report.domain,
      adCount: report.adCount,
      topCreatives: report.topCreatives,
      adsData: report.data,
    });

    const updated = await prisma.competitorReport.update({
      where: { id: report.id },
      data: {
        aiAnalysis: analysis,
        insights: {
          analyzedAt: new Date().toISOString(),
          summary: analysis.substring(0, 200),
        },
      },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/competitors/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const report = await prisma.competitorReport.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!report) {
      return res.status(404).json({ error: 'Competitor report not found.' });
    }

    await prisma.competitorReport.delete({ where: { id: req.params.id } });
    res.json({ message: 'Competitor report deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
