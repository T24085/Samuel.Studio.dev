import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import { resolveWritableRuntimeDir } from './runtime-paths.js';
import { getSiteDefinition, getSiteFolderName, getSiteLabel, normalizeSiteKey, resolveSiteKey } from './site-registry.js';

const explicitLocalCalendarRootDir = sanitizeText(process.env.LOCAL_CALENDAR_ROOT_DIR, '');
const moduleRootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const runtimeBaseCandidates = [
  resolve(os.homedir(), 'AppData', 'Local', 'Samuel Studio'),
  resolve(os.tmpdir(), 'Samuel Studio'),
];

function pad(value) {
  return String(value).padStart(2, '0');
}

function formatDateKey(date, timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Chicago') {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function formatTimeLabel(date, timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Chicago') {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function formatIsoDateTime(date) {
  return date.toISOString();
}

function sanitizeText(value, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function sanitizeDataUrl(value, fallback = '') {
  const text = sanitizeText(value, '');
  if (!text) {
    return fallback;
  }

  if (!text.startsWith('data:image/')) {
    return fallback;
  }

  return text;
}

function resolveSiteCalendarRootDir(siteKey, pageUrl = '') {
  const normalizedSiteKey = resolveSiteKey(siteKey, pageUrl);
  const siteLabel = getSiteLabel(normalizedSiteKey);
  const explicitRoot = explicitLocalCalendarRootDir
    ? resolve(explicitLocalCalendarRootDir)
    : '';

  const rootDir = resolveWritableRuntimeDir({
    explicitDir: explicitRoot,
    fallbackName: 'local-calendar',
    repoRoot: moduleRootDir,
    extraCandidates: runtimeBaseCandidates,
    scope: ['sites', normalizedSiteKey, 'local-calendar'],
  });

  return {
    siteKey: normalizedSiteKey,
    siteName: siteLabel,
    rootDir,
    leadInboxPath: resolve(rootDir, 'lead-inbox.ndjson'),
    eventsPath: resolve(rootDir, 'calendar-events.ndjson'),
    actionsPath: resolve(rootDir, 'lead-actions.ndjson'),
    calendarArchivePath: resolve(rootDir, 'calendar-archive.ndjson'),
    teamChatPath: resolve(rootDir, 'team-chat.ndjson'),
    teamChatThreadsPath: resolve(rootDir, 'team-chat-threads.ndjson'),
    teamChatProfilesPath: resolve(rootDir, 'team-chat-profiles.ndjson'),
  };
}

export function resolveLocalCalendarPaths(siteKey = '', pageUrl = '') {
  return resolveSiteCalendarRootDir(siteKey, pageUrl);
}

function uniqueStrings(values) {
  return [...new Set(values.filter((value) => typeof value === 'string' && value.trim()).map((value) => value.trim()))];
}

function fallbackLeadStatus(record) {
  if (sanitizeText(record.crmStatus, '')) {
    return sanitizeText(record.crmStatus, 'new');
  }

  if (Boolean(record.calendarEligible)) {
    return 'qualified';
  }

  if (sanitizeText(record.disposition, '') === 'hold') {
    return 'review';
  }

  return 'new';
}

function normalizeLeadStatus(value, fallback = 'new') {
  const status = sanitizeText(value, fallback).toLowerCase();
  const allowed = new Set(['new', 'review', 'qualified', 'working', 'follow-up', 'won', 'lost', 'archived']);
  return allowed.has(status) ? status : fallback;
}

function normalizePriority(value, fallback = 'normal') {
  const priority = sanitizeText(value, fallback).toLowerCase();
  const allowed = new Set(['low', 'normal', 'medium', 'high', 'urgent']);
  return allowed.has(priority) ? priority : fallback;
}

function normalizeCalendarApprovalStatus(value, fallback = '') {
  const status = sanitizeText(value, fallback).toLowerCase();
  const allowed = new Set(['pending', 'approved', 'rejected', 'not-required']);
  return allowed.has(status) ? status : fallback;
}

function normalizeTags(values) {
  return uniqueStrings(Array.isArray(values) ? values : []);
}

function normalizeScore(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(0, Math.min(100, Math.round(parsed)));
}

function pickProjectBriefList(brief, keys) {
  const values = [];

  for (const key of keys) {
    const raw = brief?.[key];
    if (Array.isArray(raw)) {
      values.push(...raw);
    }
  }

  return uniqueStrings(values);
}

function pickProjectBriefText(brief, keys) {
  for (const key of keys) {
    const value = sanitizeText(brief?.[key], '');
    if (value) {
      return value;
    }
  }

  return '';
}

function normalizeProjectBrief(record) {
  const brief = record && typeof record === 'object' ? record : {};
  const goals = pickProjectBriefList(brief, ['goals', 'projectGoals']);
  const pages = pickProjectBriefList(brief, ['pages', 'projectPages']);
  const features = pickProjectBriefList(brief, ['features', 'projectFeatures']);
  const examples = pickProjectBriefList(brief, ['examples', 'projectExamples']);
  const audience = pickProjectBriefText(brief, ['audience', 'projectAudience']);
  const timeline = pickProjectBriefText(brief, ['timeline', 'projectTimeline']);
  const budget = pickProjectBriefText(brief, ['budget', 'projectBudget']);
  const decisionMaker = pickProjectBriefText(brief, ['decisionMaker']);
  const currentWebsite = pickProjectBriefText(brief, ['currentWebsite']);
  const pageCount = pickProjectBriefText(brief, ['pageCount']);

  return {
    goals: goals.slice(0, 8),
    projectGoals: goals.slice(0, 8),
    audience,
    projectAudience: audience,
    pages: pages.slice(0, 12),
    projectPages: pages.slice(0, 12),
    timeline,
    projectTimeline: timeline,
    budget,
    projectBudget: budget,
    features: features.slice(0, 10),
    projectFeatures: features.slice(0, 10),
    examples: examples.slice(0, 8),
    projectExamples: examples.slice(0, 8),
    decisionMaker,
    currentWebsite,
    pageCount,
  };
}

function isClosedStatus(status) {
  return ['won', 'lost', 'archived'].includes(normalizeLeadStatus(status, 'new'));
}

function inferCalendarApprovalStatus(record) {
  const explicit = normalizeCalendarApprovalStatus(record.calendarApprovalStatus, '');
  if (explicit) {
    return explicit;
  }

  if (sanitizeText(record.calendarSource, '') === 'chat-agent' && Boolean(record.calendarEligible)) {
    return 'pending';
  }

  if (Boolean(record.calendarCreated) || Boolean(record.calendarEligible)) {
    return 'approved';
  }

  return '';
}

function normalizeLeadRecord(record) {
  const receivedAt = sanitizeText(record.receivedAt, new Date().toISOString());
  const receivedDate = new Date(receivedAt);
  const endDate = new Date(receivedDate.getTime() + 30 * 60 * 1000);
  const timeZone = sanitizeText(record.timeZone, Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Chicago');
  const siteKey = resolveSiteKey(record.siteKey, record.pageUrl);
  const siteName = getSiteLabel(siteKey);
  const crmStatus = normalizeLeadStatus(record.crmStatus, fallbackLeadStatus(record));
  const followUpAt = sanitizeText(record.followUpAt, '');
  const activeCalendarMoment = followUpAt || sanitizeText(record.startIso, formatIsoDateTime(receivedDate));
  const activeMomentDate = new Date(activeCalendarMoment);
  const noteCount = Number.isFinite(Number(record.noteCount)) ? Number(record.noteCount) : 0;
  const actionCount = Number.isFinite(Number(record.actionCount)) ? Number(record.actionCount) : 0;

  return {
    id: sanitizeText(record.id, `lead_${Date.now()}`),
    createdAt: receivedAt,
    dateKey: sanitizeText(record.dateKey, formatDateKey(activeMomentDate, timeZone)),
    timeLabel: sanitizeText(record.timeLabel, formatTimeLabel(activeMomentDate, timeZone)),
    startIso: sanitizeText(record.startIso, activeCalendarMoment),
    endIso: sanitizeText(record.endIso, formatIsoDateTime(new Date(activeMomentDate.getTime() + 30 * 60 * 1000))),
    timeZone,
    siteKey,
    siteName,
    title: sanitizeText(record.title, 'Samuel Studio lead'),
    customerName: sanitizeText(record.customerName, 'Unknown'),
    customerEmail: sanitizeText(record.customerEmail, 'Unknown'),
    customerPhone: sanitizeText(record.customerPhone, 'Unknown'),
    projectConsideration: sanitizeText(record.projectConsideration, 'Needs follow-up'),
    productInterests: uniqueStrings(Array.isArray(record.productInterests) ? record.productInterests : []),
    projectBrief: normalizeProjectBrief(record.projectBrief),
    qualityScore: Number.isFinite(Number(record.qualityScore)) ? Number(record.qualityScore) : 0,
    disposition: sanitizeText(record.disposition, 'review'),
    summary: sanitizeText(record.summary, ''),
    nextStep: sanitizeText(record.nextStep, ''),
    sessionId: sanitizeText(record.sessionId, 'unknown-session'),
    pageUrl: sanitizeText(record.pageUrl, 'unknown-page'),
    latestUserMessage: sanitizeText(record.latestUserMessage, ''),
    latestAssistantMessage: sanitizeText(record.latestAssistantMessage, ''),
    messageCount: Number.isFinite(Number(record.messageCount)) ? Number(record.messageCount) : 0,
    calendarEligible: Boolean(record.calendarEligible),
    calendarCreated: Boolean(record.calendarCreated),
    backupStatus: sanitizeText(record.backupStatus, 'pending'),
    backupTarget: sanitizeText(record.backupTarget, ''),
    backupCopied: Boolean(record.backupCopied),
    calendarSource: sanitizeText(record.calendarSource, ''),
    calendarApprovalStatus: inferCalendarApprovalStatus(record),
    calendarApprovalAt: sanitizeText(record.calendarApprovalAt, ''),
    calendarApprovalBy: sanitizeText(record.calendarApprovalBy, ''),
    calendarApprovalNote: sanitizeText(record.calendarApprovalNote, ''),
    calendarCleared: Boolean(record.calendarCleared),
    calendarClearedAt: sanitizeText(record.calendarClearedAt, ''),
    calendarClearedBy: sanitizeText(record.calendarClearedBy, ''),
    calendarClearedNote: sanitizeText(record.calendarClearedNote, ''),
    crmStatus,
    crmPriority: normalizePriority(record.crmPriority, crmStatus === 'qualified' ? 'high' : 'normal'),
    owner: sanitizeText(record.owner, 'Chris'),
    followUpAt,
    lastActivityAt: sanitizeText(record.lastActivityAt, receivedAt),
    lastActionAt: sanitizeText(record.lastActionAt, ''),
    lastActionType: sanitizeText(record.lastActionType, ''),
    lastActionLabel: sanitizeText(record.lastActionLabel, ''),
    lastNoteAt: sanitizeText(record.lastNoteAt, ''),
    noteCount,
    actionCount,
    notes: Array.isArray(record.notes)
      ? record.notes
          .filter(Boolean)
          .map((note) => ({
            id: sanitizeText(note?.id, `note_${Date.now()}`),
            createdAt: sanitizeText(note?.createdAt, receivedAt),
            author: sanitizeText(note?.author, 'Chris'),
            note: sanitizeText(note?.note, ''),
            type: sanitizeText(note?.type, 'note'),
          }))
      : [],
    tags: normalizeTags(record.tags),
    qualityReasons: normalizeTags(record.qualityReasons),
    source: sanitizeText(record.source, 'crm'),
    createdByUserId: sanitizeText(record.createdByUserId, ''),
    createdByUsername: sanitizeText(record.createdByUsername, ''),
    createdByDisplayName: sanitizeText(record.createdByDisplayName, ''),
    updatedAt: sanitizeText(record.updatedAt, receivedAt),
  };
}

function normalizeActionRecord(record) {
  const createdAt = sanitizeText(record.createdAt, new Date().toISOString());
  const siteKey = resolveSiteKey(record.siteKey, record.pageUrl);
  return {
    id: sanitizeText(record.id, `action_${Date.now()}`),
    leadId: sanitizeText(record.leadId, 'unknown-lead'),
    createdAt,
    siteKey,
    siteName: getSiteLabel(siteKey),
    type: sanitizeText(record.type, 'note'),
    status: normalizeLeadStatus(record.status, ''),
    note: sanitizeText(record.note, ''),
    followUpAt: sanitizeText(record.followUpAt, ''),
    owner: sanitizeText(record.owner, ''),
    priority: normalizePriority(record.priority, ''),
    calendarApprovalStatus: normalizeCalendarApprovalStatus(record.calendarApprovalStatus, ''),
    calendarApprovalNote: sanitizeText(record.calendarApprovalNote, ''),
    author: sanitizeText(record.author, 'Chris'),
    tags: normalizeTags(record.tags),
    source: sanitizeText(record.source, 'crm'),
    authorUserId: sanitizeText(record.authorUserId, ''),
    authorUsername: sanitizeText(record.authorUsername, ''),
    authorDisplayName: sanitizeText(record.authorDisplayName, ''),
  };
}

function normalizeTeamChatRecord(record) {
  const createdAt = sanitizeText(record.createdAt, new Date().toISOString());
  const siteKey = resolveSiteKey(record.siteKey, record.pageUrl);
  const siteName = getSiteLabel(siteKey);
  const leadId = sanitizeText(record.leadId, '');
  const threadId = sanitizeText(record.threadId, leadId ? `lead:${leadId}` : `site:${siteKey}`);

  return {
    id: sanitizeText(record.id, `chat_${Date.now()}`),
    threadId,
    threadName: sanitizeText(
      record.threadName,
      leadId ? sanitizeText(record.leadName, 'Lead thread') : 'Site thread',
    ),
    siteKey,
    siteName,
    profileId: sanitizeText(record.profileId, ''),
    authorName: sanitizeText(record.authorName, 'Chris'),
    avatarDataUrl: sanitizeDataUrl(record.avatarDataUrl, ''),
    avatarColor: sanitizeText(record.avatarColor, ''),
    message: sanitizeText(record.message, ''),
    createdAt,
    leadId,
    leadName: sanitizeText(record.leadName, ''),
    authorUserId: sanitizeText(record.authorUserId, ''),
    authorUsername: sanitizeText(record.authorUsername, ''),
    authorDisplayName: sanitizeText(record.authorDisplayName, ''),
    source: sanitizeText(record.source, 'team-chat'),
    updatedAt: sanitizeText(record.updatedAt, createdAt),
  };
}

function normalizeTeamChatThreadRecord(record) {
  const createdAt = sanitizeText(record.createdAt, new Date().toISOString());
  const siteKey = resolveSiteKey(record.siteKey, record.pageUrl);
  const threadType = sanitizeText(record.threadType, 'custom').toLowerCase();
  const leadId = sanitizeText(record.leadId, '');
  const leadName = sanitizeText(record.leadName, '');
  const threadId = sanitizeText(record.id, leadId ? `lead:${leadId}` : `thread_${Date.now()}`);

  return {
    id: threadId,
    siteKey,
    siteName: getSiteLabel(siteKey),
    threadType: ['site', 'lead', 'custom'].includes(threadType) ? threadType : 'custom',
    name: sanitizeText(record.name, leadName || 'New thread'),
    description: sanitizeText(record.description, ''),
    leadId,
    leadName,
    createdAt,
    updatedAt: sanitizeText(record.updatedAt, createdAt),
    createdByProfileId: sanitizeText(record.createdByProfileId, ''),
    createdByUserId: sanitizeText(record.createdByUserId, ''),
    createdByUsername: sanitizeText(record.createdByUsername, ''),
    createdByDisplayName: sanitizeText(record.createdByDisplayName, ''),
    deletedAt: sanitizeText(record.deletedAt, ''),
    deletedByProfileId: sanitizeText(record.deletedByProfileId, ''),
    isSystem: Boolean(record.isSystem) || threadType === 'site' || threadType === 'lead',
    source: sanitizeText(record.source, 'team-chat'),
  };
}

function normalizeTeamChatProfileRecord(record) {
  const createdAt = sanitizeText(record.createdAt, new Date().toISOString());
  const siteKey = resolveSiteKey(record.siteKey, record.pageUrl);

  return {
    id: sanitizeText(record.id, `profile_${Date.now()}`),
    siteKey,
    siteName: getSiteLabel(siteKey),
    name: sanitizeText(record.name, 'Chris'),
    title: sanitizeText(record.title, ''),
    avatarDataUrl: sanitizeDataUrl(record.avatarDataUrl, ''),
    avatarColor: sanitizeText(record.avatarColor, ''),
    createdByUserId: sanitizeText(record.createdByUserId, ''),
    createdByUsername: sanitizeText(record.createdByUsername, ''),
    createdByDisplayName: sanitizeText(record.createdByDisplayName, ''),
    createdAt,
    updatedAt: sanitizeText(record.updatedAt, createdAt),
    deletedAt: sanitizeText(record.deletedAt, ''),
    isDefault: Boolean(record.isDefault),
    source: sanitizeText(record.source, 'team-chat'),
  };
}

async function readNdjsonRecords(filePath, normalizer = normalizeLeadRecord) {
  try {
    const raw = await readFile(filePath, 'utf8');

    return raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        try {
          return normalizer(JSON.parse(line));
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return [];
    }

    throw error;
  }
}

async function appendNdjsonRecord(filePath, record) {
  await mkdir(dirname(filePath), { recursive: true });
  await appendFile(filePath, `${JSON.stringify(record)}\n`, 'utf8');
}

async function writeNdjsonRecords(filePath, records) {
  await mkdir(dirname(filePath), { recursive: true });
  const lines = records.map((record) => JSON.stringify(record));
  await writeFile(filePath, `${lines.join('\n')}${lines.length ? '\n' : ''}`, 'utf8');
}

function dedupeRecordsById(records, key = 'id') {
  const map = new Map();
  for (const record of records) {
    const recordId = record?.[key];
    if (!recordId) {
      continue;
    }
    map.set(recordId, record);
  }

  return [...map.values()];
}

function mergeActionsIntoLead(record, actions) {
  const normalized = normalizeLeadRecord(record);
  const sortedActions = [...actions].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const noteEntries = [];
  const tags = new Set(normalized.tags);
  let crmStatus = normalized.crmStatus;
  let crmPriority = normalized.crmPriority;
  let owner = normalized.owner;
  let followUpAt = normalized.followUpAt;
  let calendarApprovalStatus = normalized.calendarApprovalStatus;
  let calendarApprovalAt = normalized.calendarApprovalAt;
  let calendarApprovalBy = normalized.calendarApprovalBy;
  let calendarApprovalNote = normalized.calendarApprovalNote;
  let lastAction = null;

  for (const action of sortedActions) {
    lastAction = action;

    if (action.status) {
      crmStatus = action.status;
    }

    if (action.followUpAt) {
      followUpAt = action.followUpAt;
    }

    if (action.owner) {
      owner = action.owner;
    }

    if (action.priority) {
      crmPriority = action.priority;
    }

    if (action.calendarApprovalStatus) {
      calendarApprovalStatus = action.calendarApprovalStatus;
      calendarApprovalAt = action.createdAt;
      calendarApprovalBy = action.author;
      calendarApprovalNote = action.note || action.calendarApprovalNote || '';
    }

    if (action.type === 'calendar-approve') {
      calendarApprovalStatus = 'approved';
      calendarApprovalAt = action.createdAt;
      calendarApprovalBy = action.author;
      calendarApprovalNote = action.note || 'Approved on calendar.';
    }

    if (action.type === 'calendar-reject') {
      calendarApprovalStatus = 'rejected';
      calendarApprovalAt = action.createdAt;
      calendarApprovalBy = action.author;
      calendarApprovalNote = action.note || 'Rejected on calendar.';
    }

    for (const tag of action.tags) {
      tags.add(tag);
    }

    if (action.note) {
      noteEntries.push({
        id: action.id,
        createdAt: action.createdAt,
        author: action.author,
        note: action.note,
        type: action.type,
      });
    }

    if (action.type === 'archive') {
      crmStatus = 'archived';
    }
  }

  const latestNote = noteEntries[noteEntries.length - 1] || null;
  const effectiveFollowUpAt = followUpAt || normalized.followUpAt;
  const effectiveCalendarMoment = effectiveFollowUpAt || normalized.startIso;
  const calendarMomentDate = new Date(effectiveCalendarMoment);
  const closed = isClosedStatus(crmStatus);
  const activeCalendar = !closed && calendarApprovalStatus !== 'rejected' && (Boolean(effectiveFollowUpAt) || normalized.calendarEligible || calendarApprovalStatus === 'pending' || calendarApprovalStatus === 'approved' || crmStatus === 'qualified' || crmStatus === 'working' || crmStatus === 'follow-up');

  return normalizeLeadRecord({
    ...normalized,
    dateKey: formatDateKey(calendarMomentDate, normalized.timeZone),
    timeLabel: formatTimeLabel(calendarMomentDate, normalized.timeZone),
    startIso: effectiveCalendarMoment,
    endIso: formatIsoDateTime(new Date(calendarMomentDate.getTime() + 30 * 60 * 1000)),
    crmStatus,
    crmPriority,
    owner,
    followUpAt: effectiveFollowUpAt,
    lastActivityAt: lastAction?.createdAt || normalized.lastActivityAt || normalized.updatedAt,
    lastActionAt: lastAction?.createdAt || normalized.lastActionAt || '',
    lastActionType: lastAction?.type || normalized.lastActionType || '',
    lastActionLabel: lastAction?.note || lastAction?.type || normalized.lastActionLabel || '',
    lastNoteAt: latestNote?.createdAt || normalized.lastNoteAt || '',
    noteCount: noteEntries.length,
    actionCount: sortedActions.length,
    notes: noteEntries.slice(-20).reverse(),
    tags: [...tags],
    calendarEligible: activeCalendar,
    calendarCreated: normalized.calendarCreated || normalized.calendarEligible || activeCalendar || calendarApprovalStatus === 'pending' || calendarApprovalStatus === 'approved',
    calendarSource: normalized.calendarSource,
    calendarApprovalStatus: calendarApprovalStatus || normalized.calendarApprovalStatus,
    calendarApprovalAt,
    calendarApprovalBy,
    calendarApprovalNote,
    calendarCleared: normalized.calendarCleared,
    calendarClearedAt: normalized.calendarClearedAt,
    calendarClearedBy: normalized.calendarClearedBy,
    calendarClearedNote: normalized.calendarClearedNote,
    updatedAt: lastAction?.createdAt || normalized.updatedAt,
  });
}

function mergeLeadCollections(baseRecords, overlayRecords, actionRecords) {
  const actionMap = new Map();
  for (const action of actionRecords) {
    if (!actionMap.has(action.leadId)) {
      actionMap.set(action.leadId, []);
    }
    actionMap.get(action.leadId).push(action);
  }

  const leadMap = new Map();
  for (const record of baseRecords) {
    leadMap.set(record.id, mergeActionsIntoLead(record, actionMap.get(record.id) || []));
  }

  for (const overlay of overlayRecords) {
    const existing = leadMap.get(overlay.id);
    const merged = mergeActionsIntoLead(existing ? { ...existing, ...overlay } : overlay, actionMap.get(overlay.id) || []);
    leadMap.set(overlay.id, merged);
  }

  return [...leadMap.values()];
}

export function buildLocalLeadRecord(transcript, lead, quality) {
  const receivedDate = new Date(transcript.receivedAt);
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Chicago';
  const siteKey = resolveSiteKey(transcript.siteKey, transcript.pageUrl);
  const summary = lead.summary || `${lead.customerName} is considering ${lead.projectConsideration.toLowerCase()}.`;
  const followUpAt = quality.qualifiedForCalendar
    ? new Date(receivedDate.getTime() + 24 * 60 * 60 * 1000).toISOString()
    : '';
  const calendarApprovalStatus = quality.qualifiedForCalendar ? 'pending' : '';

  return normalizeLeadRecord({
    id: lead.sessionId,
    createdAt: transcript.receivedAt,
    receivedAt: transcript.receivedAt,
    dateKey: formatDateKey(receivedDate, timeZone),
    timeLabel: formatTimeLabel(receivedDate, timeZone),
    startIso: formatIsoDateTime(receivedDate),
    endIso: formatIsoDateTime(new Date(receivedDate.getTime() + 30 * 60 * 1000)),
    timeZone,
    siteKey,
    title: `${lead.customerName} - ${lead.projectConsideration}`,
    customerName: lead.customerName,
    customerEmail: lead.customerEmail,
    customerPhone: lead.customerPhone,
    projectConsideration: lead.projectConsideration,
    productInterests: lead.productInterests,
    projectBrief: lead.projectBrief,
    qualityScore: quality.score,
    disposition: quality.disposition,
    summary,
    qualityReasons: Array.isArray(quality.reasons) ? quality.reasons : [],
    nextStep: lead.nextStep,
    sessionId: lead.sessionId,
    pageUrl: lead.pageUrl,
    latestUserMessage: lead.latestUserMessage,
    latestAssistantMessage: lead.latestAssistantMessage,
    messageCount: lead.messageCount,
    calendarEligible: quality.qualifiedForCalendar,
    calendarSource: 'chat-agent',
    calendarApprovalStatus,
    calendarApprovalNote: quality.qualifiedForCalendar ? 'Pending human approval from the calendar.' : '',
    calendarCreated: false,
    backupStatus: 'pending',
    backupTarget: '',
    backupCopied: false,
    crmStatus: quality.qualifiedForCalendar ? 'qualified' : quality.disposition === 'hold' ? 'review' : 'new',
    crmPriority: quality.score >= 80 ? 'high' : quality.score >= 60 ? 'medium' : 'normal',
    owner: 'Chris',
    followUpAt,
    lastActivityAt: transcript.receivedAt,
    lastActionAt: '',
    lastActionType: '',
    lastActionLabel: quality.qualifiedForCalendar ? 'Auto-qualified' : 'Intake logged',
    lastNoteAt: '',
    noteCount: 0,
    actionCount: 0,
    notes: [],
    tags: uniqueStrings([...(lead.productInterests || []), lead.projectConsideration, quality.disposition].filter(Boolean)),
    source: 'crm',
    updatedAt: new Date().toISOString(),
  });
}

export function buildManualLeadRecord(input = {}) {
  const receivedAt = new Date().toISOString();
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Chicago';
  const siteKey = resolveSiteKey(input.siteKey, input.pageUrl);
  const customerName = sanitizeText(input.customerName, 'Manual lead');
  const summary = sanitizeText(input.summary, '');
  const nextStep = sanitizeText(input.nextStep, '');
  const projectConsideration = sanitizeText(input.projectConsideration, summary || 'Manual intake');
  const productInterests = uniqueStrings(
    [
      ...(Array.isArray(input.productInterests) ? input.productInterests : String(input.productInterests || '').split(',')),
      ...(Array.isArray(input.tags) ? input.tags : []),
    ].map((item) => sanitizeText(item, '')),
  );
  const status = normalizeLeadStatus(input.crmStatus, 'new');
  const followUpAt = sanitizeText(input.followUpAt, '');
  const qualityScore = normalizeScore(input.qualityScore, status === 'qualified' ? 75 : 55);
  const crmPriority = normalizePriority(input.crmPriority, qualityScore >= 80 ? 'high' : qualityScore >= 60 ? 'medium' : 'normal');
  const activeMoment = followUpAt || receivedAt;

  return normalizeLeadRecord({
    id: sanitizeText(input.id, `manual_${Date.now()}`),
    createdAt: receivedAt,
    receivedAt,
    dateKey: formatDateKey(new Date(activeMoment), timeZone),
    timeLabel: formatTimeLabel(new Date(activeMoment), timeZone),
    startIso: activeMoment,
    endIso: formatIsoDateTime(new Date(new Date(activeMoment).getTime() + 30 * 60 * 1000)),
    timeZone,
    siteKey,
    title: sanitizeText(input.title, `${customerName} - Manual lead`),
    customerName,
    customerEmail: sanitizeText(input.customerEmail, 'Unknown'),
    customerPhone: sanitizeText(input.customerPhone, 'Unknown'),
    projectConsideration,
    productInterests,
    projectBrief: normalizeProjectBrief(input.projectBrief),
    qualityScore,
    disposition: status === 'review' ? 'hold' : status === 'qualified' ? 'qualified' : 'manual',
    summary,
    nextStep,
    sessionId: sanitizeText(input.sessionId, `manual-${Date.now()}`),
    pageUrl: sanitizeText(input.pageUrl, 'manual-entry'),
    latestUserMessage: sanitizeText(input.latestUserMessage, summary || nextStep || 'Manual lead created from the CRM dashboard.'),
    latestAssistantMessage: sanitizeText(input.latestAssistantMessage, ''),
    messageCount: Number.isFinite(Number(input.messageCount)) ? Number(input.messageCount) : 0,
    calendarEligible: Boolean(followUpAt) || ['qualified', 'working', 'follow-up'].includes(status),
    calendarSource: 'manual',
    calendarCreated: false,
    backupStatus: 'pending',
    backupTarget: '',
    backupCopied: false,
    crmStatus: status,
    crmPriority,
    owner: sanitizeText(input.owner, 'Chris'),
    followUpAt,
    createdByUserId: sanitizeText(input.createdByUserId, ''),
    createdByUsername: sanitizeText(input.createdByUsername, ''),
    createdByDisplayName: sanitizeText(input.createdByDisplayName, ''),
    lastActivityAt: receivedAt,
    lastActionAt: receivedAt,
    lastActionType: 'manual-create',
    lastActionLabel: 'Manual lead created',
    lastNoteAt: summary ? receivedAt : '',
    noteCount: summary ? 1 : 0,
    actionCount: 1,
    notes: summary
      ? [
          {
            id: `note_${Date.now()}`,
            createdAt: receivedAt,
            author: sanitizeText(input.owner, 'Chris'),
            note: summary,
            type: 'note',
          },
        ]
      : [],
    tags: normalizeTags([...(productInterests || []), status, crmPriority]),
    qualityReasons: normalizeTags([sanitizeText(input.reason, ''), 'Manual CRM intake']),
    source: 'manual',
    updatedAt: receivedAt,
  });
}

export async function persistLocalLeadInbox(record) {
  const normalized = normalizeLeadRecord(record);
  const paths = resolveSiteCalendarRootDir(normalized.siteKey, normalized.pageUrl);
  await appendNdjsonRecord(paths.leadInboxPath, normalized);
  return normalized;
}

export async function persistLocalCalendarEvent(record) {
  const normalized = normalizeLeadRecord({
    ...record,
    calendarApprovalStatus: record.calendarApprovalStatus || 'pending',
    calendarCreated: true,
    backupStatus: 'pending',
  });
  const paths = resolveSiteCalendarRootDir(normalized.siteKey, normalized.pageUrl);
  await appendNdjsonRecord(paths.eventsPath, normalized);
  return normalized;
}

export async function persistLocalLeadAction(record) {
  const normalized = normalizeActionRecord(record);
  const paths = resolveSiteCalendarRootDir(normalized.siteKey, normalized.pageUrl);
  await appendNdjsonRecord(paths.actionsPath, normalized);
  return normalized;
}

export async function persistLocalTeamChatMessage(record) {
  const normalized = normalizeTeamChatRecord(record);
  const paths = resolveSiteCalendarRootDir(normalized.siteKey);
  await appendNdjsonRecord(paths.teamChatPath, normalized);
  return normalized;
}

export async function persistLocalTeamChatThread(record) {
  const normalized = normalizeTeamChatThreadRecord(record);
  const paths = resolveSiteCalendarRootDir(normalized.siteKey);
  await appendNdjsonRecord(paths.teamChatThreadsPath, normalized);
  return normalized;
}

export async function persistLocalTeamChatProfile(record) {
  const normalized = normalizeTeamChatProfileRecord(record);
  const paths = resolveSiteCalendarRootDir(normalized.siteKey);
  await appendNdjsonRecord(paths.teamChatProfilesPath, normalized);
  return normalized;
}

export async function loadLocalCalendarState(siteKey = '') {
  const paths = resolveSiteCalendarRootDir(siteKey);
  const [inbox, events, actions] = await Promise.all([
    readNdjsonRecords(paths.leadInboxPath, normalizeLeadRecord),
    readNdjsonRecords(paths.eventsPath, normalizeLeadRecord),
    readNdjsonRecords(paths.actionsPath, normalizeActionRecord),
  ]);
  const teamChatMessages = await readNdjsonRecords(paths.teamChatPath, normalizeTeamChatRecord);
  const teamChatThreads = dedupeRecordsById(await readNdjsonRecords(paths.teamChatThreadsPath, normalizeTeamChatThreadRecord));
  const teamChatProfiles = dedupeRecordsById(await readNdjsonRecords(paths.teamChatProfilesPath, normalizeTeamChatProfileRecord));

  const mergedLeads = mergeLeadCollections(inbox, events, actions).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const calendarEvents = mergedLeads
    .filter((record) => !record.calendarCleared && record.calendarApprovalStatus !== 'rejected' && (record.calendarEligible || Boolean(record.followUpAt) || record.calendarApprovalStatus === 'pending' || record.calendarApprovalStatus === 'approved' || record.crmStatus === 'qualified' || record.crmStatus === 'working' || record.crmStatus === 'follow-up'))
    .sort((a, b) => new Date(b.startIso).getTime() - new Date(a.startIso).getTime());

  return {
    siteKey: paths.siteKey,
    siteName: paths.siteName,
    localCalendarRootDir: paths.rootDir,
    localCalendarLeadInboxPath: paths.leadInboxPath,
    localCalendarEventsPath: paths.eventsPath,
    localCalendarActionsPath: paths.actionsPath,
    localCalendarTeamChatPath: paths.teamChatPath,
    localCalendarTeamChatThreadsPath: paths.teamChatThreadsPath,
    localCalendarTeamChatProfilesPath: paths.teamChatProfilesPath,
    inbox: mergedLeads,
    leads: mergedLeads,
    events: calendarEvents,
    actions: actions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    teamChatMessages: teamChatMessages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    teamChatThreads,
    teamChatProfiles,
  };
}

export function resolveLocalCalendarBackupDir(siteKey = '') {
  const explicit = sanitizeText(process.env.LOCAL_CALENDAR_BACKUP_DIR, '');
  const siteLabel = getSiteFolderName(siteKey);
  if (explicit) {
    return resolve(explicit, siteLabel);
  }

  const home = os.homedir();
  const candidates = [
    join(home, 'Google Drive', `${siteLabel} Calendar`),
    join(home, 'Google Drive', 'My Drive', `${siteLabel} Calendar`),
    join(home, 'My Drive', `${siteLabel} Calendar`),
    join(home, 'GoogleDrive', `${siteLabel} Calendar`),
    join(home, 'Drive', `${siteLabel} Calendar`),
  ];

  return candidates.find((candidate) => Boolean(candidate) && existsSync(candidate)) || '';
}

export async function syncLocalCalendarBackup(siteKey = '') {
  const backupDir = resolveLocalCalendarBackupDir(siteKey);

  if (!backupDir) {
    return {
      synced: false,
      reason: 'No backup folder configured or detected.',
      backupDir: '',
    };
  }

  const state = await loadLocalCalendarState(siteKey);
  await mkdir(backupDir, { recursive: true });

  const inboxBackupPath = resolve(backupDir, 'lead-inbox.ndjson');
  const eventsBackupPath = resolve(backupDir, 'calendar-events.ndjson');
  const actionsBackupPath = resolve(backupDir, 'lead-actions.ndjson');
  const teamChatBackupPath = resolve(backupDir, 'team-chat.ndjson');
  const teamChatThreadsBackupPath = resolve(backupDir, 'team-chat-threads.ndjson');
  const teamChatProfilesBackupPath = resolve(backupDir, 'team-chat-profiles.ndjson');
  const manifestBackupPath = resolve(backupDir, 'calendar-backup-manifest.json');

  await writeFile(inboxBackupPath, `${state.inbox.map((record) => JSON.stringify(record)).join('\n')}${state.inbox.length ? '\n' : ''}`, 'utf8');
  await writeFile(eventsBackupPath, `${state.events.map((record) => JSON.stringify(record)).join('\n')}${state.events.length ? '\n' : ''}`, 'utf8');
  await writeFile(actionsBackupPath, `${state.actions.map((record) => JSON.stringify(record)).join('\n')}${state.actions.length ? '\n' : ''}`, 'utf8');
  await writeFile(teamChatBackupPath, `${state.teamChatMessages.map((record) => JSON.stringify(record)).join('\n')}${state.teamChatMessages.length ? '\n' : ''}`, 'utf8');
  await writeFile(teamChatThreadsBackupPath, `${(state.teamChatThreads || []).map((record) => JSON.stringify(record)).join('\n')}${(state.teamChatThreads || []).length ? '\n' : ''}`, 'utf8');
  await writeFile(teamChatProfilesBackupPath, `${(state.teamChatProfiles || []).map((record) => JSON.stringify(record)).join('\n')}${(state.teamChatProfiles || []).length ? '\n' : ''}`, 'utf8');
  await writeFile(
    manifestBackupPath,
    JSON.stringify(
      {
        backupAt: new Date().toISOString(),
        leadCount: state.inbox.length,
        eventCount: state.events.length,
        actionCount: state.actions.length,
        teamChatCount: state.teamChatMessages.length,
        teamChatThreadCount: (state.teamChatThreads || []).length,
        teamChatProfileCount: (state.teamChatProfiles || []).length,
        source: state.localCalendarRootDir,
        siteKey: state.siteKey,
        siteName: state.siteName,
      },
      null,
      2,
    ),
    'utf8',
  );

  return {
    synced: true,
    reason: 'Backed up to the configured backup folder.',
    backupDir,
    leadCount: state.inbox.length,
    eventCount: state.events.length,
    actionCount: state.actions.length,
    teamChatCount: state.teamChatMessages.length,
    teamChatThreadCount: (state.teamChatThreads || []).length,
    teamChatProfileCount: (state.teamChatProfiles || []).length,
  };
}

function clearCalendarLeadRecord(record, clearedAt = new Date().toISOString()) {
  return normalizeLeadRecord({
    ...record,
    calendarEligible: false,
    calendarCreated: false,
    calendarSource: '',
    calendarApprovalStatus: '',
    calendarApprovalAt: '',
    calendarApprovalBy: '',
    calendarApprovalNote: '',
    calendarCleared: true,
    calendarClearedAt: clearedAt,
    calendarClearedBy: 'admin',
    calendarClearedNote: 'Cleared from the admin calendar tools.',
    followUpAt: '',
  });
}

export async function clearLocalCalendarPosts(siteKey = '') {
  const paths = resolveSiteCalendarRootDir(siteKey);
  const clearedAt = new Date().toISOString();
  const [inbox, events, actions, teamChatMessages, teamChatThreads, teamChatProfiles] = await Promise.all([
    readNdjsonRecords(paths.leadInboxPath, normalizeLeadRecord),
    readNdjsonRecords(paths.eventsPath, normalizeLeadRecord),
    readNdjsonRecords(paths.actionsPath, normalizeActionRecord),
    readNdjsonRecords(paths.teamChatPath, normalizeTeamChatRecord),
    readNdjsonRecords(paths.teamChatThreadsPath, normalizeTeamChatThreadRecord),
    readNdjsonRecords(paths.teamChatProfilesPath, normalizeTeamChatProfileRecord),
  ]);

  const nextInbox = inbox.map((record) => clearCalendarLeadRecord(record, clearedAt));
  const nextEvents = events.map((record) => clearCalendarLeadRecord(record, clearedAt));
  const nextActions = actions.filter((action) => !['calendar-approve', 'calendar-reject'].includes(String(action.type || '').toLowerCase()) && !action.calendarApprovalStatus);

  await Promise.all([
    writeNdjsonRecords(paths.leadInboxPath, nextInbox),
    writeNdjsonRecords(paths.eventsPath, nextEvents),
    writeNdjsonRecords(paths.actionsPath, nextActions),
    writeNdjsonRecords(paths.teamChatPath, teamChatMessages),
    writeNdjsonRecords(paths.teamChatThreadsPath, teamChatThreads),
    writeNdjsonRecords(paths.teamChatProfilesPath, teamChatProfiles),
  ]);

  return {
    cleared: true,
    clearedAt,
    leadCount: nextInbox.length,
    eventCount: nextEvents.length,
    actionCount: nextActions.length,
    siteKey: paths.siteKey,
    siteName: paths.siteName,
  };
}

export async function archiveLocalCalendarPosts(siteKey = '') {
  const paths = resolveSiteCalendarRootDir(siteKey);
  const archivedAt = new Date().toISOString();
  const [inbox, events, actions] = await Promise.all([
    readNdjsonRecords(paths.leadInboxPath, normalizeLeadRecord),
    readNdjsonRecords(paths.eventsPath, normalizeLeadRecord),
    readNdjsonRecords(paths.actionsPath, normalizeActionRecord),
  ]);

  const archiveRecord = {
    id: `archive_${Date.now()}`,
    archivedAt,
    archivedBy: 'admin',
    siteKey: paths.siteKey,
    siteName: paths.siteName,
    leadCount: inbox.length,
    eventCount: events.length,
    actionCount: actions.length,
    records: {
      leads: inbox,
      events,
      actions,
    },
  };

  await appendNdjsonRecord(paths.calendarArchivePath, archiveRecord);
  const cleared = await clearLocalCalendarPosts(siteKey);

  return {
    archived: true,
    archivePath: paths.calendarArchivePath,
    archiveRecordId: archiveRecord.id,
    archivedAt,
    archiveLeadCount: inbox.length,
    archiveEventCount: events.length,
    archiveActionCount: actions.length,
    ...cleared,
  };
}
