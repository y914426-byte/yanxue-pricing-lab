import {validate,type Plan,type PriceOrigin} from './pricing';
import {validDate} from './price-data';
function priceOrigin(value:unknown):PriceOrigin|undefined{
 if(value===undefined)return undefined;
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('价格来源格式无效');
 const v=value as Record<string,unknown>;
 for(const [key,max] of [['catalogId',100],['catalogName',80],['itemId',100],['projectName',80],['travelDate',10],['adoptedAt',30]] as const)if(typeof v[key]!=='string'||v[key].length>max)throw new Error('价格来源字段无效');
 if(!v.catalogId||!v.catalogName||!v.itemId||(v.source!=='system'&&v.source!=='user')||typeof v.version!=='number'||!Number.isSafeInteger(v.version)||v.version<1||typeof v.unitPrice!=='number'||!Number.isFinite(v.unitPrice)||v.unitPrice<0||v.unitPrice>10000000||!Number.isFinite(Date.parse(v.adoptedAt as string))||(v.travelDate&&!validDate(v.travelDate as string)))throw new Error('价格来源字段无效');
 return {catalogId:v.catalogId as string,catalogName:v.catalogName as string,itemId:v.itemId as string,source:v.source,version:v.version,unitPrice:v.unitPrice,adoptedAt:v.adoptedAt as string,projectName:v.projectName as string,travelDate:v.travelDate as string};
}
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
 if(!c||typeof c!=='object'||typeof c.id!=='string'||!c.id||c.id.length>100||ids.has(c.id)||typeof c.name!=='string'||c.name.length>60||typeof c.actualOnly!=='boolean'||!['fixed','person','batch','adult','child','family'].includes(c.mode)||['amount','quantity','capacity'].some(k=>typeof c[k]!=='number'||!Number.isFinite(c[k])))throw new Error('成本明细格式无效');
 ids.add(c.id);
 }
 const plan:Plan={paying:p.paying as number,free:p.free as number,price:p.price as number,tax:p.tax as number,target:p.target as number,costs:p.costs.map(c=>({id:c.id,name:c.name,mode:c.mode,amount:c.amount,quantity:c.quantity,capacity:c.capacity,actualOnly:c.actualOnly,...(c.priceOrigin!==undefined?{priceOrigin:priceOrigin(c.priceOrigin)}:{})}))};
 for(const [key,max] of [['priceProject',80],['priceCatalogId',100],['travelDate',10]] as const)if(p[key]!==undefined){if(typeof p[key]!=='string'||p[key].length>max||(key==='travelDate'&&p[key]&&!validDate(p[key])))throw new Error('价格匹配条件无效');plan[key]=p[key];}
 if(p.priceSource!==undefined){if(p.priceSource!=='system'&&p.priceSource!=='user')throw new Error('价格来源无效');plan.priceSource=p.priceSource;}
 if(p.groupType!==undefined){if(typeof p.groupType!=='string'||!['student','family','senior','adult','company','custom'].includes(p.groupType))throw new Error('团体类型无效');plan.groupType=p.groupType as Plan['groupType'];}
 for(const key of ['billing','adultsPerFamily','childrenPerFamily','commission','reserve'] as const){if(p[key]!==undefined){if(key==='billing'){if(p[key]!=='person'&&p[key]!=='family')throw new Error('收费模式无效');plan.billing=p[key];}else{if(typeof p[key]!=='number'||!Number.isFinite(p[key]))throw new Error('亲子团或附加费参数无效');plan[key]=p[key];}}}
 const errors=validate(plan);if(errors.length)throw new Error(errors.join('；'));
 return {id:v.id,title:v.title.trim(),plan};
}
