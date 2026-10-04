'use client';

import {useEffect,useMemo,useState} from 'react';

type M={name:string;qty:string;note:string;done:boolean};
type E={id:string;date:string;name:string;audience:string;people:number;place:string;status:string;materials:M[]};

type Item={name:string;unit:string;total:number;raw:string[];events:{date:string;name:string;qty:string;done:boolean}[]};

function parseQty(q:string){
 const s=String(q||'').trim();
 const m=s.match(/([0-9]+(?:\.[0-9]+)?)\s*(.*)$/);
 return m?{num:Number(m[1]),unit:m[2]||''}:{num:0,unit:''};
}

export default function Materials(){
 const [events,setEvents]=useState<E[]>([]);
 const [month,setMonth]=useState(new Date().toISOString().slice(0,7));
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const load=async()=>{try{setLoading(true);const r=await fetch('/api/learning-calendar',{cache:'no-store'});const d=await r.json();if(!r.ok)throw Error(d.error||'读取失败');setEvents(d.events||[])}catch(e){setError(e instanceof Error?e.message:'读取失败')}finally{setLoading(false)}};
 useEffect(()=>{load()},[]);
 const list=useMemo(()=>events.filter(e=>e.date.startsWith(month)),[events,month]);
 const items=useMemo(()=>{const map=new Map<string,Item>();for(const e of list)for(const m of e.materials||[]){const name=String(m.name||'').trim();if(!name)continue;const q=parseQty(m.qty);const old=map.get(name)||{name,unit:q.unit,total:0,raw:[],events:[]};if(q.unit&&!old.unit)old.unit=q.unit;old.total+=q.num;old.raw.push(m.qty);old.events.push({date:e.date,name:e.name,qty:m.qty,done:!!m.done});map.set(name,old)}return [...map.values()].sort((a,b)=>b.total-a.total||a.name.localeCompare(b.name,'zh-CN'))},[list]);
 const pending=items.filter(x=>x.events.some(e=>!e.done)).length,done=items.filter(x=>x.events.length>0&&x.events.every(e=>e.done)).length;
 const shift=(n:number)=>{const [y,m]=month.split('-').map(Number);const d=new Date(y,m-1+n,1);setMonth(d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'))};
 return <main className="materials"><nav><a href="/yanxue-calendar">← 活动日历</a><b>研学运营中心</b><a href="/yanxue-calendar/materials">物资中心</a><a href="/scheme-import">方案导入</a><a href="/">定价台</a></nav><style>{css}</style>
  <header><small>YANXUE OPERATIONS · MATERIALS</small><h1>物资中心</h1><p>按月自动汇总研学活动物资，方便备货、采购和现场核对。</p></header>
  {error&&<div className="error">{error}</div>}
  <div className="toolbar"><button onClick={()=>shift(-1)}>‹</button><strong>{month.replace('-', '年')}月</strong><button onClick={()=>shift(1)}>›</button><button onClick={()=>setMonth(new Date().toISOString().slice(0,7))}>本月</button><span>{list.length} 场活动 · {items.length} 项物资</span></div>
  <section className="stats"><article><small>物资种类</small><strong>{items.length}<i>项</i></strong></article><article><small>待准备</small><strong>{pending}<i>项</i></strong></article><article><small>已准备</small><strong>{done}<i>项</i></strong></article><article><small>参与人数</small><strong>{list.reduce((s,e)=>s+Number(e.people||0),0)}<i>人</i></strong></article></section>
  {loading?<div className="empty">正在读取物资清单…</div>:items.length===0?<div className="empty">本月活动暂未填写物资。</div>:<section className="table"><div className="thead"><b>物资</b><b>合计</b><b>使用活动</b><b>准备状态</b></div>{items.map(x=><article className="item" key={x.name}><div><strong>{x.name}</strong>{x.unit&&<small>单位：{x.unit}</small>}</div><strong className="total">{x.total?x.total+(x.unit?' '+x.unit:''):x.raw.join('、')}</strong><div className="uses">{x.events.map((e,i)=><span key={i}>{e.date.slice(5)} · {e.name} · {e.qty}</span>)}</div><div className="status">{x.events.every(e=>e.done)?<em className="ready">已准备</em>:<em>待准备</em>}</div></article>)}</section>}
  <p className="tip">数据直接来自“活动日历”的物资清单；修改活动物资后，这里会自动更新。</p>
 </main>
}
const css=`*{box-sizing:border-box}.materials{min-height:100vh;background:#f7f5ef;color:#29372e;padding:26px 32px;max-width:1240px;margin:auto;font-family:system-ui,-apple-system,BlinkMacSystemFont,'PingFang SC',sans-serif}nav{display:flex;gap:18px;align-items:center;margin-bottom:34px;font-size:13px;white-space:nowrap;overflow:auto}nav a{color:#667268;text-decoration:none}nav b{color:#315c45}header{margin-bottom:24px}header small{letter-spacing:1.5px;color:#8b9388}h1{font-size:36px;margin:7px 0}header p{color:#758075}.toolbar{display:flex;align-items:center;gap:10px;margin:18px 0}.toolbar button{border:1px solid #ddd8cc;background:#fff;border-radius:9px;padding:8px 12px;cursor:pointer}.toolbar strong{font-size:21px}.toolbar span{margin-left:auto;color:#7b8479}.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:18px}.stats article{background:#fff;border:1px solid #e4dfd5;border-radius:13px;padding:15px 17px}.stats small{display:block;color:#7b8479}.stats strong{display:block;font-size:27px;margin-top:7px}.stats i{font-size:12px;font-style:normal;font-weight:500;margin-left:4px;color:#7b8479}.table{background:#fff;border:1px solid #e3dfd5;border-radius:14px;overflow:hidden}.thead,.item{display:grid;grid-template-columns:1.2fr .8fr 2.4fr .7fr;gap:15px;align-items:center;padding:14px 16px}.thead{background:#f0eee7;color:#707970;font-size:12px}.item{border-top:1px solid #eee9df}.item>div:first-child strong,.item>div:first-child small{display:block}.item>div:first-child small{font-size:11px;color:#899187;margin-top:3px}.total{font-size:18px}.uses{display:flex;flex-wrap:wrap;gap:5px}.uses span{font-size:11px;background:#f7f5ef;border-radius:6px;padding:5px 7px;color:#667268}.status em{font-style:normal;font-size:11px;border-radius:999px;padding:5px 8px;background:#f7f1df;color:#806c31}.status .ready{background:#edf4ed;color:#315c45}.empty{background:#fff;border:1px dashed #d9d4c9;border-radius:12px;padding:28px;text-align:center;color:#7b8479}.tip{color:#899187;font-size:12px;margin-top:12px}.error{padding:10px 13px;background:#fff0ed;color:#a33b2c;border-radius:10px;margin-bottom:12px}@media(max-width:800px){.materials{padding:18px}.stats{grid-template-columns:repeat(2,1fr)}.table{overflow:auto}.thead,.item{min-width:900px}.toolbar span{display:none}h1{font-size:30px}}`;
