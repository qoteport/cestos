import type {DashboardDefinition,SavedDashboard} from './workbookDashboard';
import {normalizeDashboardHeights} from './workbookDashboard';
import {withoutLayout} from './dashboardLayout';

/** Retry only known schema-version differences, never auth, revision or network failures. */
export async function saveDashboardCompatible(definition:DashboardDefinition,send:(definition:DashboardDefinition)=>Promise<SavedDashboard>){
 const original=normalizeDashboardHeights(definition);
 if(original.layout){const {compatibility_heights,...layout}=original.layout;original.layout=layout;}
 let payload=original,legacyHeights=false,withoutDesign=false;
 for(let attempt=0;attempt<3;attempt++){
  try{return {saved:await send(payload),original,legacyHeights};}
  catch(error){
   const e=error as {status?:number;message?:string};
   if(e.status!==400&&e.status!==422)throw error;
   const message=e.message||'';
   let changed=false;
   if(!legacyHeights&&/definition[. ]widgets[. ]\d+[. ]height\b/i.test(message)&&payload.widgets.some(w=>w.kind==='kpi'&&w.height!==undefined&&w.height<240)){
    payload={...payload,widgets:payload.widgets.map(w=>w.kind==='kpi'&&w.height!==undefined&&w.height<240?{...w,height:240}:w)};
    legacyHeights=true;changed=true;
   }
   if(!withoutDesign&&payload.layout&&/layout/i.test(message)){payload=withoutLayout(payload);withoutDesign=true;changed=true;}
   if(!changed)throw error;
  }
 }
 throw new Error('The server could not accept this dashboard. Your device draft is retained.');
}
