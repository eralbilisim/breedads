const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const axios = require('axios');

const META_API_BASE = 'https://graph.facebook.com/v21.0';
const router = express.Router();
const prisma = new PrismaClient();
router.use(authenticate);

// GET /api/meta/audiences/:accountId
router.get('/:accountId', async (req, res, next) => {
  try {
    const adAccount = await prisma.adAccount.findFirst({
      where: { id: req.params.accountId, userId: req.user.id, platform: 'META' },
    });
    if (!adAccount) return res.status(404).json({ error: 'Ad account not found.' });

    const response = await axios.get(`${META_API_BASE}/act_${adAccount.accountId}/customaudiences`, {
      params: {
        access_token: adAccount.accessToken,
        fields: 'id,name,description,approximate_count,subtype,time_created,delivery_status',
        limit: 100,
      },
    });
    res.json(response.data.data || []);
  } catch (err) { next(err); }
});

// POST /api/meta/audiences/:accountId
router.post('/:accountId', async (req, res, next) => {
  try {
    const adAccount = await prisma.adAccount.findFirst({
      where: { id: req.params.accountId, userId: req.user.id, platform: 'META' },
    });
    if (!adAccount) return res.status(404).json({ error: 'Ad account not found.' });

    const { name, description, subtype, rule } = req.body;
    const params = {
      access_token: adAccount.accessToken,
      name,
      description: description || '',
      subtype: subtype || 'CUSTOM',
    };
    if (rule) params.rule = JSON.stringify(rule);

    const response = await axios.post(`${META_API_BASE}/act_${adAccount.accountId}/customaudiences`, null, { params });
    res.json(response.data);
  } catch (err) { next(err); }
});

// POST /api/meta/audiences/:accountId/lookalike
router.post('/:accountId/lookalike', async (req, res, next) => {
  try {
    const adAccount = await prisma.adAccount.findFirst({
      where: { id: req.params.accountId, userId: req.user.id, platform: 'META' },
    });
    if (!adAccount) return res.status(404).json({ error: 'Ad account not found.' });

    const { name, sourceAudienceId, country, ratio } = req.body;
    const response = await axios.post(`${META_API_BASE}/act_${adAccount.accountId}/customaudiences`, null, {
      params: {
        access_token: adAccount.accessToken,
        name,
        subtype: 'LOOKALIKE',
        origin_audience_id: sourceAudienceId,
        lookalike_spec: JSON.stringify({ type: 'similarity', country, ratio: ratio || 0.01 }),
      },
    });
    res.json(response.data);
  } catch (err) { next(err); }
});

// DELETE /api/meta/audiences/:accountId/:audienceId
router.delete('/:accountId/:audienceId', async (req, res, next) => {
  try {
    const adAccount = await prisma.adAccount.findFirst({
      where: { id: req.params.accountId, userId: req.user.id, platform: 'META' },
    });
    if (!adAccount) return res.status(404).json({ error: 'Ad account not found.' });

    await axios.delete(`${META_API_BASE}/${req.params.audienceId}`, {
      params: { access_token: adAccount.accessToken },
    });
    res.json({ message: 'Audience deleted.' });
  } catch (err) { next(err); }
});

// GET /api/meta/audiences/:accountId/targeting-search
router.get('/:accountId/targeting-search', async (req, res, next) => {
  try {
    const adAccount = await prisma.adAccount.findFirst({
      where: { id: req.params.accountId, userId: req.user.id, platform: 'META' },
    });
    if (!adAccount) return res.status(404).json({ error: 'Ad account not found.' });

    const { q, type } = req.query;
    const response = await axios.get(`${META_API_BASE}/search`, {
      params: { access_token: adAccount.accessToken, type: type || 'adinterest', q: q || '', limit: 25 },
    });
    res.json(response.data.data || []);
  } catch (err) { next(err); }
});

// GET /api/meta/audiences/:accountId/reach-estimate
router.get('/:accountId/reach-estimate', async (req, res, next) => {
  try {
    const adAccount = await prisma.adAccount.findFirst({
      where: { id: req.params.accountId, userId: req.user.id, platform: 'META' },
    });
    if (!adAccount) return res.status(404).json({ error: 'Ad account not found.' });

    const { targeting_spec } = req.query;
    const response = await axios.get(`${META_API_BASE}/act_${adAccount.accountId}/reachestimate`, {
      params: { access_token: adAccount.accessToken, targeting_spec },
    });
    res.json(response.data.data || response.data);
  } catch (err) { next(err); }
});

module.exports = router;
