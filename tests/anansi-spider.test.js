import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const html=readFileSync(new URL('../public/anansi/index.html',import.meta.url),'utf8');
const script=html.match(/<script id="spider-engine">([\s\S]*?)<\/script>/)[1];
test('shared site loader contains exactly the page engine and prevents a second spider',()=>{
  const shared=readFileSync(new URL('../public/spider.js',import.meta.url),'utf8');
  assert.ok(shared.includes(script));assert.match(shared,/if\(!document.getElementById\('spider'\)\)/);
  for(const file of ['index.html','privacy/index.html','about/index.html','vision/index.html','memory-compiler/index.html'])assert.match(readFileSync(new URL('../public/'+file,import.meta.url),'utf8'),/\/spider\.js/);
});
function mount({reduced=false,fine=true}={}) {
  let now=0,sequence=0;
  const frames=new Map(),events={},documentEvents={},mediaEvents={};
  const ctx=new Proxy({createRadialGradient:()=>({addColorStop(){}})},{get:(target,key)=>target[key]||(()=>{})});
  const canvas={style:{},hidden:false,getContext:()=>ctx};
  const button={setAttribute(key,value){this[key]=value;},addEventListener(name,fn){events['button:'+name]=fn;}};
  const media={matches:reduced,addEventListener(name,fn){mediaEvents[name]=fn;}};
  const document={hidden:false,querySelector:selector=>selector==='#spider'?canvas:button,documentElement:{addEventListener(name,fn){events['root:'+name]=fn;}},addEventListener(name,fn){documentEvents[name]=fn;}};
  vm.runInNewContext(script,{document,innerWidth:1280,innerHeight:800,devicePixelRatio:3,matchMedia:q=>q.includes('reduced')?media:{matches:fine},performance:{now:()=>now},addEventListener(name,fn){events[name]=fn;},requestAnimationFrame(fn){frames.set(++sequence,fn);return sequence;},cancelAnimationFrame(id){frames.delete(id);},Math});
  function tick(){now+=16;for(const [id,fn] of [...frames]){frames.delete(id);fn(now);}}
  return{frames,canvas,button,events,document,documentEvents,media,mediaEvents,tick};
}
test('spider is off by default for reduced motion and touch pointers',()=>{
  for(const options of [{reduced:true},{fine:false}]) {const app=mount(options);assert.equal(app.frames.size,0);assert.equal(app.canvas.hidden,true);assert.equal(app.button['aria-pressed'],'false');}
});
test('single animation loop remains finite during hunting, pouncing, clicking and resize',()=>{
  const app=mount();assert.equal(app.frames.size,1);assert.equal(app.canvas.width,224);
  for(let i=0;i<600;i++){
    if(i%15===0)app.events.pointermove({pointerType:'mouse',clientX:300+Math.sin(i/20)*250,clientY:400+Math.cos(i/30)*230});
    if(i%50===0)app.events.pointerdown({clientX:400,clientY:420});
    if(i%100===0)app.events.resize();
    app.tick();assert.equal(app.frames.size,1);assert.ok(!/NaN|Infinity/.test(app.canvas.style.transform));
  }
  app.events['button:click']();assert.equal(app.frames.size,0);assert.equal(app.canvas.hidden,true);
  app.events['button:click']();assert.equal(app.frames.size,1);
});
test('hidden tabs suspend animation; reduced-motion changes stop the loop',()=>{
  const app=mount();app.document.hidden=true;app.tick();assert.equal(app.frames.size,0);
  app.document.hidden=false;app.documentEvents.visibilitychange();assert.equal(app.frames.size,1);
  app.media.matches=true;app.mediaEvents.change();assert.equal(app.frames.size,0);
});
