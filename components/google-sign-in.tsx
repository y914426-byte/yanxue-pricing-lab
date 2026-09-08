'use client';
import {useEffect,useRef,useState} from 'react';
import {Button} from '@/components/ui/button';
type GoogleIdentity={initialize:(options:{client_id:string;nonce:string;callback:(response:{credential:string})=>void;auto_select:boolean})=>void;renderButton:(element:HTMLElement,options:{type:string;theme:string;size:string;text:string;shape:string;width:number;locale:string})=>void};
type GoogleWindow=Window&{google?:{accounts:{id:GoogleIdentity}}};
let scriptPromise:Promise<void>|null=null;
function loadGoogle(){if((window as GoogleWindow).google?.accounts.id)return Promise.resolve();if(scriptPromise)return scriptPromise;
 scriptPromise=new Promise<void>((resolve,reject)=>{const script=document.createElement('script');script.src='https://accounts.google.com/gsi/client?hl=zh-CN';script.async=true;const timer=setTimeout(()=>{script.remove();scriptPromise=null;reject(new Error('Google 登录加载超时，请检查网络后重试'));},15000);script.onload=()=>{clearTimeout(timer);resolve();};script.onerror=()=>{clearTimeout(timer);script.remove();scriptPromise=null;reject(new Error('暂时无法连接 Google，请检查网络后重试'));};document.head.appendChild(script);});return scriptPromise;
}
export function GoogleSignIn({clientId,onSuccess}:{clientId:string;onSuccess:()=>void}){
 const holder=useRef<HTMLDivElement>(null),success=useRef(onSuccess);success.current=onSuccess;
 const [error,setError]=useState(''),[busy,setBusy]=useState(false),[ready,setReady]=useState(false),[attempt,setAttempt]=useState(0);
 useEffect(()=>{let active=true;const controller=new AbortController();setReady(false);setError('');
 async function setup(){try{await loadGoogle();if(!active)return;const response=await fetch('/api/auth/google/challenge',{method:'POST',signal:controller.signal,cache:'no-store'});const value=await response.json() as {nonce:string;error?:string};if(!response.ok)throw new Error(value.error||'无法开始登录');if(!active||!holder.current)return;const google=(window as GoogleWindow).google?.accounts.id;if(!google)throw new Error('Google 登录尚未就绪');google.initialize({client_id:clientId,nonce:value.nonce,auto_select:false,callback:async({credential})=>{if(!active)return;setBusy(true);setError('');try{const r=await fetch('/api/auth/google',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({credential})});const data=await r.json() as {error?:string};if(!r.ok)throw new Error(data.error||'登录失败，请重试');if(active)success.current();}catch(e){if(active)setError(e instanceof Error?e.message:'登录失败，请重试');}finally{if(active)setBusy(false);}}});holder.current.replaceChildren();google.renderButton(holder.current,{type:'standard',theme:'outline',size:'large',text:'signin_with',shape:'rectangular',width:230,locale:'zh_CN'});setReady(true);}catch(e){if(active)setError(e instanceof Error?e.message:'登录加载失败');}}
 void setup();return()=>{active=false;controller.abort();};},[clientId,attempt]);
 return <div className="google-signin"><div ref={holder} hidden={busy||!!error} aria-label="使用 Google 登录"/>{!ready&&!error&&<span role="status">正在加载 Google 登录…</span>}{busy&&<span role="status">正在验证 Google 账号…</span>}{error&&<div role="alert"><p>{error}</p><Button variant="outline" size="sm" onClick={()=>setAttempt(v=>v+1)}>重试登录</Button></div>}</div>;
}
