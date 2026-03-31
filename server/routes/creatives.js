const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const aiService = require('../services/ai');

const router = express.Router();
const prisma = new PrismaClient();

let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.warn('sharp not available; image resize will be disabled.');
}

router.use(authenticate);

// GET /api/creatives
router.get('/', async (req, res, next) => {
  try {
    const { type, aiGenerated, search, page = 1, limit = 20 } = req.query;
    const where = { userId: req.user.id };

    if (type) where.type = type;
    if (aiGenerated !== undefined) where.aiGenerated = aiGenerated === 'true';
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { tags: { has: search } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [creatives, total] = await Promise.all([
      prisma.creative.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.creative.count({ where }),
    ]);

    res.json({
      creatives,
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

// GET /api/creatives/:id
router.get('/:id', async (req, res, next) => {
  try {
    const creative = await prisma.creative.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!creative) {
      return res.status(404).json({ error: 'Creative not found.' });
    }
    res.json(creative);
  } catch (err) {
    next(err);
  }
});

// POST /api/creatives/generate-image
router.post(
  '/generate-image',
  [
    body('prompt').trim().notEmpty().withMessage('Image prompt is required'),
    body('name').optional().trim(),
    body('size').optional().isIn(['1024x1024', '1792x1024', '1024x1792']),
    body('style').optional().isIn(['vivid', 'natural']),
    body('tags').optional().isArray(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg, errors: errors.array() });
      }

      const { prompt, name, size = '1024x1024', style = 'vivid', tags = [] } = req.body;
      const [width, height] = size.split('x').map(Number);

      const imageResult = await aiService.generateImage(prompt, { size, style });

      const creative = await prisma.creative.create({
        data: {
          userId: req.user.id,
          name: name || `AI Image - ${new Date().toISOString().slice(0, 10)}`,
          type: 'IMAGE',
          format: 'png',
          content: {
            prompt,
            size,
            style,
            revisedPrompt: imageResult.revisedPrompt,
          },
          imageUrl: imageResult.url,
          thumbnailUrl: imageResult.url,
          aiGenerated: true,
          prompt,
          tags,
          width,
          height,
        },
      });

      res.status(201).json(creative);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/creatives/generate-copy
router.post(
  '/generate-copy',
  [
    body('product').trim().notEmpty().withMessage('Product/service description is required'),
    body('platform').optional().isIn(['META', 'GOOGLE']),
    body('objective').optional().trim(),
    body('tone').optional().trim(),
    body('targetAudience').optional().trim(),
    body('count').optional().isInt({ min: 1, max: 10 }),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg, errors: errors.array() });
      }

      const { product, platform, objective, tone, targetAudience, count = 3 } = req.body;

      const copies = await aiService.generateAdCopy({
        product,
        platform: platform || 'META',
        objective: objective || 'CONVERSIONS',
        tone: tone || 'professional',
        targetAudience: targetAudience || 'general',
        count,
      });

      // Save as a creative
      const creative = await prisma.creative.create({
        data: {
          userId: req.user.id,
          name: `Ad Copy - ${product.substring(0, 30)}`,
          type: 'TEXT',
          content: {
            copies,
            params: { product, platform, objective, tone, targetAudience },
          },
          aiGenerated: true,
          prompt: `Generate ad copy for: ${product}`,
          tags: [platform || 'META', 'ad-copy', tone || 'professional'],
        },
      });

      res.status(201).json({ creative, copies });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/creatives/generate-variants
router.post(
  '/generate-variants',
  [
    body('headline').trim().notEmpty().withMessage('Original headline is required'),
    body('description').optional().trim(),
    body('primaryText').optional().trim(),
    body('count').optional().isInt({ min: 2, max: 10 }),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg, errors: errors.array() });
      }

      const { headline, description, primaryText, count = 5 } = req.body;

      const prompt = `You are an expert ad copywriter. Generate ${count} A/B test variants for the following ad:

Headline: ${headline}
${description ? `Description: ${description}` : ''}
${primaryText ? `Primary Text: ${primaryText}` : ''}

For each variant, provide:
- headline (max 40 chars)
- description (max 125 chars)
- primaryText (max 250 chars)
- callToAction suggestion
- rationale (why this variant might perform better)

Return as a JSON array of objects.`;

      const variants = await aiService.generateAdCopy({
        product: headline,
        platform: 'META',
        objective: 'CONVERSIONS',
        tone: 'varied',
        targetAudience: 'general',
        count,
        customPrompt: prompt,
      });

      res.json({ variants, original: { headline, description, primaryText } });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/creatives/resize
router.post(
  '/resize',
  [
    body('imageUrl').trim().notEmpty().withMessage('Image URL is required'),
    body('width').isInt({ min: 1, max: 4096 }).withMessage('Width is required'),
    body('height').isInt({ min: 1, max: 4096 }).withMessage('Height is required'),
    body('format').optional().isIn(['png', 'jpeg', 'webp']),
  ],
  async (req, res, next) => {
    try {
      if (!sharp) {
        return res.status(501).json({ error: 'Image processing is not available.' });
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg, errors: errors.array() });
      }

      const { imageUrl, width, height, format = 'png' } = req.body;

      const axios = require('axios');
      const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      const inputBuffer = Buffer.from(response.data);

      const outputBuffer = await sharp(inputBuffer)
        .resize(parseInt(width), parseInt(height), { fit: 'cover' })
        .toFormat(format)
        .toBuffer();

      const base64 = outputBuffer.toString('base64');
      const dataUri = `data:image/${format};base64,${base64}`;

      res.json({
        dataUri,
        width: parseInt(width),
        height: parseInt(height),
        format,
        size: outputBuffer.length,
      });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/creatives/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const creative = await prisma.creative.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!creative) {
      return res.status(404).json({ error: 'Creative not found.' });
    }

    await prisma.creative.delete({ where: { id: req.params.id } });
    res.json({ message: 'Creative deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
