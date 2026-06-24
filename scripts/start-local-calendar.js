import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..');
const nodePath = process.execPath;
const serverPath = resolve(repoRoot, 'server', 'local-calendar-server.js');

const child = spawn(nodePath, [serverPath], {
  cwd: repoRoot,
  stdio: 'ignore',
  windowsHide: true,
  env: process.env,
});

child.unref();

setInterval(() => {
  if (child.exitCode !== null) {
    process.exit(child.exitCode || 1);
  }
}, 1000).unref();

console.log(`Local calendar server started in supervised mode (pid ${child.pid}).`);
