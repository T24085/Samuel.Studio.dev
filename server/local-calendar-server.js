import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  buildManualLeadRecord,
  loadLocalCalendarState,
  resolveLocalCalendarBackupDir,
  persistLocalLeadInbox,
  persistLocalLeadAction,
  persistLocalTeamChatMessage,
  persistLocalTeamChatProfile,
  persistLocalTeamChatThread,
  archiveLocalCalendarPosts,
  clearLocalCalendarPosts,
  syncLocalCalendarBackup,
  resolveLocalCalendarPaths,
} from './local-calendar-store.js';
import {
  clearSessionCookie,
  createInvite,
  createSessionCookie,
  createUserAccount,
  getAuthContextFromRequest,
  getAuthSessionCookieName,
  listInvites,
  listUsers,
  loginWithPassword,
  logoutSession,
  registerWithInvite,
  serializeAuthInvite,
  serializeAuthUser,
  updateUserAccount,
} from './crm-auth-store.js';
import { getDefaultSiteKey, getSiteLabel, listSiteDefinitions, resolveSiteKey } from './site-registry.js';

const host = process.env.LOCAL_CALENDAR_HOST || '127.0.0.1';
const port = Number(process.env.LOCAL_CALENDAR_PORT || 8790);
const chatAgentHost = process.env.CHAT_AGENT_HOST || '127.0.0.1';
const chatAgentPort = Number(process.env.CHAT_AGENT_PORT || 8787);
const routeHealth = '/health';
const routeState = '/api/state';
const routeBackup = '/api/backup';
const routeLeadAction = '/api/lead-action';
const routeManualLead = '/api/manual-lead';
const routeChatAgentStatus = '/api/chat-agent/status';
const routeAdminCalendar = '/api/admin/calendar';
const routeTeamChat = '/api/team-chat';
const routeTeamChatThread = '/api/team-chat-thread';
const routeTeamChatProfile = '/api/team-chat-profile';
const routeAuthMe = '/api/auth/me';
const routeAuthLogin = '/api/auth/login';
const routeAuthLogout = '/api/auth/logout';
const routeAuthRegister = '/api/auth/register';
const routeAdminUsers = '/api/admin/users';
const routeAdminInvites = '/api/admin/invites';
const allSitesKey = 'all';

function jsonResponse(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.end(JSON.stringify(data));
}

function textResponse(res, status, text, contentType = 'text/plain; charset=utf-8') {
  res.statusCode = status;
  res.setHeader('Content-Type', contentType);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.end(text);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function cleanText(value, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function getAllSiteDefinitions() {
  return listSiteDefinitions();
}

function getUserAllowedSiteKeys(user) {
  if (!user) {
    return getAllSiteDefinitions().map((site) => site.key);
  }

  if (user.role === 'admin') {
    return getAllSiteDefinitions().map((site) => site.key);
  }

  const siteKeys = Array.isArray(user.allowedSiteKeys) ? user.allowedSiteKeys : [];
  const knownKeys = new Set(getAllSiteDefinitions().map((site) => site.key));
  const filtered = [...new Set(siteKeys.map((siteKey) => resolveSiteKey(siteKey)).filter((siteKey) => knownKeys.has(siteKey)))];
  return filtered.length ? filtered : [getDefaultSiteKey()];
}

function getAccessibleSiteDefinitions(user) {
  const allowedKeys = new Set(getUserAllowedSiteKeys(user));
  return getAllSiteDefinitions().filter((site) => allowedKeys.has(site.key));
}

function resolveAccessibleSiteKey(siteKey, user) {
  const allowedKeys = getUserAllowedSiteKeys(user);
  if (user?.role === 'admin') {
    return resolveSiteKey(siteKey);
  }

  const requested = cleanText(siteKey, '');
  if (requested === allSitesKey) {
    return allowedKeys.length > 1 ? allSitesKey : allowedKeys[0];
  }

  const resolved = resolveSiteKey(requested);
  return allowedKeys.includes(resolved) ? resolved : allowedKeys[0];
}

function isClosedStatus(status) {
  return ['won', 'lost', 'archived'].includes(cleanText(status, '').toLowerCase());
}

function buildActionPayload(payload) {
  return {
    id: cleanText(payload?.id, `action_${Date.now()}`),
    leadId: cleanText(payload?.leadId, ''),
    createdAt: cleanText(payload?.createdAt, new Date().toISOString()),
    siteKey: cleanText(payload?.siteKey, ''),
    type: cleanText(payload?.type, 'note'),
    status: cleanText(payload?.status, ''),
    note: cleanText(payload?.note, ''),
    followUpAt: cleanText(payload?.followUpAt, ''),
    owner: cleanText(payload?.owner, ''),
    priority: cleanText(payload?.priority, ''),
    calendarApprovalStatus: cleanText(payload?.calendarApprovalStatus, ''),
    calendarApprovalNote: cleanText(payload?.calendarApprovalNote, ''),
    author: cleanText(payload?.author, 'Chris'),
    authorUserId: cleanText(payload?.authorUserId, ''),
    authorUsername: cleanText(payload?.authorUsername, ''),
    authorDisplayName: cleanText(payload?.authorDisplayName, ''),
    tags: Array.isArray(payload?.tags) ? payload.tags.filter((tag) => typeof tag === 'string') : [],
    source: cleanText(payload?.source, 'crm-ui'),
  };
}

function buildManualLeadPayload(payload) {
  const productInterests = Array.isArray(payload?.productInterests)
    ? payload.productInterests
    : String(payload?.productInterests || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

  const tags = Array.isArray(payload?.tags)
    ? payload.tags
    : String(payload?.tags || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

  return {
    id: cleanText(payload?.id, `manual_${Date.now()}`),
    title: cleanText(payload?.title, ''),
    siteKey: cleanText(payload?.siteKey, ''),
    customerName: cleanText(payload?.customerName, 'Manual lead'),
    customerEmail: cleanText(payload?.customerEmail, 'Unknown'),
    customerPhone: cleanText(payload?.customerPhone, 'Unknown'),
    projectConsideration: cleanText(payload?.projectConsideration, 'Manual intake'),
    productInterests,
    projectBrief: payload?.projectBrief || {},
    qualityScore: cleanText(payload?.qualityScore, ''),
    disposition: cleanText(payload?.disposition, ''),
    summary: cleanText(payload?.summary, ''),
    nextStep: cleanText(payload?.nextStep, ''),
    sessionId: cleanText(payload?.sessionId, `manual-${Date.now()}`),
    pageUrl: cleanText(payload?.pageUrl, 'manual-entry'),
    siteKey: cleanText(payload?.siteKey, ''),
    latestUserMessage: cleanText(payload?.latestUserMessage, ''),
    latestAssistantMessage: cleanText(payload?.latestAssistantMessage, ''),
    messageCount: cleanText(payload?.messageCount, ''),
    crmStatus: cleanText(payload?.crmStatus, 'new'),
    crmPriority: cleanText(payload?.crmPriority, 'normal'),
    owner: cleanText(payload?.owner, 'Chris'),
    followUpAt: cleanText(payload?.followUpAt, ''),
    tags,
    reason: cleanText(payload?.reason, ''),
    source: cleanText(payload?.source, 'crm-ui'),
    createdByUserId: cleanText(payload?.createdByUserId, ''),
    createdByUsername: cleanText(payload?.createdByUsername, ''),
    createdByDisplayName: cleanText(payload?.createdByDisplayName, ''),
  };
}

function buildTeamChatPayload(payload) {
  return {
    id: cleanText(payload?.id, `chat_${Date.now()}`),
    threadId: cleanText(payload?.threadId, ''),
    threadName: cleanText(payload?.threadName, ''),
    siteKey: cleanText(payload?.siteKey, ''),
    authorName: cleanText(payload?.authorName, 'Chris'),
    profileId: cleanText(payload?.profileId, ''),
    avatarDataUrl: cleanText(payload?.avatarDataUrl, ''),
    avatarColor: cleanText(payload?.avatarColor, ''),
    message: cleanText(payload?.message, ''),
    leadId: cleanText(payload?.leadId, ''),
    leadName: cleanText(payload?.leadName, ''),
    authorUserId: cleanText(payload?.authorUserId, ''),
    authorUsername: cleanText(payload?.authorUsername, ''),
    authorDisplayName: cleanText(payload?.authorDisplayName, ''),
    source: cleanText(payload?.source, 'team-chat-ui'),
    createdAt: cleanText(payload?.createdAt, new Date().toISOString()),
    updatedAt: cleanText(payload?.updatedAt, new Date().toISOString()),
  };
}

function buildTeamChatThreadPayload(payload) {
  return {
    id: cleanText(payload?.id, `thread_${Date.now()}`),
    siteKey: cleanText(payload?.siteKey, ''),
    name: cleanText(payload?.name, 'New thread'),
    description: cleanText(payload?.description, ''),
    threadType: cleanText(payload?.threadType, 'custom'),
    leadId: cleanText(payload?.leadId, ''),
    leadName: cleanText(payload?.leadName, ''),
    createdByProfileId: cleanText(payload?.createdByProfileId, ''),
    createdByUserId: cleanText(payload?.createdByUserId, ''),
    createdByUsername: cleanText(payload?.createdByUsername, ''),
    createdByDisplayName: cleanText(payload?.createdByDisplayName, ''),
    source: cleanText(payload?.source, 'team-chat-ui'),
    createdAt: cleanText(payload?.createdAt, new Date().toISOString()),
    updatedAt: cleanText(payload?.updatedAt, new Date().toISOString()),
  };
}

function buildTeamChatProfilePayload(payload) {
  return {
    id: cleanText(payload?.id, `profile_${Date.now()}`),
    siteKey: cleanText(payload?.siteKey, ''),
    name: cleanText(payload?.name, 'Chris'),
    title: cleanText(payload?.title, ''),
    avatarDataUrl: cleanText(payload?.avatarDataUrl, ''),
    avatarColor: cleanText(payload?.avatarColor, ''),
    createdByUserId: cleanText(payload?.createdByUserId, ''),
    createdByUsername: cleanText(payload?.createdByUsername, ''),
    createdByDisplayName: cleanText(payload?.createdByDisplayName, ''),
    source: cleanText(payload?.source, 'team-chat-ui'),
    createdAt: cleanText(payload?.createdAt, new Date().toISOString()),
    updatedAt: cleanText(payload?.updatedAt, new Date().toISOString()),
  };
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    req.on('data', (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });

    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8').trim();
      if (!raw) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });

    req.on('error', reject);
  });
}

function getRequestCookieValue(req, name) {
  const cookieHeader = cleanText(req?.headers?.cookie, '');
  if (!cookieHeader) {
    return '';
  }

  const cookies = cookieHeader.split(';').map((part) => part.trim());
  for (const cookie of cookies) {
    const [key, ...rest] = cookie.split('=');
    if (key === name) {
      return decodeURIComponent(rest.join('=') || '');
    }
  }

  return '';
}

async function requireAuth(req, res) {
  const { user } = await getAuthContextFromRequest(req);
  if (!user) {
    jsonResponse(res, 401, {
      ok: false,
      error: 'Authentication required.',
    });
    return null;
  }

  return user;
}

async function requireAdmin(req, res) {
  const user = await requireAuth(req, res);
  if (!user) {
    return null;
  }

  if (user.role !== 'admin') {
    jsonResponse(res, 403, {
      ok: false,
      error: 'Admin access required.',
    });
    return null;
  }

  return user;
}

function attachAuthResponse(payload, user) {
  return {
    ...payload,
    auth: {
      user: user ? serializeAuthUser(user) : null,
      canManageUsers: user?.role === 'admin',
    },
  };
}

function buildPageTemplate() {
  return String.raw`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Samuel Studio Local Calendar</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #071017;
      --panel: rgba(13, 21, 29, 0.84);
      --panel-strong: rgba(17, 27, 37, 0.96);
      --line: rgba(255, 255, 255, 0.08);
      --line-strong: rgba(255, 255, 255, 0.14);
      --text: #edf5ff;
      --muted: #9cb1c4;
      --accent: #d0b06d;
      --accent-2: #79c9ff;
      --good: #8ed39b;
      --warn: #f0c66d;
      --bad: #ef8f8f;
      --shadow: 0 24px 80px rgba(0, 0, 0, 0.45);
      --radius: 24px;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      min-height: 100vh;
      font-family: Inter, Segoe UI, system-ui, sans-serif;
      color: var(--text);
      background:
        radial-gradient(circle at top left, rgba(208, 176, 109, 0.18), transparent 28%),
        radial-gradient(circle at top right, rgba(121, 201, 255, 0.15), transparent 32%),
        linear-gradient(180deg, #04080c, var(--bg) 45%, #05090d);
    }

    body::before {
      content: "";
      position: fixed;
      inset: 0;
      pointer-events: none;
      background-image:
        linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
      background-size: 28px 28px;
      mask-image: linear-gradient(180deg, rgba(0,0,0,0.8), transparent 92%);
    }

    .shell {
      position: relative;
      z-index: 1;
      max-width: 1600px;
      margin: 0 auto;
      padding: 28px;
      display: grid;
      grid-template-columns: 320px minmax(0, 1fr) 360px;
      gap: 20px;
    }

    .hero {
      grid-column: 1 / -1;
      display: flex;
      align-items: end;
      justify-content: space-between;
      gap: 24px;
      padding: 4px 4px 6px;
    }

    .eyebrow {
      margin: 0 0 10px;
      text-transform: uppercase;
      letter-spacing: 0.2em;
      font-size: 11px;
      color: var(--muted);
    }

    h1 {
      margin: 0;
      font-size: clamp(2.2rem, 4vw, 4.5rem);
      line-height: 0.95;
      letter-spacing: -0.05em;
      font-family: "Cormorant Garamond", Georgia, serif;
      font-weight: 600;
    }

    .subtitle {
      margin: 12px 0 0;
      max-width: 62ch;
      color: var(--muted);
      font-size: 15px;
      line-height: 1.6;
    }

    .actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      align-items: center;
      justify-content: flex-end;
    }

    .button {
      border: 1px solid var(--line-strong);
      background: rgba(255,255,255,0.04);
      color: var(--text);
      padding: 11px 16px;
      border-radius: 999px;
      cursor: pointer;
      font-weight: 600;
      transition: transform 160ms ease, border-color 160ms ease, background 160ms ease;
      box-shadow: var(--shadow);
    }

    .button:hover { transform: translateY(-1px); border-color: rgba(208,176,109,0.45); }
    .button--accent { background: linear-gradient(135deg, rgba(208,176,109,0.22), rgba(121,201,255,0.12)); }

    .panel {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: var(--radius);
      box-shadow: var(--shadow);
      backdrop-filter: blur(18px);
      overflow: hidden;
    }

    .panel__header {
      padding: 18px 18px 14px;
      border-bottom: 1px solid var(--line);
      display: flex;
      justify-content: space-between;
      align-items: start;
      gap: 12px;
    }

    .panel__header h2 {
      margin: 0;
      font-size: 15px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .panel__header p {
      margin: 6px 0 0;
      color: var(--muted);
      font-size: 13px;
      line-height: 1.5;
    }

    .stats {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      padding: 18px;
    }

    .stat {
      padding: 14px;
      border: 1px solid var(--line);
      border-radius: 18px;
      background: rgba(255,255,255,0.03);
    }

    .stat span {
      display: block;
      font-size: 12px;
      color: var(--muted);
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.12em;
    }

    .stat strong {
      font-size: 26px;
      letter-spacing: -0.04em;
    }

    .meta {
      padding: 0 18px 18px;
      color: var(--muted);
      font-size: 13px;
      line-height: 1.5;
    }

    .section {
      padding: 18px;
      border-top: 1px solid var(--line);
    }

    .section h3 {
      margin: 0 0 14px;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: var(--muted);
    }

    .stack {
      display: grid;
      gap: 12px;
    }

    .lead-card {
      border: 1px solid var(--line);
      border-radius: 18px;
      padding: 14px;
      background: rgba(255,255,255,0.025);
    }

    .lead-card--activity {
      position: relative;
      overflow: hidden;
      --bubble-accent: #cbb7ff;
      border-color: color-mix(in srgb, var(--bubble-accent) 20%, rgba(255,255,255,0.08));
      background: linear-gradient(180deg, color-mix(in srgb, var(--bubble-accent) 12%, rgba(255,255,255,0.04)), rgba(255,255,255,0.025));
    }

    .lead-card--activity::before {
      content: '';
      position: absolute;
      inset: 0 auto 0 0;
      width: 4px;
      background: linear-gradient(180deg, var(--bubble-accent), color-mix(in srgb, var(--bubble-accent) 40%, white));
      opacity: 0.95;
    }

    .calendar-statusDot {
      position: absolute;
      top: 10px;
      right: 10px;
      width: 10px;
      height: 10px;
      border-radius: 999px;
      background: var(--status-dot-color, var(--bubble-accent));
      border: 1px solid color-mix(in srgb, var(--status-dot-color, var(--bubble-accent)) 55%, white);
      box-shadow: 0 0 0 2px rgba(10, 13, 19, 0.78), 0 4px 12px rgba(0, 0, 0, 0.18);
      pointer-events: none;
      z-index: 2;
    }

    .lead-card--activity .calendar-statusDot {
      top: 10px;
      right: 10px;
    }

    .lead-card--activity .lead-card__title {
      color: color-mix(in srgb, var(--bubble-accent) 80%, white);
    }

    .lead-card__top {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: start;
      margin-bottom: 8px;
    }

    .lead-card__title {
      margin: 0;
      font-size: 15px;
      letter-spacing: -0.02em;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 10px;
      border-radius: 999px;
      font-size: 11px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      border: 1px solid var(--line);
    }

    .badge--good { color: var(--good); background: rgba(142, 211, 155, 0.08); }
    .badge--warn { color: var(--warn); background: rgba(240, 198, 109, 0.08); }
    .badge--bad { color: var(--bad); background: rgba(239, 143, 143, 0.08); }

    .lead-card p,
    .lead-card small {
      color: var(--muted);
      line-height: 1.5;
    }

    .lead-card small { display: block; margin-top: 8px; }

    .calendar-activity__title {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }

    .calendar-activity__icon {
      flex: 0 0 auto;
      width: 22px;
      height: 22px;
      border-radius: 999px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: color-mix(in srgb, var(--accent) 14%, transparent);
      border: 1px solid color-mix(in srgb, var(--accent) 28%, var(--line));
      color: var(--accent);
      font-size: 12px;
      line-height: 1;
    }

    .calendar-activity__label {
      min-width: 0;
      font-weight: 600;
      color: var(--text);
    }

    .calendar {
      display: flex;
      flex-direction: column;
      min-height: 860px;
    }

    .calendar__toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      padding: 18px;
      border-bottom: 1px solid var(--line);
    }

    .calendar__month {
      margin: 0;
      font-family: "Cormorant Garamond", Georgia, serif;
      font-size: 34px;
      font-weight: 600;
      letter-spacing: -0.04em;
    }

    .calendar__grid {
      display: grid;
      grid-template-columns: repeat(7, minmax(0, 1fr));
      grid-auto-rows: minmax(92px, auto);
      gap: 1px;
      background: var(--line);
      padding: 1px;
      align-content: start;
    }

    .weekday,
    .day {
      background: rgba(9, 15, 22, 0.78);
      min-height: 0;
      padding: 8px;
    }

    .weekday {
      min-height: auto;
      padding: 12px 10px;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      color: var(--muted);
    }

    .day {
      position: relative;
    }

    .day--empty {
      opacity: 0.32;
    }

    .day--today {
      box-shadow: inset 0 0 0 1px rgba(208,176,109,0.55);
      background: rgba(208, 176, 109, 0.08);
    }

    .day__num {
      font-size: 12px;
      color: var(--muted);
    }

    .day__events {
      display: grid;
      gap: 6px;
      margin-top: 8px;
    }

    .day__events--expanded {
      max-height: 240px;
      overflow: auto;
      padding-right: 2px;
    }

    .day__event {
      position: relative;
      overflow: hidden;
      border-radius: 12px;
      padding: 8px 24px 8px 8px;
      background: rgba(208, 176, 109, 0.12);
      border: 1px solid rgba(208, 176, 109, 0.18);
      font-size: 12px;
      line-height: 1.35;
    }

    .day__event strong { display: block; color: var(--text); margin-bottom: 4px; }
    .day__event span { color: var(--muted); }

    .day__event--compact {
      display: grid;
      margin-top: 0;
      padding: 7px 22px 6px 10px;
      font-size: 10px;
      gap: 4px;
    }

    .day__event--compact strong {
      margin-bottom: 0;
      font-size: 10px;
      line-height: 1.2;
    }

    .day__event--compact .day__event-site {
      display: block;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      margin-bottom: 0;
      padding: 1px 5px;
      font-size: 7px;
    }

    .day__event--compact .day__eventMeta {
      gap: 4px 8px;
    }

    .day__event--compact .day__eventStatus,
    .day__event--compact .day__eventTime {
      font-size: 8px;
    }

    .day__event--compact .calendar-status {
      margin-top: 0;
      padding-inline: 5px;
      font-size: 7px;
    }

    .calendar-statusDot--good {
      --status-dot-color: var(--good);
    }

    .calendar-statusDot--warn {
      --status-dot-color: var(--warn);
    }

    .calendar-statusDot--bad {
      --status-dot-color: var(--bad);
    }

    .calendar-statusDot--neutral {
      --status-dot-color: color-mix(in srgb, var(--bubble-accent) 45%, white);
    }

    .day__event.calendar-activity--lead,
    .lead-card--activity.calendar-activity--lead {
      --bubble-accent: #6ee7ff;
    }

    .day__event.calendar-activity--note,
    .lead-card--activity.calendar-activity--note {
      --bubble-accent: #d0b06d;
    }

    .day__event.calendar-activity--status,
    .lead-card--activity.calendar-activity--status {
      --bubble-accent: #8ed39b;
    }

    .day__event.calendar-activity--approval,
    .lead-card--activity.calendar-activity--approval {
      --bubble-accent: #a855f7;
    }

    .day__event.calendar-activity--archive,
    .lead-card--activity.calendar-activity--archive {
      --bubble-accent: #f58b8b;
    }

    .day__event.calendar-activity--intake,
    .lead-card--activity.calendar-activity--intake {
      --bubble-accent: #79c9ff;
    }

    .day__event.calendar-activity--generic,
    .lead-card--activity.calendar-activity--generic {
      --bubble-accent: #cbb7ff;
    }

    .day__more {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      margin-top: 0;
      padding: 7px 10px;
      border-radius: 12px;
      border: 1px dashed color-mix(in srgb, var(--accent-2) 35%, var(--line));
      background: color-mix(in srgb, var(--accent-2) 9%, rgba(255,255,255,0.02));
      color: var(--text);
      font-size: 10px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      cursor: pointer;
    }

    .day__more:hover,
    .day__more:focus-visible {
      border-color: color-mix(in srgb, var(--accent-2) 60%, var(--line));
      background: color-mix(in srgb, var(--accent-2) 14%, rgba(255,255,255,0.04));
      outline: none;
    }

    .day--expanded {
      box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent-2) 38%, transparent);
      background: color-mix(in srgb, var(--accent-2) 7%, transparent);
    }

    .day__eventMeta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      flex-wrap: wrap;
    }

    .day__eventStatus {
      color: color-mix(in srgb, var(--accent-2) 78%, white);
      font-size: 10px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      white-space: nowrap;
    }

    .day__eventTime {
      color: var(--muted);
      font-size: 9px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      white-space: nowrap;
    }

    .side {
      display: grid;
      gap: 20px;
      align-content: start;
    }

    .list {
      display: grid;
      gap: 10px;
      max-height: 410px;
      overflow: auto;
      padding-right: 4px;
    }

    .note {
      padding: 12px 18px 18px;
      color: var(--muted);
      font-size: 13px;
      line-height: 1.55;
    }

    .empty {
      padding: 16px;
      border: 1px dashed var(--line-strong);
      border-radius: 18px;
      color: var(--muted);
      text-align: center;
      background: rgba(255,255,255,0.02);
    }

    .footer {
      grid-column: 1 / -1;
      padding: 0 4px 10px;
      color: var(--muted);
      font-size: 12px;
      display: flex;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
    }

    @media (max-width: 1180px) {
      .shell {
        grid-template-columns: 1fr;
      }

      .hero {
        align-items: start;
        flex-direction: column;
      }
    }
  </style>
</head>
<body>
  <div class="shell">
    <section class="hero">
      <div>
        <p class="eyebrow">Samuel Studio local calendar</p>
        <h1>Lead calendar on your desktop.</h1>
        <p class="subtitle">Every lead lands here automatically. The review queue stays separate, and the calendar data is backed up to your configured backup folder when one is available.</p>
      </div>
      <div class="actions">
        <button class="button" id="prevMonth">Prev</button>
        <button class="button" id="todayBtn">Today</button>
        <button class="button" id="nextMonth">Next</button>
        <button class="button button--accent" id="backupBtn">Back Up Now</button>
      </div>
    </section>

    <aside class="panel">
      <div class="panel__header">
        <div>
          <h2>At A Glance</h2>
          <p>Organized by lead quality and calendar eligibility.</p>
        </div>
      </div>
      <div class="stats" id="stats"></div>
      <div class="meta" id="backupMeta"></div>
      <div class="section">
        <h3>Review Queue</h3>
        <div class="stack list" id="reviewQueue"></div>
      </div>
    </aside>

    <main class="panel calendar">
      <div class="calendar__toolbar">
        <div>
          <p class="eyebrow" style="margin-bottom:8px;">Calendar view</p>
          <h2 class="calendar__month" id="monthLabel">Calendar</h2>
        </div>
        <div class="badge badge--good" id="calendarCount">0 calendar items</div>
      </div>
      <div class="calendar__grid" id="calendarGrid"></div>
    </main>

    <aside class="panel side">
      <div>
        <div class="panel__header">
          <div>
            <h2>Calendar Activity</h2>
            <p>Every lead status change, note, and appointment lands here.</p>
          </div>
        </div>
        <div class="section">
          <div class="stack list" id="eventsList"></div>
        </div>
      </div>
    </aside>

    <div class="footer">
      <span id="rootPath"></span>
      <span id="statusLine">Loading...</span>
    </div>
  </div>

  <script>
    const state = {
      monthOffset: 0,
      data: null,
      backupBusy: false,
      expandedDayKey: null,
    };

    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const els = {
      stats: document.getElementById('stats'),
      backupMeta: document.getElementById('backupMeta'),
      reviewQueue: document.getElementById('reviewQueue'),
      eventsList: document.getElementById('eventsList'),
      calendarGrid: document.getElementById('calendarGrid'),
      monthLabel: document.getElementById('monthLabel'),
      calendarCount: document.getElementById('calendarCount'),
      rootPath: document.getElementById('rootPath'),
      statusLine: document.getElementById('statusLine'),
      backupBtn: document.getElementById('backupBtn'),
    };

    function formatDateLabel(iso) {
      return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(iso));
    }

    function formatTimeLabel(iso) {
      return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
    }

    function formatMonthLabel(date) {
      return new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(date);
    }

    function scoreBadge(score) {
      if (score >= 70) return 'badge--good';
      if (score >= 45) return 'badge--warn';
      return 'badge--bad';
    }

    function statusLabel(status) {
      const normalized = String(status || '').trim();
      const labels = {
        new: 'New',
        review: 'Review',
        qualified: 'Qualified',
        working: 'Working',
        'follow-up': 'Follow-up',
        won: 'Won',
        lost: 'Lost',
        archived: 'Archived',
      };
      return labels[normalized] || 'New';
    }

    function statusBadgeClass(status) {
      const normalized = String(status || '').trim();
      if (['won', 'qualified'].includes(normalized)) return 'badge--good';
      if (['lost', 'archived'].includes(normalized)) return 'badge--bad';
      return 'badge--warn';
    }

    function calendarApprovalLabel(status) {
      const normalized = String(status || '').trim();
      if (normalized === 'pending') return 'Pending approval';
      if (normalized === 'approved') return 'Approved';
      if (normalized === 'rejected') return 'Rejected';
      if (normalized === 'not-required') return 'Not required';
      return 'No approval';
    }

    function calendarApprovalClass(status) {
      const normalized = String(status || '').trim();
      if (normalized === 'pending') return 'calendar-status--pending';
      if (normalized === 'approved') return 'calendar-status--approved';
      if (normalized === 'rejected') return 'calendar-status--rejected';
      return '';
    }

    function calendarStatusDotClass(item) {
      if (!item) {
        return 'calendar-statusDot--neutral';
      }

      const approvalStatus = String(item.calendarApprovalStatus || '').trim();
      if (approvalStatus === 'approved') return 'calendar-statusDot--good';
      if (approvalStatus === 'rejected') return 'calendar-statusDot--bad';
      if (approvalStatus === 'pending') return 'calendar-statusDot--warn';

      const status = String(item.status || item.crmStatus || '').trim();
      if (['won', 'qualified'].includes(status)) return 'calendar-statusDot--good';
      if (['lost', 'archived'].includes(status)) return 'calendar-statusDot--bad';
      if (status) return 'calendar-statusDot--warn';

      const actionType = String(item.actionType || '').trim();
      if (actionType === 'calendar-approve') return 'calendar-statusDot--good';
      if (actionType === 'calendar-reject' || actionType === 'archive') return 'calendar-statusDot--bad';
      if (actionType === 'manual-create' || actionType === 'intake') return 'calendar-statusDot--warn';

      return 'calendar-statusDot--neutral';
    }

    function dispositionLabel(item) {
      if (item.calendarEligible) return 'Qualified';
      if (item.disposition === 'hold') return 'Review';
      return 'Unqualified';
    }

    function leadSummary(item) {
      const products = item.productInterests && item.productInterests.length ? item.productInterests.join(', ') : 'No product detail';
      return item.summary || \`\${item.customerName} is considering \${item.projectConsideration}.\`;
    }

    function projectBriefLine(item) {
      const brief = item.projectBrief || {};
      const parts = [];

      if (brief.goals && brief.goals.length) {
        parts.push(\`Goal: \${brief.goals.join(', ')}\`);
      }

      if (brief.pages && brief.pages.length) {
        parts.push(\`Pages: \${brief.pages.join(', ')}\`);
      }

      if (brief.timeline) {
        parts.push(\`Timeline: \${brief.timeline}\`);
      }

      if (brief.budget) {
        parts.push(\`Budget: \${brief.budget}\`);
      }

      if (brief.features && brief.features.length) {
        parts.push(\`Features: \${brief.features.join(', ')}\`);
      }

      if (brief.audience) {
        parts.push(\`Audience: \${brief.audience}\`);
      }

      return parts.length ? parts.slice(0, 2).join(' · ') : '';
    }

    function monthDays(date) {
      const start = new Date(date.getFullYear(), date.getMonth(), 1);
      const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      const startOffset = start.getDay();
      const days = [];

      for (let i = 0; i < startOffset; i += 1) {
        days.push(null);
      }

      for (let day = 1; day <= end.getDate(); day += 1) {
        days.push(new Date(date.getFullYear(), date.getMonth(), day));
      }

      while (days.length % 7 !== 0) {
        days.push(null);
      }

      return days;
    }

    function groupedEvents(items) {
      return items.reduce((map, item) => {
        const key = item.dateKey;
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(item);
        return map;
      }, new Map());
    }

    function sortCalendarItems(left, right) {
      const leftTime = new Date(left.sortIso || left.startIso || left.createdAt || left.dateKey || 0).getTime();
      const rightTime = new Date(right.sortIso || right.startIso || right.createdAt || right.dateKey || 0).getTime();

      if (leftTime !== rightTime) {
        return leftTime - rightTime;
      }

      if (left.kind !== right.kind) {
        return left.kind === 'lead' ? -1 : 1;
      }

      return String(left.id).localeCompare(String(right.id));
    }

    function calendarActivityLabel(item) {
      if (!item) {
        return 'Activity';
      }

      if (item.kind !== 'action') {
        return item.customerName || 'Lead';
      }

      const actionType = String(item.actionType || '').toLowerCase();

      if (actionType === 'note') return 'Note added';
      if (actionType === 'manual-create') return 'Lead created';
      if (actionType === 'intake') return 'Intake logged';
      if (actionType === 'archive') return 'Archived';
      if (actionType === 'calendar-approve') return 'Calendar approved';
      if (actionType === 'calendar-reject') return 'Calendar rejected';
      if (item.status || item.crmStatus) return 'Status changed to ' + statusLabel(item.status || item.crmStatus);
      if (item.note) return 'Note added';

      return actionType ? actionType.replace(/[-_]/g, ' ') : 'Activity logged';
    }

    function calendarActivityIcon(item) {
      if (!item) {
        return '•';
      }

      if (item.kind !== 'action') {
        return '●';
      }

      const actionType = String(item.actionType || '').toLowerCase();

      if (actionType === 'note') return '✎';
      if (actionType === 'archive') return '×';
      if (actionType === 'calendar-approve') return '✓';
      if (actionType === 'calendar-reject') return '↺';
      if (actionType === 'manual-create' || actionType === 'intake') return '+';
      if (item.status || item.crmStatus) return '↻';
      return '•';
    }

    function calendarActivityDetail(item) {
      if (!item) {
        return '';
      }

      if (item.kind !== 'action') {
        return (item.projectConsideration || leadSummary(item)) + (item.followUpAt ? ' · ' + formatDateLabel(item.followUpAt) : '');
      }

      const parts = [];
      if (item.leadName || item.customerName) {
        parts.push(item.leadName || item.customerName);
      }
      if (item.note) {
        parts.push(item.note);
      } else if (item.followUpAt) {
        parts.push('Follow-up ' + formatDateLabel(item.followUpAt));
      } else if (item.owner) {
        parts.push('Owner ' + item.owner);
      } else if (item.priority) {
        parts.push('Priority ' + item.priority);
      }

      return parts.join(' · ') || 'Activity logged';
    }

    function calendarActivityToneClass(item) {
      if (!item) {
        return 'calendar-activity--generic';
      }

      if (item.kind !== 'action') {
        return 'calendar-activity--lead';
      }

      const actionType = String(item.actionType || '').toLowerCase();

      if (actionType === 'note') return 'calendar-activity--note';
      if (actionType === 'archive') return 'calendar-activity--archive';
      if (actionType === 'calendar-approve' || actionType === 'calendar-reject') return 'calendar-activity--approval';
      if (actionType === 'manual-create' || actionType === 'intake') return 'calendar-activity--intake';
      if (item.status || item.crmStatus) return 'calendar-activity--status';
      return 'calendar-activity--generic';
    }

    function buildCalendarItems(data) {
      const leads = Array.isArray(data.leads) ? data.leads : [];
      const actions = Array.isArray(data.actions) ? data.actions : [];
      const leadMap = new Map(leads.map((lead) => [lead.id, lead]));

      const leadItems = leads.map((lead) => ({
        kind: 'lead',
        id: 'lead:' + lead.id,
        leadId: lead.id,
        customerName: lead.customerName,
        siteKey: lead.siteKey,
        siteName: lead.siteName,
        dateKey: lead.dateKey || formatDateKey(new Date(lead.startIso || lead.createdAt || Date.now())),
        startIso: lead.startIso || lead.createdAt,
        sortIso: lead.startIso || lead.createdAt,
        crmStatus: lead.crmStatus,
        calendarApprovalStatus: lead.calendarApprovalStatus,
        projectConsideration: lead.projectConsideration,
        followUpAt: lead.followUpAt,
        summary: lead.summary,
        note: lead.summary || lead.nextStep || '',
      }));

      const activityItems = actions.map((action) => {
        const lead = leadMap.get(action.leadId);
        if (!lead) {
          return null;
        }

        const createdIso = action.createdAt || lead.updatedAt || lead.createdAt || new Date().toISOString();
        const actionType = String(action.type || '').toLowerCase();

        return {
          kind: 'action',
          id: 'action:' + action.id,
          leadId: lead.id,
          leadName: lead.customerName,
          customerName: lead.customerName,
          siteKey: lead.siteKey || action.siteKey,
          siteName: lead.siteName || action.siteName || 'Unknown site',
          dateKey: formatDateKey(new Date(createdIso)),
          startIso: createdIso,
          sortIso: createdIso,
          crmStatus: action.status || lead.crmStatus,
          calendarApprovalStatus: action.calendarApprovalStatus || lead.calendarApprovalStatus,
          projectConsideration: lead.projectConsideration,
          followUpAt: action.followUpAt || lead.followUpAt || '',
          owner: action.owner || lead.owner || 'Chris',
          priority: action.priority || lead.crmPriority || 'normal',
          actionType,
          actionLabel: calendarActivityLabel({ kind: 'action', actionType, status: action.status, note: action.note }),
          note: action.note || '',
          action,
          lead,
        };
      }).filter(Boolean);

      return [...leadItems, ...activityItems].sort(sortCalendarItems);
    }

    function getCalendarBubbleItems(data) {
      return buildCalendarItems(data);
    }

    const DAY_PREVIEW_LIMIT = 3;

    function renderCalendarDayEventMarkup(item) {
      const metaTime = formatTimeLabel(item.followUpAt || item.startIso || item.createdAt);
      const metaLabel = (item.leadName || item.customerName || 'Lead') + ' · ' + (item.siteName || item.siteKey || 'Unknown site');
      const statusText = item.kind === 'action'
        ? statusLabel(item.crmStatus)
        : calendarApprovalLabel(item.calendarApprovalStatus || (item.calendarEligible ? 'approved' : ''));

      return [
        '        <button type="button" class="day__event day__event--compact ' + calendarBubbleSiteClass(item.siteKey) + ' ' + calendarActivityToneClass(item) + ' ' + ((item.leadId || item.id) === state.selectedLeadId ? 'day__event--active' : '') + '" data-lead-id="' + escapeHtml(item.leadId || item.id) + '" aria-label="View ' + escapeHtml(calendarActivityLabel(item)) + '">',
        '          <span class="calendar-statusDot ' + calendarStatusDotClass(item) + '" aria-hidden="true"></span>',
        '          <strong><span class="calendar-activity__title"><span class="calendar-activity__icon" aria-hidden="true">' + escapeHtml(calendarActivityIcon(item)) + '</span><span class="calendar-activity__label">' + escapeHtml(calendarActivityLabel(item)) + '</span></span></strong>',
        '          <div class="day__eventMeta">',
        '            <span class="day__event-site">' + escapeHtml(metaLabel) + '</span>',
        '            <span class="day__eventTime">' + escapeHtml(metaTime) + '</span>',
        '          </div>',
        '          <span class="calendar-status ' + (item.kind === 'action' ? statusBadgeClass(item.crmStatus) : calendarApprovalClass(item.calendarApprovalStatus || (item.calendarEligible ? 'approved' : ''))) + '">' + escapeHtml(statusText) + '</span>',
        '        </button>',
      ].join('\n');
    }

    async function fetchState() {
      const response = await fetch('/api/state');
      if (!response.ok) {
        throw new Error('Failed to load local calendar state.');
      }
      return response.json();
    }

    async function backupNow() {
      if (state.backupBusy) return;
      state.backupBusy = true;
      els.backupBtn.textContent = 'Backing Up...';

      try {
        const response = await fetch('/api/backup', { method: 'POST' });
        const result = await response.json();
        state.data = result.state;
        render();
      } finally {
        state.backupBusy = false;
        els.backupBtn.textContent = 'Back Up Now';
      }
    }

    function renderStats(data) {
      const cards = [
        ['Leads', data.stats.totalLeads],
        ['Qualified', data.stats.qualifiedLeads],
        ['Review', data.stats.reviewQueue],
        ['Average', data.stats.averageScore ? \`\${data.stats.averageScore}/100\` : '0/100'],
      ];

      els.stats.innerHTML = cards.map(([label, value]) => \`
        <div class="stat">
          <span>\${label}</span>
          <strong>\${value}</strong>
        </div>
      \`).join('');
    }

    function renderBackupMeta(data) {
      els.backupMeta.innerHTML = \`
        <strong style="color: var(--text); display:block; margin-bottom:6px;">Backup</strong>
        <div>\${data.backupDir ? \`Active: \${data.backupDir}\` : 'No backup folder detected yet. Set LOCAL_CALENDAR_BACKUP_DIR to point at your sync folder.'}</div>
      \`;
    }

    function renderReviewQueue(data) {
      const reviewItems = data.inbox.filter((item) => !item.calendarEligible);
      if (!reviewItems.length) {
        els.reviewQueue.innerHTML = '<div class="empty">No leads waiting for review.</div>';
        return;
      }

      els.reviewQueue.innerHTML = reviewItems.map((item) => \`
        <article class="lead-card">
          <div class="lead-card__top">
            <div>
              <p class="lead-card__title">\${item.customerName}</p>
              <small>\${item.customerEmail} · \${item.customerPhone}</small>
          </div>
          <span class="badge \${scoreBadge(item.qualityScore)}">\${item.qualityScore}/100</span>
        </div>
        <p>\${leadSummary(item)}</p>
        \${projectBriefLine(item) ? '<small>' + projectBriefLine(item) + '</small>' : ''}
        <small>\${dispositionLabel(item)} · \${item.nextStep || 'Needs manual review'}</small>
        </article>
      \`).join('');
    }

    function renderEventsList(items) {
      if (!items.length) {
        els.eventsList.innerHTML = '<div class="empty">No calendar activity yet.</div>';
        return;
      }

      els.eventsList.innerHTML = items.map((item) => \`
        <article class="lead-card lead-card--activity \${calendarActivityToneClass(item)}">
          <span class="calendar-statusDot \${calendarStatusDotClass(item)}" aria-hidden="true"></span>
          <div class="lead-card__top">
            <div>
              <p class="lead-card__title">
                <span class="calendar-activity__title">
                  <span class="calendar-activity__icon" aria-hidden="true">\${escapeHtml(calendarActivityIcon(item))}</span>
                  <span class="calendar-activity__label">\${escapeHtml(calendarActivityLabel(item))}</span>
                </span>
              </p>
              <small>\${escapeHtml(item.leadName || item.customerName || 'Lead')} · \${escapeHtml(item.siteName || item.siteKey || 'Unknown site')}</small>
          </div>
          <span class="badge \${item.kind === 'action' ? 'badge--warn' : 'badge--good'}">\${escapeHtml(item.kind === 'action' ? statusLabel(item.crmStatus) : \`\${item.qualityScore}/100\`)}</span>
        </div>
        <p>\${escapeHtml(calendarActivityDetail(item))}</p>
        \${projectBriefLine(item) ? '<small>' + projectBriefLine(item) + '</small>' : ''}
        <small>\${escapeHtml(formatDateLabel(item.startIso || item.createdAt))} · \${escapeHtml(formatTimeLabel(item.startIso || item.createdAt))}</small>
        </article>
      \`).join('');
    }

    function renderCalendar(data) {
      const baseDate = new Date();
      baseDate.setMonth(baseDate.getMonth() + state.monthOffset, 1);
      const days = monthDays(baseDate);
      const monthKey = \`\${baseDate.getFullYear()}-\${String(baseDate.getMonth() + 1).padStart(2, '0')}\`;
      const bubbleItems = getCalendarBubbleItems(data);
      const visibleBubbleItems = bubbleItems.filter((item) => typeof item.dateKey === 'string' && item.dateKey.startsWith(monthKey));
      const orderedBubbleItems = [...visibleBubbleItems].sort(sortCalendarItems);
      const grouped = groupedEvents(orderedBubbleItems);
      const todayKey = new Date().toISOString().slice(0, 10);

      els.monthLabel.textContent = formatMonthLabel(baseDate);
      els.calendarCount.textContent = \`\${orderedBubbleItems.length} calendar item\${orderedBubbleItems.length === 1 ? '' : 's'}\`;

      const header = weekdays.map((weekday) => \`<div class="weekday">\${weekday}</div>\`).join('');
      const body = days.map((day) => {
        if (!day) {
          return '<div class="day day--empty"></div>';
        }

        const key = day.toISOString().slice(0, 10);
        const items = grouped.get(key) || [];
        const isToday = key === todayKey;

        return \`
          <div class="day \${isToday ? 'day--today' : ''} \${state.expandedDayKey === key ? 'day--expanded' : ''}" data-date="\${key}">
            <div class="day__num">\${day.getDate()}</div>
            <div class="day__events \${state.expandedDayKey === key ? 'day__events--expanded' : ''}">
              \${(state.expandedDayKey === key ? items : items.slice(0, DAY_PREVIEW_LIMIT)).map((item) => renderCalendarDayEventMarkup(item)).join('')}
              \${items.length > DAY_PREVIEW_LIMIT ? \`
                <button type="button" class="day__more" data-day-toggle="\${key}" aria-expanded="\${state.expandedDayKey === key ? 'true' : 'false'}">
                  \${state.expandedDayKey === key ? 'Show less' : '+' + (items.length - DAY_PREVIEW_LIMIT) + ' more'}
                </button>
              \` : ''}
            </div>
          </div>
        \`;
      }).join('');

      els.calendarGrid.innerHTML = header + body;
      els.calendarGrid.querySelectorAll('[data-lead-id]').forEach((button) => {
        button.addEventListener('click', () => openLeadModal(button.getAttribute('data-lead-id')));
      });
      els.calendarGrid.querySelectorAll('[data-day-toggle]').forEach((button) => {
        button.addEventListener('click', () => {
          const dayKey = button.getAttribute('data-day-toggle');
          state.expandedDayKey = state.expandedDayKey === dayKey ? null : dayKey;
          renderCalendar(state.data);
        });
      });
    }

    function renderStatus(data) {
      els.rootPath.textContent = data.localCalendarRootDir;
      els.statusLine.textContent = data.backupDir
        ? \`Backing up to \${data.backupDir}\`
        : 'Backup folder not detected. Calendar still runs locally.';
    }

    function render() {
      if (!state.data) return;
      const calendarItems = getCalendarBubbleItems(state.data);
      renderStats(state.data);
      renderBackupMeta(state.data);
      renderReviewQueue(state.data);
      renderEventsList(calendarItems);
      renderCalendar(state.data);
      renderStatus(state.data);
    }

    els.backupBtn.addEventListener('click', backupNow);
    document.getElementById('prevMonth').addEventListener('click', () => { state.monthOffset -= 1; renderCalendar(state.data); });
    document.getElementById('nextMonth').addEventListener('click', () => { state.monthOffset += 1; renderCalendar(state.data); });
    document.getElementById('todayBtn').addEventListener('click', () => { state.monthOffset = 0; renderCalendar(state.data); });

    async function init() {
      try {
        state.data = await fetchState();
        render();
      } catch (error) {
        els.statusLine.textContent = error instanceof Error ? error.message : 'Unable to load calendar state.';
        els.eventsList.innerHTML = '<div class="empty">Unable to load calendar state.</div>';
        els.reviewQueue.innerHTML = '<div class="empty">Unable to load review queue.</div>';
      }
    }

    init();
  </script>
</body>
</html>`;
}

async function buildPage() {
  return readFile(resolve(process.cwd(), 'public', 'local-calendar.html'), 'utf8');
}

async function handleAuthMeRequest(req, res) {
  const { user } = await getAuthContextFromRequest(req);
  jsonResponse(res, 200, {
    ok: true,
    user: user ? serializeAuthUser(user) : null,
    canManageUsers: user?.role === 'admin',
  });
}

async function handleLoginRequest(req, res) {
  if (req.method !== 'POST') {
    textResponse(res, 405, 'Method Not Allowed');
    return;
  }

  const payload = await readJsonBody(req);
  const username = cleanText(payload?.username, '');
  const password = cleanText(payload?.password, '');

  if (!username || !password) {
    jsonResponse(res, 400, {
      ok: false,
      error: 'Username and password are required.',
    });
    return;
  }

  const result = await loginWithPassword({ username, password });
  res.setHeader('Set-Cookie', createSessionCookie(result.token));
  jsonResponse(res, 200, {
    ok: true,
    user: result.user,
  });
}

async function handleLogoutRequest(req, res) {
  if (req.method !== 'POST') {
    textResponse(res, 405, 'Method Not Allowed');
    return;
  }

  const token = getRequestCookieValue(req, getAuthSessionCookieName());
  if (token) {
    await logoutSession(token);
  }

  res.setHeader('Set-Cookie', clearSessionCookie());
  jsonResponse(res, 200, { ok: true });
}

async function handleRegisterRequest(req, res) {
  if (req.method !== 'POST') {
    textResponse(res, 405, 'Method Not Allowed');
    return;
  }

  const payload = await readJsonBody(req);
  const inviteToken = cleanText(payload?.inviteToken, '');
  const username = cleanText(payload?.username, '');
  const password = cleanText(payload?.password, '');
  const displayName = cleanText(payload?.displayName, '');

  const result = await registerWithInvite({
    inviteToken,
    username,
    password,
    displayName,
  });

  res.setHeader('Set-Cookie', createSessionCookie(result.token));
  jsonResponse(res, 200, {
    ok: true,
    user: result.user,
  });
}

async function handleAdminUsersRequest(req, res) {
  const user = await requireAdmin(req, res);
  if (!user) {
    return;
  }

  if (req.method === 'GET') {
    const [users, invites] = await Promise.all([listUsers(), listInvites()]);
    jsonResponse(res, 200, {
      ok: true,
      users,
      invites,
    });
    return;
  }

  if (req.method !== 'POST') {
    textResponse(res, 405, 'Method Not Allowed');
    return;
  }

  const payload = await readJsonBody(req);
  const action = cleanText(payload?.action, 'create');

  if (action === 'create') {
    const created = await createUserAccount({
      username: payload?.username,
      password: payload?.password,
      displayName: payload?.displayName,
      role: payload?.role,
      active: payload?.active,
      allowedSiteKeys: payload?.allowedSiteKeys,
      createdByUserId: user.id,
      createdByUsername: user.username,
    });
    jsonResponse(res, 200, {
      ok: true,
      user: created,
    });
    return;
  }

  if (action === 'update') {
    const updated = await updateUserAccount(cleanText(payload?.id, ''), {
      displayName: payload?.displayName,
      role: payload?.role,
      active: payload?.active,
      password: payload?.password,
      allowedSiteKeys: payload?.allowedSiteKeys,
    });
    jsonResponse(res, 200, {
      ok: true,
      user: updated,
    });
    return;
  }

  if (action === 'invite') {
    const invite = await createInvite({
      role: payload?.role,
      note: payload?.note,
      allowedSiteKeys: payload?.allowedSiteKeys,
      createdByUserId: user.id,
      createdByUsername: user.username,
      expiresAt: payload?.expiresAt,
    });
    jsonResponse(res, 200, {
      ok: true,
      invite: serializeAuthInvite(invite.invite),
      token: invite.token,
    });
    return;
  }

  jsonResponse(res, 400, {
    ok: false,
    error: 'Unsupported admin action.',
  });
}

async function handleAdminInvitesRequest(req, res) {
  const user = await requireAdmin(req, res);
  if (!user) {
    return;
  }

  if (req.method === 'GET') {
    const invites = await listInvites();
    jsonResponse(res, 200, {
      ok: true,
      invites,
    });
    return;
  }

  if (req.method !== 'POST') {
    textResponse(res, 405, 'Method Not Allowed');
    return;
  }

  const payload = await readJsonBody(req);
  const invite = await createInvite({
    role: payload?.role,
    note: payload?.note,
    allowedSiteKeys: payload?.allowedSiteKeys,
    createdByUserId: user.id,
    createdByUsername: user.username,
    expiresAt: payload?.expiresAt,
  });

  jsonResponse(res, 200, {
    ok: true,
    invite: serializeAuthInvite(invite.invite),
    token: invite.token,
  });
}

async function handleAdminCalendarRequest(req, res) {
  const user = await requireAdmin(req, res);
  if (!user) {
    return;
  }

  if (req.method !== 'POST') {
    textResponse(res, 405, 'Method Not Allowed');
    return;
  }

  const payload = await readJsonBody(req);
  const action = cleanText(payload?.action, 'clear-posts');
  if (!['clear-posts', 'archive-posts'].includes(action)) {
    jsonResponse(res, 400, {
      ok: false,
      error: 'Unsupported calendar admin action.',
    });
    return;
  }

  const siteKey = cleanText(payload?.siteKey, allSitesKey);
  const targetSites = isAllSitesKey(siteKey) ? getAccessibleSiteDefinitions(user) : [resolveSiteKey(siteKey)];
  const results = [];

  for (const site of targetSites) {
    if (action === 'archive-posts') {
      results.push(await archiveLocalCalendarPosts(site.key));
    } else {
      results.push(await clearLocalCalendarPosts(site.key));
    }
  }

  const state = await loadStatePayload(siteKey, user);
  jsonResponse(res, 200, {
    ok: true,
    siteKey,
    results,
    state,
  });
}

function isAllSitesKey(siteKey) {
  return cleanText(siteKey, '').toLowerCase() === allSitesKey;
}

function sortRecordsByDateDesc(left, right) {
  return new Date(right.createdAt || right.startIso || 0).getTime() - new Date(left.createdAt || left.startIso || 0).getTime();
}

async function loadAllSitesStatePayload(user = null) {
  const siteDefinitions = getAccessibleSiteDefinitions(user);
  const states = await Promise.all(siteDefinitions.map((site) => loadLocalCalendarState(site.key)));
  const backupDirs = siteDefinitions.map((site) => resolveLocalCalendarBackupDir(site.key)).filter(Boolean);
  const inbox = states.flatMap((state) => state.inbox).sort(sortRecordsByDateDesc);
  const events = states.flatMap((state) => state.events).sort(sortRecordsByDateDesc);
  const actions = states.flatMap((state) => state.actions).sort(sortRecordsByDateDesc);
  const teamChatMessages = states.flatMap((state) => state.teamChatMessages).sort(sortRecordsByDateDesc);
  const teamChatThreads = states.flatMap((state) => state.teamChatThreads || []).sort(sortRecordsByDateDesc);
  const teamChatProfiles = states.flatMap((state) => state.teamChatProfiles || []).sort(sortRecordsByDateDesc);
  const totalLeads = inbox.length;
  const qualifiedLeads = inbox.filter((item) => item.crmStatus === 'qualified' || item.calendarEligible).length;
  const reviewQueue = inbox.filter((item) => item.crmStatus === 'review' || item.disposition === 'hold').length;
  const activeLeads = inbox.filter((item) => !isClosedStatus(item.crmStatus)).length;
  const overdueLeads = inbox.filter((item) => Boolean(item.followUpAt) && new Date(item.followUpAt).getTime() < Date.now() && !isClosedStatus(item.crmStatus)).length;
  const openFollowUps = inbox.filter((item) => Boolean(item.followUpAt) && !isClosedStatus(item.crmStatus)).length;
  const wonLeads = inbox.filter((item) => item.crmStatus === 'won').length;
  const lostLeads = inbox.filter((item) => item.crmStatus === 'lost').length;
  const archivedLeads = inbox.filter((item) => item.crmStatus === 'archived').length;
  const pendingCalendarApprovals = events.filter((item) => item.calendarApprovalStatus === 'pending').length;
  const approvedCalendarEvents = events.filter((item) => item.calendarApprovalStatus === 'approved').length;
  const rejectedCalendarEvents = events.filter((item) => item.calendarApprovalStatus === 'rejected').length;
  const teamChatCount = teamChatMessages.length;
  const teamChatThreadCount = teamChatThreads.length;
  const teamChatProfileCount = teamChatProfiles.length;
  const averageScore = totalLeads
    ? Math.round(inbox.reduce((sum, item) => sum + (Number(item.qualityScore) || 0), 0) / totalLeads)
    : 0;

  return attachAuthResponse({
    inbox,
    leads: inbox,
    events,
    actions,
    teamChatMessages,
    teamChatThreads,
    teamChatProfiles,
    backupDir: backupDirs.length ? 'Multiple site backup folders' : '',
    localCalendarRootDir: 'Combined site calendars',
    localCalendarLeadInboxPath: 'Combined site inboxes',
    localCalendarEventsPath: 'Combined site calendars',
    localCalendarActionsPath: 'Combined site actions',
    siteKey: allSitesKey,
    siteName: 'All Sites',
    siteOptions: siteDefinitions,
    stats: {
      totalLeads,
      qualifiedLeads,
      reviewQueue,
      activeLeads,
      overdueLeads,
      openFollowUps,
      wonLeads,
      lostLeads,
      archivedLeads,
      pendingCalendarApprovals,
      approvedCalendarEvents,
      rejectedCalendarEvents,
      teamChatCount,
      teamChatThreadCount,
      teamChatProfileCount,
      averageScore,
    },
  }, user);
}

async function loadStatePayload(siteKey = getDefaultSiteKey(), user = null) {
  if (isAllSitesKey(siteKey)) {
    return loadAllSitesStatePayload(user);
  }

  const resolvedSiteKey = resolveAccessibleSiteKey(siteKey, user);
  const paths = resolveLocalCalendarPaths(resolvedSiteKey);
  const state = await loadLocalCalendarState(resolvedSiteKey);
  const backupDir = resolveLocalCalendarBackupDir(resolvedSiteKey);
  const totalLeads = state.inbox.length;
  const qualifiedLeads = state.inbox.filter((item) => item.crmStatus === 'qualified' || item.calendarEligible).length;
  const reviewQueue = state.inbox.filter((item) => item.crmStatus === 'review' || item.disposition === 'hold').length;
  const activeLeads = state.inbox.filter((item) => !isClosedStatus(item.crmStatus)).length;
  const overdueLeads = state.inbox.filter((item) => Boolean(item.followUpAt) && new Date(item.followUpAt).getTime() < Date.now() && !isClosedStatus(item.crmStatus)).length;
  const openFollowUps = state.inbox.filter((item) => Boolean(item.followUpAt) && !isClosedStatus(item.crmStatus)).length;
  const wonLeads = state.inbox.filter((item) => item.crmStatus === 'won').length;
  const lostLeads = state.inbox.filter((item) => item.crmStatus === 'lost').length;
  const archivedLeads = state.inbox.filter((item) => item.crmStatus === 'archived').length;
  const pendingCalendarApprovals = state.events.filter((item) => item.calendarApprovalStatus === 'pending').length;
  const approvedCalendarEvents = state.events.filter((item) => item.calendarApprovalStatus === 'approved').length;
  const rejectedCalendarEvents = state.events.filter((item) => item.calendarApprovalStatus === 'rejected').length;
  const teamChatCount = state.teamChatMessages.length;
  const teamChatThreadCount = Array.isArray(state.teamChatThreads) ? state.teamChatThreads.length : 0;
  const teamChatProfileCount = Array.isArray(state.teamChatProfiles) ? state.teamChatProfiles.length : 0;
  const averageScore = totalLeads
    ? Math.round(state.inbox.reduce((sum, item) => sum + (Number(item.qualityScore) || 0), 0) / totalLeads)
    : 0;

  return attachAuthResponse({
    ...state,
    backupDir,
    localCalendarRootDir: paths.rootDir,
    localCalendarLeadInboxPath: paths.leadInboxPath,
    localCalendarEventsPath: paths.eventsPath,
    localCalendarActionsPath: paths.actionsPath,
    siteKey: resolvedSiteKey,
    siteName: getSiteLabel(resolvedSiteKey),
    siteOptions: getAccessibleSiteDefinitions(user),
    stats: {
      totalLeads,
      qualifiedLeads,
      reviewQueue,
      activeLeads,
      overdueLeads,
      openFollowUps,
      wonLeads,
      lostLeads,
      archivedLeads,
      pendingCalendarApprovals,
      approvedCalendarEvents,
      rejectedCalendarEvents,
      teamChatCount,
      teamChatThreadCount,
      teamChatProfileCount,
      averageScore,
    },
  }, user);
}

async function handleChatAgentStatusRequest(req, res) {
  const url = req.url ? new URL(req.url, `http://${host}:${port}`) : null;
  const site = cleanText(url?.searchParams.get('site') || 'all', 'all');
  const search = site ? `?site=${encodeURIComponent(site)}` : '';
  const upstreamUrl = `http://${chatAgentHost}:${chatAgentPort}/api/status${search}`;

  try {
    const response = await fetch(upstreamUrl, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      jsonResponse(res, response.status, {
        ok: false,
        error: `Chat agent status request failed with status ${response.status}.`,
      });
      return;
    }

    const data = await response.json();
    jsonResponse(res, 200, data);
  } catch (error) {
    jsonResponse(res, 502, {
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to reach chat agent status service.',
    });
  }
}

async function handleTeamChatRequest(req, res) {
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

  const user = await requireAuth(req, res);
  if (!user) {
    return;
  }

  const payload = await readJsonBody(req);
  const message = buildTeamChatPayload({
    ...payload,
    authorName: cleanText(payload?.authorName, user.displayName),
    authorUserId: user.id,
    authorUsername: user.username,
    authorDisplayName: user.displayName,
  });

  if (!message.message) {
    jsonResponse(res, 400, {
      ok: false,
      error: 'message is required.',
    });
    return;
  }

  const persisted = await persistLocalTeamChatMessage(message);
  const state = await loadStatePayload(persisted.siteKey, user);

  jsonResponse(res, 200, {
    ok: true,
    message: persisted,
    state,
  });
}

async function handleTeamChatThreadRequest(req, res) {
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

  const user = await requireAuth(req, res);
  if (!user) {
    return;
  }

  const payload = await readJsonBody(req);
  const action = cleanText(payload?.action, 'create').toLowerCase();
  const thread = buildTeamChatThreadPayload({
    ...payload,
    createdByProfileId: cleanText(payload?.createdByProfileId, user.id),
  });
  const siteKey = resolveSiteKey(thread.siteKey);

  if (action === 'delete') {
    if (!thread.id) {
      jsonResponse(res, 400, {
        ok: false,
        error: 'id is required.',
      });
      return;
    }

    if (thread.id.startsWith('site:') || thread.id.startsWith('lead:')) {
      jsonResponse(res, 403, {
        ok: false,
        error: 'Built-in threads cannot be deleted.',
      });
      return;
    }

    const deleted = await persistLocalTeamChatThread({
      ...thread,
      siteKey,
      deletedAt: cleanText(payload?.deletedAt, new Date().toISOString()),
      deletedByProfileId: cleanText(payload?.deletedByProfileId, ''),
      updatedAt: new Date().toISOString(),
      source: 'team-chat-ui',
    });
    const state = await loadStatePayload(siteKey, user);

    jsonResponse(res, 200, {
      ok: true,
      thread: deleted,
      state,
    });
    return;
  }

  if (!thread.name) {
    jsonResponse(res, 400, {
      ok: false,
      error: 'name is required.',
    });
    return;
  }

  const persisted = await persistLocalTeamChatThread({
    ...thread,
    siteKey,
    threadType: 'custom',
    updatedAt: new Date().toISOString(),
    source: 'team-chat-ui',
  });
  const state = await loadStatePayload(siteKey, user);

  jsonResponse(res, 200, {
    ok: true,
    thread: persisted,
    state,
  });
}

async function handleTeamChatProfileRequest(req, res) {
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

  const user = await requireAuth(req, res);
  if (!user) {
    return;
  }

  const payload = await readJsonBody(req);
  const profile = buildTeamChatProfilePayload({
    ...payload,
    source: 'team-chat-ui',
    createdByUserId: user.id,
    createdByUsername: user.username,
    createdByDisplayName: user.displayName,
  });
  const siteKey = resolveSiteKey(profile.siteKey);

  if (!profile.name) {
    jsonResponse(res, 400, {
      ok: false,
      error: 'name is required.',
    });
    return;
  }

  const persisted = await persistLocalTeamChatProfile({
    ...profile,
    siteKey,
    updatedAt: new Date().toISOString(),
    source: 'team-chat-ui',
  });
  const state = await loadStatePayload(siteKey, user);

  jsonResponse(res, 200, {
    ok: true,
    profile: persisted,
    state,
  });
}

async function handleBackupRequest(req, res) {
  const user = await requireAuth(req, res);
  if (!user) {
    return;
  }

  const url = req.url ? new URL(req.url, `http://${host}:${port}`) : null;
  const siteKey = cleanText(url?.searchParams.get('site') || '', '');
  const result = isAllSitesKey(siteKey)
    ? await (async () => {
        const siteDefinitions = listSiteDefinitions();
        const results = await Promise.all(siteDefinitions.map((site) => syncLocalCalendarBackup(site.key)));
        const successful = results.filter((entry) => entry.synced);

        return {
          synced: successful.length > 0,
          reason: successful.length ? 'Backed up all site calendars.' : 'No backup folder configured or detected for any site.',
          backupDir: successful.length ? 'Multiple site backup folders' : '',
          leadCount: results.reduce((sum, entry) => sum + (Number(entry.leadCount) || 0), 0),
          eventCount: results.reduce((sum, entry) => sum + (Number(entry.eventCount) || 0), 0),
          actionCount: results.reduce((sum, entry) => sum + (Number(entry.actionCount) || 0), 0),
          teamChatCount: results.reduce((sum, entry) => sum + (Number(entry.teamChatCount) || 0), 0),
          teamChatThreadCount: results.reduce((sum, entry) => sum + (Number(entry.teamChatThreadCount) || 0), 0),
          teamChatProfileCount: results.reduce((sum, entry) => sum + (Number(entry.teamChatProfileCount) || 0), 0),
        };
      })()
    : await syncLocalCalendarBackup(siteKey);
  const state = await loadStatePayload(siteKey, user);
  jsonResponse(res, 200, { ok: true, result, state });
}

async function handleLeadActionRequest(req, res) {
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

  const user = await requireAuth(req, res);
  if (!user) {
    return;
  }

  const payload = await readJsonBody(req);
  const action = buildActionPayload({
    ...payload,
    author: user.displayName,
    authorUserId: user.id,
    authorUsername: user.username,
    authorDisplayName: user.displayName,
  });
  const isCalendarApprovalAction = action.type === 'calendar-approve' || action.type === 'calendar-reject';

  if (!action.leadId) {
    jsonResponse(res, 400, {
      ok: false,
      error: 'leadId is required.',
    });
    return;
  }

  if (!isCalendarApprovalAction && !action.note && !action.status && !action.followUpAt && !action.owner && !action.priority && action.type !== 'archive') {
    jsonResponse(res, 400, {
      ok: false,
      error: 'Add a note, status, follow-up, owner, or priority update before saving.',
    });
    return;
  }

  const persisted = await persistLocalLeadAction(action);
  const state = await loadStatePayload(action.siteKey, user);
  const lead = state.leads.find((item) => item.id === action.leadId) || null;

  jsonResponse(res, 200, {
    ok: true,
    action: persisted,
    lead,
    state,
  });
}

async function handleManualLeadRequest(req, res) {
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

  const user = await requireAuth(req, res);
  if (!user) {
    return;
  }

  const payload = await readJsonBody(req);
  const manualLead = buildManualLeadPayload({
    ...payload,
    createdByUserId: user.id,
    createdByUsername: user.username,
    createdByDisplayName: user.displayName,
  });

  if (!manualLead.customerName) {
    jsonResponse(res, 400, {
      ok: false,
      error: 'customerName is required.',
    });
    return;
  }

  const record = buildManualLeadRecord(manualLead);
  const persistedLead = await persistLocalLeadInbox(record);
  const firstAction = await persistLocalLeadAction({
    leadId: persistedLead.id,
    siteKey: persistedLead.siteKey,
    type: 'manual-create',
    status: persistedLead.crmStatus,
    note: persistedLead.summary || persistedLead.nextStep || 'Manual lead created.',
    followUpAt: persistedLead.followUpAt,
    owner: persistedLead.owner,
    priority: persistedLead.crmPriority,
    tags: persistedLead.tags,
    author: user.displayName,
    authorUserId: user.id,
    authorUsername: user.username,
    authorDisplayName: user.displayName,
    source: 'crm-ui',
  });
  const state = await loadStatePayload(persistedLead.siteKey, user);
  const lead = state.leads.find((item) => item.id === persistedLead.id) || persistedLead;

  jsonResponse(res, 200, {
    ok: true,
    lead,
    action: firstAction,
    state,
  });
}

const server = createServer(async (req, res) => {
  try {
    const url = req.url ? new URL(req.url, `http://${host}:${port}`) : null;

    if (!url) {
      textResponse(res, 400, 'Bad Request');
      return;
    }

    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.end();
      return;
    }

    if (url.pathname === routeHealth) {
      jsonResponse(res, 200, { ok: true, service: 'local-calendar', port });
      return;
    }

    if (url.pathname === routeAuthMe) {
      await handleAuthMeRequest(req, res);
      return;
    }

    if (url.pathname === routeAuthLogin) {
      await handleLoginRequest(req, res);
      return;
    }

    if (url.pathname === routeAuthLogout) {
      await handleLogoutRequest(req, res);
      return;
    }

    if (url.pathname === routeAuthRegister) {
      await handleRegisterRequest(req, res);
      return;
    }

    if (url.pathname === routeAdminUsers) {
      await handleAdminUsersRequest(req, res);
      return;
    }

    if (url.pathname === routeAdminInvites) {
      await handleAdminInvitesRequest(req, res);
      return;
    }

    if (url.pathname === routeAdminCalendar) {
      await handleAdminCalendarRequest(req, res);
      return;
    }

    if (url.pathname === routeState) {
      const user = await requireAuth(req, res);
      if (!user) {
        return;
      }

      const state = await loadStatePayload(url.searchParams.get('site') || '', user);
      jsonResponse(res, 200, { ok: true, ...state });
      return;
    }

    if (url.pathname === routeBackup && req.method === 'POST') {
      await handleBackupRequest(req, res);
      return;
    }

    if (url.pathname === routeChatAgentStatus && req.method === 'GET') {
      await handleChatAgentStatusRequest(req, res);
      return;
    }

    if (url.pathname === routeLeadAction && req.method === 'POST') {
      await handleLeadActionRequest(req, res);
      return;
    }

    if (url.pathname === routeManualLead && req.method === 'POST') {
      await handleManualLeadRequest(req, res);
      return;
    }

    if (url.pathname === routeTeamChatThread && req.method === 'POST') {
      await handleTeamChatThreadRequest(req, res);
      return;
    }

    if (url.pathname === routeTeamChatProfile && req.method === 'POST') {
      await handleTeamChatProfileRequest(req, res);
      return;
    }

    if (url.pathname === routeTeamChat && req.method === 'POST') {
      await handleTeamChatRequest(req, res);
      return;
    }

    if (url.pathname === '/' || url.pathname === '/index.html') {
      const html = await buildPage();
      textResponse(res, 200, html, 'text/html; charset=utf-8');
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

server.on('close', () => {
  console.log('Samuel Studio local calendar server closed.');
});

server.on('error', (error) => {
  console.error('Samuel Studio local calendar server error:', error);
});

process.on('uncaughtException', (error) => {
  console.error('Samuel Studio local calendar uncaught exception:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Samuel Studio local calendar unhandled rejection:', error);
});

process.on('exit', (code) => {
  console.log(`Samuel Studio local calendar process exiting with code ${code}.`);
});

server.listen(port, host, () => {
  console.log(`Samuel Studio local calendar listening on http://${host}:${port}`);
});
