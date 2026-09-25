import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

// Rewrites are baked into the Next.js build, so use the deployment backend
// rather than a localhost value from a developer's .env.local.
const config = JSON.parse(readFileSync(new URL('../wrangler.jsonc', import.meta.url), 'utf8'));
const backend = process.env.CESTOS_API_BACKEND_URL || config.vars.CESTOS_API_BACKEND_URL;
const url = new URL(backend);
if (url.protocol !== 'https:' || ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
  throw new Error('CESTOS_API_BACKEND_URL must be a public HTTPS backend URL.');
}
const result = spawnSync(process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['opennextjs-cloudflare', 'build'], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, DIST_DIR: '.next', CESTOS_API_BACKEND_URL: backend },
  });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
