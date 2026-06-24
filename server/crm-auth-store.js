import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveWritableRuntimeDir } from './runtime-paths.js';
import { listSiteDefinitions, resolveSiteKey } from './site-registry.js';

const moduleRootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const authRootDir = resolveWritableRuntimeDir({
  fallbackName: 'crm-auth',
  repoRoot: moduleRootDir,
  scope: ['crm-auth'],
});
const authStorePath = resolve(authRootDir, 'crm-auth.json');
const authSessionCookieName = 'samuel_studio_crm_session';
const defaultAdminUsername = 'admin';
const defaultAdminPassword = 'admin';
const defaultSessionTtlMs = 1000 * 60 * 60 * 24 * 30;
const defaultInviteTtlMs = 1000 * 60 * 60 * 24 * 7;
const allSiteKeys = listSiteDefinitions().map((site) => site.key);

function cleanText(value, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function normalizeUsername(value) {
  return cleanText(value, '').toLowerCase();
}

function normalizeRole(value, fallback = 'user') {
  const role = cleanText(value, fallback).toLowerCase();
  return role === 'admin' ? 'admin' : 'user';
}

function normalizeAllowedSiteKeys(values, fallback = allSiteKeys) {
  const source = Array.isArray(values) ? values : [];
  const normalized = [...new Set(source.map((value) => resolveSiteKey(value)).filter((value) => allSiteKeys.includes(value)))];
  return normalized.length ? normalized : [...fallback];
}

function nowIso() {
  return new Date().toISOString();
}

function createPasswordHash(password, salt = randomBytes(16).toString('hex')) {
  const derived = scryptSync(password, salt, 64);
  return {
    algorithm: 'scrypt',
    salt,
    hash: derived.toString('hex'),
  };
}

function verifyPassword(password, user) {
  if (!user || !user.passwordHash || !user.passwordSalt) {
    return false;
  }

  const derived = scryptSync(password, user.passwordSalt, 64);
  const expected = Buffer.from(user.passwordHash, 'hex');
  if (derived.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(derived, expected);
}

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

function defaultStore() {
  return {
    version: 1,
    users: [],
    invites: [],
    sessions: [],
  };
}

function normalizeStore(raw) {
  const input = raw && typeof raw === 'object' ? raw : {};

  return {
    version: Number.isFinite(Number(input.version)) ? Number(input.version) : 1,
    users: Array.isArray(input.users) ? input.users : [],
    invites: Array.isArray(input.invites) ? input.invites : [],
    sessions: Array.isArray(input.sessions) ? input.sessions : [],
  };
}

function normalizeUserRecord(user) {
  return {
    id: cleanText(user?.id, `user_${randomUUID()}`),
    username: normalizeUsername(user?.username),
    displayName: cleanText(user?.displayName, normalizeUsername(user?.username) || 'User'),
    role: normalizeRole(user?.role, 'user'),
    active: user?.active !== false,
    passwordAlgorithm: cleanText(user?.passwordAlgorithm, 'scrypt'),
    passwordSalt: cleanText(user?.passwordSalt, ''),
    passwordHash: cleanText(user?.passwordHash, ''),
    createdAt: cleanText(user?.createdAt, nowIso()),
    updatedAt: cleanText(user?.updatedAt, nowIso()),
    createdByUserId: cleanText(user?.createdByUserId, ''),
    createdByUsername: cleanText(user?.createdByUsername, ''),
    lastLoginAt: cleanText(user?.lastLoginAt, ''),
    lastSeenAt: cleanText(user?.lastSeenAt, ''),
    allowedSiteKeys: normalizeAllowedSiteKeys(user?.allowedSiteKeys),
  };
}

function normalizeInviteRecord(invite) {
  return {
    id: cleanText(invite?.id, `invite_${randomUUID()}`),
    tokenHash: cleanText(invite?.tokenHash, ''),
    role: normalizeRole(invite?.role, 'user'),
    note: cleanText(invite?.note, ''),
    createdAt: cleanText(invite?.createdAt, nowIso()),
    createdByUserId: cleanText(invite?.createdByUserId, ''),
    createdByUsername: cleanText(invite?.createdByUsername, ''),
    expiresAt: cleanText(invite?.expiresAt, ''),
    redeemedAt: cleanText(invite?.redeemedAt, ''),
    redeemedByUserId: cleanText(invite?.redeemedByUserId, ''),
    redeemedByUsername: cleanText(invite?.redeemedByUsername, ''),
    active: invite?.active !== false,
    tokenPreview: cleanText(invite?.tokenPreview, ''),
    allowedSiteKeys: normalizeAllowedSiteKeys(invite?.allowedSiteKeys),
  };
}

function normalizeSessionRecord(session) {
  return {
    id: cleanText(session?.id, `session_${randomUUID()}`),
    tokenHash: cleanText(session?.tokenHash, ''),
    userId: cleanText(session?.userId, ''),
    createdAt: cleanText(session?.createdAt, nowIso()),
    lastUsedAt: cleanText(session?.lastUsedAt, nowIso()),
    expiresAt: cleanText(session?.expiresAt, ''),
  };
}

async function readStoreFile() {
  try {
    const raw = await readFile(authStorePath, 'utf8');
    return normalizeStore(JSON.parse(raw));
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return defaultStore();
    }

    throw error;
  }
}

async function writeStoreFile(store) {
  await mkdir(dirname(authStorePath), { recursive: true });
  await writeFile(authStorePath, `${JSON.stringify(store, null, 2)}\n`, 'utf8');
}

function ensureBootstrapAdmin(store) {
  const normalizedUsers = store.users.map(normalizeUserRecord);
  const adminUser = normalizedUsers.find((user) => user.username === defaultAdminUsername && user.role === 'admin');

  if (adminUser) {
    store.users = normalizedUsers;
    return false;
  }

  const createdAt = nowIso();
  const adminPassword = createPasswordHash(defaultAdminPassword);
  store.users = [
    {
      id: `user_${randomUUID()}`,
      username: defaultAdminUsername,
      displayName: 'Admin',
      role: 'admin',
      active: true,
      passwordAlgorithm: adminPassword.algorithm,
      passwordSalt: adminPassword.salt,
      passwordHash: adminPassword.hash,
      createdAt,
      updatedAt: createdAt,
      createdByUserId: '',
      createdByUsername: 'system',
      lastLoginAt: '',
      lastSeenAt: '',
      allowedSiteKeys: [...allSiteKeys],
    },
    ...normalizedUsers,
  ];
  return true;
}

function pruneExpiredSessions(store) {
  const now = Date.now();
  store.sessions = store.sessions
    .map(normalizeSessionRecord)
    .filter((session) => {
      if (!session.expiresAt) {
        return true;
      }

      const expiresAt = new Date(session.expiresAt).getTime();
      return Number.isFinite(expiresAt) && expiresAt > now;
    });
}

function findUserByUsername(store, username) {
  const normalizedUsername = normalizeUsername(username);
  return store.users.find((user) => user.username === normalizedUsername) || null;
}

function findUserById(store, userId) {
  return store.users.find((user) => user.id === userId) || null;
}

function findInviteByToken(store, token) {
  const tokenHash = hashToken(token);
  return store.invites.find((invite) => invite.tokenHash === tokenHash) || null;
}

function serializeUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    active: user.active !== false,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    createdByUserId: user.createdByUserId || '',
    createdByUsername: user.createdByUsername || '',
    lastLoginAt: user.lastLoginAt || '',
    lastSeenAt: user.lastSeenAt || '',
    allowedSiteKeys: Array.isArray(user.allowedSiteKeys) ? user.allowedSiteKeys : [...allSiteKeys],
  };
}

function serializeInvite(invite) {
  if (!invite) {
    return null;
  }

  return {
    id: invite.id,
    role: invite.role,
    note: invite.note,
    createdAt: invite.createdAt,
    createdByUserId: invite.createdByUserId || '',
    createdByUsername: invite.createdByUsername || '',
    expiresAt: invite.expiresAt || '',
    redeemedAt: invite.redeemedAt || '',
    redeemedByUserId: invite.redeemedByUserId || '',
    redeemedByUsername: invite.redeemedByUsername || '',
    active: invite.active !== false,
    tokenPreview: invite.tokenPreview || '',
    allowedSiteKeys: Array.isArray(invite.allowedSiteKeys) ? invite.allowedSiteKeys : [...allSiteKeys],
  };
}

export async function loadAuthStore() {
  let rawStore = defaultStore();

  try {
    if (existsSync(authStorePath)) {
      rawStore = normalizeStore(JSON.parse(await readFile(authStorePath, 'utf8')));
    }
  } catch {
    rawStore = defaultStore();
  }

  const store = rawStore;
  const seeded = ensureBootstrapAdmin(store);
  pruneExpiredSessions(store);

  if (seeded || !existsSync(authStorePath)) {
    await writeStoreFile(store);
  }

  return store;
}

export async function saveAuthStore(store) {
  const nextStore = normalizeStore(store);
  ensureBootstrapAdmin(nextStore);
  pruneExpiredSessions(nextStore);
  await writeStoreFile(nextStore);
  return nextStore;
}

export async function getAuthContextFromRequest(req) {
  const store = await loadAuthStore();
  const cookieHeader = cleanText(req?.headers?.cookie, '');
  const token = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .map((part) => part.split('='))
    .find(([name]) => name === authSessionCookieName)?.[1];

  if (!token) {
    return { store, user: null, session: null };
  }

  const tokenHash = hashToken(decodeURIComponent(token));
  const session = store.sessions.find((entry) => entry.tokenHash === tokenHash) || null;
  if (!session) {
    return { store, user: null, session: null };
  }

  if (session.expiresAt && new Date(session.expiresAt).getTime() <= Date.now()) {
    store.sessions = store.sessions.filter((entry) => entry.id !== session.id);
    await saveAuthStore(store);
    return { store, user: null, session: null };
  }

  const user = findUserById(store, session.userId);
  if (!user || user.active === false) {
    return { store, user: null, session: null };
  }

  return { store, user: normalizeUserRecord(user), session: normalizeSessionRecord(session) };
}

export async function loginWithPassword({ username, password }) {
  const store = await loadAuthStore();
  const user = findUserByUsername(store, username);

  if (!user || user.active === false) {
    throw new Error('Invalid username or password.');
  }

  if (!verifyPassword(password, user)) {
    throw new Error('Invalid username or password.');
  }

  const createdAt = nowIso();
  const token = randomBytes(32).toString('hex');
  const session = normalizeSessionRecord({
    id: `session_${randomUUID()}`,
    tokenHash: hashToken(token),
    userId: user.id,
    createdAt,
    lastUsedAt: createdAt,
    expiresAt: new Date(Date.now() + defaultSessionTtlMs).toISOString(),
  });

  user.lastLoginAt = createdAt;
  user.lastSeenAt = createdAt;
  user.updatedAt = createdAt;

  store.users = store.users.map((entry) => (entry.id === user.id ? { ...entry, ...user } : entry));
  store.sessions = [...store.sessions.filter((entry) => entry.userId !== user.id), session];
  await saveAuthStore(store);

  return {
    user: serializeUser(user),
    token,
    session,
  };
}

export async function logoutSession(token) {
  if (!token) {
    return;
  }

  const store = await loadAuthStore();
  const tokenHash = hashToken(token);
  store.sessions = store.sessions.filter((entry) => entry.tokenHash !== tokenHash);
  await saveAuthStore(store);
}

export async function createUserAccount(input) {
  const store = await loadAuthStore();
  const username = normalizeUsername(input.username);
  const password = cleanText(input.password, '');
  const displayName = cleanText(input.displayName, username || 'User');
  const role = normalizeRole(input.role, 'user');

  if (!username) {
    throw new Error('username is required.');
  }

  if (!password) {
    throw new Error('password is required.');
  }

  if (findUserByUsername(store, username)) {
    throw new Error('That username is already taken.');
  }

  const createdAt = nowIso();
  const passwordHash = createPasswordHash(password);
  const user = normalizeUserRecord({
    id: `user_${randomUUID()}`,
    username,
    displayName,
    role,
    active: input.active !== false,
    passwordAlgorithm: passwordHash.algorithm,
    passwordSalt: passwordHash.salt,
    passwordHash: passwordHash.hash,
    createdAt,
    updatedAt: createdAt,
    createdByUserId: cleanText(input.createdByUserId, ''),
    createdByUsername: normalizeUsername(input.createdByUsername),
    allowedSiteKeys: normalizeAllowedSiteKeys(input.allowedSiteKeys),
  });

  store.users.push(user);
  await saveAuthStore(store);
  return serializeUser(user);
}

export async function updateUserAccount(userId, patch = {}) {
  const store = await loadAuthStore();
  const userIndex = store.users.findIndex((user) => user.id === userId);

  if (userIndex < 0) {
    throw new Error('User not found.');
  }

  const existing = normalizeUserRecord(store.users[userIndex]);
  const updatedAt = nowIso();
  const nextPassword = cleanText(patch.password, '');
  const nextPasswordRecord = nextPassword ? createPasswordHash(nextPassword) : null;

  const nextUser = normalizeUserRecord({
    ...existing,
    displayName: cleanText(patch.displayName, existing.displayName),
    role: normalizeRole(patch.role, existing.role),
    active: patch.active === undefined ? existing.active : Boolean(patch.active),
    allowedSiteKeys: patch.allowedSiteKeys === undefined ? existing.allowedSiteKeys : normalizeAllowedSiteKeys(patch.allowedSiteKeys, existing.allowedSiteKeys),
    updatedAt,
    passwordAlgorithm: nextPasswordRecord?.algorithm || existing.passwordAlgorithm,
    passwordSalt: nextPasswordRecord?.salt || existing.passwordSalt,
    passwordHash: nextPasswordRecord?.hash || existing.passwordHash,
  });

  if (nextUser.username === defaultAdminUsername && nextUser.role !== 'admin') {
    throw new Error('The admin account must stay an admin.');
  }

  store.users[userIndex] = nextUser;
  if (patch.active === false || nextPassword) {
    store.sessions = store.sessions.filter((session) => session.userId !== userId);
  }
  await saveAuthStore(store);
  return serializeUser(nextUser);
}

export async function listUsers() {
  const store = await loadAuthStore();
  return store.users
    .map(normalizeUserRecord)
    .sort((left, right) => {
      if (left.role !== right.role) {
        return left.role === 'admin' ? -1 : 1;
      }

      return left.username.localeCompare(right.username);
    })
    .map(serializeUser);
}

export async function listInvites() {
  const store = await loadAuthStore();
  return store.invites
    .map(normalizeInviteRecord)
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .map(serializeInvite);
}

export async function createInvite(input) {
  const store = await loadAuthStore();
  const rawToken = randomBytes(18).toString('hex');
  const createdAt = nowIso();
  const invite = normalizeInviteRecord({
    id: `invite_${randomUUID()}`,
    tokenHash: hashToken(rawToken),
    role: normalizeRole(input.role, 'user'),
    note: cleanText(input.note, ''),
    createdAt,
    createdByUserId: cleanText(input.createdByUserId, ''),
    createdByUsername: normalizeUsername(input.createdByUsername),
    expiresAt: cleanText(input.expiresAt, new Date(Date.now() + defaultInviteTtlMs).toISOString()),
    active: true,
    tokenPreview: rawToken.slice(-6),
    allowedSiteKeys: normalizeAllowedSiteKeys(input.allowedSiteKeys),
  });

  store.invites.push(invite);
  await saveAuthStore(store);

  return {
    invite: serializeInvite(invite),
    token: rawToken,
  };
}

export async function registerWithInvite(input) {
  const store = await loadAuthStore();
  const token = cleanText(input.inviteToken, '');
  const username = normalizeUsername(input.username);
  const password = cleanText(input.password, '');
  const displayName = cleanText(input.displayName, username || 'User');

  if (!token) {
    throw new Error('inviteToken is required.');
  }

  if (!username) {
    throw new Error('username is required.');
  }

  if (!password) {
    throw new Error('password is required.');
  }

  if (findUserByUsername(store, username)) {
    throw new Error('That username is already taken.');
  }

  const invite = findInviteByToken(store, token);
  if (!invite || invite.active === false) {
    throw new Error('That invite is invalid.');
  }

  if (invite.expiresAt && new Date(invite.expiresAt).getTime() <= Date.now()) {
    throw new Error('That invite has expired.');
  }

  const createdAt = nowIso();
  const passwordHash = createPasswordHash(password);
  const user = normalizeUserRecord({
    id: `user_${randomUUID()}`,
    username,
    displayName,
    role: invite.role || 'user',
    active: true,
    passwordAlgorithm: passwordHash.algorithm,
    passwordSalt: passwordHash.salt,
    passwordHash: passwordHash.hash,
    createdAt,
    updatedAt: createdAt,
    createdByUserId: invite.createdByUserId,
    createdByUsername: invite.createdByUsername,
    allowedSiteKeys: normalizeAllowedSiteKeys(invite.allowedSiteKeys),
  });

  const redeemedInvite = {
    ...invite,
    redeemedAt: createdAt,
    redeemedByUserId: user.id,
    redeemedByUsername: user.username,
    active: false,
  };

  const tokenForSession = randomBytes(32).toString('hex');
  const session = normalizeSessionRecord({
    id: `session_${randomUUID()}`,
    tokenHash: hashToken(tokenForSession),
    userId: user.id,
    createdAt,
    lastUsedAt: createdAt,
    expiresAt: new Date(Date.now() + defaultSessionTtlMs).toISOString(),
  });

  store.users.push(user);
  store.invites = store.invites.map((entry) => (entry.id === invite.id ? redeemedInvite : entry));
  store.sessions.push(session);
  await saveAuthStore(store);

  return {
    user: serializeUser(user),
    token: tokenForSession,
    session,
  };
}

export function getAuthSessionCookieName() {
  return authSessionCookieName;
}

export function createSessionCookie(token) {
  return `${authSessionCookieName}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`;
}

export function clearSessionCookie() {
  return `${authSessionCookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function serializeAuthUser(user) {
  return serializeUser(user);
}

export function serializeAuthInvite(invite) {
  return serializeInvite(invite);
}
