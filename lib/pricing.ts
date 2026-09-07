export type Cost = { id:string; name:string; mode:'fixed'|'person'|'batch'; amount:number; quantity:number; capacity:number; actualOnly:boolean };
export type Plan = {paying:number; free:number; price:number; tax:number; target:number; costs:Cost[]};
export const demo:Plan={paying:40,free:2,price:298,tax:0,target:25,costs:[
{id:'1',name:'课程与场地',mode:'fixed',amount:1600,quantity:1,capacity:1,actualOnly:false},
{id:'2',name:'往返大巴',mode:'batch',amount:1200,quantity:1,capacity:50,actualOnly:false},
{id:'3',name:'研学材料包',mode:'person',amount:38,quantity:1,capacity:1,actualOnly:false},
{id:'4',name:'餐饮与饮水',mode:'person',amount:45,quantity:1,capacity:1,actualOnly:false},
{id:'5',name:'活动保险',mode:'person',amount:5,quantity:1,capacity:1,actualOnly:false},
{id:'6',name:'带班老师',mode:'batch',amount:400,quantity:1,capacity:25,actualOnly:true},
{id:'7',name:'活动执行',mode:'fixed',amount:500,quantity:1,capacity:1,actualOnly:true}
]};
export function validate(p:Plan){
const errors:string[]=[];
for(const [name,n] of [['收费人数',p.paying],['免费随行人数',p.free]] as const) if(!Number.isInteger(n)||n<0||n>10000)errors.push(name+'须为 0–10,000 的整数');
if(!Number.isFinite(p.price)||p.price<0||p.price>1000000)errors.push('售价须为 0–1,000,000 元');
for(const [name,n] of [['税费比例',p.tax],['目标毛利率',p.target]] as const)if(!Number.isFinite(n)||n<0||n>100)errors.push(name+'须为 0–100%');
if(p.costs.length>100)errors.push('成本项目最多 100 项');
p.costs.forEach((c,i)=>{const label=c.name||'第 '+(i+1)+' 项成本';
if(!Number.isFinite(c.amount)||c.amount<0||c.amount>10000000)errors.push(label+'：单价须为 0–10,000,000 元');
if(!['fixed','person','batch'].includes(c.mode))errors.push(label+'：计费方式无效');
if(c.mode==='fixed'&&(!Number.isFinite(c.quantity)||c.quantity<0||c.quantity>10000))errors.push(label+'：数量须为 0–10,000');
if(c.mode==='batch'&&(!Number.isInteger(c.capacity)||c.capacity<1||c.capacity>20000))errors.push(label+'：每组人数须为 1–20,000 的整数');
});return errors;
}
export function costTotal(c:Cost,attendees:number){return c.amount*(c.mode==='person'?attendees:c.mode==='batch'?Math.ceil(attendees/c.capacity):c.quantity);}
export function calculate(p:Plan,paying=p.paying,price=p.price){
const attendees=paying+p.free;
const items=p.costs.map(c=>({...c,total:costTotal(c,attendees)}));
const base=items.reduce((s,c)=>s+c.total,0),revenue=paying*price,taxCost=revenue*p.tax/100,actual=base+taxCost;
const extra=items.filter(c=>c.actualOnly).reduce((s,c)=>s+c.total,0),financial=actual-extra,profit=revenue-actual;
return {attendees,items,base,revenue,taxCost,actual,extra,financial,profit,
margin:revenue>0?profit/revenue:null,financialProfit:revenue-financial,
financialMargin:revenue>0?(revenue-financial)/revenue:null,
breakPrice:paying>0&&p.tax<100?base/(paying*(1-p.tax/100)):null,
targetPrice:paying>0&&p.tax+p.target<100?base/(paying*(1-(p.tax+p.target)/100)):null,
perPerson:paying>0?actual/paying:null};
}
export function breakEven(p:Plan){for(let n=1;n<=10000;n++){const r=calculate(p,n);if(r.revenue>0&&r.profit>=-1e-7)return n;}return null;}
export const money=(n:number|null)=>n===null||!Number.isFinite(n)?'—':new Intl.NumberFormat('zh-CN',{maximumFractionDigits:2,minimumFractionDigits:2}).format(n);
export const pct=(n:number|null)=>n===null?'—':(n*100).toFixed(1)+'%';
