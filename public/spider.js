// Shared site-wide loader. ANANSI's single-file page already owns its spider.
if(!document.getElementById('spider')){
const canvas=document.createElement('canvas');canvas.id='spider';canvas.setAttribute('aria-hidden','true');canvas.style.cssText='position:fixed;left:0;top:0;width:112px;height:112px;pointer-events:none;z-index:2147483000;contain:strict';
const button=document.createElement('button');button.id='spider-toggle';button.type='button';button.style.cssText='position:fixed;bottom:18px;right:18px;z-index:2147483001;background:#111114e8;border:1px solid #d6cbb640;color:#d6cbb6;padding:10px 13px;font:9px monospace;cursor:pointer;min-height:36px';
document.body.append(canvas,button);

/* One tiny procedural jumping spider. No WebGL, sprites or external runtime. */
(()=>{'use strict';
const canvas=document.querySelector('#spider'),toggle=document.querySelector('#spider-toggle');
if(!canvas||!toggle)return;
const ctx=canvas.getContext('2d');if(!ctx)return;
const reduced=matchMedia('(prefers-reduced-motion: reduce)'),fine=matchMedia('(hover: hover) and (pointer: fine)');
let enabled=!reduced.matches&&fine.matches,raf=0,last=0,w=innerWidth,h=innerHeight,dpr=1;
let saved={};try{saved=JSON.parse(sessionStorage.getItem('anansi-spider')||'{}');}catch{}
if(typeof saved.enabled==='boolean'&&!reduced.matches&&fine.matches)enabled=saved.enabled;
let x=Number.isFinite(saved.x)?saved.x:w*.77,y=Number.isFinite(saved.y)?saved.y:Math.min(h*.65,480),angle=Number.isFinite(saved.angle)?saved.angle:-1.8,state='idle',clock=0,elapsed=0,vx=0,vy=0,jump=0,group=0,snap=0,cooldown=0;
const pointer={x:w*.55,y:h*.45,active:false,time:0},attack={x:0,y:0,sx:0,sy:0},escape={x:0,y:0};
const feet=Array.from({length:8},(_,i)=>({side:i<4?-1:1,row:i%4,x:0,y:0,fromX:0,fromY:0,toX:0,toY:0,progress:1,lift:0,group:(i%4+(i<4?0:1))%2}));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
function world(lx,ly){return{x:x+Math.cos(angle)*lx-Math.sin(angle)*ly,y:y+Math.sin(angle)*lx+Math.cos(angle)*ly};}
function target(leg){const forward=[16,7,-3,-14][leg.row],spread=[19,25,25,21][leg.row]*(state==='crouch'?.7:1);return world(forward,leg.side*spread);}
function plant(){feet.forEach(leg=>{const t=target(leg);Object.assign(leg,{x:t.x,y:t.y,progress:1,lift:0});});}
function change(next){state=next;clock=0;}
function flee(){let dx=x-pointer.x,dy=y-pointer.y,len=Math.hypot(dx,dy)||1;escape.x=clamp(x+dx/len*150,42,w-42);escape.y=clamp(y+dy/len*150,42,h-42);change('flee');cooldown=1.8;}
function resize(){w=innerWidth;h=innerHeight;dpr=Math.min(devicePixelRatio||1,2);canvas.width=112*dpr;canvas.height=112*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);x=clamp(x,35,w-35);y=clamp(y,35,h-35);plant();}
function update(dt){elapsed+=dt;clock+=dt;cooldown=Math.max(0,cooldown-dt);const dx=pointer.x-x,dy=pointer.y-y,distance=Math.hypot(dx,dy);let tx=pointer.x,ty=pointer.y,speed=0;
if(!pointer.active&&state!=='flee') {if(state!=='idle')change('idle');}
if(state==='idle'){if(pointer.active){snap-=dt;if(snap<=0){angle+=clamp(wrap(Math.atan2(dy,dx)-angle),-.65,.65);snap=.3+Math.random()*.55;}if(distance>75&&clock>.8)change('stalk');else if(distance<=75&&cooldown===0&&clock>.7)change('crouch');}}
else if(state==='stalk'){speed=distance>320?48:27;if(distance<72&&cooldown===0)change('crouch');}
else if(state==='crouch'){if(clock>.4){attack.sx=x;attack.sy=y;attack.x=pointer.x;attack.y=pointer.y;angle=Math.atan2(attack.y-y,attack.x-x);change('pounce');}}
else if(state==='pounce'){const t=clamp(clock/.19,0,1),ease=1-(1-t)**2;x=attack.sx+(attack.x-attack.sx)*ease;y=attack.sy+(attack.y-attack.sy)*ease;jump=Math.sin(t*Math.PI)*8;if(t>=1){escape.x=clamp(x-Math.cos(angle)*60,35,w-35);escape.y=clamp(y-Math.sin(angle)*60,35,h-35);change('retreat');cooldown=1.5;}}
else if(state==='retreat'||state==='flee'){tx=escape.x;ty=escape.y;speed=state==='flee'?240:100;if(Math.hypot(tx-x,ty-y)<8||clock>1.1)change('idle');}
if(speed){const heading=Math.atan2(ty-y,tx-x);angle+=wrap(heading-angle)*Math.min(1,dt*9);vx=Math.cos(heading)*speed;vy=Math.sin(heading)*speed;x+=vx*dt;y+=vy*dt;}else{vx=0;vy=0;}
x=clamp(x,30,w-30);y=clamp(y,30,h-30);
// Feet are world-space anchors; alternate tetrapod groups lift together.
if(!feet.some(leg=>leg.progress<1)) {const stretched=feet.some(leg=>{const t=target(leg);return Math.hypot(t.x-leg.x,t.y-leg.y)>9;});if(stretched){group=1-group;feet.filter(leg=>leg.group===group).forEach(leg=>{const t=target(leg);Object.assign(leg,{fromX:leg.x,fromY:leg.y,toX:t.x+vx*.10,toY:t.y+vy*.10,progress:0});});}}
feet.forEach(leg=>{if(leg.progress<1){leg.progress=Math.min(1,leg.progress+dt/(state==='flee'?.065:.13));const t=leg.progress,e=t*t*(3-2*t);leg.x=leg.fromX+(leg.toX-leg.fromX)*e;leg.y=leg.fromY+(leg.toY-leg.fromY)*e;leg.lift=Math.sin(t*Math.PI)*4;}else leg.lift=0;});
}
function segment(ax,ay,bx,by,width,color){ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(bx,by);ctx.lineWidth=width;ctx.strokeStyle=color;ctx.lineCap='round';ctx.stroke();}
function ellipse(ex,ey,rx,ry,fill){ctx.beginPath();ctx.ellipse(ex,ey,rx,ry,0,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();}
function draw(){ctx.clearRect(0,0,112,112);canvas.style.transform=`translate3d(${(x-56).toFixed(2)}px,${(y-56).toFixed(2)}px,0)`;ctx.save();ctx.translate(56,56);ctx.rotate(angle);const crouch=state==='crouch'?1-Math.min(clock/.4,1)*.08:1;ctx.scale(crouch,crouch);
// Contact shadow grows and separates during the jump.
ctx.save();ctx.translate(2+jump*.25,3+jump*.6);ctx.filter='blur(2px)';ellipse(-3,0,17+jump*.3,12+jump*.2,'rgba(0,0,0,.7)');ctx.restore();ctx.translate(0,-jump);
feet.forEach(leg=>{const hip={x:[7,3,-2,-6][leg.row],y:leg.side*5};const dx=leg.x-x,dy=leg.y-y;let fx=Math.cos(angle)*dx+Math.sin(angle)*dy,fy=-Math.sin(angle)*dx+Math.cos(angle)*dy;fy-=leg.side*leg.lift*.5;
// Analytic two-bone IK; the knee is the intersection of two reach circles.
const a=18,b=20,ux=fx-hip.x,uy=fy-hip.y,d=clamp(Math.hypot(ux,uy),.01,a+b-.01),dir=Math.atan2(uy,ux),offset=Math.acos(clamp((a*a+d*d-b*b)/(2*a*d),-1,1));const bend=dir+leg.side*offset;const kx=hip.x+Math.cos(bend)*a,ky=hip.y+Math.sin(bend)*a;
segment(hip.x+1,hip.y+3,kx+1,ky+3,3,'#0008');segment(kx+1,ky+3,fx+1,fy+3,2,'#0008');segment(hip.x,hip.y,kx,ky,2.8,'#4e4943');segment(hip.x-.4,hip.y-.5,kx-.4,ky-.5,.7,'#b2a897');segment(kx,ky,fx,fy,1.6,'#8a7d67');segment(kx-.3,ky-.4,fx-.3,fy-.4,.5,'#ded2b7');
for(let j=1;j<=4;j++){const t=j/5,hx=kx+(fx-kx)*t,hy=ky+(fy-ky)*t;segment(hx,hy,hx-1.3,hy+leg.side*2,.4,'#c4b8a080');}});
const abdomen=ctx.createRadialGradient(-9,-3,1,-7,0,11);abdomen.addColorStop(0,'#d6c6a6');abdomen.addColorStop(.35,'#8f8067');abdomen.addColorStop(.8,'#463c30');abdomen.addColorStop(1,'#191713');ellipse(-7,0,10,7.5,abdomen);
// Organic chevrons and deterministic fine bristles.
for(let i=0;i<4;i++){const ax=-13+i*3;segment(ax,-4,ax+2,0,.9,'#241e17');segment(ax+2,0,ax,4,.9,'#241e17');}for(let i=0;i<36;i++){const a=i*2.399;const bx=-7+Math.cos(a)*9,by=Math.sin(a)*7;segment(bx,by,bx+Math.cos(a)*1.8,by+Math.sin(a)*1.8,.4,'#e0d1b480');}
const head=ctx.createRadialGradient(6,-3,1,5,0,9);head.addColorStop(0,'#877e70');head.addColorStop(.45,'#3b3732');head.addColorStop(1,'#151412');ellipse(5,0,8,7,head);ellipse(4,-3,3,1,'#e3dac120');
for(const side of [-1,1]){const twitch=Math.sin(elapsed*15+side)*.9;segment(11,side*3,15+twitch,side*4.6,2,'#c1ae88');ellipse(15+twitch,side*4.6,1.6,1.1,'#99866a');}
for(const [ex,ey,r] of [[11,-2.3,2.1],[11,2.3,2.1],[8.7,-5,1.25],[8.7,5,1.25]]){ellipse(ex,ey,r,r,'#08090a');ellipse(ex-.5,ey-.65,r*.28,r*.28,'#f6f0e2');}
ctx.restore();}
function frame(time){if(!enabled||document.hidden){raf=0;return;}const dt=Math.min((time-last)/1000||.016,.04);last=time;update(dt);draw();raf=requestAnimationFrame(frame);}
function sync(){toggle.setAttribute('aria-pressed',String(enabled));toggle.textContent='SPIDER / '+(enabled?'ON':'OFF');canvas.hidden=!enabled;if(!enabled){cancelAnimationFrame(raf);raf=0;}else if(!document.hidden&&!raf){last=performance.now();raf=requestAnimationFrame(frame);}}
addEventListener('pointermove',event=>{if(event.pointerType!=='mouse')return;const now=performance.now(),dt=Math.max(16,now-pointer.time),speed=Math.hypot(event.clientX-pointer.x,event.clientY-pointer.y)/dt*1000;pointer.x=event.clientX;pointer.y=event.clientY;pointer.active=true;pointer.time=now;if(speed>1600&&Math.hypot(pointer.x-x,pointer.y-y)<130&&state!=='flee')flee();},{passive:true});
addEventListener('pointerdown',event=>{if(Math.hypot(event.clientX-x,event.clientY-y)<36)flee();},{passive:true});document.documentElement.addEventListener('pointerleave',()=>{pointer.active=false;});
function remember(){try{sessionStorage.setItem('anansi-spider',JSON.stringify({x,y,angle,enabled}));}catch{}}
addEventListener('pagehide',remember);addEventListener('resize',resize,{passive:true});document.addEventListener('visibilitychange',sync);reduced.addEventListener('change',()=>{enabled=!reduced.matches&&fine.matches;sync();});toggle.addEventListener('click',()=>{enabled=!enabled;remember();sync();});resize();sync();
})();


}
