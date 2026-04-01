const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const metaAdsService = require('../services/metaAds');

const router = express.Router();
const prisma = new PrismaClient();
router.use(authenticate);

// GET /api/meta/adsets/:campaignId
router.get('/:campaignId', async (req, res, next) => {
  try {
    const campaign = await prisma.campaign.findFirst({
      where: { id: req.params.campaignId, userId: req.user.id, platform: 'META' },
      include: { adAccount: true },
    });
    if (!campaign || !campaign.platformCampaignId) {
      return res.status(404).json({ error: 'Campaign not found or not published.' });
    }
    const adSets = await metaAdsService.getAdSets(campaign.adAccount, campaign.platformCampaignId);
    res.json(adSets);
  } catch (err) { next(err); }
});

// POST /api/meta/adsets
router.post('/', async (req, res, next) => {
  try {
    const { adSetId } = req.body;
    const adSet = await prisma.adSet.findUnique({
      where: { id: adSetId },
      include: { campaign: { include: { adAccount: true } } },
    });
    if (!adSet || adSet.campaign.userId !== req.user.id) {
      return res.status(404).json({ error: 'Ad set not found.' });
    }
    if (!adSet.campaign.platformCampaignId) {
      return res.status(400).json({ error: 'Campaign not published to Meta yet.' });
    }
    const result = await metaAdsService.createAdSet(adSet.campaign.adAccount, {
      ...adSet, platformCampaignId: adSet.campaign.platformCampaignId,
    });
    const updated = await prisma.adSet.update({
      where: { id: adSetId },
      data: { platformAdSetId: result.id, status: 'ACTIVE' },
    });
    res.json(updated);
  } catch (err) { next(err); }
});

// PUT /api/meta/adsets/:id
router.put('/:id', async (req, res, next) => {
  try {
    const adSet = await prisma.adSet.findUnique({
      where: { id: req.params.id },
      include: { campaign: { include: { adAccount: true } } },
    });
    if (!adSet || adSet.campaign.userId !== req.user.id) {
      return res.status(404).json({ error: 'Ad set not found.' });
    }
    if (!adSet.platformAdSetId) {
      return res.status(400).json({ error: 'Ad set not published to Meta.' });
    }
    const updates = {};
    const { name, status, budget, bidAmount } = req.body;
    if (name) updates.name = name;
    if (status) updates.status = status === 'ACTIVE' ? 'ACTIVE' : 'PAUSED';
    if (budget) updates.daily_budget = Math.round(budget * 100);
    if (bidAmount) updates.bid_amount = Math.round(bidAmount * 100);

    await metaAdsService.updateAdSet(adSet.campaign.adAccount, adSet.platformAdSetId, updates);
    const updateData = {};
    if (name) updateData.name = name;
    if (status) updateData.status = status;
    if (budget) updateData.budget = parseFloat(budget);
    if (bidAmount) updateData.bidAmount = parseFloat(bidAmount);
    const updated = await prisma.adSet.update({ where: { id: req.params.id }, data: updateData });
    res.json(updated);
  } catch (err) { next(err); }
});

// DELETE /api/meta/adsets/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const adSet = await prisma.adSet.findUnique({
      where: { id: req.params.id },
      include: { campaign: { include: { adAccount: true } } },
    });
    if (!adSet || adSet.campaign.userId !== req.user.id) {
      return res.status(404).json({ error: 'Ad set not found.' });
    }
    if (adSet.platformAdSetId) {
      await metaAdsService.deleteAdSet(adSet.campaign.adAccount, adSet.platformAdSetId);
    }
    await prisma.adSet.delete({ where: { id: req.params.id } });
    res.json({ message: 'Ad set deleted.' });
  } catch (err) { next(err); }
});

module.exports = router;
