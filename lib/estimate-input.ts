import {validate,type Plan} from './pricing';
export function parseEstimate(input:unknown):{id:string;title:string;plan:Plan}{
 if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('估算格式无效');
 const v=input as Record<string,unknown>;
 if(typeof v.id!=='string'||! /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v.id))throw new Error('记录编号无效');
 if(typeof v.title!=='string'||!v.title.trim()||v.title.trim().length>80)throw new Error('请填写 1–80 字的项目主题名称');
 if(!v.plan||typeof v.plan!=='object'||Array.isArray(v.plan))throw new Error('成本参数无效');
 const p=v.plan as Record<string,unknown>;
 if(['paying','free','price','tax','target'].some(k=>typeof p[k]!=='number'||!Number.isFinite(p[k])))throw new Error('请补全有效的项目参数');
 if(!Array.isArray(p.costs)||p.costs.length>100)throw new Error('成本明细最多 100 项');
 const ids=new Set<string>();
 for(const c of p.costs){
 if(!c||typeof c!=='object'||typeof c.id!=='string'||!c.id||c.id.length>100||ids.has(c.id)||typeof c.name!=='string'||c.name.length>60||typeof c.actualOnly!=='boolean'||!['fixed','person','batch'].includes(c.mode)||['amount','quantity','capacity'].some(k=>typeof c[k]!=='number'||!Number.isFinite(c[k])))throw new Error('成本明细格式无效');
 ids.add(c.id);
 }
 const plan:Plan={paying:p.paying as number,free:p.free as number,price:p.price as number,tax:p.tax as number,target:p.target as number,costs:p.costs.map(c=>({id:c.id,name:c.name,mode:c.mode,amount:c.amount,quantity:c.quantity,capacity:c.capacity,actualOnly:c.actualOnly}))};
 const errors=validate(plan);if(errors.length)throw new Error(errors.join('；'));
 return {id:v.id,title:v.title.trim(),plan};
}
