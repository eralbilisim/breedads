const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticate);

// GET /api/notifications
router.get('/', async (req, res, next) => {
  try {
    const { isRead, type, page = 1, limit = 30 } = req.query;
    const where = { userId: req.user.id };

    if (isRead !== undefined) where.isRead = isRead === 'true';
    if (type) where.type = type;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: { userId: req.user.id, isRead: false },
      }),
    ]);

    res.json({
      notifications,
      unreadCount,
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

// PUT /api/notifications/read-all  (must be before /:id routes)
router.put('/read-all', async (req, res, next) => {
  try {
    const result = await prisma.notification.updateMany({
      where: { userId: req.user.id, isRead: false },
      data: { isRead: true },
    });

    res.json({ message: `Marked ${result.count} notifications as read.`, count: result.count });
  } catch (err) {
    next(err);
  }
});

// PUT /api/notifications/:id/read
router.put('/:id/read', async (req, res, next) => {
  try {
    const notification = await prisma.notification.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found.' });
    }

    const updated = await prisma.notification.update({
      where: { id: req.params.id },
      data: { isRead: true },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/notifications/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const notification = await prisma.notification.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found.' });
    }

    await prisma.notification.delete({ where: { id: req.params.id } });
    res.json({ message: 'Notification deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
