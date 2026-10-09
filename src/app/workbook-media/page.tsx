'use client';
import {useEffect,useState} from 'react';
import {useAuth} from '@/components/AuthProvider';
import {apiFetch,apiFetchBlob,downloadBlob} from '@/lib/api';
export default function WorkbookMediaPage(){
 const {user,loading}=useAuth();const [file,setFile]=useState<{name:string;url:string;blob:Blob;kind:string}|null>(null),[error,setError]=useState('');
 useEffect(()=>{if(!user)return;let live=true,url='';void(async()=>{try{
  const id=new URLSearchParams(window.location.search).get('id');if(!id||!/^[0-9a-f-]{36}$/i.test(id))throw Error('Invalid media link.');
  const metadata=await apiFetch<{file_name:string}>(`/api/v1/documents/${id}`,{},true,{cacheResponse:false,cacheOfflineRead:false,memoryCache:false});
  const blob=await apiFetchBlob(`/api/v1/documents/${id}/download`);
  const ext=metadata.file_name.split('.').pop()?.toLowerCase()||'';
  const types:Record<string,string>={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',webp:'image/webp',mp4:'video/mp4',webm:'video/webm',ogg:'video/ogg'};
  const kind=types[ext]||'application/octet-stream';url=URL.createObjectURL(new Blob([blob],{type:kind}));
  if(live)setFile({name:metadata.file_name,url,blob,kind});else URL.revokeObjectURL(url);
 }catch(e){if(live)setError(e instanceof Error?e.message:'Media is unavailable or you do not have access.');}})();return()=>{live=false;if(url)URL.revokeObjectURL(url);};},[user]);
 return <main className="mx-auto max-w-4xl space-y-4 p-6"><h1 className="text-xl font-bold">{file?.name||'Workbook media'}</h1>{loading?<p>Checking access...</p>:!user?<p><a className="underline" href="/sign-up-login">Sign in</a>, then reopen this media link. Document permissions apply.</p>:error?<p role="alert">{error}</p>:!file?<p>Loading media...</p>:<>{file.kind.startsWith('image/')?<img className="max-h-[75vh] max-w-full object-contain" src={file.url} alt={file.name}/>:file.kind.startsWith('video/')?<video className="max-h-[75vh] max-w-full" src={file.url} controls/>:<p>Download this file to open it on your device.</p>}<button type="button" className="rounded border px-4 py-2" onClick={()=>downloadBlob(file.blob,file.name)}>Download file</button></>}</main>;
}
