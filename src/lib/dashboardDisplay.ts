export const DATE_FORMATS=[['auto','Original'],['dmy','DD/MM/YYYY'],['mdy','MM/DD/YYYY'],['iso','YYYY-MM-DD'],['short','D MMM YYYY'],['long','D MMMM YYYY'],['month','MMM YYYY']] as const;
export type VisualDateFormat=typeof DATE_FORMATS[number][0];
/** Preserve source calendar dates and grouped month/year precision; never shift time zones. */
export function visualDate(value:unknown,format:VisualDateFormat='auto'){
 const text=String(value??'');if(format==='auto')return text;
 const match=/^(\d{4})-(\d{2})(?:-(\d{2})(?:$|[T ].*))?$/.exec(text);
 if(!match)return text;
 const [,year,month,day]=match,m=Number(month),d=Number(day||1);
 const date=new Date(`${year}-${month}-${day||'01'}T00:00:00Z`);
 if(m<1||m>12||!Number.isFinite(date.getTime())||date.getUTCDate()!==d)return text;
 const short=new Intl.DateTimeFormat('en',{month:'short',timeZone:'UTC'}).format(date);
 if(format==='iso')return day?`${year}-${month}-${day}`:`${year}-${month}`;
 if(!day||format==='month')return `${short} ${year}`;
 if(format==='dmy')return `${day}/${month}/${year}`;
 if(format==='mdy')return `${month}/${day}/${year}`;
 const name=format==='long'?new Intl.DateTimeFormat('en',{month:'long',timeZone:'UTC'}).format(date):short;
 return `${d} ${name} ${year}`;
}
export function tooltipNumber(value:unknown,decimals?:number,prefix='',suffix=''){
 if(typeof value!=='number'||!Number.isFinite(value))return '—';
 return prefix+value.toLocaleString(undefined,decimals==null?{maximumFractionDigits:2}:{minimumFractionDigits:decimals,maximumFractionDigits:decimals})+suffix;
}
