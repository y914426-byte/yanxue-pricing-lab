import {parseEstimate} from './estimate-input';
import {calculate} from './pricing';

export function exportEstimate(saved:{id:string;title:string;createdAt:string;plan:unknown}){
 const value=parseEstimate(saved);
 const filename=(value.title.replace(/[<>:"/\\|?*\u0000-\u001f]/g,'_').replace(/[. ]+$/g,'')||'历史估算').slice(0,80)+'-估算.json';
 return {filename,content:JSON.stringify({format:'yanxue-estimate',version:1,...value,createdAt:saved.createdAt,summary:calculate(value.plan)},null,2)};
}
