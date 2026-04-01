const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticate);

// GET /api/settings
router.get('/', async (req, res, next) => {
  try {
    let settings = await prisma.appSettings.findUnique({
      where: { id: 'app_settings' },
    });

    if (!settings) {
      settings = await prisma.appSettings.create({
        data: { id: 'app_settings' },
      });
    }

    const isAdmin = req.user.role === 'ADMIN';

    res.json({
      metaAppId: settings.metaAppId ? (isAdmin ? settings.metaAppId : '****' + (settings.metaAppId?.slice(-4) || '')) : null,
      metaAppSecret: settings.metaAppSecret ? (isAdmin ? settings.metaAppSecret : '••••••••') : null,
      metaRedirectUri: settings.metaRedirectUri || null,
      googleClientId: settings.googleClientId ? (isAdmin ? settings.googleClientId : '****' + (settings.googleClientId?.slice(-4) || '')) : null,
      googleClientSecret: settings.googleClientSecret ? (isAdmin ? settings.googleClientSecret : '••••••••') : null,
      googleDeveloperToken: settings.googleDeveloperToken ? (isAdmin ? settings.googleDeveloperToken : '••••••••') : null,
      googleRedirectUri: settings.googleRedirectUri || null,
      geminiApiKey: settings.geminiApiKey ? (isAdmin ? settings.geminiApiKey : '••••••••') : null,
      configured: {
        meta: !!(settings.metaAppId && settings.metaAppSecret),
        google: !!(settings.googleClientId && settings.googleClientSecret),
        gemini: !!settings.geminiApiKey,
      },
      updatedAt: settings.updatedAt,
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/settings
router.put('/', async (req, res, next) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only admins can update app settings.' });
    }

    const {
      metaAppId, metaAppSecret, metaRedirectUri,
      googleClientId, googleClientSecret, googleDeveloperToken, googleRedirectUri,
      geminiApiKey,
    } = req.body;

    const updateData = { updatedBy: req.user.id };

    if (metaAppId !== undefined) updateData.metaAppId = metaAppId || null;
    if (metaAppSecret !== undefined) updateData.metaAppSecret = metaAppSecret || null;
    if (metaRedirectUri !== undefined) updateData.metaRedirectUri = metaRedirectUri || null;
    if (googleClientId !== undefined) updateData.googleClientId = googleClientId || null;
    if (googleClientSecret !== undefined) updateData.googleClientSecret = googleClientSecret || null;
    if (googleDeveloperToken !== undefined) updateData.googleDeveloperToken = googleDeveloperToken || null;
    if (googleRedirectUri !== undefined) updateData.googleRedirectUri = googleRedirectUri || null;
    if (geminiApiKey !== undefined) updateData.geminiApiKey = geminiApiKey || null;

    const settings = await prisma.appSettings.upsert({
      where: { id: 'app_settings' },
      update: updateData,
      create: { id: 'app_settings', ...updateData },
    });

    // Reset AI client cache when API key changes
    if (geminiApiKey !== undefined) {
      try {
        const aiService = require('../services/ai');
        aiService.resetClient();
      } catch {}
    }

    res.json({ message: 'Settings updated successfully', updatedAt: settings.updatedAt });
  } catch (err) {
    next(err);
  }
});

// POST /api/settings/test
router.post('/test', async (req, res, next) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only admins can test connections.' });
    }

    const { provider } = req.body;
    const settings = await prisma.appSettings.findUnique({ where: { id: 'app_settings' } });

    if (!settings) {
      return res.status(400).json({ error: 'No settings configured.' });
    }

    if (provider === 'meta') {
      if (!settings.metaAppId || !settings.metaAppSecret) {
        return res.json({ success: false, message: 'Meta App ID and Secret are required.' });
      }
      const axios = require('axios');
      try {
        await axios.get('https://graph.facebook.com/v21.0/oauth/access_token', {
          params: {
            client_id: settings.metaAppId,
            client_secret: settings.metaAppSecret,
            grant_type: 'client_credentials',
          },
          timeout: 10000,
        });
        res.json({ success: true, message: 'Meta API connection successful.' });
      } catch (e) {
        res.json({ success: false, message: e.response?.data?.error?.message || 'Meta API connection failed.' });
      }
    } else if (provider === 'gemini') {
      if (!settings.geminiApiKey) {
        return res.json({ success: false, message: 'Gemini API Key is required.' });
      }
      try {
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(settings.geminiApiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        await model.generateContent('Say hello');
        res.json({ success: true, message: 'Gemini API connection successful.' });
      } catch (e) {
        res.json({ success: false, message: 'Gemini API connection failed.' });
      }
    } else {
      res.json({ success: false, message: 'Unknown provider.' });
    }
  } catch (err) {
    next(err);
  }
});

module.exports = router;
