import type {WorkspaceSource} from './workbookDatabaseWorkspace';
import type {DatabaseSource} from './workbookDatabaseSource';
export async function loadWorkbookCatalog(fetcher:(path:string)=>Promise<unknown>):Promise<{sources:WorkspaceSource[];notice:string}> {
 try{return {sources:await fetcher('/api/v1/workbook-connections/workspace') as WorkspaceSource[],notice:''};}
 catch(error){
  if((error as {status?:number})?.status!==404)throw error;
  try{
   const sources=await fetcher('/api/v1/workbook-connections/sources') as DatabaseSource[];
   return {sources:sources.map(source=>({...source,relations:[]})),notice:'This server supports viewing tables only. Deploy the latest backend to enable relationships and confirmed database edits.'};
  }catch(fallback){
   if((fallback as {status?:number})?.status===404)throw Error('Database tables are unavailable because this server has not deployed the workbook database endpoints. Deploy the latest Cestos backend, then click Refresh. This is not a field-admin or supervisor role restriction.');
   throw fallback;
  }
 }
}
