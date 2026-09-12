import {parseEstimate} from './estimate-input';
import {calculate,breakEven} from './pricing';
import type {Cell,SheetData} from 'write-excel-file/universal';

const number=(value:number|null,format='#,##0.00'):Cell=>value===null?{type:String,value:'—'}:{type:Number,value,format};
const text=(value:string):Cell=>({type:String,value,wrap:true});
const header=(labels:string[])=>labels.map(value=>({type:String,value,fontWeight:'bold' as const,backgroundColor:'#244BC5',textColor:'#FFFFFF',height:28,wrap:true}));
const groups={student:'学生团',family:'亲子团',senior:'长者团',adult:'成人团',company:'企业团',custom:'自定义'};
const modes={fixed:'固定数量',person:'按参与人数',batch:'按批次',adult:'按成人',child:'按儿童',family:'按家庭'};

// Export the saved estimate as a readable snapshot, with numeric Excel cells.
export async function exportEstimate(saved:{id:string;title:string;createdAt:string;plan:unknown}){
 const value=parseEstimate(saved),p=value.plan,r=calculate(p);
 const overview:SheetData=[
  header(['项目估算','数值 / 内容']),
  [text('项目名称'),text(value.title)],
  [text('记录编号'),text(value.id)],
  [text('保存时间（UTC）'),text(saved.createdAt)],
  [text('导出说明'),text('云端已保存估算快照；金额单位为元，未保存的页面修改不包含在内。')],
  header(['测算结果','数值']),
  ['总收入',number(r.revenue)],['实际成本',number(r.actual)],['实际毛利',number(r.profit)],['实际毛利率',number(r.margin,'0.00%')],
  ['财务成本',number(r.financial)],['财务毛利',number(r.financialProfit)],['财务毛利率',number(r.financialMargin,'0.00%')],
  ['成本明细小计',number(r.subtotal)],['成本预备金',number(r.reserveCost)],['税费',number(r.taxCost)],['渠道佣金',number(r.commissionCost)],['仅计实际成本',number(r.extra)],
  ['单位实际成本',number(r.perPerson)],['保本售价',number(r.breakPrice)],['目标售价',number(r.targetPrice)],['首次保本收费数量',number(breakEven(p),'0')],
  header(['项目参数','数值 / 内容']),
  ['团体类型',groups[p.groupType??'student']],['收费模式',p.billing==='family'?'按家庭（组）':'按人'],
  ['收费数量',number(p.paying,'0')],['免费随行人数',number(p.free,'0')],['售价',number(p.price)],
  ['税费比例',number(p.tax/100,'0.00%')],['目标毛利率',number(p.target/100,'0.00%')],['渠道佣金比例',number((p.commission??0)/100,'0.00%')],['预备金比例',number((p.reserve??0)/100,'0.00%')],
  ['每组成人',p.billing==='family'?number(p.adultsPerFamily??1,'0'):'不适用'],['每组儿童',p.billing==='family'?number(p.childrenPerFamily??1,'0'):'不适用'],
  ['参与人数',number(r.attendees,'0')],['成人数',number(r.adults,'0')],['儿童数',number(r.children,'0')],['家庭组数',number(r.families,'0')],
  ['价格匹配项目',text(p.priceProject??'')],['出行日期',text(p.travelDate??'')],['价格来源',p.priceSource==='system'?'系统':p.priceSource==='user'?'个人':'未指定'],['价格库编号',text(p.priceCatalogId??'')]
 ];
 const details:SheetData=[header(['成本项目','计费方式','单价（元）','固定数量','每批容量','合计（元）','仅计实际成本','项目编号','来源价格库','来源类型','来源单价','来源版本','采用时间','来源项目','来源出行日期','来源价格库编号','来源条目编号']),
  ...r.items.map(c=>[text(c.name),modes[c.mode],number(c.amount),number(c.quantity,'0.##'),number(c.capacity,'0'),number(c.total),c.actualOnly?'是':'否',text(c.id),text(c.priceOrigin?.catalogName??''),c.priceOrigin?(c.priceOrigin.source==='system'?'系统':'个人'):'',c.priceOrigin?number(c.priceOrigin.unitPrice):null,c.priceOrigin?number(c.priceOrigin.version,'0'):null,text(c.priceOrigin?.adoptedAt??''),text(c.priceOrigin?.projectName??''),text(c.priceOrigin?.travelDate??''),text(c.priceOrigin?.catalogId??''),text(c.priceOrigin?.itemId??'')]),
  [text('成本明细小计'),null,null,null,null,number(r.subtotal)]
 ];
 const {default:writeExcelFile}=await import('write-excel-file/universal');
 const content=await writeExcelFile([
  {sheet:'估算概览',data:overview,columns:[{width:28},{width:72}],showGridLines:false},
  {sheet:'成本明细',data:details,columns:[32,20,18,14,14,18,20,22,28,16,18,14,28,28,20,36,36].map(width=>({width})),showGridLines:false}
 ],{fontFamily:'Microsoft YaHei',fontSize:11}).toBlob();
 const filename=(value.title.replace(/[<>:"/\\|?*\u0000-\u001f]/g,'_').replace(/[. ]+$/g,'')||'历史估算').slice(0,80)+'-估算.xlsx';
 return {filename,content};
}
