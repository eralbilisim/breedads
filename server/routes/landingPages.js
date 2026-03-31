const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticate, optionalAuth } = require('../middleware/auth');
const aiService = require('../services/ai');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/landing-pages/preview/:slug - public, no auth required
router.get('/preview/:slug', async (req, res, next) => {
  try {
    const page = await prisma.landingPage.findUnique({
      where: { slug: req.params.slug },
    });
    if (!page) {
      return res.status(404).json({ error: 'Landing page not found.' });
    }

    // Increment visits
    await prisma.landingPage.update({
      where: { id: page.id },
      data: { visits: { increment: 1 } },
    });

    // Return the HTML directly if it exists
    if (page.html) {
      const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${page.name}</title>
  <style>${page.css || ''}</style>
</head>
<body>
  ${page.html}
  <script>
    // Conversion tracking
    document.querySelectorAll('[data-conversion]').forEach(el => {
      el.addEventListener('click', () => {
        fetch('/api/landing-pages/${page.id}/convert', { method: 'POST' });
      });
    });
  </script>
</body>
</html>`;
      return res.type('html').send(fullHtml);
    }

    res.json(page);
  } catch (err) {
    next(err);
  }
});

// Conversion tracking endpoint (public)
router.post('/:id/convert', async (req, res, next) => {
  try {
    const page = await prisma.landingPage.findUnique({
      where: { id: req.params.id },
    });
    if (!page) {
      return res.status(404).json({ error: 'Landing page not found.' });
    }

    const newConversions = page.conversions + 1;
    const newRate = page.visits > 0 ? (newConversions / page.visits) * 100 : 0;

    await prisma.landingPage.update({
      where: { id: page.id },
      data: {
        conversions: newConversions,
        conversionRate: newRate,
      },
    });

    res.json({ message: 'Conversion tracked.' });
  } catch (err) {
    next(err);
  }
});

// All remaining routes require auth
router.use(authenticate);

// GET /api/landing-pages
router.get('/', async (req, res, next) => {
  try {
    const { isPublished, search, page = 1, limit = 20 } = req.query;
    const where = { userId: req.user.id };

    if (isPublished !== undefined) where.isPublished = isPublished === 'true';
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [pages, total] = await Promise.all([
      prisma.landingPage.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          slug: true,
          isPublished: true,
          aiGenerated: true,
          visits: true,
          conversions: true,
          conversionRate: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.landingPage.count({ where }),
    ]);

    res.json({
      pages,
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

// GET /api/landing-pages/:id
router.get('/:id', async (req, res, next) => {
  try {
    const page = await prisma.landingPage.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!page) {
      return res.status(404).json({ error: 'Landing page not found.' });
    }
    res.json(page);
  } catch (err) {
    next(err);
  }
});

// POST /api/landing-pages
router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('Page name is required'),
    body('slug').trim().notEmpty().withMessage('URL slug is required')
      .matches(/^[a-z0-9-]+$/).withMessage('Slug must contain only lowercase letters, numbers, and hyphens'),
    body('content').optional().isObject(),
    body('html').optional().trim(),
    body('css').optional().trim(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg, errors: errors.array() });
      }

      const { name, slug, content, html, css } = req.body;

      // Check slug uniqueness
      const existingSlug = await prisma.landingPage.findUnique({ where: { slug } });
      if (existingSlug) {
        return res.status(409).json({ error: 'This URL slug is already in use.' });
      }

      const page = await prisma.landingPage.create({
        data: {
          userId: req.user.id,
          name,
          slug,
          content: content || {},
          html: html || null,
          css: css || null,
        },
      });

      res.status(201).json(page);
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/landing-pages/:id
router.put(
  '/:id',
  [
    body('name').optional().trim().notEmpty(),
    body('slug').optional().trim().matches(/^[a-z0-9-]+$/),
    body('content').optional().isObject(),
    body('html').optional().trim(),
    body('css').optional().trim(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg, errors: errors.array() });
      }

      const existing = await prisma.landingPage.findFirst({
        where: { id: req.params.id, userId: req.user.id },
      });
      if (!existing) {
        return res.status(404).json({ error: 'Landing page not found.' });
      }

      const { name, slug, content, html, css } = req.body;
      const updateData = {};

      if (name !== undefined) updateData.name = name;
      if (slug !== undefined) {
        // Check slug uniqueness
        const existingSlug = await prisma.landingPage.findFirst({
          where: { slug, id: { not: req.params.id } },
        });
        if (existingSlug) {
          return res.status(409).json({ error: 'This URL slug is already in use.' });
        }
        updateData.slug = slug;
      }
      if (content !== undefined) updateData.content = content;
      if (html !== undefined) updateData.html = html;
      if (css !== undefined) updateData.css = css;

      const page = await prisma.landingPage.update({
        where: { id: req.params.id },
        data: updateData,
      });

      res.json(page);
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/landing-pages/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const existing = await prisma.landingPage.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Landing page not found.' });
    }

    await prisma.landingPage.delete({ where: { id: req.params.id } });
    res.json({ message: 'Landing page deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

// POST /api/landing-pages/generate - AI-generate a landing page
router.post(
  '/generate',
  [
    body('prompt').trim().notEmpty().withMessage('Prompt is required'),
    body('name').optional().trim(),
    body('style').optional().trim(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg, errors: errors.array() });
      }

      const { prompt, name, style } = req.body;

      const result = await aiService.generateLandingPage(prompt, { style });

      // Generate a slug from the name or prompt
      const baseName = name || prompt.substring(0, 40);
      const slug = baseName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        + '-' + Date.now().toString(36);

      const page = await prisma.landingPage.create({
        data: {
          userId: req.user.id,
          name: name || `AI Page - ${prompt.substring(0, 30)}`,
          slug,
          content: { prompt, style, generatedAt: new Date().toISOString() },
          html: result.html,
          css: result.css,
          aiGenerated: true,
          prompt,
        },
      });

      res.status(201).json(page);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/landing-pages/:id/publish
router.post('/:id/publish', async (req, res, next) => {
  try {
    const existing = await prisma.landingPage.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Landing page not found.' });
    }

    const page = await prisma.landingPage.update({
      where: { id: req.params.id },
      data: { isPublished: true },
    });

    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3001}`;

    res.json({
      ...page,
      publicUrl: `${baseUrl}/api/landing-pages/preview/${page.slug}`,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/landing-pages/:id/analytics
router.get('/:id/analytics', async (req, res, next) => {
  try {
    const page = await prisma.landingPage.findFirst({
      where: { id: req.params.id, userId: req.user.id },
      select: {
        id: true,
        name: true,
        slug: true,
        visits: true,
        conversions: true,
        conversionRate: true,
        isPublished: true,
        createdAt: true,
      },
    });
    if (!page) {
      return res.status(404).json({ error: 'Landing page not found.' });
    }

    res.json({
      ...page,
      conversionRate: page.visits > 0 ? (page.conversions / page.visits) * 100 : 0,
      bounceRate: page.visits > 0 ? Math.max(0, 100 - (page.conversions / page.visits) * 100 * 2) : 0,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
