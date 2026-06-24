import { openSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..');
const nodePath = process.execPath;
const serverPath = resolve(repoRoot, 'server', 'chat-agent-server.js');
const logPath = resolve(repoRoot, 'chat-agent.log');
const errorLogPath = resolve(repoRoot, 'chat-agent.error.log');

const stdout = openSync(logPath, 'a');
const stderr = openSync(errorLogPath, 'a');

const child = spawn(nodePath, [serverPath], {
  cwd: repoRoot,
  stdio: ['ignore', stdout, stderr],
  detached: true,
  windowsHide: true,
  env: process.env,
});

child.unref();

setInterval(() => {
  if (child.exitCode !== null) {
    process.exit(child.exitCode || 1);
  }
}, 1000);

console.log(`Chat agent server started in supervised mode (pid ${child.pid}).`);
