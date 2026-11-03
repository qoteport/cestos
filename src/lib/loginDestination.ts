// Only supported local destinations may override the account portal.
function safeDestination(value:string|null):string|null {
 if(value==='/workbooks')return value;
 if(!value||!/^\/dashboards(?:\?|$)/.test(value)||/[\\#\r\n]/.test(value))return null;
 const query=new URLSearchParams(value.split('?')[1]||'');const id=query.get('dashboard'),tab=query.get('tab');
 if(id&&!/^[0-9a-f-]{36}$/i.test(id))return null;
 if(tab&&tab.length>100)return null;
 const clean=new URLSearchParams();if(id)clean.set('dashboard',id);if(tab)clean.set('tab',tab);
 return '/dashboards'+(clean.toString()?'?'+clean.toString():'');
}
export function loginDestination(search:string,fallback:string):string {return safeDestination(new URLSearchParams(search).get('next'))||fallback;}
export function loginPageFor(pathname:string):string {const dest=safeDestination(pathname);return dest==='/workbooks'?'/sign-up-login?next=/workbooks':dest?'/sign-up-login?next='+encodeURIComponent(dest):'/sign-up-login';}
