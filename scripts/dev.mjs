#!/usr/bin/env node
/**
 * RailGPT local development orchestrator.
 *
 *   node scripts/dev.mjs          -> demo API (:8090) + Vite frontend (:5173)
 *   node scripts/dev.mjs --real   -> Vite frontend only, proxied to Spring Boot (:8081)
 *
 * For --real, start the Spring Boot backend separately (mvn spring-boot:run)
 * with PostgreSQL reachable and the env vars from .env.example set.
 *
 * This is for local development. In the Arena sandbox the two processes are
 * started independently via the process tools instead.
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const real = process.argv.includes('--real');
const children = [];
let shuttingDown = false;

function run(name, args, opts = {}) {
  const child = spawn(process.execPath, args, {
    cwd: opts.cwd || root,
    env: { ...process.env, ...(opts.env || {}) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const prefix = `[${name}] `;
  const pipe = (stream) =>
    stream.on('data', (d) => process.stdout.write(prefix + d.toString().replace(/\n(?=.)/g, '\n' + prefix)));
  pipe(child.stdout);
  pipe(child.stderr);
  child.on('exit', (code) => {
    console.log(`${prefix}exited with code ${code}`);
    shutdown(code ?? 0);
  });
  children.push(child);
  return child;
}

function shutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const c of children) {
    try { c.kill('SIGTERM'); } catch { /* already gone */ }
  }
  setTimeout(() => process.exit(code), 300);
}
process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

const apiTarget = process.env.VITE_API_TARGET || (real ? 'http://localhost:8081' : 'http://localhost:8090');

if (!real) {
  run('api', [path.join(root, 'demo-api', 'src', 'server.js')], {
    env: {
      DEMO_PORT: process.env.DEMO_PORT || '8090',
      DEMO_PERSIST: process.env.DEMO_PERSIST || 'false',
    },
  });
}

run('web', [path.join(root, 'frontend', 'node_modules', 'vite', 'bin', 'vite.js'), '--host', '0.0.0.0'], {
  cwd: path.join(root, 'frontend'),
  env: { VITE_API_TARGET: apiTarget },
});

console.log(real
  ? `RailGPT dev (real backend): frontend :5173 -> Spring Boot ${apiTarget}. Ctrl+C to stop.`
  : 'RailGPT dev: demo API :8090 + frontend :5173. Ctrl+C to stop.');
