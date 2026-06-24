import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import os from 'node:os';

function sanitizeCandidate(value) {
  return typeof value === 'string' && value.trim() ? resolve(value.trim()) : '';
}

function probeWritableDirectory(dir) {
  try {
    mkdirSync(dir, { recursive: true });
    const probePath = join(dir, `.probe-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}.tmp`);
    writeFileSync(probePath, 'ok', 'utf8');
    rmSync(probePath, { force: true });
    return true;
  } catch {
    return false;
  }
}

export function resolveWritableRuntimeDir({ explicitDir = '', fallbackName, repoRoot, extraCandidates = [], scope = [] }) {
  const scopeParts = Array.isArray(scope) ? scope.filter(Boolean) : [];
  const homedir = os.homedir();
  const localAppData = process.env.LOCALAPPDATA
    ? resolve(process.env.LOCALAPPDATA)
    : homedir
      ? resolve(homedir, 'AppData', 'Local')
      : '';
  const tempDir = os.tmpdir();
  const repoBase = repoRoot ? resolve(repoRoot) : process.cwd();

  const candidates = [
    sanitizeCandidate(explicitDir),
    ...extraCandidates.map(sanitizeCandidate),
    localAppData ? resolve(localAppData, 'Samuel Studio', fallbackName) : '',
    tempDir ? resolve(tempDir, 'Samuel Studio', fallbackName) : '',
    resolve(repoBase, 'logs', fallbackName),
    resolve(repoBase, fallbackName),
  ].filter(Boolean);

  for (const candidate of candidates) {
    const scopedCandidate = scopeParts.length ? resolve(candidate, ...scopeParts) : candidate;
    if (probeWritableDirectory(scopedCandidate)) {
      return scopedCandidate;
    }
  }

  const fallbackCandidate = candidates[0] || resolve(tempDir || repoBase, 'Samuel Studio', fallbackName);
  return scopeParts.length ? resolve(fallbackCandidate, ...scopeParts) : fallbackCandidate;
}
