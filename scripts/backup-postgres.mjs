#!/usr/bin/env node
import { createWriteStream } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const user = process.env.POSTGRES_ADMIN_USER || process.env.POSTGRES_USER || 'railgpt_admin';
const database = process.env.POSTGRES_DB || 'railgpt';
const backupDirectory = path.resolve(process.env.BACKUP_DIR || path.join(root, 'backups'));
await mkdir(backupDirectory, { recursive: true, mode: 0o700 });
const timestamp = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');
const backupPath = path.join(backupDirectory, `railgpt-${timestamp}.dump`);
const output = createWriteStream(backupPath, { flags: 'wx', mode: 0o600 });
const outputDone = new Promise((resolve, reject) => {
  output.once('finish', resolve);
  output.once('error', reject);
});
const child = spawn('docker', [
  'compose', '-f', 'compose.production.yml', 'exec', '-T', 'db',
  'pg_dump', '--format=custom', '--no-owner', '--no-acl', '-U', user, '-d', database,
], { cwd: root, stdio: ['ignore', 'pipe', 'inherit'] });
child.stdout.pipe(output);

const exitCode = await new Promise((resolve, reject) => {
  child.once('error', reject);
  child.once('close', resolve);
});
await outputDone;

if (exitCode !== 0) {
  await rm(backupPath, { force: true });
  process.exitCode = Number(exitCode) || 1;
  console.error('Database backup failed; incomplete output was removed.');
} else {
  console.log(`Database backup created: ${backupPath}`);
  console.log('This file contains passenger/account data. Encrypt it and store it outside this host.');
}
