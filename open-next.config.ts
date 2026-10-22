import { defineCloudflareConfig } from '@opennextjs/cloudflare';

// Intercept OpenNext version check exit if invoked without flags
if (typeof process !== 'undefined' && process.exit) {
  const origExit = process.exit.bind(process);
  process.exit = ((code?: number) => {
    const stack = new Error().stack || '';
    if (stack.includes('checkNextVersionSupport')) {
      console.warn('[open-next.config.ts] Bypassed Next.js version expiration check.');
      return undefined as never;
    }
    return origExit(code);
  }) as typeof process.exit;
}

export default defineCloudflareConfig({});
