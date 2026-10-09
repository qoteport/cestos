'use client';
import {useEffect,useState} from 'react';
import dynamic from 'next/dynamic';
import {useRouter} from 'next/navigation';
import {useAuth} from '@/components/AuthProvider';
import FieldWorkbookDialog from '@/components/FieldWorkbookDialog';
import {apiFetch} from '@/lib/api';
const Workspace=dynamic(()=>import('@/components/FieldWorkbookWorkspace'),{ssr:false,loading:()=> <p className="p-6">Opening workbooks...</p>});
export default function WorkbooksPage(){
 const {user,loading,error,reload}=useAuth();const router=useRouter();
 const [lists,setLists]=useState<{projects:any[];assets:any[];employees:any[];sites:any[]}>({projects:[],assets:[],employees:[],sites:[]});
 useEffect(()=>{if(!loading&&!user&&!error)router.replace('/sign-up-login?next=/workbooks');},[user,loading,error,router]);
 useEffect(()=>{let active=true;setLists({projects:[],assets:[],employees:[],sites:[]});if(!user)return;
  void Promise.allSettled(['/api/v1/projects','/api/v1/assets','/api/v1/employees','/api/v1/field-portal/sites'].map(path=>apiFetch<any>(`${path}?page_size=100`))).then(results=>{
   if(!active)return;const rows=results.map(result=>result.status==='fulfilled'?(Array.isArray(result.value)?result.value:result.value?.items||[]):[]);
   setLists({projects:rows[0],assets:rows[1],employees:rows[2],sites:rows[3]});
  });return()=>{active=false;};
 },[user?.id]);
 if(loading)return <main className="p-6">Restoring your workbook session...</main>;
 if(!user)return <main className="p-6">{error?<><p>{error}</p><button type="button" onClick={()=>void reload()}>Retry</button><a className="ml-4 underline" href="/sign-up-login?next=/workbooks">Sign in</a></>:<p>Opening sign in...</p>}</main>;
 return <FieldWorkbookDialog open standalone onClose={()=>{}}><Workspace key={user.id} {...lists} storageScope={String(user.id)}/></FieldWorkbookDialog>;
}
