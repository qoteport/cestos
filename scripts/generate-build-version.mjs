import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

let revision = 'unknown';
try { revision = execFileSync('git', ['rev-parse', '--short=12', 'HEAD'], { encoding: 'utf8' }).trim(); } catch {}
const version = `${revision}-${Date.now().toString(36)}`;
mkdirSync(new URL('../public/', import.meta.url), { recursive: true });
writeFileSync(new URL('../public/build-version.json', import.meta.url), `${JSON.stringify({ version })}\n`);
console.log(`Generated PWA build version ${version}`);
