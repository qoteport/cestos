import openNext from './.open-next/worker.js';
import { backendApiRequest } from './dashboard-api-proxy.mjs';
export * from './.open-next/worker.js';

export default {
  ...openNext,
  fetch(request, env, ctx) {
    const upstream = backendApiRequest(request, env);
    return upstream ? fetch(upstream) : openNext.fetch(request, env, ctx);
  },
};
