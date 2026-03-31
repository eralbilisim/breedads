const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticate, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

const SALT_ROUNDS = 12;
const TOKEN_EXPIRY = '7d';

function generateToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

// POST /api/auth/register
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('company').optional().trim(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg, errors: errors.array() });
      }

      const { email, password, name, company } = req.body;

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return res.status(409).json({ error: 'An account with this email already exists.' });
      }

      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          company: company || null,
        },
        select: {
          id: true,
          email: true,
          name: true,
          company: true,
          role: true,
          createdAt: true,
        },
      });

      const token = generateToken(user.id);

      // Create a welcome notification
      await prisma.notification.create({
        data: {
          userId: user.id,
          title: 'Welcome to BreedAds!',
          message: 'Your account has been created. Connect your ad accounts to get started.',
          type: 'SUCCESS',
        },
      });

      res.status(201).json({ user, token });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg, errors: errors.array() });
      }

      const { email, password } = req.body;

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const token = generateToken(user.id);

      res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          company: user.company,
          avatar: user.avatar,
          role: user.role,
          createdAt: user.createdAt,
        },
        token,
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/auth/me
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        company: true,
        avatar: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        adAccounts: {
          select: {
            id: true,
            platform: true,
            accountId: true,
            accountName: true,
            isActive: true,
            currency: true,
            timezone: true,
          },
        },
        _count: {
          select: {
            campaigns: true,
            automations: true,
            creatives: true,
            landingPages: true,
          },
        },
      },
    });

    res.json(user);
  } catch (err) {
    next(err);
  }
});

// PUT /api/auth/me
router.put(
  '/me',
  authenticate,
  [
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('company').optional().trim(),
    body('avatar').optional().trim(),
    body('currentPassword').optional(),
    body('newPassword').optional().isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg, errors: errors.array() });
      }

      const { name, company, avatar, currentPassword, newPassword } = req.body;
      const updateData = {};

      if (name !== undefined) updateData.name = name;
      if (company !== undefined) updateData.company = company;
      if (avatar !== undefined) updateData.avatar = avatar;

      // Handle password change
      if (newPassword) {
        if (!currentPassword) {
          return res.status(400).json({ error: 'Current password is required to set a new password.' });
        }
        const fullUser = await prisma.user.findUnique({ where: { id: req.user.id } });
        const valid = await bcrypt.compare(currentPassword, fullUser.password);
        if (!valid) {
          return res.status(400).json({ error: 'Current password is incorrect.' });
        }
        updateData.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
      }

      const user = await prisma.user.update({
        where: { id: req.user.id },
        data: updateData,
        select: {
          id: true,
          email: true,
          name: true,
          company: true,
          avatar: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      res.json(user);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
