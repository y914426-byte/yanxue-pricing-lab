'use client';
import {useEffect,useState} from 'react';
import {Button} from '@/components/ui/button';
export default function ImportPage(){
 const [info,setInfo]=useState<{google:string;legacy:string|null;count:number;verifyLegacy:string}|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[done,setDone]=useState(false);
 async function load(){setError('');try{const r=await fetch('/api/account/import',{cache:'no-store'});const data=await r.json() as {google:string;legacy:string|null;count:number;verifyLegacy:string;error?:string};if(!r.ok)throw new Error(data.error);setInfo(data);}catch(e){setError(e instanceof Error?e.message:'读取失败，请重试');}}
 useEffect(()=>{void load();},[]);
 async function transfer(){setBusy(true);setError('');try{const r=await fetch('/api/account/import',{method:'POST'});const data=await r.json() as {error?:string};if(!r.ok)throw new Error(data.error);setDone(true);}catch(e){setError(e instanceof Error?e.message:'导入失败，请重试');}finally{setBusy(false);}}
 return <main className="panel migration-page"><a href="/">← 返回成本测算</a><h1>导入旧版项目记录</h1><p>以前通过 ChatGPT 账号保存的项目可以转入你的 Google 账号。需要验证原账号，确认后，旧记录将归当前 Google 账号所有。</p>{error&&<div className="error-box" role="alert">{error}<Button variant="outline" onClick={load}>重试</Button></div>}{done?<p role="status">导入完成。回到首页后，使用 Google 账号即可查询这些项目。</p>:info?<><div className="migration-accounts"><p>接收记录的 Google 账号：<strong>{info.google}</strong></p>{info.legacy&&<><p>已验证的原账号：<strong>{info.legacy}</strong></p><p>待导入记录：<strong>{info.count} 条</strong></p></>}</div><div className="migration-actions">{info.legacy?<Button disabled={busy||info.count===0} onClick={transfer}>{busy?'正在导入…':'确认转入这个 Google 账号'}</Button>:<a href={info.verifyLegacy} target="_top">验证原账号以读取旧记录</a>}<a href="/">返回首页</a></div>{info.legacy&&info.count===0&&<p>原账号没有待导入记录，可能已完成导入。</p>}</>:!error&&<p role="status">正在读取账号信息…</p>}</main>;
}
