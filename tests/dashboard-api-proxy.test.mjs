import test from 'node:test';
import assert from 'node:assert/strict';
import {backendApiRequest} from '../dashboard-api-proxy.mjs';
const env={CESTOS_API_BACKEND_URL:'https://backend.example'};
test('forwards authenticated dashboard requests without changing payload or query',async()=>{
 const req=new Request('https://frontend.example/api/v1/dashboard-publications/123?tab=a',{method:'POST',headers:{Authorization:'Bearer test','Content-Type':'application/json'},body:'{"draft_revision":2}'});
 const forwarded=backendApiRequest(req,env);
 assert.equal(forwarded.url,'https://backend.example/api/v1/dashboard-publications/123?tab=a');
 assert.equal(forwarded.method,'POST');assert.equal(forwarded.headers.get('Authorization'),'Bearer test');assert.equal(await forwarded.text(),'{"draft_revision":2}');assert.equal(forwarded.redirect,'manual');
});
test('routes the full backend API namespace and leaves pages and assets to OpenNext',()=>{
 for(const path of ['/api/v1/auth/me','/api/v1/auth/refresh','/api/v1/documents','/api/v1/workbook-dashboards','/api/v1/dashboard-publications'])assert.equal(backendApiRequest(new Request('https://frontend.example'+path),env)?.url,'https://backend.example'+path);
 for(const path of ['/dashboards','/api/v10/auth/me','/_next/static/app.js'])assert.equal(backendApiRequest(new Request('https://frontend.example'+path),env),null);
});
