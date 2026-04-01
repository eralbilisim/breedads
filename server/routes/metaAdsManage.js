const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const metaAdsService = require('../services/metaAds');

const router = express.Router();
const prisma = new PrismaClient();
router.use(authenticate);

// POST /api/meta/ads-manage
router.post('/', async (req, res, next) => {
  try {
    const { adId } = req.body;
    const ad = await prisma.ad.findUnique({
      where: { id: adId },
      include: { adSet: { include: { campaign: { include: { adAccount: true } } } } },
    });
    if (!ad || ad.adSet.campaign.userId !== req.user.id) {
      return res.status(404).json({ error: 'Ad not found.' });
    }
    if (!ad.adSet.platformAdSetId) {
      return res.status(400).json({ error: 'Ad set not published to Meta.' });
    }
    const result = await metaAdsService.createAd(ad.adSet.campaign.adAccount, {
      ...ad, platformAdSetId: ad.adSet.platformAdSetId,
    });
    const updated = await prisma.ad.update({
      where: { id: adId },
      data: { platformAdId: result.id, status: 'ACTIVE' },
    });
    res.json(updated);
  } catch (err) { next(err); }
});

// PUT /api/meta/ads-manage/:id/status
router.put('/:id/status', async (req, res, next) => {
  try {
    const ad = await prisma.ad.findUnique({
      where: { id: req.params.id },
      include: { adSet: { include: { campaign: { include: { adAccount: true } } } } },
    });
    if (!ad || ad.adSet.campaign.userId !== req.user.id) {
      return res.status(404).json({ error: 'Ad not found.' });
    }
    if (!ad.platformAdId) {
      return res.status(400).json({ error: 'Ad not published to Meta.' });
    }
    const { status } = req.body;
    await metaAdsService.updateAd(ad.adSet.campaign.adAccount, ad.platformAdId, { status });
    const updated = await prisma.ad.update({
      where: { id: req.params.id },
      data: { status: status === 'ACTIVE' ? 'ACTIVE' : 'PAUSED' },
    });
    res.json(updated);
  } catch (err) { next(err); }
});

// DELETE /api/meta/ads-manage/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const ad = await prisma.ad.findUnique({
      where: { id: req.params.id },
      include: { adSet: { include: { campaign: { include: { adAccount: true } } } } },
    });
    if (!ad || ad.adSet.campaign.userId !== req.user.id) {
      return res.status(404).json({ error: 'Ad not found.' });
    }
    if (ad.platformAdId) {
      await metaAdsService.deleteAd(ad.adSet.campaign.adAccount, ad.platformAdId);
    }
    await prisma.ad.delete({ where: { id: req.params.id } });
    res.json({ message: 'Ad deleted.' });
  } catch (err) { next(err); }
});

// GET /api/meta/ads-manage/:id/insights
router.get('/:id/insights', async (req, res, next) => {
  try {
    const ad = await prisma.ad.findUnique({
      where: { id: req.params.id },
      include: { adSet: { include: { campaign: { include: { adAccount: true } } } } },
    });
    if (!ad || ad.adSet.campaign.userId !== req.user.id) {
      return res.status(404).json({ error: 'Ad not found.' });
    }
    if (!ad.platformAdId) {
      return res.status(400).json({ error: 'Ad not published to Meta.' });
    }
    const { startDate, endDate } = req.query;
    const insights = await metaAdsService.getAdInsights(
      ad.adSet.campaign.adAccount, ad.platformAdId, { startDate, endDate }
    );
    res.json({ insights });
  } catch (err) { next(err); }
});

module.exports = router;
