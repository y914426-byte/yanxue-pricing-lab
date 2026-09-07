import {fileURLToPath} from 'node:url';
const cli=new URL('./cli.js',import.meta.resolve('vinext')); 
// Vinext exits immediately after closing its prerender server. Allow Windows
// native handles to finish closing; preserve every nonzero failure exit.
if(process.platform==='win32'){
 const exit=process.exit.bind(process);
 process.exit=(code=0)=>{
  if(Number(code)!==0)return exit(code);
  process.exitCode=0;
  setTimeout(()=>exit(process.exitCode??0),2000).unref();
 };
}
process.argv=[process.execPath,fileURLToPath(cli),'build',...process.argv.slice(2)];
await import(cli.href);
