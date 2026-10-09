import {makeSheet, MAX_ROWS, MAX_COLS, type FieldSheet, type CellFormat} from './fieldWorkbook';
export type DatabaseSource = {id:string; name:string; pagination:'page'|'none'; columns:{name:string;type:string;format?:string}[]};
export function databaseSheets(source:DatabaseSource, records:Record<string,unknown>[], columns:string[], existingNames:string[]):FieldSheet[] {
  if(!columns.length || columns.length>MAX_COLS || new Set(columns).size!==columns.length || columns.some(name=>!source.columns.some(c=>c.name===name)))throw new Error('Choose between 1 and 100 unique columns.');
  const count=Math.max(1,Math.ceil(records.length/(MAX_ROWS-1)));
  if(existingNames.length+count>30)throw new Error('These records exceed the available sheet capacity. Load into a new workbook or narrow the data in the source.');
  const names=new Set(existingNames.map(name=>name.toLowerCase()));
  const loadedAt=new Date().toISOString();
  return Array.from({length:count},(_,page)=>{
    const base=source.name.replace(/[\\/?*\[\]:]/g,' ').trim().slice(0,25) || 'Database';
    let name=base, suffix=1;
    while(names.has(name.toLowerCase()))name=`${base} ${suffix++}`;
    names.add(name.toLowerCase());
    const rows=records.slice(page*(MAX_ROWS-1),(page+1)*(MAX_ROWS-1));
    const sheet=makeSheet(name,columns);
    sheet.cells=[columns, ...rows.map(record=>columns.map(column=>{
      const value=record[column];
      if(value===null || value===undefined)return '';
      if(!['string','number','boolean'].includes(typeof value))throw new Error(`Column ${column} contains nested data and cannot be loaded as a flat cell.`);
      const text=String(value);if(text.length>32767)throw new Error(`A value in ${column} exceeds the cell size limit.`);return text;
    }))];
    sheet.widths=columns.map(()=>160);sheet.heights=sheet.cells.map(()=>34);sheet.formats={};
    columns.forEach((column,c)=>{
      const definition=source.columns.find(item=>item.name===column)!;
      const dataType:CellFormat['dataType']=definition.format==='date'?'date':definition.format==='time'?'time':['integer','number'].includes(definition.type)?'number':'text';
      // Offset-aware timestamps remain exact text; never silently discard timezone information.
      for(let r=1;r<sheet.cells.length;r++)sheet.formats![`${r}:${c}`]={dataType};
    });
    sheet.databaseSource={path:source.id,loadedAt,columns:[...columns],part:page+1,parts:count,mode:'update',baseline:Object.fromEntries(rows.filter(row=>row.id!=null).map(row=>[String(row.id),Object.fromEntries(columns.map(column=>[column,row[column]??null]))]))};
    return sheet;
  });
}
export async function loadDatabaseRecords(source:DatabaseSource, capacity:number, fetchPage:(path:string)=>Promise<unknown>):Promise<Record<string,unknown>[]> {
  if(!source.id.startsWith('/api/v1/') || /[?#]/.test(source.id))throw new Error('Invalid database source.');
  const rows:Record<string,unknown>[]=[];
  const seen=new Set<string>();
  let expectedTotal:number | undefined;
  for(let page=1;page<=Math.ceil(capacity/100)+1;page++) {
    const result:any=await fetchPage(source.pagination==='page'?`${source.id}?page=${page}&page_size=100`:source.id);
    const items=source.pagination==='page'?result?.items:result;
    if(!Array.isArray(items) || items.some(item=>!item || typeof item!=='object' || Array.isArray(item)))throw new Error('The source returned an unsupported record format.');
    if(source.pagination==='page' && (!Number.isInteger(result.total) || result.total<0))throw new Error('The source returned an invalid total.');
    if(source.pagination==='page'){if(expectedTotal!==undefined && expectedTotal!==result.total)throw new Error('The record count changed during loading. Please retry.');expectedTotal=result.total;}
    if((source.pagination==='page' && result.total>capacity) || rows.length+items.length>capacity)throw new Error('Too many records for this workbook. Use a new workbook or narrow the data in the source. No partial sheet was added.');
    for(const item of items) {
      if(item.id!==undefined){const id=String(item.id);if(seen.has(id))throw new Error('Records changed during loading. Please retry to avoid duplicate or missing rows.');seen.add(id);}
      rows.push(item);
    }
    if(source.pagination==='none' || rows.length>=result.total)return rows;
    if(!items.length)throw new Error('The source ended before all records arrived. Please retry.');
  }
  throw new Error('Could not finish loading the database records. No partial sheet was added.');
}
