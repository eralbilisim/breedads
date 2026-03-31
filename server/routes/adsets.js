const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticate);

// GET /api/adsets?campaignId=xxx
router.get('/', async (req, res, next) => {
  try {
    const { campaignId } = req.query;
    if (!campaignId) {
      return res.status(400).json({ error: 'campaignId query parameter is required.' });
    }

    // Verify campaign belongs to user
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, userId: req.user.id },
    });
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found.' });
    }

    const adSets = await prisma.adSet.findMany({
      where: { campaignId },
      include: {
        ads: true,
        _count: { select: { ads: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(adSets);
  } catch (err) {
    next(err);
  }
});

// GET /api/adsets/:id
router.get('/:id', async (req, res, next) => {
  try {
    const adSet = await prisma.adSet.findUnique({
      where: { id: req.params.id },
      include: {
        campaign: {
          select: { id: true, name: true, userId: true, platform: true },
        },
        ads: true,
      },
    });

    if (!adSet || adSet.campaign.userId !== req.user.id) {
      return res.status(404).json({ error: 'Ad set not found.' });
    }

    res.json(adSet);
  } catch (err) {
    next(err);
  }
});

// POST /api/adsets
router.post(
  '/',
  [
    body('campaignId').notEmpty().withMessage('Campaign ID is required'),
    body('name').trim().notEmpty().withMessage('Ad set name is required'),
    body('budget').optional().isFloat({ min: 0 }),
    body('bidAmount').optional().isFloat({ min: 0 }),
    body('bidStrategy').optional().trim(),
    body('targeting').optional().isObject(),
    body('placements').optional().isObject(),
    body('schedule').optional().isObject(),
    body('optimizationGoal').optional().trim(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg, errors: errors.array() });
      }

      const { campaignId, name, budget, bidAmount, bidStrategy, targeting, placements, schedule, optimizationGoal } = req.body;

      const campaign = await prisma.campaign.findFirst({
        where: { id: campaignId, userId: req.user.id },
      });
      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found.' });
      }

      const adSet = await prisma.adSet.create({
        data: {
          campaignId,
          name,
          budget: budget ? parseFloat(budget) : null,
          bidAmount: bidAmount ? parseFloat(bidAmount) : null,
          bidStrategy: bidStrategy || null,
          targeting: targeting || null,
          placements: placements || null,
          schedule: schedule || null,
          optimizationGoal: optimizationGoal || null,
        },
        include: {
          campaign: { select: { id: true, name: true, platform: true } },
        },
      });

      res.status(201).json(adSet);
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/adsets/:id
router.put(
  '/:id',
  [
    body('name').optional().trim().notEmpty(),
    body('status').optional().isIn(['DRAFT', 'PENDING', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED', 'ERROR']),
    body('budget').optional().isFloat({ min: 0 }),
    body('bidAmount').optional().isFloat({ min: 0 }),
    body('bidStrategy').optional().trim(),
    body('targeting').optional().isObject(),
    body('placements').optional().isObject(),
    body('schedule').optional().isObject(),
    body('optimizationGoal').optional().trim(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg, errors: errors.array() });
      }

      const adSet = await prisma.adSet.findUnique({
        where: { id: req.params.id },
        include: {
          campaign: { select: { userId: true } },
        },
      });

      if (!adSet || adSet.campaign.userId !== req.user.id) {
        return res.status(404).json({ error: 'Ad set not found.' });
      }

      const { name, status, budget, bidAmount, bidStrategy, targeting, placements, schedule, optimizationGoal } = req.body;
      const updateData = {};

      if (name !== undefined) updateData.name = name;
      if (status !== undefined) updateData.status = status;
      if (budget !== undefined) updateData.budget = parseFloat(budget);
      if (bidAmount !== undefined) updateData.bidAmount = parseFloat(bidAmount);
      if (bidStrategy !== undefined) updateData.bidStrategy = bidStrategy;
      if (targeting !== undefined) updateData.targeting = targeting;
      if (placements !== undefined) updateData.placements = placements;
      if (schedule !== undefined) updateData.schedule = schedule;
      if (optimizationGoal !== undefined) updateData.optimizationGoal = optimizationGoal;

      const updated = await prisma.adSet.update({
        where: { id: req.params.id },
        data: updateData,
        include: {
          ads: true,
          campaign: { select: { id: true, name: true, platform: true } },
        },
      });

      res.json(updated);
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/adsets/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const adSet = await prisma.adSet.findUnique({
      where: { id: req.params.id },
      include: {
        campaign: { select: { userId: true } },
      },
    });

    if (!adSet || adSet.campaign.userId !== req.user.id) {
      return res.status(404).json({ error: 'Ad set not found.' });
    }

    await prisma.adSet.delete({ where: { id: req.params.id } });
    res.json({ message: 'Ad set deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
