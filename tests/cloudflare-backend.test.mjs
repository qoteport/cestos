import test from 'node:test';
import assert from 'node:assert/strict';
import {cloudflareBackend} from '../scripts/cloudflare-backend.mjs';
import {readFileSync} from 'node:fs';
test('build resolves the checked-in Cloud Run target',()=>{const config=JSON.parse(readFileSync(new URL('../wrangler.jsonc',import.meta.url)));assert.equal(cloudflareBackend(config),'https://cestos-oversight-629203414453.europe-west1.run.app');});
test('invalid deployment targets fail before building',()=>{for(const value of ['http://localhost:8000','https://localhost','https://example.com/api','https://user:secret@example.com'])assert.throws(()=>cloudflareBackend({vars:{CESTOS_API_BACKEND_URL:value}}));assert.throws(()=>cloudflareBackend({}));});
