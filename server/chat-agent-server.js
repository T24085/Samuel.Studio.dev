import { createServer } from 'node:http';
import { appendFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const host = process.env.CHAT_AGENT_HOST || '127.0.0.1';
const port = Number(process.env.CHAT_AGENT_PORT || 8787);
const ollamaChatUrl = process.env.OLLAMA_CHAT_URL || 'http://127.0.0.1:11434/api/chat';
const routeAssistantChat = '/api/assistant-chat';
const routeChatLog = '/api/chat-log';
const routeHealth = '/health';
const logFilePath = resolve(process.cwd(), 'logs', 'nova-chat-transcripts.ndjson');
const sessionDirPath = resolve(process.cwd(), 'logs', 'chat-sessions');

function jsonResponse(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.end(JSON.stringify(data));
}

function textResponse(res, status, text) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.end(text);
}

async function readJsonBody(req) {
  const chunks = [];
  let total = 0;

  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.length;

    if (total > 1_000_000) {
      throw new Error('Payload too large.');
    }

    chunks.push(buffer);
  }

  const raw = Buffer.concat(chunks).toString('utf8').trim();
  return raw ? JSON.parse(raw) : {};
}

function cleanText(value, fallback) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function normalizeClientProfile(profile) {
  return {
    name: cleanText(profile?.name, 'Unknown'),
    email: cleanText(profile?.email, 'Unknown'),
    phone: cleanText(profile?.phone, 'Unknown'),
  };
}

function normalizeTranscript(payload) {
  const messages = Array.isArray(payload.messages) ? payload.messages : [];
  const receivedAt = new Date().toISOString();

  return {
    assistant: cleanText(payload.assistant, 'Nova'),
    sessionId: cleanText(payload.sessionId, 'unknown-session'),
    pageUrl: cleanText(payload.pageUrl, 'unknown-page'),
    model: cleanText(payload.model, 'unknown-model'),
    loggedAt: cleanText(payload.loggedAt, new Date().toISOString()),
    receivedAt,
    sendEmail: Boolean(payload.sendEmail),
    clientProfile: normalizeClientProfile(payload.clientProfile),
    messages: messages
      .map((message, index) => {
        if (!message || (message.role !== 'user' && message.role !== 'assistant') || typeof message.content !== 'string') {
          return null;
        }

        return {
          id: typeof message.id === 'string' && message.id ? message.id : `${message.role}_${index}_${Date.now()}`,
          role: message.role,
          content: message.content,
          createdAt: typeof message.createdAt === 'number' ? message.createdAt : Date.now() + index,
          source: message.source === 'ollama' || message.source === 'fallback' || message.source === 'seed' ? message.source : undefined,
          model: typeof message.model === 'string' && message.model ? message.model : undefined,
        };
      })
      .filter(Boolean),
  };
}

function sanitizeSessionId(sessionId) {
  return sessionId.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function formatTimestamp(timestamp) {
  const date = typeof timestamp === 'number' ? new Date(timestamp) : new Date(timestamp);
  return Number.isNaN(date.getTime()) ? 'Unknown time' : date.toISOString();
}

function toBlockquote(text) {
  return text
    .split(/\r?\n/)
    .map((line) => (line ? `> ${line}` : '>'))
    .join('\n');
}

function buildTranscriptMarkdown(transcript) {
  const lines = [
    '# Nova Chat Session',
    '',
    `- Assistant: ${transcript.assistant}`,
    `- Session ID: ${transcript.sessionId}`,
    `- Logged At: ${transcript.loggedAt}`,
    `- Received At: ${transcript.receivedAt}`,
    `- Page URL: ${transcript.pageUrl}`,
    `- Model: ${transcript.model}`,
    `- Email Forwarding: ${transcript.sendEmail ? 'Enabled' : 'Disabled'}`,
    '',
    '## Client Details',
    `- Name: ${transcript.clientProfile.name}`,
    `- Email: ${transcript.clientProfile.email}`,
    `- Phone: ${transcript.clientProfile.phone}`,
    '',
    '## Conversation',
  ];

  for (const message of transcript.messages) {
    const label = message.role === 'user' ? 'Client' : 'Nova';
    const source = message.source ? ` (${message.source})` : '';
    const model = message.model ? ` · ${message.model}` : '';

    lines.push('');
    lines.push(`### ${label}${source}${model}`);
    lines.push(`- Time: ${formatTimestamp(message.createdAt)}`);
    lines.push('');
    lines.push(toBlockquote(message.content));
  }

  if (transcript.messages.length === 0) {
    lines.push('');
    lines.push('_No conversation messages have been recorded yet._');
  }

  return `${lines.join('\n')}\n`;
}

function buildSessionMemoryPrompt(transcript) {
  return [
    'Client profile context:',
    `- Name: ${transcript.clientProfile.name}`,
    `- Email: ${transcript.clientProfile.email}`,
    `- Phone: ${transcript.clientProfile.phone}`,
    'Use the profile only as supporting context.',
    'Answer the latest user question directly with a specific Samuel Studio recommendation or a direct site fact.',
    'Do not default to a package if the user is asking what Samuel Studio builds, what is included, or how the process works.',
    'Keep the tone premium, concise, and studio-led.',
  ].join('\n');
}

function buildWebsiteKnowledgePrompt() {
  return [
    'Samuel Studio knowledge base:',
    '- Samuel Studio builds custom websites for businesses, brands, creators, churches, ministries, and product-based companies.',
    '- Starter Landing Page: $300 - $500. A focused single-page site for one clear offer and a simple inquiry path.',
    '- Portfolio Website: $600 - $1,000. A polished multi-page presence for services, proof, bookings, galleries, and contact.',
    '- Brand / Campaign Website: Starting at $1,000+. A high-impact launch site for brands that need presence, storytelling, and scale.',
    '- AI Lead Assistant: from $299. Answers questions and captures leads.',
    '- SEO: from $299. Helps the site show up in search and attract more traffic.',
    '- Online Booking & Scheduling: from $249. Lets visitors book appointments or consultations.',
    '- Online Store (E-Commerce): from $499. Adds a catalog, cart, and checkout.',
    '- Content Creation Package: from $299. Covers website copy and messaging.',
    '- Website Care Plan: $49 / month. Covers monitoring, backups, minor updates, and support.',
    '- Intake form and email are available when a conversation needs human follow-up.',
  ].join('\n');
}

function buildConversationMessages(transcript) {
  return transcript.messages
    .filter((message) => message.source !== 'seed')
    .slice(-12)
    .map((message) => ({
      role: message.role,
      content: message.content,
    }));
}

function buildIntentPrimer(userText) {
  if (isProductIntent(userText)) {
    return 'Recommendation anchor: Brand / Campaign Website + Online Store. Mention SEO and Content Creation if they want to grow traffic or trust.';
  }

  if (isServiceIntent(userText) || isChurchIntent(userText)) {
    return 'Recommendation anchor: Portfolio Website.';
  }

  if (isLandingPageIntent(userText)) {
    return 'Recommendation anchor: Starter Landing Page.';
  }

  return '';
}

function buildIntentDirective(userText) {
  if (isProductIntent(userText)) {
    return [
      'Intent directive:',
      'The user is asking about a product-based or ecommerce business.',
      'Answer with Brand / Campaign Website + Online Store as the recommendation.',
      'Mention SEO and Content Creation only if helpful.',
      'Do not mention Portfolio Website.',
      'Keep the reply direct and under 3 sentences.',
    ].join('\n');
  }

  if (isServiceIntent(userText)) {
    return [
      'Intent directive:',
      'The user is asking about a service-based or local business.',
      'Answer with Portfolio Website as the recommendation.',
      'Do not mention an online store unless the user asks for products.',
      'Keep the reply direct and under 3 sentences.',
    ].join('\n');
  }

  if (isChurchIntent(userText)) {
    return [
      'Intent directive:',
      'The user is asking about a church or ministry website.',
      'Answer with Portfolio Website as the recommendation.',
      'Keep the reply direct and under 3 sentences.',
    ].join('\n');
  }

  if (isLandingPageIntent(userText)) {
    return [
      'Intent directive:',
      'The user wants one main offer or lead capture.',
      'Answer with Starter Landing Page as the recommendation.',
      'Keep the reply direct and under 3 sentences.',
    ].join('\n');
  }

  return '';
}

function isProductIntent(userText) {
  const query = userText.toLowerCase();

  return [
    'nutrition',
    'supplement',
    'supplements',
    'product',
    'products',
    'store',
    'storefront',
    'shop',
    'retail',
    'catalog',
    'e-commerce',
    'ecommerce',
  ].some((term) => query.includes(term));
}

function isServiceIntent(userText) {
  const query = userText.toLowerCase();

  return [
    'service business',
    'service-based',
    'local business',
    'small business',
    'restaurant',
    'restaurants',
    'cafe',
    'cafe',
    'coffee shop',
    'bakery',
    'catering',
    'hotel',
    'venue',
    'event venue',
    'contractor',
    'consultant',
    'consulting',
    'agency',
    'studio',
    'landscaping',
    'lawn care',
    'hvac',
    'plumbing',
    'electrician',
    'roofing',
    'painting',
    'cleaning',
    'salon',
    'salons',
    'spa',
    'barber',
    'photography',
    'photographer',
    'videography',
    'realty',
    'real estate',
    'realtor',
    'broker',
    'brokerage',
    'coach',
    'trainer',
    'clinic',
    'med spa',
    'chiropractor',
    'veterinary',
    'vet',
    'dentist',
    'doctor',
    'lawyer',
    'attorney',
    'law firm',
    'construction',
    'handyman',
    'moving',
    'fitness',
    'gym',
    'gyms',
  ].some((term) => query.includes(term));
}

function isChurchIntent(userText) {
  const query = userText.toLowerCase();

  return ['church', 'ministry', 'faith'].some((term) => query.includes(term));
}

function isLandingPageIntent(userText) {
  const query = userText.toLowerCase();

  return ['one main offer', 'lead capture', 'landing page'].some((term) => query.includes(term));
}

function buildBrandedRecommendationResponse(packageLine, detailLine, questionLine) {
  return [packageLine, detailLine, questionLine].filter(Boolean).join(' ');
}

function normalizeIntentResponse(userText, responseText) {
  if (isProductIntent(userText)) {
    return buildBrandedRecommendationResponse(
      'Brand / Campaign Website + Online Store.',
      'That gives your business a polished front and a clear path to sell. If you want traffic and conversion support, add SEO and Content Creation.',
      'Want me to outline the pages?',
    );
  }

  if (isServiceIntent(userText)) {
    return buildBrandedRecommendationResponse(
      'Portfolio Website.',
      'It gives you room for services, proof, bookings, menus, locations, and a stronger contact path.',
      'Want me to outline the pages?',
    );
  }

  if (isChurchIntent(userText)) {
    return buildBrandedRecommendationResponse(
      'Portfolio Website.',
      'It gives you a polished multi-page presence for services, events, and contact paths.',
      'Want me to outline the pages?',
    );
  }

  if (isLandingPageIntent(userText)) {
    return buildBrandedRecommendationResponse(
      'Starter Landing Page.',
      'It is the cleanest option when you want one clear offer and a simple path to inquire.',
      'Want me to outline the pages?',
    );
  }

  return responseText.trim();
}

async function writeTranscript(transcript) {
  await mkdir(dirname(logFilePath), { recursive: true });
  await mkdir(sessionDirPath, { recursive: true });
  await appendFile(logFilePath, `${JSON.stringify(transcript)}\n`, 'utf8');
  await writeFile(resolve(sessionDirPath, `${sanitizeSessionId(transcript.sessionId)}.md`), buildTranscriptMarkdown(transcript), 'utf8');
}

function buildFallbackReply(userText) {
  const query = userText.toLowerCase();

  if (query.includes('nutrition') || query.includes('supplement') || query.includes('supplements') || query.includes('product') || query.includes('products') || query.includes('store') || query.includes('storefront') || query.includes('shop') || query.includes('retail') || query.includes('catalog') || query.includes('e-commerce') || query.includes('ecommerce')) {
    return 'Brand / Campaign Website + Online Store. That gives you a polished brand front and a clear path to sell.';
  }

  if (query.includes('church') || query.includes('ministry') || query.includes('faith')) {
    return 'Portfolio Website. It gives you a polished multi-page presence for services, events, and contact paths.';
  }

  if (query.includes('service business') || query.includes('contractor') || query.includes('consultant')) {
    return 'Portfolio Website. It gives you room for services, proof, bookings, menus, locations, and a stronger contact path.';
  }

  if (query.includes('price') || query.includes('pricing') || query.includes('cost')) {
    return 'Starter Landing Page starts at $300-$500, Portfolio Website at $600-$1,000, and Brand / Campaign Website starts at $1,000+.';
  }

  if (query.includes('ai assistant') || query.includes('chat assistant') || query.includes('lead assistant')) {
    return 'AI Lead Assistant. It answers questions, helps capture leads, and points visitors toward the next step.';
  }

  if (query.includes('booking') || query.includes('schedule')) {
    return 'Online Booking & Scheduling starts at $249 and lets visitors book appointments or consultations directly from the site with confirmations and reminders.';
  }

  if (query.includes('seo') || query.includes('google')) {
    return 'SEO starts at $299 and covers keyword optimization, meta titles and descriptions, indexing setup, performance improvements, local SEO, and Search Console setup.';
  }

  if (query.includes('store') || query.includes('storefront') || query.includes('shop') || query.includes('retail') || query.includes('catalog') || query.includes('e-commerce') || query.includes('ecommerce')) {
    return 'Online Store / E-Commerce starts at $499 and includes a catalog, shopping cart, secure checkout, payment setup, inventory management, order notifications, and mobile-friendly storefront support.';
  }

  if (query.includes('content') || query.includes('copy') || query.includes('writing')) {
    return 'Content Creation Package. It starts at $299 and covers homepage copy, service page writing, about page content, calls to action, SEO-friendly formatting, and brand messaging support.';
  }

  if (query.includes('care') || query.includes('support') || query.includes('maintenance')) {
    return 'Website Care Plan. It is $49 per month and covers monitoring, security checks, backups, performance reviews, minor content updates, and priority support.';
  }

  if (query.includes('process') || query.includes('how does it work')) {
    return 'Discovery Form, Style Direction, Design & Build, Review & Refine, Launch, and Support. The intake form is the fastest way to start.';
  }

  if (query.includes('intake') || query.includes('form')) {
    return 'Send your goals, brand direction, target audience, pages you need, examples you like, timeline, and budget range.';
  }

  return 'Tell me what kind of business you are building, and I will point you to the right package or add-ons.';
}

async function maybeSendEmail(transcript) {
  if (!transcript.sendEmail) {
    return { emailed: false, reason: 'Email forwarding disabled for this transcript.' };
  }

  const email = {
    host: process.env.NOVA_SMTP_HOST,
    port: process.env.NOVA_SMTP_PORT,
    secure: process.env.NOVA_SMTP_SECURE,
    user: process.env.NOVA_SMTP_USER,
    pass: process.env.NOVA_SMTP_PASS,
    from: process.env.NOVA_EMAIL_FROM,
    to: process.env.NOVA_EMAIL_TO,
  };

  if (!email.host || !email.port || !email.from || !email.to) {
    return { emailed: false, reason: 'SMTP not configured.' };
  }

  const nodemailer = await import('nodemailer');
  const transporter = nodemailer.createTransport({
    host: email.host,
    port: Number(email.port),
    secure: email.secure === 'true',
    auth: email.user && email.pass ? { user: email.user, pass: email.pass } : undefined,
  });

  await transporter.sendMail({
    from: email.from,
    to: email.to,
    subject: `Samuel Studio chat transcript - ${transcript.sessionId}`,
    text: [
      `Nova transcript logged at ${transcript.loggedAt}`,
      `Session: ${transcript.sessionId}`,
      `Page: ${transcript.pageUrl}`,
      `Model: ${transcript.model}`,
      `Client: ${transcript.clientProfile.name} <${transcript.clientProfile.email}>`,
      `Phone: ${transcript.clientProfile.phone}`,
      '',
      ...transcript.messages.map((message) => `[${message.role}] ${message.content}`),
    ].join('\n'),
  });

  return { emailed: true, reason: 'Sent.' };
}

async function persistTranscript(transcript) {
  await writeTranscript(transcript);

  let emailResult = { emailed: false, reason: 'Email disabled.' };
  try {
    emailResult = await maybeSendEmail(transcript);
  } catch (error) {
    emailResult = {
      emailed: false,
      reason: error instanceof Error ? error.message : 'Failed to send email.',
    };
  }

  return emailResult;
}

async function callOllama(model, systemPrompt, transcript) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);
  const latestUserMessage = [...transcript.messages].reverse().find((message) => message.role === 'user');
  const intentPrimer = latestUserMessage ? buildIntentPrimer(latestUserMessage.content) : '';
  const intentDirective = latestUserMessage ? buildIntentDirective(latestUserMessage.content) : '';
  const knowledgePrompt = buildWebsiteKnowledgePrompt();

  try {
    const response = await fetch(ollamaChatUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'system', content: buildSessionMemoryPrompt(transcript) },
          { role: 'system', content: knowledgePrompt },
          ...(intentDirective ? [{ role: 'system', content: intentDirective }] : []),
          ...(intentPrimer ? [{ role: 'system', content: intentPrimer }] : []),
          ...buildConversationMessages(transcript),
        ],
        stream: false,
        think: false,
        options: {
          temperature: 0,
          top_p: 0.9,
          repeat_penalty: 1.12,
          seed: 42,
          num_predict: 220,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama request failed with status ${response.status}`);
    }

    const data = await response.json();
    const content = data.message?.content?.trim() || data.response?.trim() || '';

    if (!content) {
      throw new Error('Ollama returned an empty response.');
    }

    return {
      content,
      model,
      usedFallback: false,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

async function handleAssistantChat(req, res) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    textResponse(res, 405, 'Method Not Allowed');
    return;
  }

  const payload = await readJsonBody(req);
  const transcript = normalizeTranscript(payload);
  const hasIntake = transcript.clientProfile.name !== 'Unknown' && transcript.clientProfile.email !== 'Unknown' && transcript.clientProfile.phone !== 'Unknown';

  if (!hasIntake) {
    jsonResponse(res, 400, {
      ok: false,
      error: 'Client intake is required before chat can start.',
      needIntake: true,
    });
    return;
  }

  const latestUserMessage = [...transcript.messages].reverse().find((message) => message.role === 'user');
  const requestText = latestUserMessage?.content || '';
  const modelCandidates = Array.isArray(payload.modelCandidates) && payload.modelCandidates.length > 0 ? payload.modelCandidates : [transcript.model];
  const systemPrompt = typeof payload.systemPrompt === 'string' && payload.systemPrompt.trim() ? payload.systemPrompt.trim() : 'You are Nova, the Samuel Studio assistant.';

  let reply = null;

  for (const model of modelCandidates) {
    try {
      reply = await callOllama(model, systemPrompt, transcript);
      break;
    } catch {
      reply = null;
    }
  }

  if (!reply) {
    reply = {
      content: buildFallbackReply(requestText),
      model: modelCandidates[0] || transcript.model,
      usedFallback: true,
    };
  }

  reply.content = normalizeIntentResponse(requestText, reply.content);

  const assistantMessage = {
    id: `assistant_${Date.now()}`,
    role: 'assistant',
    content: reply.content,
    createdAt: Date.now(),
    source: reply.usedFallback ? 'fallback' : 'ollama',
    model: reply.model,
  };

  const nextTranscript = {
    ...transcript,
    model: reply.model,
    messages: [...transcript.messages, assistantMessage],
  };

  const emailResult = await persistTranscript(nextTranscript);

  jsonResponse(res, 200, {
    ok: true,
    content: reply.content,
    model: reply.model,
    usedFallback: reply.usedFallback,
    assistant: transcript.assistant,
    loggedAt: transcript.loggedAt,
    email: emailResult,
  });
}

async function handleChatLog(req, res) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    textResponse(res, 405, 'Method Not Allowed');
    return;
  }

  const payload = await readJsonBody(req);
  const transcript = normalizeTranscript(payload);
  const emailResult = await persistTranscript(transcript);

  jsonResponse(res, 200, {
    ok: true,
    stored: true,
    email: emailResult,
  });
}

const server = createServer(async (req, res) => {
  try {
    const url = req.url ? new URL(req.url, `http://${host}:${port}`) : null;

    if (!url) {
      textResponse(res, 400, 'Bad Request');
      return;
    }

    if (url.pathname === routeHealth) {
      jsonResponse(res, 200, { ok: true, service: 'chat-agent', port });
      return;
    }

    if (url.pathname === routeAssistantChat) {
      await handleAssistantChat(req, res);
      return;
    }

    if (url.pathname === routeChatLog) {
      await handleChatLog(req, res);
      return;
    }

    textResponse(res, 404, 'Not Found');
  } catch (error) {
    jsonResponse(res, 500, {
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to handle request.',
    });
  }
});

server.listen(port, host, () => {
  console.log(`Samuel Studio chat agent listening on http://${host}:${port}`);
});
