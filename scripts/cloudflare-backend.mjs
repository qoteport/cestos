// Cloudflare's checked-in deployment configuration is the source of truth for
// both build-time Next rewrites and runtime Worker variables.
export function cloudflareBackend(config) {
  const value=config.vars?.CESTOS_API_BACKEND_URL;
  if(!value)throw new Error('Set CESTOS_API_BACKEND_URL in wrangler.jsonc before building.');
  const url=new URL(value);
  if(url.protocol!=='https:'||['localhost','127.0.0.1','[::1]'].includes(url.hostname)||url.username||url.password||url.search||url.hash||url.pathname!=='/')throw new Error('The Cloudflare backend must be a public HTTPS origin.');
  return url.origin;
}
