import {cpSync,mkdirSync,readdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
const root=resolve(import.meta.dirname,'..');
const client=join(root,'dist/client'), server=join(root,'dist/server');
const worker=join(client,'_worker.js');
const files=[];
function scan(dir,prefix=''){for(const e of readdirSync(dir,{withFileTypes:true})){if(e.name.startsWith('.')||e.name==='_worker.js'||e.name==='_headers'||e.name==='_redirects')continue;const rel=prefix+'/'+e.name;if(e.isDirectory())scan(join(dir,e.name),rel);else files.push(rel);}}
scan(client);
mkdirSync(worker,{recursive:true});
cpSync(server,join(worker,'server'),{recursive:true,filter:src=>!src.endsWith('.map')&&!src.endsWith('wrangler.json')&&!src.split(/[\\/]/).includes('.vite')});
writeFileSync(join(worker,'index.js'),`import app from './server/index.js';
const assets=new Set(${JSON.stringify(files)});
export default {async fetch(request,env,ctx){
 const path=new URL(request.url).pathname;
 // Direct Pages has no trusted Sites identity proxy. Never trust visitor-supplied identity headers.
 const headers=new Headers(request.headers);
 for(const key of [...headers.keys()])if(key.startsWith('oai-'))headers.delete(key);
 const clean=new Request(request,{headers});
 if(path==='/api/account/import')return Response.json({error:'旧版项目迁移请在原 Sites 网站完成。此站不接受外部身份头。'},{status:403,headers:{'Cache-Control':'no-store'}});
 if(assets.has(path))return env.ASSETS.fetch(clean);
 return app.fetch(clean,env,ctx);
}};
`);
writeFileSync(join(client,'_routes.json'),JSON.stringify({version:1,include:['/*'],exclude:['/_next/static/*','/favicon.ico']}));
console.log('Pages server bundle prepared.');
