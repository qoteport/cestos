import test from 'node:test';
import assert from 'node:assert/strict';
import {dashboardApiRequest} from '../dashboard-api-proxy.mjs';
const env={CESTOS_API_BACKEND_URL:'https://backend.example'};
test('forwards authenticated dashboard requests without changing payload or query',async()=>{
 const req=new Request('https://frontend.example/api/v1/dashboard-publications/123?tab=a',{method:'POST',headers:{Authorization:'Bearer test','Content-Type':'application/json'},body:'{"draft_revision":2}'});
 const forwarded=dashboardApiRequest(req,env);
 assert.equal(forwarded.url,'https://backend.example/api/v1/dashboard-publications/123?tab=a');
 assert.equal(forwarded.method,'POST');assert.equal(forwarded.headers.get('Authorization'),'Bearer test');assert.equal(await forwarded.text(),'{"draft_revision":2}');assert.equal(forwarded.redirect,'manual');
});
test('matches the dashboard collections and leaves page routing to OpenNext',()=>{
 for(const path of ['/api/v1/workbook-dashboards','/api/v1/dashboard-publications'])assert.ok(dashboardApiRequest(new Request('https://frontend.example'+path),env));
 for(const path of ['/dashboards','/api/v1/dashboard-publications-other'])assert.equal(dashboardApiRequest(new Request('https://frontend.example'+path),env),null);
});
