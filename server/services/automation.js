const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Evaluate all active automation rules.
 * Called by the cron job every 15 minutes.
 */
async function evaluateRules() {
  console.log('[Automation] Evaluating rules at', new Date().toISOString());

  try {
    const rules = await prisma.automationRule.findMany({
      where: { isActive: true },
      include: {
        campaign: {
          include: {
            adAccount: true,
            analytics: {
              orderBy: { date: 'desc' },
              take: 7,
            },
          },
        },
        user: { select: { id: true, email: true } },
      },
    });

    console.log(`[Automation] Found ${rules.length} active rules.`);

    for (const rule of rules) {
      try {
        const shouldExecute = await checkTrigger(rule);
        if (shouldExecute) {
          console.log(`[Automation] Trigger met for rule "${rule.name}" (${rule.id})`);
          await executeRule(rule);
        }
      } catch (err) {
        console.error(`[Automation] Error evaluating rule "${rule.name}" (${rule.id}):`, err.message);
        await logExecution(rule.id, rule.actionType, 'ERROR', { error: err.message });
      }
    }
  } catch (err) {
    console.error('[Automation] Fatal error evaluating rules:', err.message);
  }
}

/**
 * Check whether a rule's trigger condition is met.
 */
async function checkTrigger(rule) {
  const condition = rule.triggerCondition;

  switch (rule.triggerType) {
    case 'PERFORMANCE_THRESHOLD': {
      if (!rule.campaign || !rule.campaign.analytics.length) return false;

      const analytics = rule.campaign.analytics;
      const metric = condition.metric; // e.g., 'cpc', 'ctr', 'spend', 'roas'
      const operator = condition.operator; // 'gt', 'lt', 'gte', 'lte', 'eq'
      const threshold = condition.value;

      // Calculate the average of the metric over the analytics window
      const values = analytics.map(a => a[metric]).filter(v => v !== undefined && v !== null);
      if (values.length === 0) return false;

      const avg = values.reduce((sum, v) => sum + v, 0) / values.length;

      switch (operator) {
        case 'gt': return avg > threshold;
        case 'lt': return avg < threshold;
        case 'gte': return avg >= threshold;
        case 'lte': return avg <= threshold;
        case 'eq': return Math.abs(avg - threshold) < 0.01;
        default: return false;
      }
    }

    case 'SCHEDULE': {
      // Check if current time matches the cron-like schedule
      const now = new Date();
      const hour = now.getHours();
      const dayOfWeek = now.getDay();

      if (condition.hours && !condition.hours.includes(hour)) return false;
      if (condition.daysOfWeek && !condition.daysOfWeek.includes(dayOfWeek)) return false;

      return true;
    }

    case 'BUDGET_LIMIT': {
      if (!rule.campaign) return false;

      const campaign = rule.campaign;
      const totalSpend = campaign.analytics.reduce((sum, a) => sum + a.spend, 0);
      const budgetLimit = condition.maxSpend || campaign.budget * (condition.budgetMultiplier || 1);

      return totalSpend >= budgetLimit;
    }

    case 'TIME_BASED': {
      const now = new Date();

      if (condition.afterDate && now < new Date(condition.afterDate)) return false;
      if (condition.beforeDate && now > new Date(condition.beforeDate)) return false;

      // Check minimum interval since last run
      if (condition.minIntervalMinutes && rule.lastRunAt) {
        const minutesSinceLastRun = (now - new Date(rule.lastRunAt)) / 60000;
        if (minutesSinceLastRun < condition.minIntervalMinutes) return false;
      }

      return true;
    }

    case 'AI_RECOMMENDATION': {
      // Only trigger if campaign has enough data and hasn't been optimized recently
      if (!rule.campaign || rule.campaign.analytics.length < 3) return false;

      if (rule.lastRunAt) {
        const hoursSinceLastRun = (Date.now() - new Date(rule.lastRunAt).getTime()) / 3600000;
        if (hoursSinceLastRun < (condition.minHoursBetweenRuns || 24)) return false;
      }

      return true;
    }

    case 'METRIC_CHANGE': {
      if (!rule.campaign || rule.campaign.analytics.length < 2) return false;

      const analytics = rule.campaign.analytics;
      const metric = condition.metric;
      const changePercent = condition.changePercent || 20;
      const direction = condition.direction || 'decrease'; // 'increase' or 'decrease'

      const current = analytics[0][metric];
      const previous = analytics[1][metric];

      if (previous === 0 || previous === null || previous === undefined) return false;

      const percentChange = ((current - previous) / Math.abs(previous)) * 100;

      if (direction === 'decrease' && percentChange <= -changePercent) return true;
      if (direction === 'increase' && percentChange >= changePercent) return true;

      return false;
    }

    default:
      return false;
  }
}

/**
 * Execute a specific automation rule's action.
 */
async function executeRule(rule) {
  const config = rule.actionConfig;
  let result = {};
  let status = 'SUCCESS';

  try {
    switch (rule.actionType) {
      case 'PAUSE_CAMPAIGN': {
        if (!rule.campaign) throw new Error('No campaign associated with this rule.');

        await prisma.campaign.update({
          where: { id: rule.campaign.id },
          data: { status: 'PAUSED' },
        });

        // Try to pause on platform too
        if (rule.campaign.platformCampaignId && rule.campaign.adAccount) {
          try {
            if (rule.campaign.platform === 'META') {
              const metaAds = require('./metaAds');
              await metaAds.pauseCampaign(rule.campaign.adAccount, rule.campaign.platformCampaignId);
            } else if (rule.campaign.platform === 'GOOGLE') {
              const googleAds = require('./googleAds');
              await googleAds.pauseCampaign(rule.campaign.adAccount, rule.campaign.platformCampaignId);
            }
          } catch (platformErr) {
            console.error('[Automation] Platform pause failed:', platformErr.message);
          }
        }

        result = { action: 'paused', campaignId: rule.campaign.id, campaignName: rule.campaign.name };

        await createNotification(rule.userId, {
          title: 'Campaign Auto-Paused',
          message: `"${rule.campaign.name}" was paused by automation rule "${rule.name}".`,
          type: 'AUTOMATION',
          data: { campaignId: rule.campaign.id, ruleId: rule.id },
        });
        break;
      }

      case 'RESUME_CAMPAIGN': {
        if (!rule.campaign) throw new Error('No campaign associated with this rule.');

        await prisma.campaign.update({
          where: { id: rule.campaign.id },
          data: { status: 'ACTIVE' },
        });

        if (rule.campaign.platformCampaignId && rule.campaign.adAccount) {
          try {
            if (rule.campaign.platform === 'META') {
              const metaAds = require('./metaAds');
              await metaAds.resumeCampaign(rule.campaign.adAccount, rule.campaign.platformCampaignId);
            } else if (rule.campaign.platform === 'GOOGLE') {
              const googleAds = require('./googleAds');
              await googleAds.resumeCampaign(rule.campaign.adAccount, rule.campaign.platformCampaignId);
            }
          } catch (platformErr) {
            console.error('[Automation] Platform resume failed:', platformErr.message);
          }
        }

        result = { action: 'resumed', campaignId: rule.campaign.id, campaignName: rule.campaign.name };

        await createNotification(rule.userId, {
          title: 'Campaign Auto-Resumed',
          message: `"${rule.campaign.name}" was resumed by automation rule "${rule.name}".`,
          type: 'AUTOMATION',
          data: { campaignId: rule.campaign.id, ruleId: rule.id },
        });
        break;
      }

      case 'ADJUST_BUDGET': {
        if (!rule.campaign) throw new Error('No campaign associated with this rule.');

        const adjustment = config.adjustmentType || 'percentage'; // 'percentage' or 'absolute'
        let newBudget;

        if (adjustment === 'percentage') {
          const percent = config.adjustmentValue || 10;
          const direction = config.direction || 'increase';
          const multiplier = direction === 'increase' ? (1 + percent / 100) : (1 - percent / 100);
          newBudget = Math.max(1, rule.campaign.budget * multiplier);
        } else {
          newBudget = Math.max(1, config.newBudget || rule.campaign.budget);
        }

        newBudget = Math.round(newBudget * 100) / 100;

        await prisma.campaign.update({
          where: { id: rule.campaign.id },
          data: { budget: newBudget },
        });

        result = {
          action: 'budget_adjusted',
          campaignId: rule.campaign.id,
          oldBudget: rule.campaign.budget,
          newBudget,
        };

        await createNotification(rule.userId, {
          title: 'Budget Adjusted',
          message: `"${rule.campaign.name}" budget changed from $${rule.campaign.budget} to $${newBudget} by rule "${rule.name}".`,
          type: 'AUTOMATION',
          data: { campaignId: rule.campaign.id, ruleId: rule.id },
        });
        break;
      }

      case 'ADJUST_BID': {
        if (!rule.campaignId) throw new Error('No campaign associated with this rule.');

        const adSets = await prisma.adSet.findMany({
          where: { campaignId: rule.campaignId },
        });

        const adjustPercent = config.adjustmentPercent || 10;
        const direction = config.direction || 'increase';

        for (const adSet of adSets) {
          if (adSet.bidAmount) {
            const multiplier = direction === 'increase' ? (1 + adjustPercent / 100) : (1 - adjustPercent / 100);
            const newBid = Math.max(0.01, Math.round(adSet.bidAmount * multiplier * 100) / 100);
            await prisma.adSet.update({
              where: { id: adSet.id },
              data: { bidAmount: newBid },
            });
          }
        }

        result = { action: 'bid_adjusted', adSetsUpdated: adSets.length, adjustPercent, direction };

        await createNotification(rule.userId, {
          title: 'Bids Adjusted',
          message: `Bids ${direction}d by ${adjustPercent}% for ${adSets.length} ad set(s) by rule "${rule.name}".`,
          type: 'AUTOMATION',
          data: { ruleId: rule.id },
        });
        break;
      }

      case 'SEND_NOTIFICATION': {
        await createNotification(rule.userId, {
          title: config.title || `Automation Alert: ${rule.name}`,
          message: config.message || `Automation rule "${rule.name}" triggered.`,
          type: 'AUTOMATION',
          data: { ruleId: rule.id, campaignId: rule.campaignId },
        });

        result = { action: 'notification_sent' };
        break;
      }

      case 'CHANGE_STATUS': {
        if (!rule.campaign) throw new Error('No campaign associated with this rule.');

        const newStatus = config.newStatus || 'PAUSED';
        await prisma.campaign.update({
          where: { id: rule.campaign.id },
          data: { status: newStatus },
        });

        result = { action: 'status_changed', newStatus, campaignId: rule.campaign.id };

        await createNotification(rule.userId, {
          title: 'Campaign Status Changed',
          message: `"${rule.campaign.name}" status changed to ${newStatus} by rule "${rule.name}".`,
          type: 'AUTOMATION',
          data: { campaignId: rule.campaign.id, ruleId: rule.id },
        });
        break;
      }

      case 'DUPLICATE_CAMPAIGN': {
        if (!rule.campaign) throw new Error('No campaign associated with this rule.');

        const original = rule.campaign;
        const duplicate = await prisma.campaign.create({
          data: {
            userId: original.userId,
            adAccountId: original.adAccountId,
            platform: original.platform,
            name: `${original.name} (Copy - ${new Date().toLocaleDateString()})`,
            objective: original.objective,
            status: 'DRAFT',
            budget: original.budget,
            budgetType: original.budgetType,
            targeting: original.targeting,
            settings: original.settings,
          },
        });

        // Duplicate ad sets and ads
        const originalAdSets = await prisma.adSet.findMany({
          where: { campaignId: original.id },
          include: { ads: true },
        });

        for (const adSet of originalAdSets) {
          const newAdSet = await prisma.adSet.create({
            data: {
              campaignId: duplicate.id,
              name: adSet.name,
              budget: adSet.budget,
              bidAmount: adSet.bidAmount,
              bidStrategy: adSet.bidStrategy,
              targeting: adSet.targeting,
              placements: adSet.placements,
              schedule: adSet.schedule,
              optimizationGoal: adSet.optimizationGoal,
            },
          });

          for (const ad of adSet.ads) {
            await prisma.ad.create({
              data: {
                adSetId: newAdSet.id,
                name: ad.name,
                format: ad.format,
                headline: ad.headline,
                description: ad.description,
                primaryText: ad.primaryText,
                callToAction: ad.callToAction,
                destinationUrl: ad.destinationUrl,
                imageUrl: ad.imageUrl,
                videoUrl: ad.videoUrl,
                creativeData: ad.creativeData,
              },
            });
          }
        }

        result = { action: 'duplicated', originalId: original.id, newCampaignId: duplicate.id };

        await createNotification(rule.userId, {
          title: 'Campaign Duplicated',
          message: `"${original.name}" was duplicated by automation rule "${rule.name}".`,
          type: 'AUTOMATION',
          data: { originalId: original.id, newCampaignId: duplicate.id, ruleId: rule.id },
        });
        break;
      }

      case 'AI_OPTIMIZE': {
        if (!rule.campaign) throw new Error('No campaign associated with this rule.');

        const aiService = require('./ai');
        const optimizations = await aiService.optimizeCampaign(rule.campaign, rule.campaign.analytics);

        result = { action: 'ai_optimized', optimizations };

        await createNotification(rule.userId, {
          title: 'AI Optimization Suggestions',
          message: `AI generated ${optimizations.optimizations?.length || 0} optimization suggestions for "${rule.campaign.name}".`,
          type: 'AUTOMATION',
          data: { campaignId: rule.campaign.id, ruleId: rule.id, optimizations },
        });
        break;
      }

      default:
        throw new Error(`Unknown action type: ${rule.actionType}`);
    }
  } catch (err) {
    status = 'ERROR';
    result = { error: err.message };
    console.error(`[Automation] Error executing rule "${rule.name}":`, err.message);
  }

  // Log the execution
  await logExecution(rule.id, rule.actionType, status, result);

  // Update rule metadata
  await prisma.automationRule.update({
    where: { id: rule.id },
    data: {
      lastRunAt: new Date(),
      lastResult: result,
      runCount: { increment: 1 },
    },
  });

  return { status, result, ruleId: rule.id, ruleName: rule.name };
}

/**
 * Log an automation execution.
 */
async function logExecution(automationId, action, status, result) {
  return prisma.automationLog.create({
    data: {
      automationId,
      action,
      status,
      result: result || null,
    },
  });
}

/**
 * Create a notification for a user.
 */
async function createNotification(userId, { title, message, type, data }) {
  return prisma.notification.create({
    data: {
      userId,
      title,
      message,
      type: type || 'AUTOMATION',
      data: data || null,
    },
  });
}

/**
 * Start the cron job that evaluates automation rules every 15 minutes.
 */
function startAutomationCron() {
  // Run every 15 minutes
  const task = cron.schedule('*/15 * * * *', async () => {
    await evaluateRules();
  }, {
    scheduled: true,
    timezone: 'UTC',
  });

  console.log('[Automation] Cron job started - evaluating rules every 15 minutes.');
  return task;
}

module.exports = {
  evaluateRules,
  executeRule,
  checkTrigger,
  startAutomationCron,
  logExecution,
};
