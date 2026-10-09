import {apiFetch} from './api';
import type {WorkbookAsset} from './workbookMedia';
const uploads=new Map<string,Promise<WorkbookAsset>>();
export async function uploadWorkbookMedia(asset:WorkbookAsset):Promise<WorkbookAsset> {
 if(asset.documentId)return asset;
 if(!navigator.onLine)throw Error('Media is saved offline and will upload when connected.');
 const {getAccessToken}=await import('./api');
 const key=JSON.stringify([getAccessToken(),asset.id]);
 const existing=uploads.get(key);if(existing)return existing;
 const task=(async()=>{
  const bytes=Uint8Array.from(atob(asset.data),char=>char.charCodeAt(0));
  const form=new FormData();form.append('file',new Blob([bytes],{type:asset.mime}),asset.name);
  form.append('title',asset.name);form.append('category','Workbook Media');form.append('visibility','PRIVATE');form.append('tags',`wm-${asset.id}`);
  const document=await apiFetch<{id:string}>('/api/v1/documents',{method:'POST',body:form},true,{queueWhenOffline:false,cacheResponse:false,cacheOfflineRead:false});
  if(!document?.id)throw Error('The server did not confirm media storage.');
  return {...asset,documentId:document.id};
 })();uploads.set(key,task);
 try{return await task;}catch(error){uploads.delete(key);throw error;}
}
