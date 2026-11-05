import { cloudflareBackend } from './cloudflare-backend.mjs';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

// Rewrites are baked into the Next.js build, so use the deployment backend
// rather than a localhost value from a developer's .env.local.
const config = JSON.parse(readFileSync(new URL('../wrangler.jsonc', import.meta.url), 'utf8'));
const backend = cloudflareBackend(config);
if(process.env.CESTOS_API_BACKEND_URL&&process.env.CESTOS_API_BACKEND_URL.replace(/\/$/,'')!==backend){
  console.warn('Ignoring a conflicting build-environment backend URL; using wrangler.jsonc.');
}
console.log(`Cloudflare API proxy target: ${backend}`);
const result = spawnSync(process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['opennextjs-cloudflare', 'build', '--dangerouslyUseUnsupportedNextVersion'], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, DIST_DIR: '.next', CESTOS_API_BACKEND_URL: backend, CESTOS_API_URL: backend },
  });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
