export type MergeConflict={path:string;local:unknown;server:unknown};
export function mergeWorkbookVersions(base:any,local:any,server:any,choices:Record<string,'local'|'server'>={}) {
 const conflicts:MergeConflict[]=[];const same=(a:any,b:any)=>JSON.stringify(a)===JSON.stringify(b);
 function walk(b:any,l:any,s:any,path:string):any {
  if(same(l,s))return l;if(same(l,b))return s;if(same(s,b))return l;
  const objects=[b,l,s].every(v=>v!==null&&typeof v==='object');
  const sheetStructure=objects&&b.cells&&l.cells&&s.cells&&(!same(b.merges,l.merges)||!same(b.merges,s.merges)||b.cells.length!==l.cells.length||b.cells.length!==s.cells.length||b.widths?.length!==l.widths?.length||b.widths?.length!==s.widths?.length);
  const identifiedArrays=objects&&[b,l,s].every(Array.isArray)&&b.some((item:any)=>item?.id)&&(!same(b.map((item:any)=>item?.id),l.map((item:any)=>item?.id))||!same(b.map((item:any)=>item?.id),s.map((item:any)=>item?.id)));
  if(objects&&!sheetStructure&&!identifiedArrays&&[b,l,s].every(Array.isArray)&&b.length===l.length&&l.length===s.length)return l.map((_:any,i:number)=>walk(b[i],l[i],s[i],`${path}/${i}`));
  if(objects&&!sheetStructure&&[b,l,s].every(v=>!Array.isArray(v))){const result:any={};for(const key of new Set([...Object.keys(b),...Object.keys(l),...Object.keys(s)])){const value=walk(b[key],l[key],s[key],`${path}/${key.replace(/~/g,'~0').replace(/\//g,'~1')}`);if(value!==undefined)result[key]=value;}return result;}
  conflicts.push({path,local:l,server:s});return choices[path]==='server'?s:l;
 }
 return {book:structuredClone(walk(base,local,server,'')),conflicts};
}
