import fs from 'node:fs';
import path from 'node:path';

function patchFile(relPath, replacer) {
  const fullPath = path.resolve(process.cwd(), relPath);
  if (!fs.existsSync(fullPath)) return;
  try {
    const content = fs.readFileSync(fullPath, 'utf8');
    const updated = replacer(content);
    if (updated !== content) {
      fs.writeFileSync(fullPath, updated, 'utf8');
      console.log(`[patch-opennext] Patched ${relPath}`);
    }
  } catch (err) {
    console.warn(`[patch-opennext] Failed to patch ${relPath}:`, err?.message || err);
  }
}

// 1. Patch @opennextjs/cloudflare default flag for dangerouslyUseUnsupportedNextVersion to true
patchFile('node_modules/@opennextjs/cloudflare/dist/cli/commands/build.js', (content) => {
  return content.replace(
    /option\("dangerouslyUseUnsupportedNextVersion",\s*\{\s*type:\s*"boolean",\s*default:\s*false/g,
    'option("dangerouslyUseUnsupportedNextVersion", { type: "boolean", default: true'
  );
});

// 2. Patch @opennextjs/aws checkNextVersionSupport to allow Next.js version
patchFile('node_modules/@opennextjs/aws/dist/build/helper.js', (content) => {
  return content.replace(
    /export function checkNextVersionSupport\(nextVersion, allowUnsupportedNextVersion, flagName = [^)]+\) \{/g,
    'export function checkNextVersionSupport(nextVersion, allowUnsupportedNextVersion, flagName) { return;'
  );
});

console.log('[patch-opennext] Completed OpenNext Cloudflare patches.');
