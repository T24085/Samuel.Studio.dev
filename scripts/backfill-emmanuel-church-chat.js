import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import os from 'node:os';
import { resolve } from 'node:path';
import { persistLocalTeamChatMessage, resolveLocalCalendarPaths } from '../server/local-calendar-store.js';

const siteKey = 'emmanuel-church';
const siteName = 'Emmanuel Church';
const transcriptPath = resolve(
  os.tmpdir(),
  'Samuel Studio',
  'sites',
  siteKey,
  'chat-agent-runtime',
  'nova-chat-transcripts.ndjson',
);
const calendarPaths = resolveLocalCalendarPaths(siteKey);

function parseNdjson(rawText) {
  return rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function toIso(value, fallback) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Date(value).toISOString();
  }

  if (typeof value === 'string' && value.trim()) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  return fallback;
}

function buildMessageId(sessionId, role, createdAt, index) {
  const safeSession = String(sessionId || 'session').replace(/[^a-zA-Z0-9._-]/g, '_');
  const safeRole = role === 'assistant' ? 'assistant' : 'user';
  const safeTime = String(createdAt || Date.now()).replace(/[^a-zA-Z0-9._-]/g, '_');
  return `backfill_${safeSession}_${safeRole}_${safeTime}_${index}`;
}

async function main() {
  if (!existsSync(transcriptPath)) {
    console.error(`Transcript log not found: ${transcriptPath}`);
    process.exit(1);
  }

  const raw = await readFile(transcriptPath, 'utf8');
  const transcripts = parseNdjson(raw)
    .filter((entry) => entry && entry.siteKey === siteKey && Array.isArray(entry.messages) && entry.messages.length > 0)
    .sort((left, right) => new Date(left.loggedAt || left.receivedAt || 0).getTime() - new Date(right.loggedAt || right.receivedAt || 0).getTime());

  const existingIds = new Set();
  if (existsSync(calendarPaths.teamChatPath)) {
    const existingRaw = await readFile(calendarPaths.teamChatPath, 'utf8');
    for (const line of existingRaw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed) {
        continue;
      }

      try {
        const record = JSON.parse(trimmed);
        if (typeof record?.id === 'string' && record.id) {
          existingIds.add(record.id);
        }
      } catch {
        // Ignore malformed lines.
      }
    }
  }
  let appended = 0;
  let skipped = 0;

  for (const transcript of transcripts) {
    const threadId = `site:${siteKey}`;
    const threadName = `${siteName} Website Chat`;
    const visitorName = typeof transcript?.clientProfile?.name === 'string' && transcript.clientProfile.name.trim() && transcript.clientProfile.name.trim() !== 'Unknown'
      ? transcript.clientProfile.name.trim()
      : 'Website Visitor';

    for (const [index, message] of transcript.messages.entries()) {
      if (!message || (message.role !== 'user' && message.role !== 'assistant') || typeof message.content !== 'string' || !message.content.trim()) {
        continue;
      }

      const createdAt = toIso(message.createdAt, transcript.receivedAt || transcript.loggedAt || new Date().toISOString());
      const id = buildMessageId(transcript.sessionId, message.role, createdAt, index);

      if (existingIds.has(id)) {
        skipped += 1;
        continue;
      }

      await persistLocalTeamChatMessage({
        id,
        threadId,
        threadName,
        siteKey,
        siteName,
        profileId: '',
        authorName: message.role === 'assistant' ? (transcript.assistant || 'Nova') : visitorName,
        avatarDataUrl: '',
        avatarColor: '',
        message: message.content.trim(),
        leadId: '',
        leadName: '',
        authorUserId: '',
        authorUsername: '',
        authorDisplayName: message.role === 'assistant' ? (transcript.assistant || 'Nova') : visitorName,
        source: 'church-chat-history',
        createdAt,
        updatedAt: createdAt,
      });

      existingIds.add(id);
      appended += 1;
    }
  }

  console.log(`Backfill complete. Appended ${appended} messages. Skipped ${skipped} existing messages.`);
  console.log(`Team chat file: ${calendarPaths.teamChatPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
