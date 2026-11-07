import { cloudflareBackend } from './scripts/cloudflare-backend.mjs';

// Handle versioned API traffic before Next.js page routing. Preserve the backend's
// authorization decisions, status codes and streaming responses.
export function backendApiRequest(request, env) {
  const incoming = new URL(request.url);
  if (!/^\/api\/v1(?:\/|$)/.test(incoming.pathname)) return null;
  const target = new URL(cloudflareBackend({vars: env}));
  target.pathname = incoming.pathname;
  target.search = incoming.search;
  const upstream = new Request(target, request);
  upstream.headers.delete('host');
  return new Request(upstream, { redirect: 'manual' });
}
