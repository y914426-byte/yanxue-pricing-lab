import {env} from 'cloudflare:workers';
export function getDb(){if(!env.DB)throw new Error('云端数据库暂不可用');return env.DB;}
