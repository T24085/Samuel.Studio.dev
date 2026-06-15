import { appendFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
const routeAssistantChat = '/api/assistant-chat';
const routeChatLog = '/api/chat-log';
const ollamaChatUrl = 'http://127.0.0.1:11434/api/chat';
const logFilePath = resolve(process.cwd(), 'logs', 'nova-chat-transcripts.ndjson');
const sessionDirPath = resolve(process.cwd(), 'logs', 'chat-sessions');
function jsonResponse(res, status, data) {
    const payload = JSON.stringify(data);
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.end(payload);
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
    const clientProfile = normalizeClientProfile(payload.clientProfile);
    return {
        assistant: cleanText(payload.assistant, 'Nova'),
        sessionId: cleanText(payload.sessionId, 'unknown-session'),
        pageUrl: cleanText(payload.pageUrl, 'unknown-page'),
        model: cleanText(payload.model, 'unknown-model'),
        loggedAt: cleanText(payload.loggedAt, new Date().toISOString()),
        receivedAt: new Date().toISOString(),
        sendEmail: Boolean(payload.sendEmail),
        clientProfile,
        messages: messages.filter((message) => Boolean(message &&
            typeof message.id === 'string' &&
            (message.role === 'user' || message.role === 'assistant') &&
            typeof message.content === 'string' &&
            typeof message.createdAt === 'number')),
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
        `# Nova Chat Session`,
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
        'Answer the latest user question directly with a specific Samuel Studio recommendation.',
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
    const query = userText.toLowerCase();
    if (query.includes('nutrition') || query.includes('product') || query.includes('products') || query.includes('store') || query.includes('shop') || query.includes('e-commerce') || query.includes('ecommerce')) {
        return 'Recommendation anchor: Brand / Campaign Website + Online Store. Mention SEO and Content Creation if they want to grow traffic or trust.';
    }
    if (query.includes('service business') || query.includes('contractor') || query.includes('consultant')) {
        return 'Recommendation anchor: Portfolio Website.';
    }
    if (query.includes('church') || query.includes('ministry') || query.includes('faith')) {
        return 'Recommendation anchor: Portfolio Website.';
    }
    if (query.includes('one main offer') || query.includes('lead capture') || query.includes('landing page')) {
        return 'Recommendation anchor: Starter Landing Page.';
    }
    return '';
}
function buildIntentDirective(userText) {
    const query = userText.toLowerCase();
    if (query.includes('nutrition') || query.includes('product') || query.includes('products') || query.includes('store') || query.includes('shop') || query.includes('e-commerce') || query.includes('ecommerce')) {
        return [
            'Intent directive:',
            'The user is asking about a nutrition or product business.',
            'Answer with Brand / Campaign Website + Online Store as the recommendation.',
            'Mention SEO and Content Creation only if helpful.',
            'Do not mention Portfolio Website.',
            'Keep the reply direct and under 3 sentences.',
        ].join('\n');
    }
    if (query.includes('service business') || query.includes('contractor') || query.includes('consultant')) {
        return [
            'Intent directive:',
            'The user is asking about a service business.',
            'Answer with Portfolio Website as the recommendation.',
            'Do not mention an online store unless the user asks for products.',
            'Keep the reply direct and under 3 sentences.',
        ].join('\n');
    }
    if (query.includes('church') || query.includes('ministry') || query.includes('faith')) {
        return [
            'Intent directive:',
            'The user is asking about a church or ministry website.',
            'Answer with Portfolio Website as the recommendation.',
            'Keep the reply direct and under 3 sentences.',
        ].join('\n');
    }
    if (query.includes('one main offer') || query.includes('lead capture') || query.includes('landing page')) {
        return [
            'Intent directive:',
            'The user wants one main offer or lead capture.',
            'Answer with Starter Landing Page as the recommendation.',
            'Keep the reply direct and under 3 sentences.',
        ].join('\n');
    }
    return '';
}
function normalizeIntentResponse(userText, responseText) {
    const query = userText.toLowerCase();
    const content = responseText.trim();
    if (query.includes('nutrition') || query.includes('product') || query.includes('products') || query.includes('store') || query.includes('shop') || query.includes('e-commerce') || query.includes('ecommerce')) {
        if (!content.includes('Brand / Campaign Website') || !content.includes('Online Store')) {
            return 'I recommend our Brand / Campaign Website + Online Store for your nutrition products to build trust and drive sales. These packages give you both a high-impact presence and a functional shop. Would you like me to outline the specific pages included?';
        }
    }
    if (query.includes('service business') || query.includes('contractor') || query.includes('consultant')) {
        if (!content.includes('Portfolio Website')) {
            return 'I recommend our Portfolio Website for your service business to showcase your work and guide bookings effectively. It gives you room for services, proof, and a stronger booking path. Would you like me to outline the pages for this package?';
        }
    }
    if (query.includes('church') || query.includes('ministry') || query.includes('faith')) {
        if (!content.includes('Portfolio Website')) {
            return 'I recommend our Portfolio Website for your church or ministry so you can clearly share services, events, and contact options. It gives you a polished multi-page presence for your community. Would you like me to outline the pages for this package?';
        }
    }
    if (query.includes('one main offer') || query.includes('lead capture') || query.includes('landing page')) {
        if (!content.includes('Starter Landing Page')) {
            return 'I recommend our Starter Landing Page for a focused lead-capture presence around one main offer. It is the cleanest option when you want one clear action and a simple path to inquire. Would you like me to outline the pages for this package?';
        }
    }
    return content;
}
async function writeTranscript(transcript) {
    await mkdir(dirname(logFilePath), { recursive: true });
    await mkdir(sessionDirPath, { recursive: true });
    await appendFile(logFilePath, `${JSON.stringify(transcript)}\n`, 'utf8');
    await writeFile(resolve(sessionDirPath, `${sanitizeSessionId(transcript.sessionId)}.md`), buildTranscriptMarkdown(transcript), 'utf8');
}
function formatEmailBody(transcript) {
    const lines = [
        `Nova transcript logged at ${transcript.loggedAt}`,
        `Session: ${transcript.sessionId}`,
        `Page: ${transcript.pageUrl}`,
        `Model: ${transcript.model}`,
        `Client: ${transcript.clientProfile.name} <${transcript.clientProfile.email}>`,
        `Phone: ${transcript.clientProfile.phone}`,
        '',
        ...transcript.messages.map((message) => `[${message.role}] ${message.content}`),
    ];
    return lines.join('\n');
}
function getEmailConfig() {
    return {
        host: process.env.NOVA_SMTP_HOST,
        port: process.env.NOVA_SMTP_PORT,
        secure: process.env.NOVA_SMTP_SECURE,
        user: process.env.NOVA_SMTP_USER,
        pass: process.env.NOVA_SMTP_PASS,
        from: process.env.NOVA_EMAIL_FROM,
        to: process.env.NOVA_EMAIL_TO,
    };
}
async function maybeSendEmail(transcript) {
    if (!transcript.sendEmail) {
        return { emailed: false, reason: 'Email forwarding disabled for this transcript.' };
    }
    const email = getEmailConfig();
    if (!email.host || !email.port || !email.from || !email.to) {
        return { emailed: false, reason: 'SMTP not configured.' };
    }
    const nodemailer = (await import('nodemailer'));
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
        text: formatEmailBody(transcript),
    });
    return { emailed: true, reason: 'Sent.' };
}
async function persistTranscript(transcript) {
    await writeTranscript(transcript);
    let emailResult = { emailed: false, reason: 'Email disabled.' };
    try {
        emailResult = await maybeSendEmail(transcript);
    }
    catch (error) {
        emailResult = {
            emailed: false,
            reason: error instanceof Error ? error.message : 'Failed to send email.',
        };
    }
    return emailResult;
}
function buildFallbackReply(userText) {
    const query = userText.toLowerCase();
    if (query.includes('nutrition') || query.includes('product') || query.includes('products') || query.includes('store') || query.includes('shop') || query.includes('e-commerce')) {
        return [
            'For a product business like nutrition products, I would usually recommend a Brand / Campaign Website with an Online Store if you need checkout and product pages.',
            'If you are promoting one main offer or a limited catalog, a Starter Landing Page can work as the front door, with SEO and Content Creation to help people trust the brand.',
            'If you want, tell me how many products you sell and whether you need full checkout or just lead capture.',
        ].join(' ');
    }
    if (query.includes('church') || query.includes('ministry') || query.includes('faith')) {
        return [
            'For a church, I would usually start with the Portfolio Website package if you need multiple pages for sermons, events, ministries, and contact info.',
            'If you only need a simple one-page presence, the Starter Landing Page can work too.',
            'The AI Lead Assistant add-on is a good fit if you want questions answered after hours.',
        ].join(' ');
    }
    if (query.includes('service business') || query.includes('contractor') || query.includes('consultant')) {
        return [
            'For a service business, the Portfolio Website is usually the best fit because it gives you room for services, proof, and a stronger booking path.',
            'If you want something leaner, the Starter Landing Page is the simplest option.',
            'SEO, booking, and the AI Lead Assistant are the most useful add-ons for lead generation.',
        ].join(' ');
    }
    if (query.includes('price') || query.includes('pricing') || query.includes('cost')) {
        return [
            'The core packages are Starter Landing Page at $300-$500, Portfolio Website at $600-$1,000, and Brand / Campaign Website starting at $1,000+.',
            'Common add-ons include AI Lead Assistant from $299, SEO from $299, Booking from $249, Online Store from $499, Content Creation from $299, and Care Plan at $49/month.',
        ].join(' ');
    }
    if (query.includes('ai assistant') || query.includes('chat assistant') || query.includes('lead assistant')) {
        return [
            'The AI Lead Assistant is a website add-on that answers questions, helps capture leads, and points visitors toward the right next step.',
            'It starts at $299 and works well for service businesses, contractors, consultants, churches, and local businesses.',
        ].join(' ');
    }
    if (query.includes('booking') || query.includes('schedule')) {
        return 'Online Booking & Scheduling starts at $249 and lets visitors book appointments or consultations directly from the site with confirmations and reminders.';
    }
    if (query.includes('seo') || query.includes('google')) {
        return 'SEO starts at $299 and covers keyword optimization, meta titles and descriptions, indexing setup, performance improvements, local SEO, and Search Console setup.';
    }
    if (query.includes('store') || query.includes('shop') || query.includes('e-commerce')) {
        return 'Online Store / E-Commerce starts at $499 and includes a catalog, shopping cart, secure checkout, payment setup, inventory management, order notifications, and mobile-friendly storefront support.';
    }
    if (query.includes('content') || query.includes('copy') || query.includes('writing')) {
        return 'The Content Creation Package starts at $299 and covers homepage copy, service page writing, about page content, calls to action, SEO-friendly formatting, and brand messaging support.';
    }
    if (query.includes('care') || query.includes('support') || query.includes('maintenance')) {
        return 'The Website Care Plan is $49 per month and covers monitoring, security checks, backups, performance reviews, minor content updates, and priority support.';
    }
    if (query.includes('process') || query.includes('how does it work')) {
        return 'The process is Discovery Form, Style Direction, Design & Build, Review & Refine, Launch, and Support. The intake form is the fastest way to start.';
    }
    if (query.includes('intake') || query.includes('form')) {
        return 'For the intake form, send your goals, brand direction, target audience, pages you need, examples you like, timeline, and budget range.';
    }
    if (query.includes('contact') || query.includes('email')) {
        return 'You can use the intake form or email the studio directly.';
    }
    return 'Tell me what kind of site you need, and I can point you to the right package or add-ons.';
}
async function callOllama(model, systemPrompt, transcript) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    const latestUserMessage = [...transcript.messages].reverse().find((message) => message.role === 'user');
    const intentPrimer = latestUserMessage ? buildIntentPrimer(latestUserMessage.content) : '';
    const intentDirective = latestUserMessage ? buildIntentDirective(latestUserMessage.content) : '';
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
                    ...(intentDirective ? [{ role: 'system', content: intentDirective }] : []),
                    ...(intentPrimer ? [{ role: 'assistant', content: intentPrimer }] : []),
                    ...buildConversationMessages(transcript),
                ],
                stream: false,
                think: false,
                options: {
                    temperature: 0.1,
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
        const data = (await response.json());
        const content = data.message?.content?.trim() || data.response?.trim() || '';
        if (!content) {
            throw new Error('Ollama returned an empty response.');
        }
        return {
            content,
            model,
            usedFallback: false,
        };
    }
    finally {
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
    let lastError = null;
    for (const model of modelCandidates) {
        try {
            reply = await callOllama(model, systemPrompt, transcript);
            break;
        }
        catch (error) {
            lastError = error;
        }
    }
    if (!reply) {
        reply = {
            content: buildFallbackReply(requestText),
            model: modelCandidates[0] || transcript.model,
            usedFallback: true,
        };
        if (lastError instanceof Error) {
            reply.content = `${reply.content}`;
        }
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
async function handleRequest(req, res) {
    const url = req.url ? new URL(req.url, 'http://127.0.0.1') : null;
    if (!url) {
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
}
function attachMiddleware(server) {
    server.middlewares.use(async (req, res, next) => {
        const url = req.url ? new URL(req.url, 'http://127.0.0.1') : null;
        if (!url || (url.pathname !== routeAssistantChat && url.pathname !== routeChatLog)) {
            next();
            return;
        }
        try {
            await handleRequest(req, res);
        }
        catch (error) {
            jsonResponse(res, 500, {
                ok: false,
                error: error instanceof Error ? error.message : 'Failed to handle chat request.',
            });
        }
    });
}
export function chatLogPlugin() {
    return {
        name: 'samuel-studio-chat-log',
        configureServer(server) {
            attachMiddleware(server);
        },
        configurePreviewServer(server) {
            attachMiddleware(server);
        },
    };
}
