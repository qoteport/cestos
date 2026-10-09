import type {DatabaseSource} from './workbookDatabaseSource';
import type {FieldSheet} from './fieldWorkbook';
export type Schema = {type?:string;format?:string;enum?:unknown[];anyOf?:Schema[];$ref?:string;properties?:Record<string,Schema>;required?:string[];$defs?:Record<string,Schema>;title?:string;description?:string};
export type DatabaseAction={path:string;method:'POST'|'PATCH';schema:Schema};
export type WorkspaceSource=DatabaseSource & {detailPath?:string;create?:DatabaseAction;update?:DatabaseAction;relations:{column:string;target:string;targetColumn:string}[]};
export type RecordChange={row:number;id?:string;values:Record<string,unknown>;before:Record<string,unknown>;action:DatabaseAction};
export function resolvedSchema(schema:Schema,root:Schema):Schema {
 if(schema.$ref)return root.$defs?.[schema.$ref.split('/').pop()!] || schema;
 return schema;
}
export function fieldValue(text:string,schema:Schema,root:Schema):unknown {
 schema=resolvedSchema(schema,root);
 const choices=schema.anyOf?.map(item=>resolvedSchema(item,root));
 if(text===''&&choices?.some(item=>item.type==='null'))return null;
 schema=choices?.find(item=>item.type!=='null')||schema;
 if(schema.type==='integer'||schema.type==='number') {const n=Number(text);if(!text.trim()||!Number.isFinite(n)||(schema.type==='integer'&&!Number.isInteger(n)))throw Error('Enter a valid '+schema.type);return n;}
 if(schema.type==='boolean'){if(!['true','false'].includes(text.toLowerCase()))throw Error('Enter true or false');return text.toLowerCase()==='true';}
 if(schema.type==='object'||schema.type==='array'){const value=JSON.parse(text);if(schema.type==='array'?!Array.isArray(value):!value||typeof value!=='object'||Array.isArray(value))throw Error('Enter valid JSON '+schema.type);return value;}
 if(schema.enum&&!schema.enum.includes(text))throw Error('Choose '+schema.enum.join(', '));
 return text;
}
export function sheetChanges(sheet:FieldSheet,source:WorkspaceSource):RecordChange[] {
 const link=sheet.databaseSource;if(!link||link.path!==source.id)throw Error('Sheet connection does not match this table.');
 const headers=sheet.cells[0];if(!headers||new Set(headers).size!==headers.length||link.columns.some(name=>!headers.includes(name)))throw Error('Restore the original column headers before saving database changes.');
 const idCol=headers.indexOf('id');if(idCol<0)throw Error('Include the id column when loading a table to review database edits.');
 const seen=new Set<string>(),changes:RecordChange[]=[];
 for(let row=1;row<sheet.cells.length;row++){
  const cells=sheet.cells[row];if(!cells.some(Boolean))continue;
  const id=idCol>=0?cells[idCol]:'';
  const before=link.mode!=='insert'&&id?link.baseline?.[id]:undefined;
  if(link.mode!=='insert'&&id&&!before)throw Error(`Row ${row+1}: unknown or changed record ID. Load the table again; IDs cannot be edited.`);
  if(before&&seen.has(id))throw Error(`Row ${row+1}: duplicate record ID.`);if(before)seen.add(id);
  const action=before?source.update:source.create;
  const changed=headers.filter((name,c)=>name!=='id' && (before?cells[c]!==String(before[name]??''):cells[c]!==''));
  if(before&&!changed.length)continue;
  if(!action)throw Error(`Row ${row+1}: you do not have a supported ${before?'edit':'create'} action for this table.`);
  const values:Record<string,unknown>={};
  for(const name of changed){
   const definition=action.schema.properties?.[name];
   if(!definition){if(before)throw Error(`Row ${row+1}: ${name} is read-only.`);continue;}
   try{values[name]=fieldValue(cells[headers.indexOf(name)],definition,action.schema);}catch(e){throw Error(`Row ${row+1}, ${name}: ${e instanceof Error?e.message:'Invalid value'}`);}
  }
  for(const name of action.schema.required||[])if(!(name in values)&&!before)throw Error(`Row ${row+1}: ${name} is required.`);
  if(Object.keys(values).length)changes.push({row,id:before?id:undefined,values,before:before||{},action});
 }
 return changes;
}
export function actionPath(action:DatabaseAction,id?:string){
 if(!action.path.startsWith('/api/v1/')||/[?#]/.test(action.path))throw Error('Invalid database action.');
 if(action.method==='PATCH'&&!id)throw Error('Record ID is required.');
 return action.path.replace(/\{[^}]+\}/,encodeURIComponent(id||''));
}
