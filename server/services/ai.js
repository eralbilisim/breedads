const { GoogleGenerativeAI } = require('@google/generative-ai');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

let _genAI = null;

async function getGeminiClient() {
  if (_genAI) return _genAI;

  // Try DB settings first, then env
  let apiKey = process.env.GEMINI_API_KEY;
  try {
    const settings = await prisma.appSettings.findUnique({ where: { id: 'app_settings' } });
    if (settings?.geminiApiKey) apiKey = settings.geminiApiKey;
  } catch {
    // ignore - use env
  }

  if (!apiKey) {
    throw new Error('Gemini API key is not configured. Go to Settings > API Keys to add it.');
  }

  _genAI = new GoogleGenerativeAI(apiKey);
  return _genAI;
}

function getModel(modelName) {
  return modelName || process.env.GEMINI_MODEL || 'gemini-2.0-flash';
}

// Reset client cache when settings change
function resetClient() {
  _genAI = null;
}

/**
 * Generate ad copy (headlines, descriptions, CTAs) using Gemini.
 */
async function generateAdCopy(params) {
  const { product, platform, objective, tone, targetAudience, count = 3, customPrompt } = params;

  const genAI = await getGeminiClient();
  const model = genAI.getGenerativeModel({ model: getModel() });

  const systemInstruction = `Sen ${platform} reklamlarında derin deneyime sahip uzman bir dijital reklam metin yazarısın.
${objective.toLowerCase()} sonuçları elde eden yüksek dönüşümlü reklam metinleri yazarsın.
Her zaman geçerli JSON dizileri döndür.`;

  const userMessage = customPrompt || `Aşağıdakiler için ${count} adet reklam metni varyasyonu oluştur:

Ürün/Hizmet: ${product}
Platform: ${platform}
Hedef: ${objective}
Ton: ${tone}
Hedef Kitle: ${targetAudience}

Her varyasyon için şunları sağla:
- headline (Meta için max 40, Google için max 30 karakter)
- description (Meta için max 125, Google için max 90 karakter)
- primaryText (max 250 karakter, sadece Meta için)
- callToAction ("LEARN_MORE", "SHOP_NOW", "SIGN_UP", "GET_OFFER", "CONTACT_US" gibi)
- hook (kullanılan duygusal/mantıksal kanca)

Bu anahtarlara sahip nesnelerin JSON dizisi olarak döndür. Yanıtı {"copies": [...]} formatında ver.`;

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: userMessage }] }],
    systemInstruction: { parts: [{ text: systemInstruction }] },
    generationConfig: {
      temperature: 0.8,
      maxOutputTokens: 2000,
      responseMimeType: 'application/json',
    },
  });

  const content = result.response.text();
  try {
    const parsed = JSON.parse(content);
    return parsed.copies || parsed.variants || parsed.variations || parsed.results || parsed.data || [parsed];
  } catch {
    return [{ headline: content.substring(0, 40), description: content.substring(0, 125), primaryText: content, callToAction: 'LEARN_MORE', hook: 'general' }];
  }
}

/**
 * Generate an ad image description/prompt using Gemini.
 * Note: Gemini doesn't generate images directly like DALL-E.
 * This returns an optimized image prompt that can be used with an image generation service.
 */
async function generateImage(prompt, options = {}) {
  const genAI = await getGeminiClient();
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const enhancedPrompt = `Profesyonel reklam görseli: ${prompt}. Yüksek kalite, ticari fotoğrafçılık stili, dijital reklamcılığa uygun.`;

  // Gemini can generate images with Imagen - try it
  try {
    const imageModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await imageModel.generateContent({
      contents: [{ role: 'user', parts: [{ text: `Create a professional advertising image: ${enhancedPrompt}. Return a detailed image description and creative brief.` }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1000,
      },
    });

    return {
      url: null,
      description: result.response.text(),
      prompt: enhancedPrompt,
      note: 'Image description generated. Use with an image generation service for actual image creation.',
    };
  } catch {
    return {
      url: null,
      description: enhancedPrompt,
      prompt: enhancedPrompt,
      note: 'Image generation requires additional configuration.',
    };
  }
}

/**
 * Analyze campaign performance data and provide insights.
 */
async function analyzePerformance(performanceSummary) {
  const genAI = await getGeminiClient();
  const model = genAI.getGenerativeModel({ model: getModel() });

  const systemInstruction = `Sen uzman bir dijital reklam analistsin.
Kampanya performans verilerini analiz et ve eyleme geçirilebilir öneriler sun.
Her zaman şu anahtarlara sahip geçerli JSON döndür: "insights" (string), "recommendations" (string dizisi),
"alerts" (her birinde "type" ve "message" olan nesneler dizisi), ve "score" (0-100 genel performans puanı).`;

  const userMessage = `Aşağıdaki kampanya performans verilerini analiz et ve öneriler sun:

${JSON.stringify(performanceSummary, null, 2)}

Şunları değerlendir:
1. Hangi kampanyalar en iyi/en kötü performansı gösteriyor?
2. Bütçe tahsis verimliliği
3. TO ve TBM karşılaştırmaları
4. ROAS analizi
5. İyileştirme önerileri
6. Endişe verici trendler veya uyarılar

Eyleme geçirilebilir, spesifik öneriler sun.`;

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: userMessage }] }],
    systemInstruction: { parts: [{ text: systemInstruction }] },
    generationConfig: {
      temperature: 0.5,
      maxOutputTokens: 3000,
      responseMimeType: 'application/json',
    },
  });

  const content = result.response.text();
  try {
    return JSON.parse(content);
  } catch {
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

  const genAI = await getGeminiClient();
  const model = genAI.getGenerativeModel({ model: getModel() });

  const systemInstruction = `Sen yüksek dönüşümlü açılış sayfaları oluşturan uzman bir web tasarımcısın.
Açılış sayfaları için eksiksiz, duyarlı HTML ve CSS oluştur.
HTML temiz, semantik olmalı ve dönüşüm odaklı öğeler içermelidir.
İzleme için CTA düğmelerine data-conversion özniteliği ekle.
"html" ve "css" anahtarlarına sahip geçerli JSON döndür.`;

  const userMessage = `Aşağıdakiler için ${style} bir açılış sayfası oluştur:

${prompt}

Gereksinimler:
- Tam duyarlı tasarım (önce mobil)
- Profesyonel ve temiz düzen
- Net başlık ve CTA ile hero bölümü
- Özellikler/faydalar bölümü
- Sosyal kanıt/müşteri yorumları bölümü
- Son CTA bölümü
- Modern CSS kullan (flexbox/grid)
- Hover efektleri ve yumuşak geçişler ekle
- Profesyonel renk şeması kullan
- Tüm CTA düğmelerinde data-conversion="true" özniteliği olmalı
- <html>, <head>, <body> etiketleri EKLEME (sadece iç içerik)
- Sadece satır içi güvenli sınıf adları kullan (çakışma olmasın)

Tam olarak iki anahtara sahip JSON döndür: "html" (HTML içeriği) ve "css" (CSS stilleri).`;

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: userMessage }] }],
    systemInstruction: { parts: [{ text: systemInstruction }] },
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 4000,
      responseMimeType: 'application/json',
    },
  });

  const content = result.response.text();
  try {
    const parsed = JSON.parse(content);
    return {
      html: parsed.html || '<div class="lp-error">HTML oluşturulamadı</div>',
      css: parsed.css || '',
    };
  } catch {
    return {
      html: `<div class="lp-container"><h1>Açılış Sayfası</h1><p>${prompt}</p><button data-conversion="true">Başla</button></div>`,
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
  const genAI = await getGeminiClient();
  const model = genAI.getGenerativeModel({ model: getModel() });

  const systemInstruction = `Sen dijital reklamcılık konusunda uzmanlaşmış bir rekabet istihbaratı analistsin.
Rakip reklam stratejileri hakkında detaylı, eyleme geçirilebilir analizler sun.`;

  const userMessage = `Bu rakibin reklam stratejisini analiz et:

Rakip: ${data.competitorName}
Platform: ${data.platform}
Domain: ${data.domain || 'Bilinmiyor'}
Aktif reklam sayısı: ${data.adCount}

En İyi Kreatifler:
${JSON.stringify(data.topCreatives || [], null, 2)}

Reklam Veri Özeti:
${JSON.stringify(data.adsData?.ads?.slice(0, 10) || [], null, 2)}

Şunları kapsayan analiz sun:
1. Genel reklam stratejisi değerlendirmesi
2. Kreatif kalıplar ve mesaj temaları
3. Olası hedef kitle
4. Reklam sıklığı ve bütçe tahmini
5. Güçlü ve zayıf yönler
6. Farklılaşma fırsatları
7. Önerilen karşı stratejiler
8. Önemli çıkarımlar

Spesifik ve eyleme geçirilebilir ol.`;

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: userMessage }] }],
    systemInstruction: { parts: [{ text: systemInstruction }] },
    generationConfig: {
      temperature: 0.6,
      maxOutputTokens: 3000,
    },
  });

  return result.response.text();
}

/**
 * Generate automation rule suggestions based on campaign data.
 */
async function generateAutomationSuggestions(campaigns) {
  const genAI = await getGeminiClient();
  const model = genAI.getGenerativeModel({ model: getModel() });

  const systemInstruction = `Sen reklam otomasyonu ve optimizasyon uzmanısın.
Kampanya performansını iyileştirmek için otomasyon kuralları öner.
Kural önerileri dizisi içeren geçerli JSON döndür.`;

  const summaries = campaigns.map(c => ({
    name: c.name,
    platform: c.platform,
    status: c.status,
    budget: c.budget,
    objective: c.objective,
  }));

  const userMessage = `Bu aktif kampanyalara dayalı otomasyon kuralları öner:

${JSON.stringify(summaries, null, 2)}

Her öneri için şunları sağla:
- name: kural adı
- description: ne yaptığı
- triggerType: PERFORMANCE_THRESHOLD, SCHEDULE, BUDGET_LIMIT, TIME_BASED, AI_RECOMMENDATION, METRIC_CHANGE
- triggerCondition: örnek koşul nesnesi
- actionType: PAUSE_CAMPAIGN, RESUME_CAMPAIGN, ADJUST_BUDGET, ADJUST_BID, SEND_NOTIFICATION, CHANGE_STATUS, DUPLICATE_CAMPAIGN, AI_OPTIMIZE
- actionConfig: örnek eylem yapılandırma nesnesi
- priority: high/medium/low
- reason: bu kuralın neden önerildiği

JSON'u {"suggestions": [...]} formatında döndür.`;

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: userMessage }] }],
    systemInstruction: { parts: [{ text: systemInstruction }] },
    generationConfig: {
      temperature: 0.6,
      maxOutputTokens: 3000,
      responseMimeType: 'application/json',
    },
  });

  const content = result.response.text();
  try {
    const parsed = JSON.parse(content);
    return parsed.suggestions || parsed.rules || [];
  } catch {
    return [];
  }
}

/**
 * Analyze a campaign and suggest optimizations.
 */
async function optimizeCampaign(campaign, analytics) {
  const genAI = await getGeminiClient();
  const model = genAI.getGenerativeModel({ model: getModel() });

  const systemInstruction = `Sen uzman bir kampanya optimizasyon uzmanısın.
Kampanya verilerini analiz et ve spesifik, eyleme geçirilebilir optimizasyonlar öner.
"optimizations" dizisi ve "overallAssessment" string içeren geçerli JSON döndür.`;

  const userMessage = `Bu kampanyayı optimize et:

Kampanya: ${campaign.name}
Platform: ${campaign.platform}
Hedef: ${campaign.objective}
Bütçe: $${campaign.budget} (${campaign.budgetType})
Durum: ${campaign.status}
Hedefleme: ${JSON.stringify(campaign.targeting || {})}

Son Analitik (son 7 gün):
${JSON.stringify(analytics || [], null, 2)}

Şunlar için spesifik optimizasyonlar sun:
1. Bütçe tahsisi
2. Hedefleme iyileştirmesi
3. Teklif stratejisi
4. Kreatif önerileri
5. Zamanlama ayarlamaları
6. A/B test önerileri

Her optimizasyonda şunlar olsun:
- category: optimizasyon alanı
- action: yapılacak spesifik eylem
- expectedImpact: tahmini iyileştirme
- priority: high/medium/low
- implementation: uygulama adımları`;

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: userMessage }] }],
    systemInstruction: { parts: [{ text: systemInstruction }] },
    generationConfig: {
      temperature: 0.5,
      maxOutputTokens: 3000,
      responseMimeType: 'application/json',
    },
  });

  const content = result.response.text();
  try {
    return JSON.parse(content);
  } catch {
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
  resetClient,
};
