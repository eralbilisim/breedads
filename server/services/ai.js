const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o';
const IMAGE_MODEL = 'dall-e-3';

/**
 * Generate ad copy (headlines, descriptions, CTAs) using GPT.
 */
async function generateAdCopy(params) {
  const { product, platform, objective, tone, targetAudience, count = 3, customPrompt } = params;

  const systemMessage = `You are an expert digital advertising copywriter with deep experience in ${platform} ads.
You write high-converting ad copy that drives ${objective.toLowerCase()} results.
Always return valid JSON arrays.`;

  const userMessage = customPrompt || `Generate ${count} ad copy variations for the following:

Product/Service: ${product}
Platform: ${platform}
Objective: ${objective}
Tone: ${tone}
Target Audience: ${targetAudience}

For each variation, provide:
- headline (max 40 characters for Meta, max 30 characters for Google)
- description (max 125 characters for Meta, max 90 characters for Google)
- primaryText (max 250 characters, for Meta only)
- callToAction (e.g., "LEARN_MORE", "SHOP_NOW", "SIGN_UP", "GET_OFFER", "CONTACT_US")
- hook (the emotional/logical hook being used)

Return as a JSON array of objects with those keys.`;

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: systemMessage },
      { role: 'user', content: userMessage },
    ],
    temperature: 0.8,
    max_tokens: 2000,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0].message.content;
  try {
    const parsed = JSON.parse(content);
    return parsed.copies || parsed.variants || parsed.variations || parsed.results || parsed.data || [parsed];
  } catch (e) {
    return [{ headline: content.substring(0, 40), description: content.substring(0, 125), primaryText: content, callToAction: 'LEARN_MORE', hook: 'general' }];
  }
}

/**
 * Generate an ad image using DALL-E 3.
 */
async function generateImage(prompt, options = {}) {
  const { size = '1024x1024', style = 'vivid' } = options;

  const enhancedPrompt = `Professional advertising image: ${prompt}. High quality, commercial photography style, suitable for digital advertising.`;

  const response = await openai.images.generate({
    model: IMAGE_MODEL,
    prompt: enhancedPrompt,
    n: 1,
    size,
    style,
    quality: 'hd',
  });

  return {
    url: response.data[0].url,
    revisedPrompt: response.data[0].revised_prompt,
  };
}

/**
 * Analyze campaign performance data and provide insights.
 */
async function analyzePerformance(performanceSummary) {
  const systemMessage = `You are an expert digital advertising analyst.
Analyze campaign performance data and provide actionable insights.
Always return valid JSON with "insights" (string), "recommendations" (array of strings),
"alerts" (array of objects with "type" and "message"), and "score" (0-100 overall performance score).`;

  const userMessage = `Analyze the following campaign performance data and provide insights:

${JSON.stringify(performanceSummary, null, 2)}

Consider:
1. Which campaigns are performing best/worst?
2. Budget allocation efficiency
3. CTR and CPC benchmarks
4. ROAS analysis
5. Recommendations for improvement
6. Any concerning trends or alerts

Respond with actionable, specific insights.`;

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: systemMessage },
      { role: 'user', content: userMessage },
    ],
    temperature: 0.5,
    max_tokens: 3000,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0].message.content;
  try {
    return JSON.parse(content);
  } catch (e) {
    return {
      insights: content,
      recommendations: [],
      alerts: [],
      score: 50,
    };
  }
}

/**
 * Generate a landing page HTML/CSS from a description prompt.
 */
async function generateLandingPage(prompt, options = {}) {
  const { style = 'modern' } = options;

  const systemMessage = `You are an expert web designer who creates high-converting landing pages.
Generate complete, responsive HTML and CSS for landing pages.
The HTML should be clean, semantic, and include conversion-focused elements.
Add data-conversion attribute to CTA buttons for tracking.
Return valid JSON with "html" and "css" keys.`;

  const userMessage = `Create a ${style} landing page for the following:

${prompt}

Requirements:
- Fully responsive design (mobile-first)
- Professional and clean layout
- Hero section with clear headline and CTA
- Features/benefits section
- Social proof/testimonials section
- Final CTA section
- Use modern CSS (flexbox/grid)
- Include hover effects and smooth transitions
- Use a professional color scheme
- All CTA buttons should have data-conversion="true" attribute
- Do NOT include <html>, <head>, <body> tags (just the inner content)
- Use only inline-safe class names (no collisions)

Return JSON with exactly two keys: "html" (the HTML content) and "css" (the CSS styles).`;

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: systemMessage },
      { role: 'user', content: userMessage },
    ],
    temperature: 0.7,
    max_tokens: 4000,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0].message.content;
  try {
    const parsed = JSON.parse(content);
    return {
      html: parsed.html || '<div class="lp-error">Failed to generate HTML</div>',
      css: parsed.css || '',
    };
  } catch (e) {
    return {
      html: `<div class="lp-container"><h1>Landing Page</h1><p>${prompt}</p><button data-conversion="true">Get Started</button></div>`,
      css: `.lp-container { max-width: 800px; margin: 0 auto; padding: 2rem; text-align: center; font-family: sans-serif; }
.lp-container button { background: #2563eb; color: white; border: none; padding: 12px 32px; font-size: 18px; border-radius: 8px; cursor: pointer; }
.lp-container button:hover { background: #1d4ed8; }`,
    };
  }
}

/**
 * Analyze a competitor's ad strategy.
 */
async function analyzeCompetitor(data) {
  const systemMessage = `You are an expert competitive intelligence analyst specializing in digital advertising.
Provide detailed, actionable analysis of competitor ad strategies.`;

  const userMessage = `Analyze this competitor's advertising strategy:

Competitor: ${data.competitorName}
Platform: ${data.platform}
Domain: ${data.domain || 'Unknown'}
Number of active ads: ${data.adCount}

Top Creatives:
${JSON.stringify(data.topCreatives || [], null, 2)}

Ad Data Summary:
${JSON.stringify(data.adsData?.ads?.slice(0, 10) || [], null, 2)}

Provide analysis covering:
1. Overall ad strategy assessment
2. Creative patterns and messaging themes
3. Likely target audience
4. Ad frequency and budget estimation
5. Strengths and weaknesses
6. Opportunities to differentiate
7. Recommended counter-strategies
8. Key takeaways

Be specific and actionable.`;

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: systemMessage },
      { role: 'user', content: userMessage },
    ],
    temperature: 0.6,
    max_tokens: 3000,
  });

  return response.choices[0].message.content;
}

/**
 * Generate automation rule suggestions based on campaign data.
 */
async function generateAutomationSuggestions(campaigns) {
  const systemMessage = `You are an expert in advertising automation and optimization.
Suggest automation rules to improve campaign performance.
Return valid JSON with an array of rule suggestions.`;

  const summaries = campaigns.map(c => ({
    name: c.name,
    platform: c.platform,
    status: c.status,
    budget: c.budget,
    objective: c.objective,
  }));

  const userMessage = `Based on these active campaigns, suggest automation rules:

${JSON.stringify(summaries, null, 2)}

For each suggestion, provide:
- name: rule name
- description: what it does
- triggerType: one of PERFORMANCE_THRESHOLD, SCHEDULE, BUDGET_LIMIT, TIME_BASED, AI_RECOMMENDATION, METRIC_CHANGE
- triggerCondition: example condition object
- actionType: one of PAUSE_CAMPAIGN, RESUME_CAMPAIGN, ADJUST_BUDGET, ADJUST_BID, SEND_NOTIFICATION, CHANGE_STATUS, DUPLICATE_CAMPAIGN, AI_OPTIMIZE
- actionConfig: example action config object
- priority: high/medium/low
- reason: why this rule is recommended

Return JSON with a "suggestions" array.`;

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: systemMessage },
      { role: 'user', content: userMessage },
    ],
    temperature: 0.6,
    max_tokens: 3000,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0].message.content;
  try {
    const parsed = JSON.parse(content);
    return parsed.suggestions || parsed.rules || [];
  } catch (e) {
    return [];
  }
}

/**
 * Analyze a campaign and suggest optimizations.
 */
async function optimizeCampaign(campaign, analytics) {
  const systemMessage = `You are an expert campaign optimization specialist.
Analyze campaign data and suggest specific, actionable optimizations.
Return valid JSON with "optimizations" array and "overallAssessment" string.`;

  const userMessage = `Optimize this campaign:

Campaign: ${campaign.name}
Platform: ${campaign.platform}
Objective: ${campaign.objective}
Budget: $${campaign.budget} (${campaign.budgetType})
Status: ${campaign.status}
Targeting: ${JSON.stringify(campaign.targeting || {})}

Recent Analytics (last 7 days):
${JSON.stringify(analytics || [], null, 2)}

Provide specific optimizations for:
1. Budget allocation
2. Targeting refinement
3. Bid strategy
4. Creative recommendations
5. Scheduling adjustments
6. A/B test suggestions

Each optimization should have:
- category: the area of optimization
- action: specific action to take
- expectedImpact: estimated improvement
- priority: high/medium/low
- implementation: steps to implement`;

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: systemMessage },
      { role: 'user', content: userMessage },
    ],
    temperature: 0.5,
    max_tokens: 3000,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0].message.content;
  try {
    return JSON.parse(content);
  } catch (e) {
    return {
      overallAssessment: content,
      optimizations: [],
    };
  }
}

module.exports = {
  generateAdCopy,
  generateImage,
  analyzePerformance,
  generateLandingPage,
  analyzeCompetitor,
  generateAutomationSuggestions,
  optimizeCampaign,
};
