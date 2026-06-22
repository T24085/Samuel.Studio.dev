import { createServer } from 'node:http';
import { appendFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import {
  buildLocalLeadRecord,
  persistLocalLeadAction,
  persistLocalCalendarEvent,
  persistLocalLeadInbox,
  syncLocalCalendarBackup,
} from './local-calendar-store.js';
import { resolveWritableRuntimeDir } from './runtime-paths.js';
import { getSiteLabel, resolveSiteKey } from './site-registry.js';

const host = process.env.CHAT_AGENT_HOST || '127.0.0.1';
const port = Number(process.env.CHAT_AGENT_PORT || 8787);
const ollamaChatUrl = process.env.OLLAMA_CHAT_URL || 'http://127.0.0.1:11434/api/chat';
const ollamaTagsUrl = process.env.OLLAMA_TAGS_URL || ollamaChatUrl.replace(/\/api\/chat\/?$/, '/api/tags');
const routeAssistantChat = '/api/assistant-chat';
const routeChatLog = '/api/chat-log';
const routeHealth = '/health';
const defaultOllamaModelCandidates = ['gemma4:12b', 'gemma3:12b', 'llama3.1:8b', 'qwen2.5:7b'];
const defaultOwnerEmail = 'christoffersent@gmail.com';
const moduleRootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function resolveChatAgentPaths(siteKey = '') {
  const resolvedSiteKey = resolveSiteKey(siteKey);
  const rootDir = resolveWritableRuntimeDir({
    explicitDir: process.env.CHAT_AGENT_LOG_DIR || '',
    fallbackName: 'chat-agent-runtime',
    repoRoot: moduleRootDir,
    extraCandidates: [
      resolve(process.env.LOCALAPPDATA || resolve(os.homedir(), 'AppData', 'Local'), 'Samuel Studio'),
      resolve(os.tmpdir(), 'Samuel Studio'),
    ],
    scope: ['sites', resolvedSiteKey, 'chat-agent-runtime'],
  });

  return {
    siteKey: resolvedSiteKey,
    siteName: getSiteLabel(resolvedSiteKey),
    rootDir,
    logFilePath: resolve(rootDir, 'nova-chat-transcripts.ndjson'),
    sessionDirPath: resolve(rootDir, 'chat-sessions'),
    crmReportDirPath: resolve(rootDir, 'crm-reports'),
    crmLeadLogPath: resolve(rootDir, 'crm-leads.ndjson'),
  };
}

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

function uniqueStrings(values) {
  return [...new Set(values.filter((value) => typeof value === 'string' && value.trim()).map((value) => value.trim()))];
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
  const siteKey = resolveSiteKey(payload.siteKey, payload.pageUrl);

  return {
    assistant: cleanText(payload.assistant, 'Nova'),
    sessionId: cleanText(payload.sessionId, 'unknown-session'),
    pageUrl: cleanText(payload.pageUrl, 'unknown-page'),
    siteKey,
    siteName: getSiteLabel(siteKey),
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

async function fetchInstalledOllamaModels() {
  try {
    const response = await fetch(ollamaTagsUrl);

    if (!response.ok) {
      return [];
    }

    const data = await response.json();

    if (!data || !Array.isArray(data.models)) {
      return [];
    }

    return data.models
      .map((model) => (typeof model?.name === 'string' ? model.name.trim() : ''))
      .filter(Boolean);
  } catch {
    return [];
  }
}

function buildModelCandidates(payloadCandidates, transcriptModel, installedModels) {
  return uniqueStrings([
    ...(Array.isArray(payloadCandidates) ? payloadCandidates : []),
    transcriptModel,
    ...installedModels,
    ...defaultOllamaModelCandidates,
  ]);
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
    `- Site: ${transcript.siteName || transcript.siteKey || 'Unknown'}`,
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

function getConversationMessages(transcript) {
  return transcript.messages.filter((message) => message.source !== 'seed');
}

function getLatestUserMessage(transcript) {
  return [...transcript.messages].reverse().find((message) => message.role === 'user');
}

function getLatestAssistantMessage(transcript) {
  return [...transcript.messages].reverse().find((message) => message.role === 'assistant');
}

function cleanLeadPhrase(value) {
  return value
    .replace(/\s+/g, ' ')
    .replace(/^[\s"'“”‘’\-–—:]+/, '')
    .replace(/[\s"'“”‘’\-–—:]+$/, '')
    .trim();
}

function isGenericLeadPhrase(value) {
  const lower = value.toLowerCase();
  const genericTerms = [
    'website',
    'web site',
    'site',
    'page',
    'pages',
    'landing page',
    'portfolio website',
    'store',
    'shop',
    'ecommerce',
    'e-commerce',
    'business',
    'brand',
    'project',
    'package',
    'service',
    'services',
    'booking',
    'calendar',
    'copy',
    'content',
  ];

  return genericTerms.some((term) => lower === term || lower.includes(` ${term} `) || lower.startsWith(`${term} `) || lower.endsWith(` ${term}`));
}

function splitLeadFragments(value) {
  return value
    .split(/(?:,|\/|&|\band\b|\bor\b|\bplus\b)/i)
    .map(cleanLeadPhrase)
    .filter(Boolean);
}

function inferProjectConsiderationFromText(userText) {
  if (isProductIntent(userText)) {
    return 'Business Growth Website + Sell Products or Services Online';
  }

  if (isServiceIntent(userText) || isChurchIntent(userText)) {
    return 'Professional Website';
  }

  if (isLandingPageIntent(userText)) {
    return 'Starter Website';
  }

  const lower = userText.toLowerCase();

  if (lower.includes('booking') || lower.includes('schedule') || lower.includes('appointment')) {
    return 'Professional Website + Let Customers Schedule Online';
  }

  if (lower.includes('seo') || lower.includes('google')) {
    return 'Get Found on Google';
  }

  if (lower.includes('content') || lower.includes('copy') || lower.includes('writing')) {
    return 'Website Copy & Content Help';
  }

  return '';
}

function extractProductInterests(transcript) {
  const userText = transcript.messages
    .filter((message) => message.role === 'user')
    .map((message) => message.content)
    .join(' ');

  if (!userText.trim()) {
    return [];
  }

  const patterns = [
    /\b(?:i\s+sell|we\s+sell|selling|sell|offer|offering|carry|carrying|stock|stocks)\s+(?:a|an|the|some|new)?\s*([^.!?]{3,140})/gi,
    /\b(?:interested in|looking for|need|want|consider(?:ing)?|exploring|shopping for)\s+(?:a|an|the|some|new)?\s*([^.!?]{3,140})/gi,
    /\b(?:products? like|product line(?: includes)?|my products? include|our products? include)\s*([^.!?]{3,140})/gi,
  ];

  const products = new Set();

  for (const pattern of patterns) {
    pattern.lastIndex = 0;

    let match = pattern.exec(userText);
    while (match) {
      const fragments = splitLeadFragments(match[1]);
      for (const fragment of fragments) {
        if (fragment.length < 2 || isGenericLeadPhrase(fragment)) {
          continue;
        }

        products.add(fragment);
      }

      match = pattern.exec(userText);
    }
  }

  return [...products].slice(0, 6);
}

function collectUserConversationText(transcript) {
  return transcript.messages
    .filter((message) => message.role === 'user')
    .map((message) => message.content)
    .join(' ');
}

function firstTextMatch(text, patterns) {
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match) {
      return cleanLeadPhrase(match[1] || match[0]);
    }
  }

  return '';
}

function extractKeywordLabels(text, entries) {
  return uniqueStrings(entries.filter((entry) => entry.pattern.test(text)).map((entry) => entry.label));
}

function extractProjectBrief(transcript) {
  const userText = collectUserConversationText(transcript);
  const lowered = userText.toLowerCase();
  const projectGoals = extractKeywordLabels(userText, [
    { pattern: /\b(more leads?|lead generation|inquiries?|quotes?|estimates?|consults?|consultations?)\b/i, label: 'generate more leads' },
    { pattern: /\b(bookings?|appointments?|scheduling|schedule online)\b/i, label: 'get more bookings' },
    { pattern: /\b(sales?|sell more|checkout|orders?|store|shop|ecommerce|e-commerce)\b/i, label: 'sell products or services online' },
    { pattern: /\b(redesign|rebrand|refresh|new site|new website|modernize|upgrade)\b/i, label: 'refresh the brand and website' },
    { pattern: /\b(launch|go live|publish)\b/i, label: 'launch the site' },
    { pattern: /\b(traffic|seo|google|search visibility)\b/i, label: 'increase visibility and SEO' },
    { pattern: /\b(trust|professional|credible|premium)\b/i, label: 'build trust and credibility' },
  ]);

  const projectPages = extractKeywordLabels(userText, [
    { pattern: /\b(home|homepage)\b/i, label: 'Home' },
    { pattern: /\b(about|about us)\b/i, label: 'About' },
    { pattern: /\b(services|service pages?)\b/i, label: 'Services' },
    { pattern: /\b(pricing|packages)\b/i, label: 'Pricing' },
    { pattern: /\b(contact|contact us)\b/i, label: 'Contact' },
    { pattern: /\b(gallery|portfolio)\b/i, label: 'Gallery / Portfolio' },
    { pattern: /\b(blog|articles?)\b/i, label: 'Blog' },
    { pattern: /\b(faq|questions)\b/i, label: 'FAQ' },
    { pattern: /\b(booking|schedule|appointments?)\b/i, label: 'Booking' },
    { pattern: /\b(shop|store|catalog|product pages?)\b/i, label: 'Shop / Catalog' },
    { pattern: /\b(testimonials?|reviews?)\b/i, label: 'Testimonials' },
  ]);

  const projectFeatures = extractKeywordLabels(userText, [
    { pattern: /\b(booking|calendar|schedule)\b/i, label: 'Booking' },
    { pattern: /\b(checkout|payment|payments|stripe|shop pay|paypal)\b/i, label: 'Payments' },
    { pattern: /\b(ecommerce|e-commerce|store|shop|catalog|inventory)\b/i, label: 'Storefront' },
    { pattern: /\b(forms?|lead capture|contact form|quote form)\b/i, label: 'Lead capture forms' },
    { pattern: /\b(SEO|search engine optimization|google)\b/i, label: 'SEO' },
    { pattern: /\b(newsletter|email list|mailing list)\b/i, label: 'Email list' },
    { pattern: /\b(blog|news|articles?)\b/i, label: 'Blog' },
    { pattern: /\b(multilingual|languages?)\b/i, label: 'Multilingual support' },
    { pattern: /\b(automation|crm|integrations?)\b/i, label: 'Automation / integrations' },
    { pattern: /\b(photo gallery|gallery|portfolio)\b/i, label: 'Gallery' },
  ]);

  const projectExamples = uniqueStrings([
    firstTextMatch(userText, [
      /\b(?:like|similar to|inspired by|modeled after|want(?: it)? to look like|examples? like)\s+([^.!?]{3,100})/i,
      /\b(?:reference|references|inspiration)\s*:?\s*([^.!?]{3,100})/i,
    ]),
  ]);

  const projectAudience = firstTextMatch(userText, [
    /\btarget audience(?: is|:)?\s*([^.!?]{3,90})/i,
    /\bideal customer(?: is|:)?\s*([^.!?]{3,90})/i,
    /\bwe serve\s+([^.!?]{3,90})/i,
    /\bfor\s+(?:small businesses?|product brands?|service businesses?|churches?|ministries?|local clients?|homeowners?|families?|patients?|students?|members?|shoppers?|customers?)\s*([^.!?]{0,50})/i,
  ]);

  const projectTimeline = firstTextMatch(userText, [
    /\b(?:by|before)\s+([^.!?]{3,40})/i,
    /\b(?:next week|next month|this month|this quarter|as soon as possible|asap|soon)\b/i,
    /\bin\s+\d+\s+(?:days?|weeks?|months?)\b/i,
  ]);

  const projectBudget = firstTextMatch(userText, [
    /\$\s?\d[\d,]*(?:\s*(?:-|to|–)\s*\$\s?\d[\d,]*)?/i,
    /\bbudget(?: range)?(?: is|:)?\s*([^.!?]{3,40})/i,
    /\b(?:around|under|over)\s+\$?\d[\d,]*(?:\s*(?:-|to|–)\s*\$?\d[\d,]*)?/i,
  ]);

  const decisionMaker = firstTextMatch(userText, [
    /\b(?:i(?:'m| am)?|we(?:'re| are)?)\s+(?:the\s+)?(?:owner|founder|decision maker|operator)\b/i,
    /\b(?:my|our)\s+(?:partner|team|client|boss)\b/i,
  ]);

  const currentWebsite = firstTextMatch(userText, [
    /\b(?:current|existing|old)\s+(?:website|site)\s*[:\-]?\s*([^.!?]{3,80})/i,
    /\b(?:no website|no current website|starting from scratch|from scratch)\b/i,
    /\b(?:redesign|rebuild|replace)\s+(?:my|our)?\s*(?:website|site)\b/i,
  ]);

  const pageCount = firstTextMatch(userText, [
    /\b(\d+)\s+pages?\b/i,
  ]);

  return {
    projectGoals,
    projectPages,
    projectFeatures,
    projectExamples,
    projectAudience,
    projectTimeline,
    projectBudget,
    decisionMaker,
    currentWebsite,
    pageCount,
  };
}

function describeProjectBrief(brief) {
  const parts = [];

  if (brief.projectGoals.length) {
    parts.push(`goal: ${brief.projectGoals.join(', ')}`);
  }

  if (brief.projectPages.length) {
    parts.push(`pages: ${brief.projectPages.join(', ')}`);
  }

  if (brief.projectFeatures.length) {
    parts.push(`features: ${brief.projectFeatures.join(', ')}`);
  }

  if (brief.projectAudience) {
    parts.push(`audience: ${brief.projectAudience}`);
  }

  if (brief.projectTimeline) {
    parts.push(`timeline: ${brief.projectTimeline}`);
  }

  if (brief.projectBudget) {
    parts.push(`budget: ${brief.projectBudget}`);
  }

  if (brief.projectExamples.length) {
    parts.push(`examples: ${brief.projectExamples.join(', ')}`);
  }

  if (brief.decisionMaker) {
    parts.push(`decision maker: ${brief.decisionMaker}`);
  }

  if (brief.currentWebsite) {
    parts.push(`current website: ${brief.currentWebsite}`);
  }

  if (brief.pageCount) {
    parts.push(`page count: ${brief.pageCount}`);
  }

  return parts.join(' · ');
}

function missingProjectBriefFields(brief) {
  const missing = [];

  if (!brief.projectGoals.length) missing.push('goal');
  if (!brief.projectPages.length) missing.push('pages');
  if (!brief.projectAudience) missing.push('audience');
  if (!brief.projectTimeline) missing.push('timeline');
  if (!brief.projectBudget) missing.push('budget');
  if (!brief.projectFeatures.length) missing.push('features');
  if (!brief.projectExamples.length) missing.push('examples');
  if (!brief.decisionMaker) missing.push('decision maker');
  if (!brief.currentWebsite) missing.push('current website');

  return missing;
}

function buildProjectIntakePrompt(transcript) {
  const brief = extractProjectBrief(transcript);
  const known = describeProjectBrief(brief) || 'nothing specific yet';
  const missing = missingProjectBriefFields(brief);

  return [
    'Project intake directive:',
    `Known so far: ${known}.`,
    `Missing: ${missing.length ? missing.join(', ') : 'none'}.`,
    'Ask one concise follow-up question that captures the highest-value missing details.',
    'Prefer goal, pages, audience, timeline, budget, features, examples, decision maker, and current website.',
    'If several are missing, combine them into one easy-to-answer sentence.',
    'Do not turn this into a long questionnaire.',
  ].join('\n');
}

function analyzeLead(transcript) {
  const conversationMessages = getConversationMessages(transcript);
  const latestUserMessage = getLatestUserMessage(transcript);
  const latestAssistantMessage = getLatestAssistantMessage(transcript);
  const productInterests = extractProductInterests(transcript);
  const projectBrief = extractProjectBrief(transcript);

  let projectConsideration = '';
  for (const message of [...transcript.messages].reverse()) {
    if (message.role !== 'user') {
      continue;
    }

    const inferredProject = inferProjectConsiderationFromText(message.content);
    if (inferredProject) {
      projectConsideration = inferredProject;
      break;
    }
  }

  if (!projectConsideration) {
    projectConsideration = 'Needs follow-up';
  }

  const productLine = productInterests.length ? productInterests.join(', ') : 'Not explicitly mentioned';
  const latestUserLine = latestUserMessage ? latestUserMessage.content : 'No user question captured yet.';
  const projectBriefSummary = describeProjectBrief(projectBrief);
  const summaryParts = [`${transcript.clientProfile.name} is discussing ${projectConsideration.toLowerCase()}.`];
  if (productInterests.length) {
    summaryParts.push(`Products mentioned: ${productLine}.`);
  }
  if (projectBriefSummary) {
    summaryParts.push(`Project brief: ${projectBriefSummary}.`);
  }
  const summary = summaryParts.join(' ');

  const missingBrief = missingProjectBriefFields(projectBrief);

  return {
    customerName: transcript.clientProfile.name,
    customerEmail: transcript.clientProfile.email,
    customerPhone: transcript.clientProfile.phone,
    sessionId: transcript.sessionId,
    pageUrl: transcript.pageUrl,
    siteKey: transcript.siteKey,
    siteName: transcript.siteName,
    loggedAt: transcript.loggedAt,
    receivedAt: transcript.receivedAt,
    model: transcript.model,
    projectConsideration,
    productInterests,
    projectBrief,
    latestUserMessage: latestUserLine,
    latestAssistantMessage: latestAssistantMessage ? latestAssistantMessage.content : '',
    summary,
    nextStep: missingBrief.length
      ? `Ask for the ${missingBrief.slice(0, 3).join(', ')}.`
      : 'Confirm the scope, timeline, and next step.',
    messageCount: conversationMessages.length,
  };
}

function assessLeadQuality(transcript, lead) {
  const userMessages = transcript.messages.filter((message) => message.role === 'user');
  const allUserText = userMessages.map((message) => message.content).join(' ').toLowerCase();
  const latestUserText = lead.latestUserMessage.toLowerCase();
  const reasons = [];
  let score = 0;

  if (lead.customerName !== 'Unknown' && lead.customerEmail !== 'Unknown' && lead.customerPhone !== 'Unknown') {
    score += 25;
    reasons.push('contact details confirmed');
  }

  if (lead.projectConsideration !== 'Needs follow-up') {
    score += 20;
    reasons.push(`project identified: ${lead.projectConsideration}`);
  }

  if (lead.productInterests.length > 0) {
    score += 15;
    reasons.push(`products mentioned: ${lead.productInterests.join(', ')}`);
  }

  if (lead.projectBrief.projectGoals.length > 0) {
    score += 5;
    reasons.push(`project goals: ${lead.projectBrief.projectGoals.join(', ')}`);
  }

  if (lead.projectBrief.projectPages.length > 0) {
    score += 5;
    reasons.push(`pages discussed: ${lead.projectBrief.projectPages.join(', ')}`);
  }

  if (lead.projectBrief.projectAudience) {
    score += 5;
    reasons.push(`audience identified: ${lead.projectBrief.projectAudience}`);
  }

  if (lead.projectBrief.projectTimeline) {
    score += 5;
    reasons.push(`timeline mentioned: ${lead.projectBrief.projectTimeline}`);
  }

  if (lead.projectBrief.projectBudget) {
    score += 5;
    reasons.push(`budget mentioned: ${lead.projectBrief.projectBudget}`);
  }

  if (lead.projectBrief.projectFeatures.length > 0) {
    score += 5;
    reasons.push(`features mentioned: ${lead.projectBrief.projectFeatures.join(', ')}`);
  }

  if (lead.projectBrief.projectExamples.length > 0) {
    score += 5;
    reasons.push(`examples mentioned: ${lead.projectBrief.projectExamples.join(', ')}`);
  }

  if (lead.projectBrief.decisionMaker) {
    score += 3;
    reasons.push(`decision maker identified: ${lead.projectBrief.decisionMaker}`);
  }

  if (lead.projectBrief.currentWebsite) {
    score += 3;
    reasons.push(`current website identified: ${lead.projectBrief.currentWebsite}`);
  }

  if (lead.projectBrief.pageCount) {
    score += 2;
    reasons.push(`page count mentioned: ${lead.projectBrief.pageCount}`);
  }

  if (userMessages.length >= 2) {
    score += 10;
    reasons.push('more than one user message');
  }

  if (userMessages.length >= 3) {
    score += 5;
    reasons.push('deeper conversation depth');
  }

  if (latestUserText.length >= 80) {
    score += 10;
    reasons.push('detailed final question');
  }

  const decisionSignals = ['budget', 'pricing', 'price', 'quote', 'estimate', 'timeline', 'deadline', 'launch', 'ready', 'book', 'booking', 'schedule', 'checkout', 'inventory', 'pages', 'proposal'];
  const hasDecisionSignal = decisionSignals.some((term) => allUserText.includes(term));
  if (hasDecisionSignal) {
    score += 15;
    reasons.push('decision signal present');
  }

  const qualificationPhrases = ['need a website', 'looking for a website', 'need a redesign', 'need a shop', 'need a store', 'interested in', 'want to build', 'considering'];
  const hasQualificationPhrase = qualificationPhrases.some((phrase) => allUserText.includes(phrase));
  if (hasQualificationPhrase) {
    score += 10;
    reasons.push('explicit buying intent');
  }

  if (allUserText.length > 240) {
    score += 5;
    reasons.push('substantial conversation length');
  }

  const qualifiedForCalendar = score >= 70 && lead.projectConsideration !== 'Needs follow-up' && userMessages.length >= 2;
  const disposition = qualifiedForCalendar ? 'qualified' : score >= 45 ? 'hold' : 'unqualified';

  return {
    score,
    qualifiedForCalendar,
    disposition,
    reasons,
  };
}

function formatIcsTimestamp(date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function escapeIcsText(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function formatProjectBriefBullets(brief) {
  return [
    ['Goal', brief.projectGoals.length ? brief.projectGoals.join(', ') : 'Not specified'],
    ['Audience', brief.projectAudience || 'Not specified'],
    ['Pages', brief.projectPages.length ? brief.projectPages.join(', ') : 'Not specified'],
    ['Timeline', brief.projectTimeline || 'Not specified'],
    ['Budget', brief.projectBudget || 'Not specified'],
    ['Features', brief.projectFeatures.length ? brief.projectFeatures.join(', ') : 'Not specified'],
    ['Examples', brief.projectExamples.length ? brief.projectExamples.join(', ') : 'Not specified'],
    ['Decision Maker', brief.decisionMaker || 'Not specified'],
    ['Current Site', brief.currentWebsite || 'Not specified'],
    ['Page Count', brief.pageCount || 'Not specified'],
  ];
}

function buildCalendarEventIcs(transcript, lead, quality) {
  const start = new Date(transcript.receivedAt);
  const end = new Date(start.getTime() + 30 * 60 * 1000);
  const summary = `Qualified lead - ${lead.customerName} - ${lead.projectConsideration}`;
  const description = [
    `Customer: ${lead.customerName}`,
    `Email: ${lead.customerEmail}`,
    `Phone: ${lead.customerPhone}`,
    `Session: ${lead.sessionId}`,
    `Page: ${lead.pageUrl}`,
    `Products: ${lead.productInterests.length ? lead.productInterests.join(', ') : 'Not explicitly mentioned'}`,
    `Project: ${lead.projectConsideration}`,
    `Goal: ${lead.projectBrief.projectGoals.length ? lead.projectBrief.projectGoals.join(', ') : 'Not specified'}`,
    `Audience: ${lead.projectBrief.projectAudience || 'Not specified'}`,
    `Pages: ${lead.projectBrief.projectPages.length ? lead.projectBrief.projectPages.join(', ') : 'Not specified'}`,
    `Timeline: ${lead.projectBrief.projectTimeline || 'Not specified'}`,
    `Budget: ${lead.projectBrief.projectBudget || 'Not specified'}`,
    `Features: ${lead.projectBrief.projectFeatures.length ? lead.projectBrief.projectFeatures.join(', ') : 'Not specified'}`,
    `Decision Maker: ${lead.projectBrief.decisionMaker || 'Not specified'}`,
    `Current Site: ${lead.projectBrief.currentWebsite || 'Not specified'}`,
    `Page Count: ${lead.projectBrief.pageCount || 'Not specified'}`,
    `Quality score: ${quality.score}/100`,
    `Disposition: ${quality.disposition}`,
    `Reasons: ${quality.reasons.length ? quality.reasons.join('; ') : 'None'}`,
    `Summary: ${lead.summary}`,
  ].join('\n');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Samuel Studio//CRM Lead Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${escapeIcsText(`${lead.sessionId}-${lead.siteKey || transcript.siteKey || 'site'}@samuel.studio`)}`,
    `DTSTAMP:${formatIcsTimestamp(new Date(transcript.receivedAt))}`,
    `DTSTART:${formatIcsTimestamp(start)}`,
    `DTEND:${formatIcsTimestamp(end)}`,
    `SUMMARY:${escapeIcsText(summary)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    'LOCATION:Online chat',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

function buildCrmReportMarkdown(transcript, lead, quality, calendarSync) {
  const lines = [
    '# CRM Lead Report',
    '',
    `- Customer: ${lead.customerName}`,
    `- Email: ${lead.customerEmail}`,
    `- Phone: ${lead.customerPhone}`,
    `- Session ID: ${lead.sessionId}`,
    `- Logged At: ${lead.loggedAt}`,
    `- Received At: ${lead.receivedAt}`,
    `- Page URL: ${lead.pageUrl}`,
    `- Site: ${lead.siteName || lead.siteKey || transcript.siteName || transcript.siteKey || 'Unknown'}`,
    `- Model: ${lead.model}`,
    `- Project Considering: ${lead.projectConsideration}`,
    `- Products Interested In: ${lead.productInterests.length ? lead.productInterests.join(', ') : 'Not explicitly mentioned'}`,
    `- Project Goal: ${lead.projectBrief.projectGoals.length ? lead.projectBrief.projectGoals.join(', ') : 'Not specified'}`,
    `- Audience: ${lead.projectBrief.projectAudience || 'Not specified'}`,
    `- Pages: ${lead.projectBrief.projectPages.length ? lead.projectBrief.projectPages.join(', ') : 'Not specified'}`,
    `- Timeline: ${lead.projectBrief.projectTimeline || 'Not specified'}`,
    `- Budget: ${lead.projectBrief.projectBudget || 'Not specified'}`,
    `- Features: ${lead.projectBrief.projectFeatures.length ? lead.projectBrief.projectFeatures.join(', ') : 'Not specified'}`,
    `- Examples: ${lead.projectBrief.projectExamples.length ? lead.projectBrief.projectExamples.join(', ') : 'Not specified'}`,
    `- Decision Maker: ${lead.projectBrief.decisionMaker || 'Not specified'}`,
    `- Current Site: ${lead.projectBrief.currentWebsite || 'Not specified'}`,
    `- Page Count: ${lead.projectBrief.pageCount || 'Not specified'}`,
    `- CRM Status: ${lead.crmStatus || 'new'}`,
    `- Owner: ${lead.owner || 'Chris'}`,
    `- Follow-up: ${lead.followUpAt || 'Not scheduled'}`,
    `- Message Count: ${lead.messageCount}`,
    `- Lead Quality: ${quality.disposition}`,
    `- Quality Score: ${quality.score}/100`,
    `- Quality Reasons: ${quality.reasons.length ? quality.reasons.join('; ') : 'None'}`,
    `- Calendar Sync: ${calendarSync.synced ? 'Created in local calendar' : `Skipped (${calendarSync.reason})`}`,
    `- Calendar Backup: ${calendarSync.backup?.synced ? `Copied to ${calendarSync.backup.backupDir}` : `Skipped (${calendarSync.backup?.reason || 'No backup destination found.'})`}`,
    '',
    '## Summary',
    '',
    lead.summary,
    '',
    '## Next Step',
    '',
    lead.nextStep,
    '',
    '## Project Brief',
    '',
    ...formatProjectBriefBullets(lead.projectBrief).flatMap(([label, value]) => [`- ${label}: ${value}`]),
    '',
    '## Latest User Message',
    '',
    lead.latestUserMessage ? toBlockquote(lead.latestUserMessage) : '_No user message captured yet._',
    '',
    '## Latest Assistant Message',
    '',
    lead.latestAssistantMessage ? toBlockquote(lead.latestAssistantMessage) : '_No assistant response captured yet._',
    '',
    '## Conversation',
  ];

  for (const message of transcript.messages.filter((message) => message.source !== 'seed')) {
    const label = message.role === 'user' ? 'Client' : 'Nova';
    const source = message.source ? ` (${message.source})` : '';
    const model = message.model ? ` · ${message.model}` : '';

    lines.push('');
    lines.push(`### ${label}${source}${model}`);
    lines.push(`- Time: ${formatTimestamp(message.createdAt)}`);
    lines.push('');
    lines.push(toBlockquote(message.content));
  }

  return `${lines.join('\n')}\n`;
}

async function writeCrmArtifacts(transcript) {
  const lead = analyzeLead(transcript);
  const quality = assessLeadQuality(transcript, lead);
  const crmPaths = resolveChatAgentPaths(transcript.siteKey);

  try {
    await mkdir(crmPaths.crmReportDirPath, { recursive: true });
    await appendFile(crmPaths.crmLeadLogPath, `${JSON.stringify({ ...lead, quality, siteKey: crmPaths.siteKey, siteName: crmPaths.siteName })}\n`, 'utf8');
  } catch (error) {
    console.warn('CRM artifact persistence skipped:', error instanceof Error ? error.message : error);
  }
  return {
    lead,
    quality,
    crmPaths,
  };
}

function buildCrmEmailBody(transcript, lead, quality, calendarSync) {
  return [
    'Samuel Studio CRM lead report',
    '',
    `Customer: ${lead.customerName}`,
    `Email: ${lead.customerEmail}`,
    `Phone: ${lead.customerPhone}`,
    `Session: ${lead.sessionId}`,
    `Page: ${lead.pageUrl}`,
    `Site: ${lead.siteName || lead.siteKey || transcript.siteName || transcript.siteKey || 'Unknown'}`,
    `Project considering: ${lead.projectConsideration}`,
    `Products interested in: ${lead.productInterests.length ? lead.productInterests.join(', ') : 'Not explicitly mentioned'}`,
    `Decision maker: ${lead.projectBrief.decisionMaker || 'Not specified'}`,
    `Current site: ${lead.projectBrief.currentWebsite || 'Not specified'}`,
    `CRM status: ${lead.crmStatus || 'new'}`,
    `Owner: ${lead.owner || 'Chris'}`,
    `Follow-up: ${lead.followUpAt || 'Not scheduled'}`,
    `Lead quality: ${quality.disposition} (${quality.score}/100)`,
    `Quality reasons: ${quality.reasons.length ? quality.reasons.join('; ') : 'None'}`,
    `Calendar sync: ${calendarSync.synced ? `Created in local calendar (${calendarSync.approvalStatus === 'pending' ? 'pending human approval' : 'approved'})` : `Skipped (${calendarSync.reason})`}`,
    `Backup: ${calendarSync.backup?.synced ? `Copied to ${calendarSync.backup.backupDir}` : `Skipped (${calendarSync.backup?.reason || 'No backup destination found.'})`}`,
    '',
    lead.summary,
    '',
    'Conversation summary',
    `- Latest user message: ${lead.latestUserMessage}`,
    `- Latest assistant message: ${lead.latestAssistantMessage || 'None'}`,
    `- Messages captured: ${lead.messageCount}`,
    '',
    `Calendar events are only created for qualified leads. This lead was ${quality.qualifiedForCalendar ? 'added to the local calendar and left pending human approval' : 'kept out of calendar sync'} for quality control.`,
  ].join('\n');
}

function buildSessionMemoryPrompt(transcript) {
  const projectBrief = extractProjectBrief(transcript);
  const projectBriefSummary = describeProjectBrief(projectBrief) || 'nothing specific yet';
  const missingProjectDetails = missingProjectBriefFields(projectBrief);

  return [
    'Client profile context:',
    `- Name: ${transcript.clientProfile.name}`,
    `- Email: ${transcript.clientProfile.email}`,
    `- Phone: ${transcript.clientProfile.phone}`,
    'Use the profile only as supporting context.',
    `Project brief so far: ${projectBriefSummary}.`,
    `Still missing: ${missingProjectDetails.length ? missingProjectDetails.join(', ') : 'none'}.`,
    'Ask for missing project brief details before wrapping up the conversation.',
    'Answer the latest user question directly with a specific Samuel Studio recommendation or a direct site fact.',
    'Do not default to a package if the user is asking what Samuel Studio builds, what is included, or how the process works.',
    'Keep the tone premium, concise, and studio-led.',
  ].join('\n');
}

function buildWebsiteKnowledgePrompt() {
  return [
    'Samuel Studio knowledge base:',
    '- Samuel Studio builds custom websites for businesses, brands, creators, churches, ministries, and product-based companies.',
    '- Starter Website: Starting at $499. A clean, professional website for a simple online presence.',
    '- Professional Website: Starting at $999. A full business website built to show services, build trust, and turn visitors into customers.',
    '- Business Growth Website: Starting at $1,999. A premium website built for leads, automation, booking, and stronger online growth.',
    '- Get Found on Google: from $149. Search optimization, page titles and descriptions, local search setup, and indexing support.',
    '- Never Miss a Lead: from $299. AI chat assistant that answers questions and captures leads 24/7.',
    '- Let Customers Schedule Online: from $199. Booking calendar, confirmations, reminders, and calendar integration.',
    '- Sell Products or Services Online: from $399. Product catalog, cart, checkout, payments, and order notifications.',
    '- Website Copy & Content Help: from $199. Homepage copy, service page copy, about page writing, and calls to action.',
    '- Keep My Website Updated: from $49/month. Website monitoring, security checks, backups, and minor content updates.',
    '- Priority Website Care: from $100/month subscription. Monthly support with faster response and more hands-on help.',
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
    return 'Recommendation anchor: Business Growth Website. Mention Sell Products or Services Online when checkout, payments, or digital delivery are needed. After the recommendation, ask one short follow-up question about goals, pages, timeline, budget, audience, or features that are still missing.';
  }

  if (isServiceIntent(userText) || isChurchIntent(userText)) {
    return 'Recommendation anchor: Professional Website. Mention Let Customers Schedule Online when booking is part of the project. After the recommendation, ask one short follow-up question about goals, pages, timeline, budget, audience, or features that are still missing.';
  }

  if (isLandingPageIntent(userText)) {
    return 'Recommendation anchor: Starter Website. After the recommendation, ask one short follow-up question about goals, pages, timeline, budget, audience, or features that are still missing.';
  }

  return '';
}

function buildIntentDirective(userText) {
  if (isProductIntent(userText)) {
    return [
      'Intent directive:',
      'The user is asking about a product-based or ecommerce business.',
      'Answer with Business Growth Website as the recommendation.',
      'Mention Sell Products or Services Online only if helpful.',
      'Do not mention Starter Website or Professional Website unless the user asks for alternatives.',
      'Keep the reply direct and under 3 sentences.',
      'Then ask one short follow-up question that gathers the biggest missing project brief detail.',
    ].join('\n');
  }

  if (isServiceIntent(userText)) {
    return [
      'Intent directive:',
      'The user is asking about a service-based or local business.',
      'Answer with Professional Website as the recommendation.',
      'Mention Let Customers Schedule Online only if booking is part of the project.',
      'Keep the reply direct and under 3 sentences.',
      'Then ask one short follow-up question that gathers the biggest missing project brief detail.',
    ].join('\n');
  }

  if (isChurchIntent(userText)) {
    return [
      'Intent directive:',
      'The user is asking about a church or ministry website.',
      'Answer with Professional Website as the recommendation.',
      'Keep the reply direct and under 3 sentences.',
      'Then ask one short follow-up question that gathers the biggest missing project brief detail.',
    ].join('\n');
  }

  if (isLandingPageIntent(userText)) {
    return [
      'Intent directive:',
      'The user wants one main offer or lead capture.',
      'Answer with Starter Website as the recommendation.',
      'Keep the reply direct and under 3 sentences.',
      'Then ask one short follow-up question that gathers the biggest missing project brief detail.',
    ].join('\n');
  }

  return '';
}

function isProductIntent(userText) {
  const query = userText.toLowerCase();
  const foodBusinessSignals = ['bakery', 'restaurant', 'restaurants', 'cafe', 'coffee shop', 'catering', 'food truck'];
  const orderingSignals = ['ordering', 'order online', 'online order', 'online ordering', 'delivery', 'pickup', 'takeout', 'menu', 'menus', 'checkout', 'catalog'];

  const hasProductSignals = [
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

  const hasFoodOrderingSignals = foodBusinessSignals.some((term) => query.includes(term))
    && orderingSignals.some((term) => query.includes(term));

  return hasProductSignals || hasFoodOrderingSignals;
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
      'Business Growth Website.',
      'That gives your business a polished front and a clear path to grow. If you need checkout, payments, or digital delivery, add Sell Products or Services Online.',
      'What products matter most, what pages do you need, and when do you want it live?',
    );
  }

  if (isServiceIntent(userText)) {
    return buildBrandedRecommendationResponse(
      'Professional Website.',
      'It gives you room for services, proof, menus, locations, and a stronger contact path.',
      'What services, pages, and launch timing should I note?',
    );
  }

  if (isChurchIntent(userText)) {
    return buildBrandedRecommendationResponse(
      'Professional Website.',
      'It gives you a polished multi-page presence for services, events, and contact paths.',
      'What ministries, pages, and launch timing should I note?',
    );
  }

  if (isLandingPageIntent(userText)) {
    return buildBrandedRecommendationResponse(
      'Starter Website.',
      'It is the cleanest option when you want a simple online presence and a direct path to inquire.',
      'What is the goal, and what offer or pages should I capture?',
    );
  }

  return responseText.trim();
}

async function writeTranscript(transcript) {
  const chatPaths = resolveChatAgentPaths(transcript.siteKey);
  try {
    await mkdir(dirname(chatPaths.logFilePath), { recursive: true });
    await mkdir(chatPaths.sessionDirPath, { recursive: true });
    await appendFile(chatPaths.logFilePath, `${JSON.stringify(transcript)}\n`, 'utf8');
    await writeFile(resolve(chatPaths.sessionDirPath, `${sanitizeSessionId(transcript.sessionId)}.md`), buildTranscriptMarkdown(transcript), 'utf8');
  } catch (error) {
    console.warn('Transcript persistence skipped:', error instanceof Error ? error.message : error);
  }
}

function buildFallbackReply(userText) {
  const query = userText.toLowerCase();

  if (query.includes('nutrition') || query.includes('supplement') || query.includes('supplements') || query.includes('product') || query.includes('products') || query.includes('store') || query.includes('storefront') || query.includes('shop') || query.includes('retail') || query.includes('catalog') || query.includes('e-commerce') || query.includes('ecommerce')) {
    return 'Business Growth Website. That gives you a polished front and a clear path to grow. If you need checkout or payments, add Sell Products or Services Online. What products matter most, what pages do you need, and when do you want it live?';
  }

  if (query.includes('church') || query.includes('ministry') || query.includes('faith')) {
    return 'Professional Website. It gives you a polished multi-page presence for services, events, and contact paths. What ministries, pages, and launch timing should I capture?';
  }

  if (query.includes('service business') || query.includes('contractor') || query.includes('consultant')) {
    return 'Professional Website. It gives you room for services, proof, menus, locations, and a stronger contact path. What services, pages, and launch timing should I capture?';
  }

  if (query.includes('price') || query.includes('pricing') || query.includes('cost')) {
    return 'Starter Website starts at $499, Professional Website starts at $999, and Business Growth Website starts at $1,999. Common add-ons include Get Found on Google from $149, Never Miss a Lead from $299, Let Customers Schedule Online from $199, Sell Products or Services Online from $399, Website Copy & Content Help from $199, Keep My Website Updated at $49/month, and Priority Website Care as a separate $100/month subscription. What kind of project are you pricing, and what budget range should I note?';
  }

  if (query.includes('ai assistant') || query.includes('chat assistant') || query.includes('lead assistant')) {
    return 'Never Miss a Lead. It answers questions, helps capture leads, and points visitors toward the next step. What should it collect, and what project is it supporting?';
  }

  if (query.includes('booking') || query.includes('schedule')) {
    return 'Let Customers Schedule Online starts at $199 and lets visitors book appointments or consultations directly from the site with confirmations, reminders, and calendar integration. What appointment types, pages, and timeline should I note?';
  }

  if (query.includes('seo') || query.includes('google')) {
    return 'Get Found on Google starts at $149 and covers page titles, descriptions, local search setup, indexing support, and search-friendly structure. What pages, audience, and budget range should I capture?';
  }

  if (query.includes('store') || query.includes('storefront') || query.includes('shop') || query.includes('retail') || query.includes('catalog') || query.includes('e-commerce') || query.includes('ecommerce')) {
    return 'Sell Products or Services Online starts at $399 and includes a product catalog, shopping cart, secure checkout, payment setup, and order notifications. What product categories, pages, and launch timing should I note?';
  }

  if (query.includes('content') || query.includes('copy') || query.includes('writing')) {
    return 'Website Copy & Content Help starts at $199 and covers homepage copy, service page writing, about page content, calls to action, SEO-friendly formatting, and brand messaging support. What pages and brand goals should I capture?';
  }

  if (query.includes('care') || query.includes('support') || query.includes('maintenance')) {
    return 'Website care plans include Keep My Website Updated at $49 per month and Priority Website Care as a separate $100 per month subscription. Both cover monitoring, security checks, backups, and minor content updates, with the higher tier giving you faster response and more hands-on help. What site does it support and what changes do you expect each month?';
  }

  if (query.includes('process') || query.includes('how does it work')) {
    return 'Discovery Form, Style Direction, Design & Build, Review & Refine, Launch, and Support. The intake form is the fastest way to start. What goal, pages, and timeline should I note first?';
  }

  if (query.includes('intake') || query.includes('form')) {
    return 'Send your goals, brand direction, target audience, pages you need, examples you like, timeline, and budget range. If you already know them, send any must-have features too.';
  }

  return 'Tell me what kind of business you are building, what the site needs to do, and when you want it live.';
}

async function maybeSendEmail(transcript, lead, quality, calendarSync) {
  const email = {
    host: process.env.NOVA_SMTP_HOST,
    port: process.env.NOVA_SMTP_PORT,
    secure: process.env.NOVA_SMTP_SECURE,
    user: process.env.NOVA_SMTP_USER,
    pass: process.env.NOVA_SMTP_PASS,
    from: process.env.NOVA_EMAIL_FROM || defaultOwnerEmail,
    to: process.env.NOVA_EMAIL_TO || defaultOwnerEmail,
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
    subject: `Samuel Studio CRM lead - ${lead.customerName} - ${lead.projectConsideration}`,
    text: buildCrmEmailBody(transcript, lead, quality, calendarSync),
    attachments: [
      {
        filename: `${sanitizeSessionId(transcript.sessionId)}-crm-report.md`,
        content: buildCrmReportMarkdown(transcript, lead, quality, calendarSync),
      },
      {
        filename: `${sanitizeSessionId(transcript.sessionId)}-conversation.md`,
        content: buildTranscriptMarkdown(transcript),
      },
      ...(quality.qualifiedForCalendar
        ? [
            {
              filename: `${sanitizeSessionId(transcript.sessionId)}.ics`,
              content: buildCalendarEventIcs(transcript, lead, quality),
            },
          ]
        : []),
    ],
  });

  return { emailed: true, reason: 'Sent.' };
}

async function persistCrmLead(transcript) {
  await writeTranscript(transcript);
  const crmRecord = await writeCrmArtifacts(transcript);
  const { lead, quality, crmPaths } = crmRecord;
  let calendarSync = {
    synced: false,
    reason: quality.qualifiedForCalendar ? 'Calendar event pending human approval.' : `Lead quality is ${quality.disposition}; calendar sync skipped.`,
  };
  let leadSync = {
    saved: false,
    reason: 'Local CRM lead not written yet.',
  };

  const localLeadRecord = buildLocalLeadRecord(transcript, lead, quality);
  try {
    await persistLocalLeadInbox(localLeadRecord);
    leadSync = {
      saved: true,
      reason: 'Stored in local CRM inbox.',
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.warn('Local CRM inbox write failed:', reason);
    leadSync = {
      saved: false,
      reason: `Local CRM inbox write failed: ${reason}`,
    };
  }

  if (leadSync.saved) {
    try {
      await persistLocalLeadAction({
        leadId: localLeadRecord.id,
        siteKey: localLeadRecord.siteKey,
        type: 'intake',
        status: localLeadRecord.crmStatus,
        note: lead.summary,
        followUpAt: localLeadRecord.followUpAt,
        owner: localLeadRecord.owner,
        priority: localLeadRecord.crmPriority,
        tags: localLeadRecord.tags,
        author: 'CRM automation',
        source: 'chat-agent',
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      console.warn('Local CRM action write failed:', reason);
    }

    if (quality.qualifiedForCalendar) {
      try {
        await persistLocalCalendarEvent({
          ...localLeadRecord,
          calendarSource: 'chat-agent',
          calendarApprovalStatus: 'pending',
          calendarApprovalNote: 'Pending human approval from the calendar.',
          calendarCreated: true,
          backupStatus: 'pending',
        });

        calendarSync = {
          synced: true,
          reason: 'Qualified lead added to local calendar pending human approval.',
          approvalStatus: 'pending',
        };
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        console.warn('Local calendar event write failed:', reason);
        calendarSync = {
          synced: false,
          reason: `Local calendar event write failed: ${reason}`,
        };
      }
    }
  }

  if (leadSync.saved) {
    try {
      const backupResult = await syncLocalCalendarBackup(transcript.siteKey);
      calendarSync = {
        ...calendarSync,
        backup: backupResult,
      };
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      console.warn('Calendar backup skipped:', reason);
      calendarSync = {
        ...calendarSync,
        backup: {
          synced: false,
          reason: `Calendar backup failed: ${reason}`,
          backupDir: '',
        },
      };
    }
  }

  try {
    await mkdir(crmPaths.crmReportDirPath, { recursive: true });
    const reportPath = resolve(crmPaths.crmReportDirPath, `${sanitizeSessionId(transcript.sessionId)}.md`);
    await writeFile(reportPath, buildCrmReportMarkdown(transcript, lead, quality, calendarSync), 'utf8');
  } catch (error) {
    console.warn('CRM report write skipped:', error instanceof Error ? error.message : error);
  }

  let emailResult = { emailed: false, reason: 'Email disabled.' };
  try {
    emailResult = await maybeSendEmail(transcript, lead, quality, calendarSync);
  } catch (error) {
    emailResult = {
      emailed: false,
      reason: error instanceof Error ? error.message : 'Failed to send email.',
    };
  }

  return {
    email: emailResult,
    lead,
    quality,
    calendarSync,
    leadSync,
    localCalendarRootDir: crmPaths.rootDir,
    siteKey: crmPaths.siteKey,
    siteName: crmPaths.siteName,
  };
}

async function callOllama(model, systemPrompt, transcript) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);
  const latestUserMessage = [...transcript.messages].reverse().find((message) => message.role === 'user');
  const intentPrimer = latestUserMessage ? buildIntentPrimer(latestUserMessage.content) : '';
  const intentDirective = latestUserMessage ? buildIntentDirective(latestUserMessage.content) : '';
  const knowledgePrompt = buildWebsiteKnowledgePrompt();
  const projectIntakePrompt = buildProjectIntakePrompt(transcript);

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
          { role: 'system', content: projectIntakePrompt },
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
  const systemPrompt = typeof payload.systemPrompt === 'string' && payload.systemPrompt.trim() ? payload.systemPrompt.trim() : 'You are Nova, the Samuel Studio assistant.';
  const installedModels = await fetchInstalledOllamaModels();
  const modelCandidates = buildModelCandidates(payload.modelCandidates, transcript.model, installedModels);

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

  const crmResult = await persistCrmLead(nextTranscript);

  jsonResponse(res, 200, {
    ok: true,
    content: reply.content,
    model: reply.model,
    usedFallback: reply.usedFallback,
    assistant: transcript.assistant,
    siteKey: transcript.siteKey,
    siteName: transcript.siteName,
    loggedAt: transcript.loggedAt,
    email: crmResult.email,
    crm: {
      quality: crmResult.quality,
      calendarSync: crmResult.calendarSync,
      lead: crmResult.lead,
    },
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
  await writeTranscript(transcript);

  jsonResponse(res, 200, {
    ok: true,
    stored: true,
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
