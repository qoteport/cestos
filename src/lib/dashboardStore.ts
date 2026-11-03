import type {SavedDashboard,DashboardData} from './workbookDashboard';
let database:Promise<IDBDatabase>|undefined;
function open(){return database??=new Promise((resolve,reject)=>{const r=indexedDB.open('cestos-dashboards-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('entries');r.onsuccess=()=>{r.result.onversionchange=()=>{r.result.close();database=undefined;};resolve(r.result);};r.onerror=()=>{database=undefined;reject(r.error);};r.onblocked=()=>{database=undefined;reject(Error('Close older dashboard windows to update local storage.'));};});}
async function read<T>(key:string):Promise<T|undefined>{const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction('entries','readonly'),r=tx.objectStore('entries').get(key);tx.oncomplete=()=>resolve(r.result);tx.onerror=tx.onabort=()=>reject(tx.error);});}
async function write(key:string,value:unknown){const db=await open();return new Promise<void>((resolve,reject)=>{const tx=db.transaction('entries','readwrite');tx.objectStore('entries').put(value,key);tx.oncomplete=()=>resolve();tx.onerror=tx.onabort=()=>reject(tx.error);});}
export const readDashboards=(scope:string)=>read<SavedDashboard[]>(JSON.stringify([scope,'dashboards']));
export const saveDashboards=(scope:string,items:SavedDashboard[])=>write(JSON.stringify([scope,'dashboards']),items);
export const readDashboardData=(scope:string,key:string)=>read<DashboardData>(JSON.stringify([scope,'dataset',key]));
export const saveDashboardData=(scope:string,key:string,data:DashboardData)=>write(JSON.stringify([scope,'dataset',key]),data);
