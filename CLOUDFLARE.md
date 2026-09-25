# Cloudflare Workers deployment

This Next.js frontend uses the OpenNext adapter on **Workers**.
`next build` alone does not generate `.open-next/worker.js`.

## Cloudflare Git build settings

- Root directory: repository root
- Node.js version: 24 (set `NODE_VERSION=24` in build variables)
- Install: `npm ci` (include development dependencies)
- Build command: `npm run build:cf`
- Deploy command: `npx opennextjs-cloudflare deploy`
- Non-production branch deploy command, if enabled: `npx opennextjs-cloudflare upload`

The build creates `.open-next/worker.js` and `.open-next/assets`. Do not
commit these generated files. Commit `package-lock.json` so CI uses the
verified dependency versions.

## Local verification and deployment

```sh
npm ci
npm run check:cf
npm run preview:cf
# Publish when ready:
npm run deploy:cf
```

`check:cf` builds and runs a Wrangler dry run without publishing.
`deploy:cf` and `preview:cf` always build first.
OpenNext recommends Linux/WSL for builds; native Windows may have limitations.

## Backend

Browser requests use `/api/...` on the frontend origin. Next.js rewrites
proxy them to `https://cestos-oversight.fly.dev/api/...`.
The default is stored in `wrangler.jsonc`. Set `CESTOS_API_BACKEND_URL`
in Cloudflare **build variables** to override it. Rebuild after changing it:
rewrites are baked into the Next.js output; a runtime variable alone does
not change the destination. The Cloudflare build script overrides local
`.env` defaults and rejects localhost or non-HTTPS backend URLs.

Keep API keys and local `.env` / `.dev.vars` files out of Git.

References: https://opennext.js.org/cloudflare/get-started
