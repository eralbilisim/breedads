const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticate);

// GET /api/ads?adSetId=xxx
router.get('/', async (req, res, next) => {
  try {
    const { adSetId } = req.query;
    if (!adSetId) {
      return res.status(400).json({ error: 'adSetId query parameter is required.' });
    }

    // Verify ownership through the chain
    const adSet = await prisma.adSet.findUnique({
      where: { id: adSetId },
      include: {
        campaign: { select: { userId: true } },
      },
    });
    if (!adSet || adSet.campaign.userId !== req.user.id) {
      return res.status(404).json({ error: 'Ad set not found.' });
    }

    const ads = await prisma.ad.findMany({
      where: { adSetId },
      include: {
        analytics: {
          orderBy: { date: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(ads);
  } catch (err) {
    next(err);
  }
});

// GET /api/ads/:id
router.get('/:id', async (req, res, next) => {
  try {
    const ad = await prisma.ad.findUnique({
      where: { id: req.params.id },
      include: {
        adSet: {
          include: {
            campaign: { select: { id: true, name: true, userId: true, platform: true } },
          },
        },
        analytics: {
          orderBy: { date: 'desc' },
          take: 30,
        },
      },
    });

    if (!ad || ad.adSet.campaign.userId !== req.user.id) {
      return res.status(404).json({ error: 'Ad not found.' });
    }

    res.json(ad);
  } catch (err) {
    next(err);
  }
});

// POST /api/ads
router.post(
  '/',
  [
    body('adSetId').notEmpty().withMessage('Ad set ID is required'),
    body('name').trim().notEmpty().withMessage('Ad name is required'),
    body('format').isIn([
      'IMAGE', 'VIDEO', 'CAROUSEL', 'COLLECTION', 'STORIES',
      'RESPONSIVE_SEARCH', 'RESPONSIVE_DISPLAY', 'PERFORMANCE_MAX', 'TEXT',
    ]).withMessage('Valid ad format is required'),
    body('headline').optional().trim(),
    body('description').optional().trim(),
    body('primaryText').optional().trim(),
    body('callToAction').optional().trim(),
    body('destinationUrl').optional().trim(),
    body('imageUrl').optional().trim(),
    body('videoUrl').optional().trim(),
    body('creativeData').optional().isObject(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg, errors: errors.array() });
      }

      const { adSetId, name, format, headline, description, primaryText, callToAction, destinationUrl, imageUrl, videoUrl, creativeData } = req.body;

      // Verify ownership
      const adSet = await prisma.adSet.findUnique({
        where: { id: adSetId },
        include: { campaign: { select: { userId: true } } },
      });
      if (!adSet || adSet.campaign.userId !== req.user.id) {
        return res.status(404).json({ error: 'Ad set not found.' });
      }

      const ad = await prisma.ad.create({
        data: {
          adSetId,
          name,
          format,
          headline: headline || null,
          description: description || null,
          primaryText: primaryText || null,
          callToAction: callToAction || null,
          destinationUrl: destinationUrl || null,
          imageUrl: imageUrl || null,
          videoUrl: videoUrl || null,
          creativeData: creativeData || null,
        },
        include: {
          adSet: {
            select: { id: true, name: true, campaignId: true },
          },
        },
      });

      res.status(201).json(ad);
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/ads/:id
router.put(
  '/:id',
  [
    body('name').optional().trim().notEmpty(),
    body('status').optional().isIn(['DRAFT', 'PENDING', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED', 'ERROR']),
    body('format').optional().isIn([
      'IMAGE', 'VIDEO', 'CAROUSEL', 'COLLECTION', 'STORIES',
      'RESPONSIVE_SEARCH', 'RESPONSIVE_DISPLAY', 'PERFORMANCE_MAX', 'TEXT',
    ]),
    body('headline').optional().trim(),
    body('description').optional().trim(),
    body('primaryText').optional().trim(),
    body('callToAction').optional().trim(),
    body('destinationUrl').optional().trim(),
    body('imageUrl').optional().trim(),
    body('videoUrl').optional().trim(),
    body('creativeData').optional().isObject(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg, errors: errors.array() });
      }

      const ad = await prisma.ad.findUnique({
        where: { id: req.params.id },
        include: {
          adSet: { include: { campaign: { select: { userId: true } } } },
        },
      });

      if (!ad || ad.adSet.campaign.userId !== req.user.id) {
        return res.status(404).json({ error: 'Ad not found.' });
      }

      const { name, status, format, headline, description, primaryText, callToAction, destinationUrl, imageUrl, videoUrl, creativeData } = req.body;
      const updateData = {};

      if (name !== undefined) updateData.name = name;
      if (status !== undefined) updateData.status = status;
      if (format !== undefined) updateData.format = format;
      if (headline !== undefined) updateData.headline = headline;
      if (description !== undefined) updateData.description = description;
      if (primaryText !== undefined) updateData.primaryText = primaryText;
      if (callToAction !== undefined) updateData.callToAction = callToAction;
      if (destinationUrl !== undefined) updateData.destinationUrl = destinationUrl;
      if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
      if (videoUrl !== undefined) updateData.videoUrl = videoUrl;
      if (creativeData !== undefined) updateData.creativeData = creativeData;

      const updated = await prisma.ad.update({
        where: { id: req.params.id },
        data: updateData,
        include: {
          adSet: { select: { id: true, name: true, campaignId: true } },
        },
      });

      res.json(updated);
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/ads/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const ad = await prisma.ad.findUnique({
      where: { id: req.params.id },
      include: {
        adSet: { include: { campaign: { select: { userId: true } } } },
      },
    });

    if (!ad || ad.adSet.campaign.userId !== req.user.id) {
      return res.status(404).json({ error: 'Ad not found.' });
    }

    await prisma.ad.delete({ where: { id: req.params.id } });
    res.json({ message: 'Ad deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
