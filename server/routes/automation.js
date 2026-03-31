const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const automationService = require('../services/automation');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticate);

// GET /api/automation - list all automation rules
router.get('/', async (req, res, next) => {
  try {
    const { isActive, campaignId } = req.query;
    const where = { userId: req.user.id };

    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (campaignId) where.campaignId = campaignId;

    const rules = await prisma.automationRule.findMany({
      where,
      include: {
        campaign: { select: { id: true, name: true, platform: true, status: true } },
        _count: { select: { logs: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(rules);
  } catch (err) {
    next(err);
  }
});

// GET /api/automation/:id
router.get('/:id', async (req, res, next) => {
  try {
    const rule = await prisma.automationRule.findFirst({
      where: { id: req.params.id, userId: req.user.id },
      include: {
        campaign: { select: { id: true, name: true, platform: true, status: true } },
        logs: {
          orderBy: { executedAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!rule) {
      return res.status(404).json({ error: 'Automation rule not found.' });
    }

    res.json(rule);
  } catch (err) {
    next(err);
  }
});

// POST /api/automation - create a rule
router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('Rule name is required'),
    body('description').optional().trim(),
    body('campaignId').optional(),
    body('triggerType').isIn([
      'PERFORMANCE_THRESHOLD', 'SCHEDULE', 'BUDGET_LIMIT',
      'TIME_BASED', 'AI_RECOMMENDATION', 'METRIC_CHANGE',
    ]).withMessage('Valid trigger type is required'),
    body('triggerCondition').isObject().withMessage('Trigger condition is required'),
    body('actionType').isIn([
      'PAUSE_CAMPAIGN', 'RESUME_CAMPAIGN', 'ADJUST_BUDGET',
      'ADJUST_BID', 'SEND_NOTIFICATION', 'CHANGE_STATUS',
      'DUPLICATE_CAMPAIGN', 'AI_OPTIMIZE',
    ]).withMessage('Valid action type is required'),
    body('actionConfig').isObject().withMessage('Action config is required'),
    body('schedule').optional().trim(),
    body('isActive').optional().isBoolean(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg, errors: errors.array() });
      }

      const { name, description, campaignId, triggerType, triggerCondition, actionType, actionConfig, schedule, isActive } = req.body;

      // Verify campaign belongs to user if provided
      if (campaignId) {
        const campaign = await prisma.campaign.findFirst({
          where: { id: campaignId, userId: req.user.id },
        });
        if (!campaign) {
          return res.status(404).json({ error: 'Campaign not found.' });
        }
      }

      const rule = await prisma.automationRule.create({
        data: {
          userId: req.user.id,
          campaignId: campaignId || null,
          name,
          description: description || null,
          triggerType,
          triggerCondition,
          actionType,
          actionConfig,
          schedule: schedule || null,
          isActive: isActive !== undefined ? isActive : true,
        },
        include: {
          campaign: { select: { id: true, name: true, platform: true } },
        },
      });

      res.status(201).json(rule);
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/automation/:id
router.put(
  '/:id',
  [
    body('name').optional().trim().notEmpty(),
    body('description').optional().trim(),
    body('campaignId').optional(),
    body('triggerType').optional().isIn([
      'PERFORMANCE_THRESHOLD', 'SCHEDULE', 'BUDGET_LIMIT',
      'TIME_BASED', 'AI_RECOMMENDATION', 'METRIC_CHANGE',
    ]),
    body('triggerCondition').optional().isObject(),
    body('actionType').optional().isIn([
      'PAUSE_CAMPAIGN', 'RESUME_CAMPAIGN', 'ADJUST_BUDGET',
      'ADJUST_BID', 'SEND_NOTIFICATION', 'CHANGE_STATUS',
      'DUPLICATE_CAMPAIGN', 'AI_OPTIMIZE',
    ]),
    body('actionConfig').optional().isObject(),
    body('schedule').optional().trim(),
    body('isActive').optional().isBoolean(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg, errors: errors.array() });
      }

      const existing = await prisma.automationRule.findFirst({
        where: { id: req.params.id, userId: req.user.id },
      });
      if (!existing) {
        return res.status(404).json({ error: 'Automation rule not found.' });
      }

      const { name, description, campaignId, triggerType, triggerCondition, actionType, actionConfig, schedule, isActive } = req.body;
      const updateData = {};

      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (campaignId !== undefined) updateData.campaignId = campaignId || null;
      if (triggerType !== undefined) updateData.triggerType = triggerType;
      if (triggerCondition !== undefined) updateData.triggerCondition = triggerCondition;
      if (actionType !== undefined) updateData.actionType = actionType;
      if (actionConfig !== undefined) updateData.actionConfig = actionConfig;
      if (schedule !== undefined) updateData.schedule = schedule;
      if (isActive !== undefined) updateData.isActive = isActive;

      const rule = await prisma.automationRule.update({
        where: { id: req.params.id },
        data: updateData,
        include: {
          campaign: { select: { id: true, name: true, platform: true } },
        },
      });

      res.json(rule);
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/automation/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const existing = await prisma.automationRule.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Automation rule not found.' });
    }

    await prisma.automationRule.delete({ where: { id: req.params.id } });
    res.json({ message: 'Automation rule deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

// POST /api/automation/:id/execute - manually run an automation
router.post('/:id/execute', async (req, res, next) => {
  try {
    const rule = await prisma.automationRule.findFirst({
      where: { id: req.params.id, userId: req.user.id },
      include: {
        campaign: { include: { adAccount: true, analytics: { orderBy: { date: 'desc' }, take: 7 } } },
      },
    });
    if (!rule) {
      return res.status(404).json({ error: 'Automation rule not found.' });
    }

    const result = await automationService.executeRule(rule);

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/automation/:id/logs
router.get('/:id/logs', async (req, res, next) => {
  try {
    const rule = await prisma.automationRule.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!rule) {
      return res.status(404).json({ error: 'Automation rule not found.' });
    }

    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [logs, total] = await Promise.all([
      prisma.automationLog.findMany({
        where: { automationId: rule.id },
        orderBy: { executedAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.automationLog.count({ where: { automationId: rule.id } }),
    ]);

    res.json({
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
