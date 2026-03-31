const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create demo user
  const hashedPassword = await bcrypt.hash('password123', 12);

  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@breedads.com' },
    update: {},
    create: {
      email: 'demo@breedads.com',
      password: hashedPassword,
      name: 'Demo User',
      company: 'BreedAds Demo',
      role: 'ADMIN',
    },
  });

  console.log(`Created demo user: ${demoUser.email} (ID: ${demoUser.id})`);

  // Create demo ad accounts
  const metaAccount = await prisma.adAccount.upsert({
    where: {
      platform_accountId: {
        platform: 'META',
        accountId: 'act_demo_meta_123',
      },
    },
    update: {},
    create: {
      userId: demoUser.id,
      platform: 'META',
      accountId: 'act_demo_meta_123',
      accountName: 'BreedAds Meta Demo Account',
      accessToken: 'demo-access-token-meta',
      currency: 'USD',
      timezone: 'America/New_York',
    },
  });

  const googleAccount = await prisma.adAccount.upsert({
    where: {
      platform_accountId: {
        platform: 'GOOGLE',
        accountId: 'demo_google_456',
      },
    },
    update: {},
    create: {
      userId: demoUser.id,
      platform: 'GOOGLE',
      accountId: 'demo_google_456',
      accountName: 'BreedAds Google Demo Account',
      accessToken: 'demo-access-token-google',
      currency: 'USD',
      timezone: 'America/New_York',
    },
  });

  console.log(`Created demo ad accounts: Meta (${metaAccount.id}), Google (${googleAccount.id})`);

  // Create demo campaigns
  const metaCampaign = await prisma.campaign.create({
    data: {
      userId: demoUser.id,
      adAccountId: metaAccount.id,
      platform: 'META',
      name: 'Summer Sale - Brand Awareness',
      objective: 'AWARENESS',
      status: 'ACTIVE',
      budget: 50.00,
      budgetType: 'DAILY',
      startDate: new Date('2026-03-01'),
      targeting: {
        locations: { countries: ['US', 'CA'] },
        ageMin: 25,
        ageMax: 55,
        interests: ['online shopping', 'fashion'],
      },
    },
  });

  const metaCampaign2 = await prisma.campaign.create({
    data: {
      userId: demoUser.id,
      adAccountId: metaAccount.id,
      platform: 'META',
      name: 'Product Launch - Lead Gen',
      objective: 'LEADS',
      status: 'ACTIVE',
      budget: 75.00,
      budgetType: 'DAILY',
      startDate: new Date('2026-03-10'),
      targeting: {
        locations: { countries: ['US'] },
        ageMin: 18,
        ageMax: 45,
        interests: ['technology', 'startups'],
      },
    },
  });

  const googleCampaign = await prisma.campaign.create({
    data: {
      userId: demoUser.id,
      adAccountId: googleAccount.id,
      platform: 'GOOGLE',
      name: 'Search - High Intent Keywords',
      objective: 'CONVERSIONS',
      status: 'ACTIVE',
      budget: 100.00,
      budgetType: 'DAILY',
      startDate: new Date('2026-03-05'),
      targeting: {
        keywords: ['buy product online', 'best deals 2026', 'product reviews'],
        locations: ['United States'],
      },
    },
  });

  const googleCampaign2 = await prisma.campaign.create({
    data: {
      userId: demoUser.id,
      adAccountId: googleAccount.id,
      platform: 'GOOGLE',
      name: 'Display - Retargeting',
      objective: 'TRAFFIC',
      status: 'PAUSED',
      budget: 30.00,
      budgetType: 'DAILY',
      startDate: new Date('2026-03-15'),
      targeting: {
        audiences: ['website visitors', 'cart abandoners'],
      },
    },
  });

  console.log('Created 4 demo campaigns.');

  // Create ad sets and ads for Meta campaign
  const adSet1 = await prisma.adSet.create({
    data: {
      campaignId: metaCampaign.id,
      name: 'Broad Audience - 25-55',
      status: 'ACTIVE',
      budget: 25.00,
      bidStrategy: 'LOWEST_COST',
      targeting: {
        ageMin: 25,
        ageMax: 55,
        genders: [0],
      },
      placements: {
        automatic: true,
      },
      optimizationGoal: 'REACH',
    },
  });

  const adSet2 = await prisma.adSet.create({
    data: {
      campaignId: metaCampaign.id,
      name: 'Interest Targeting - Fashion',
      status: 'ACTIVE',
      budget: 25.00,
      bidStrategy: 'LOWEST_COST',
      targeting: {
        ageMin: 25,
        ageMax: 45,
        interests: ['fashion', 'clothing'],
      },
      placements: {
        automatic: false,
        platforms: ['facebook', 'instagram'],
      },
      optimizationGoal: 'REACH',
    },
  });

  await prisma.ad.createMany({
    data: [
      {
        adSetId: adSet1.id,
        name: 'Summer Sale - Image Ad',
        status: 'ACTIVE',
        format: 'IMAGE',
        headline: 'Summer Sale - Up to 50% Off!',
        description: 'Shop our biggest sale of the year. Limited time only.',
        primaryText: 'Don\'t miss our incredible summer deals! Shop now and save up to 50% on all products.',
        callToAction: 'SHOP_NOW',
        destinationUrl: 'https://example.com/summer-sale',
      },
      {
        adSetId: adSet1.id,
        name: 'Summer Sale - Carousel Ad',
        status: 'ACTIVE',
        format: 'CAROUSEL',
        headline: 'Top Summer Picks',
        description: 'Browse our curated summer collection.',
        primaryText: 'Discover the season\'s hottest products at unbeatable prices.',
        callToAction: 'LEARN_MORE',
        destinationUrl: 'https://example.com/summer-collection',
        creativeData: {
          cards: [
            { headline: 'Beachwear', imageUrl: 'https://example.com/img1.jpg', link: 'https://example.com/beachwear' },
            { headline: 'Sunglasses', imageUrl: 'https://example.com/img2.jpg', link: 'https://example.com/sunglasses' },
            { headline: 'Accessories', imageUrl: 'https://example.com/img3.jpg', link: 'https://example.com/accessories' },
          ],
        },
      },
      {
        adSetId: adSet2.id,
        name: 'Fashion Forward - Stories',
        status: 'ACTIVE',
        format: 'STORIES',
        headline: 'New Arrivals',
        primaryText: 'Be the first to shop our new collection.',
        callToAction: 'SHOP_NOW',
        destinationUrl: 'https://example.com/new-arrivals',
      },
    ],
  });

  // Create ad sets and ads for Google campaign
  const googleAdSet = await prisma.adSet.create({
    data: {
      campaignId: googleCampaign.id,
      name: 'High Intent Keywords Group',
      status: 'ACTIVE',
      bidAmount: 2.50,
      bidStrategy: 'MANUAL_CPC',
      targeting: {
        keywords: ['buy product online', 'best product deals'],
        matchType: 'PHRASE',
      },
      optimizationGoal: 'CONVERSIONS',
    },
  });

  await prisma.ad.createMany({
    data: [
      {
        adSetId: googleAdSet.id,
        name: 'Search Ad - Best Deals',
        status: 'ACTIVE',
        format: 'RESPONSIVE_SEARCH',
        headline: 'Best Deals Online - Save 50%',
        description: 'Shop the best deals with free shipping. Limited time offer.',
        callToAction: 'SHOP_NOW',
        destinationUrl: 'https://example.com/deals',
        creativeData: {
          headline2: 'Free Shipping Available',
          headline3: 'Trusted by 10K+ Customers',
          description2: 'Quality products at unbeatable prices. Order today.',
        },
      },
      {
        adSetId: googleAdSet.id,
        name: 'Search Ad - Product Reviews',
        status: 'ACTIVE',
        format: 'RESPONSIVE_SEARCH',
        headline: 'Top Rated Products - 4.8 Stars',
        description: 'Read real customer reviews. 30-day money back guarantee.',
        callToAction: 'LEARN_MORE',
        destinationUrl: 'https://example.com/reviews',
      },
    ],
  });

  console.log('Created demo ad sets and ads.');

  // Generate analytics data for the last 30 days
  const today = new Date();
  const campaigns = [metaCampaign, metaCampaign2, googleCampaign, googleCampaign2];

  for (const campaign of campaigns) {
    const analyticsData = [];
    for (let i = 30; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      // Generate realistic-ish data with some variance
      const baseImpressions = campaign.platform === 'META' ? 5000 : 3000;
      const baseCtr = campaign.platform === 'META' ? 0.02 : 0.04;
      const baseCpc = campaign.platform === 'META' ? 0.8 : 1.5;

      const impressions = Math.floor(baseImpressions * (0.7 + Math.random() * 0.6));
      const ctr = baseCtr * (0.7 + Math.random() * 0.6);
      const clicks = Math.floor(impressions * ctr);
      const spend = Math.round(clicks * baseCpc * (0.8 + Math.random() * 0.4) * 100) / 100;
      const conversionRate = 0.03 + Math.random() * 0.04;
      const conversions = Math.floor(clicks * conversionRate);
      const avgOrderValue = 45 + Math.random() * 60;
      const revenue = Math.round(conversions * avgOrderValue * 100) / 100;

      analyticsData.push({
        campaignId: campaign.id,
        date,
        impressions,
        clicks,
        spend,
        conversions,
        revenue,
        ctr: Math.round(ctr * 10000) / 100,
        cpc: clicks > 0 ? Math.round((spend / clicks) * 100) / 100 : 0,
        cpm: impressions > 0 ? Math.round(((spend / impressions) * 1000) * 100) / 100 : 0,
        roas: spend > 0 ? Math.round((revenue / spend) * 100) / 100 : 0,
        reach: Math.floor(impressions * 0.85),
        frequency: 1 + Math.random() * 0.5,
      });
    }

    await prisma.campaignAnalytics.createMany({ data: analyticsData });
  }

  console.log('Generated 31 days of analytics data for each campaign.');

  // Create a demo automation rule
  await prisma.automationRule.create({
    data: {
      userId: demoUser.id,
      campaignId: metaCampaign.id,
      name: 'Pause if CPC exceeds $2',
      description: 'Automatically pause the campaign if average CPC goes above $2.00',
      isActive: true,
      triggerType: 'PERFORMANCE_THRESHOLD',
      triggerCondition: {
        metric: 'cpc',
        operator: 'gt',
        value: 2.0,
      },
      actionType: 'PAUSE_CAMPAIGN',
      actionConfig: {},
    },
  });

  await prisma.automationRule.create({
    data: {
      userId: demoUser.id,
      campaignId: googleCampaign.id,
      name: 'Budget alert at $80 daily spend',
      description: 'Send notification when daily spend approaches the budget limit',
      isActive: true,
      triggerType: 'BUDGET_LIMIT',
      triggerCondition: {
        maxSpend: 80,
      },
      actionType: 'SEND_NOTIFICATION',
      actionConfig: {
        title: 'Budget Alert',
        message: 'Google Search campaign is approaching daily budget limit.',
      },
    },
  });

  console.log('Created demo automation rules.');

  // Create sample notifications
  await prisma.notification.createMany({
    data: [
      {
        userId: demoUser.id,
        title: 'Welcome to BreedAds!',
        message: 'Your account is set up with demo data. Explore the dashboard to see what BreedAds can do.',
        type: 'SUCCESS',
        isRead: false,
      },
      {
        userId: demoUser.id,
        title: 'Meta Campaign Performing Well',
        message: '"Summer Sale" campaign ROAS is 3.2x - above your target of 2.5x.',
        type: 'PERFORMANCE',
        isRead: false,
        data: { campaignId: metaCampaign.id },
      },
      {
        userId: demoUser.id,
        title: 'New AI Insights Available',
        message: 'We analyzed your campaigns and found 3 optimization opportunities.',
        type: 'INFO',
        isRead: false,
      },
    ],
  });

  console.log('Created demo notifications.');

  // Create a demo landing page
  await prisma.landingPage.create({
    data: {
      userId: demoUser.id,
      name: 'Summer Sale Landing Page',
      slug: 'summer-sale-2026',
      content: {
        sections: ['hero', 'features', 'testimonials', 'cta'],
      },
      html: `<div class="lp-hero">
  <h1>Summer Sale - Up to 50% Off!</h1>
  <p>Don't miss our biggest sale of the year. Limited time only.</p>
  <button data-conversion="true" class="lp-cta-btn">Shop Now</button>
</div>
<div class="lp-features">
  <div class="lp-feature">
    <h3>Free Shipping</h3>
    <p>On all orders over $50</p>
  </div>
  <div class="lp-feature">
    <h3>30-Day Returns</h3>
    <p>No questions asked</p>
  </div>
  <div class="lp-feature">
    <h3>Secure Checkout</h3>
    <p>256-bit SSL encryption</p>
  </div>
</div>
<div class="lp-cta-section">
  <h2>Ready to Save?</h2>
  <button data-conversion="true" class="lp-cta-btn">Get Started</button>
</div>`,
      css: `.lp-hero { text-align: center; padding: 80px 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
.lp-hero h1 { font-size: 2.5rem; margin-bottom: 1rem; }
.lp-hero p { font-size: 1.2rem; opacity: 0.9; margin-bottom: 2rem; }
.lp-cta-btn { background: #f59e0b; color: #1a1a2e; border: none; padding: 16px 40px; font-size: 1.1rem; font-weight: 700; border-radius: 8px; cursor: pointer; transition: transform 0.2s; }
.lp-cta-btn:hover { transform: scale(1.05); }
.lp-features { display: flex; justify-content: center; gap: 2rem; padding: 60px 20px; flex-wrap: wrap; }
.lp-feature { text-align: center; max-width: 250px; }
.lp-feature h3 { font-size: 1.3rem; margin-bottom: 0.5rem; }
.lp-cta-section { text-align: center; padding: 60px 20px; background: #f8fafc; }
.lp-cta-section h2 { margin-bottom: 1.5rem; font-size: 2rem; }`,
      isPublished: true,
      aiGenerated: false,
      visits: 1247,
      conversions: 89,
      conversionRate: 7.14,
    },
  });

  console.log('Created demo landing page.');

  console.log('\nSeed completed successfully!');
  console.log('Demo login: demo@breedads.com / password123');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
