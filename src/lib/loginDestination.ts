// Only explicitly supported local destinations may override the account portal.
export function loginDestination(search:string,fallback:string):string {
 return new URLSearchParams(search).get('next')==='/workbooks'?'/workbooks':fallback;
}
export function loginPageFor(pathname:string):string {
 return pathname==='/workbooks'?'/sign-up-login?next=/workbooks':'/sign-up-login';
}
