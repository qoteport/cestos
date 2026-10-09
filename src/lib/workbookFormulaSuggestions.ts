export const workbookFunctions = [
  {name:'SUM', example:'=SUM(A2:A10)', description:'Add numbers in a range.'},
  {name:'AVERAGE', example:'=AVERAGE(A2:A10)', description:'Calculate the average of numbers.'},
  {name:'HOURS', example:'=HOURS(B2,C2)', description:'Hours between start and end times, including overnight.'},
  {name:'COUNT', example:'=COUNT(A2:A10)', description:'Count numeric values in a range.'},
  {name:'MIN', example:'=MIN(A2:A10)', description:'Find the smallest number.'},
  {name:'MAX', example:'=MAX(A2:A10)', description:'Find the largest number.'},
  {name:'MOD', example:'=MOD(A2,24)', description:'Return the remainder after division.'},
];
export function formulaCompletion(value:string,caret:number) {
  if(!value.startsWith('='))return null;
  const before=value.slice(0,caret);
  const match=/(?:^=|[=+*/^(,\-])\s*([A-Za-z]*)$/.exec(before);
  if(!match)return null;
  const prefix=match[1].toUpperCase();
  const items=workbookFunctions.filter(item=>item.name.startsWith(prefix));
  if(!items.length)return null;
  return {items,start:caret-match[1].length,end:caret+(value.slice(caret).match(/^[A-Za-z]*/)?.[0].length || 0)};
}
export function insertFormulaFunction(value:string,caret:number,name:string) {
  const completion=formulaCompletion(value,caret);
  if(!completion)return {value,caret};
  const suffix=value.slice(completion.end);
  const insert=name+(suffix.startsWith('(')?'':'(');
  return {value:value.slice(0,completion.start)+insert+suffix,caret:completion.start+name.length+1};
}
