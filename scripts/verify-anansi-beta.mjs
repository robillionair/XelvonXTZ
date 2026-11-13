import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
const base='http://127.0.0.1:4182';
const evidence={at:new Date().toISOString(),base,checks:[]};
const check=(name,ok)=>{assert.ok(ok,name);evidence.checks.push(name);};
const post=(value,origin=base)=>fetch(base+'/api/anansi/register',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(value)});
if(process.argv.includes('--resume')){
 const {download}=JSON.parse(await readFile('.wrangler/anansi-qa-token.json','utf8'));
 const result=await fetch(base+download);check('Capability survives Worker restart with durable storage',result.status===200);
 const hash=createHash('sha256').update(Buffer.from(await result.arrayBuffer())).digest('hex');
 check('Restarted download matches pilot installer SHA256',hash==='2b0c1c7980b7cf8c62b1d9b621723276ef943208d988ea579a62494da5408d74');
}else{
 for(const route of ['/Anansi','/anansi','/anansi/','/anansi.html'])check('Page serves '+route,(await fetch(base+route)).status===200);
 check('Installer cannot be fetched directly',(await fetch(base+'/_anansi-private/ANANSI-Ultimate-0.1.0-windows-x64-setup.exe')).status===404);
 check('Download without capability denied',(await fetch(base+'/api/anansi/download')).status===403);
 check('Cross-origin signup denied',(await post({email:'qa@example.com',consent:true,platform:'windows'},'https://other.example')).status===403);
 check('Missing consent denied',(await post({email:'qa@example.com',platform:'windows'})).status===400);
 check('Invalid email denied',(await post({email:'bad',consent:true,platform:'windows'})).status===400);
 const registration=await post({email:'qa-http@example.com',consent:true,platform:'windows'});check('Signup stored successfully',registration.status===200);
 const {download}=await registration.json();check('Capability returned',/^\/api\/anansi\/download\?token=[a-f0-9]{64}$/.test(download));
 const result=await fetch(base+download);check('Authorized installer served',result.status===200);
 check('Installer is an attachment',result.headers.get('content-disposition').includes('attachment'));
 check('Download is not cached',result.headers.get('cache-control')==='private, no-store');
 const hash=createHash('sha256').update(Buffer.from(await result.arrayBuffer())).digest('hex');
 check('Actual downloaded installer SHA256 matches verified package',hash==='2b0c1c7980b7cf8c62b1d9b621723276ef943208d988ea579a62494da5408d74');
 await writeFile('.wrangler/anansi-qa-token.json',JSON.stringify({download}));
}
await writeFile('.wrangler/anansi-http'+(process.argv.includes('--resume')?'-restart':'')+'-evidence.json',JSON.stringify(evidence,null,2));
console.log(JSON.stringify(evidence,null,2));
