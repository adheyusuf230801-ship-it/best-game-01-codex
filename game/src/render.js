(function (BK) {
  'use strict';
  const W = 1280, H = 800, TAU = Math.PI * 2;
  function ellipse(c, x, y, rx, ry, color, angle) { c.fillStyle=color; c.beginPath(); c.ellipse(x,y,rx,ry,angle || 0,0,TAU); c.fill(); }
  function glow(c,x,y,r,color) { const g=c.createRadialGradient(x,y,0,x,y,r); g.addColorStop(0,color); g.addColorStop(1,'transparent'); c.fillStyle=g; c.fillRect(x-r,y-r,r*2,r*2); }
  function text(c,label,x,y,size,color,align) { c.fillStyle=color || '#e8efd9'; c.font=`${size}px Georgia, serif`; c.textAlign=align || 'center'; c.fillText(label,x,y); }
  function burst(c,x,y,t,color,count) {
    for(let j=0;j<count;j++) { const a=j*2.39996, r=10+(j%5)*6+Math.sin(t*3+j)*5; ellipse(c,x+Math.cos(a)*r,y+Math.sin(a)*r,2,3,color,a); }
  }
  function background(c,s,t) {
    const g=c.createLinearGradient(0,0,0,H); g.addColorStop(0,'#08152f'); g.addColorStop(0.55,'#122c3b'); g.addColorStop(1,'#102c2c'); c.fillStyle=g; c.fillRect(0,0,W,H);
    glow(c,1010,130,210,'#cce8ff25'); glow(c,1010,130,115,'#d8efff28'); ellipse(c,1010,130,51,51,'#e1ecd4');
    ellipse(c,995,115,10,13,'#c1d5ca'); ellipse(c,1028,143,14,9,'#c9d9ce'); ellipse(c,1006,157,6,5,'#c1d5ca');
    const rng=BK.random.create(s.seed);
    for(let i=0;i<95;i++) { const x=BK.random.range(rng,0,W), y=BK.random.range(rng,0,560), a=BK.random.range(rng,0,TAU); c.globalAlpha=0.25+0.5*(0.5+0.5*Math.sin(t*0.5+a)); ellipse(c,(x+Math.sin(t*0.07+a)*7+W)%W,y, i%8===0?2:1,1,'#d4e9dd'); } c.globalAlpha=1;
    ellipse(c,640,420,390,290,'#173c382e');
    c.strokeStyle='#83b6a016'; c.lineWidth=2; c.beginPath(); c.ellipse(640,400,220,220,0,0,TAU); c.stroke();
    for(let i=0;i<230;i++) { const x=BK.random.range(rng,20,W-20), y=BK.random.range(rng,270,H); c.strokeStyle=i%3?'#477b6328':'#8eb47b30'; c.beginPath(); c.moveTo(x,y); c.quadraticCurveTo(x-5,y-8,x+Math.sin(i)*7,y-15); c.stroke(); }
    for(let i=0;i<26;i++) { const x=BK.random.range(rng,100,1180)+Math.sin(t*0.4+i)*17, y=BK.random.range(rng,260,760)+Math.cos(t*0.6+i)*12; glow(c,x,y,13,'#cce98818'); ellipse(c,x,y,1.5,1.5,'#dfef9b'); }
  }
  function bed(c,b,s,t) {
    ellipse(c,b.x,b.y+11,46,23,'#061c2390'); ellipse(c,b.x,b.y+5,36,19,'#34413b'); ellipse(c,b.x,b.y+4,31,15,'#252d31');
    for(let i=0;i<7;i++) ellipse(c,b.x+Math.cos(i*2.4)*25,b.y+7+Math.sin(i*2.4)*10,2,1,'#687266');
    if(b.hp<=0) { c.strokeStyle='#60685d'; c.beginPath(); c.moveTo(b.x,b.y+5); c.quadraticCurveTo(b.x-9,b.y-12,b.x+4,b.y-9); c.stroke(); return; }
    const health=b.hp/BK.config.bloom.hp, open=0.25+0.75*b.growth, droop=(1-health)*12;
    glow(c,b.x,b.y-12,60,'#96baf015');
    c.strokeStyle='#79a687'; c.lineWidth=3; c.beginPath(); c.moveTo(b.x,b.y+7); c.quadraticCurveTo(b.x-3,b.y-9,b.x+droop,b.y-23+droop); c.stroke();
    ellipse(c,b.x-10,b.y-3,12,4,'#659a7a',0.5); ellipse(c,b.x+10,b.y-10,12,4,'#86b98a',-0.6);
    const colors=['#b8a9e6','#efb3cb','#a5dbdd','#e6d6a1'];
    for(let j=0;j<7;j++) { const a=j*TAU/7+t*0.025, r=12*open; ellipse(c,b.x+droop+Math.cos(a)*r,b.y-25+droop+Math.sin(a)*r,10*open,5*open,health<0.4?'#917e9d':colors[b.id%4],a); }
    ellipse(c,b.x+droop,b.y-25+droop,5,5,'#f6df9f');
    const chewing=s.moths.some(m=>Math.hypot(m.x-b.x,m.y-b.y)<BK.config.moths[m.kind].radius+BK.config.bloom.radius+2);
    if(chewing) burst(c,b.x,b.y-18,t,'#c6a3bf',5);
    if(b.growth<1) burst(c,b.x,b.y-15,t,'#eee6b6',12);
  }
  function moth(c,m,t) {
    const r=BK.config.moths[m.kind].radius, flap=0.55+0.45*Math.abs(Math.sin(t*(m.kind==='drifter'?3:9)+m.phase));
    c.save(); c.translate(m.x,m.y); c.rotate(Math.atan2(m.vy || Math.sin(m.phase),m.vx || Math.cos(m.phase))+Math.PI/2);
    const color={drifter:'#c5d6dd',darter:'#b6b3e5',splitter:'#d4b0ca',bulb:'#f0dba3'}[m.kind];
    glow(c,0,0,r*2,color+'19');
    for(const side of [-1,1]) { ellipse(c,side*r*0.55,0,r*(m.kind==='darter'?0.34:0.75)*flap,r*(m.kind==='darter'?1.15:0.65),color,side*0.4); ellipse(c,side*r*0.6,2,r*0.15,r*0.3,'#61788b',side*0.3); }
    ellipse(c,0,0,m.kind==='splitter'?7:3,r*0.65,'#536474'); ellipse(c,-2,-r*0.45,1.4,1.4,'#fae9be'); ellipse(c,2,-r*0.45,1.4,1.4,'#fae9be'); c.restore();
  }
  function keeper(c,k,t) {
    if(k.dashTime>0) for(let i=5;i>0;i--) { c.globalAlpha=(6-i)*0.07; ellipse(c,k.x-k.dashX*i*12,k.y-k.dashY*i*12,12,18,'#a7e6dc'); } c.globalAlpha=1;
    ellipse(c,k.x,k.y+18,19,7,'#041b2680');
    c.save(); c.translate(k.x,k.y); c.rotate(Math.atan2(k.aimY,k.aimX)+Math.PI/2);
    if(k.invulnerable>0) { c.strokeStyle='#c7e7d9'; c.beginPath(); c.arc(0,0,24,0,TAU); c.stroke(); }
    c.fillStyle='#648e91'; c.beginPath(); c.moveTo(0,-18); c.quadraticCurveTo(-17,-9,-15,17); c.quadraticCurveTo(0,23,15,17); c.quadraticCurveTo(17,-9,0,-18); c.fill();
    ellipse(c,0,-5,9,11,'#172b40'); ellipse(c,-3,-7,1.5,1.5,'#d7e9d5'); ellipse(c,3,-7,1.5,1.5,'#d7e9d5');
    glow(c,18,-8,65,'#ffdf8a40'); c.fillStyle='#eed495'; c.fillRect(14,-14,8,12); c.strokeStyle='#b1a16c'; c.strokeRect(12,-16,12,16); c.restore();
  }
  function hud(c,s,muted) {
    c.fillStyle='#071827c9'; c.fillRect(32,28,1216,65); c.strokeStyle='#a5c1b333'; c.strokeRect(32,28,1216,65);
    text(c,'B L O O M K E E P E R',54,54,17,'#d8e4ce','left');
    text(c,'♥ '.repeat(Math.max(0,s.hearts))+'♡ '.repeat(Math.max(0,3-s.hearts)),54,80,22,'#edb3be','left');
    text(c,`WAVE  ${s.wave.number || 1} / 8`,390,66,18);
    c.strokeStyle='#cfc99d'; c.strokeRect(530,48,100,19); c.fillStyle='#e2c778'; c.fillRect(533,51,94*s.nectar/BK.config.orbsPerBloom,13);
    text(c,`NECTAR  ${s.nectar} / ${BK.config.orbsPerBloom}`,580,83,11,'#b5c9bd');
    text(c,`✿  ${s.beds.filter(b=>b.hp>0).length} / 8`,755,67,23,'#cbbfe3'); text(c,String(s.score).padStart(6,'0'),1040,67,24,'#e9dfb6');
    text(c,muted?'M · MUTED':'M · SOUND',1195,66,11,'#91aaa6');
    text(c,'WASD / ARROWS  move     ·     MOUSE  aim     ·     CLICK / SPACE  dew     ·     SHIFT  dash     ·     P  pause',640,771,13,'#a5beb5');
  }
  function panel(c,s,screen,t) {
    const title=screen==='title';
    c.fillStyle=title?'#06132277':'#061322a8'; c.fillRect(0,0,W,H);
    c.fillStyle='#0c2232ee'; c.fillRect(290,242,700,310); c.strokeStyle='#a4b8a966'; c.lineWidth=1; c.strokeRect(300,252,680,290);
    text(c,title?'A MOONLIT GARDEN DEFENSE':'B L O O M K E E P E R',640,292,13,'#a7c7c0');
    text(c,title?'Bloomkeeper':screen==='won'?'The garden blooms':screen==='lost'?'The blight prevails':'A moment of stillness',640,365,title?70:45,'#f0e6c6');
    text(c,title?'Gather nectar. Nurture the ring. Keep the moths from the light.':screen==='paused'?'The moon will wait for you.':`FINAL SCORE   ${s.score}   ·   ${s.bloomsGrown} BLOOMS GROWN`,640,414,18,'#b7cecb');
    text(c,title?'WASD to move · aim & click to cast dew · Shift to dash':screen==='won'?'Eight waves survived. A little light, kept alive.':screen==='lost'?'Even the longest night gives way to another beginning.':'',640,452,16,'#99b7b4');
    c.globalAlpha=0.7+Math.sin(t*2)*0.2; text(c,title?'click to begin':screen==='paused'?'P to return to the garden':'click or press R to plant again',640,505,19,'#ecdaa4'); c.globalAlpha=1;
  }
  BK.render = { draw(c,s,screen,t,muted) {
    c.save(); background(c,s,t); s.beds.forEach(b=>bed(c,b,s,t));
    for(const o of s.orbs) { glow(c,o.x,o.y,23,'#e6c86b35'); ellipse(c,o.x,o.y+Math.sin(t*3+o.id)*2,4,5,'#f2db91'); }
    for(const b of s.bolts) { c.strokeStyle='#a1e9ee70'; c.lineWidth=3; c.beginPath(); c.moveTo(b.x-b.vx*0.035,b.y-b.vy*0.035); c.lineTo(b.x,b.y); c.stroke(); glow(c,b.x,b.y,19,'#a5eafa55'); ellipse(c,b.x,b.y,4,6,'#dcffff',Math.atan2(b.vy,b.vx)-Math.PI/2); }
    s.moths.forEach(m=>{ moth(c,m,t); if(m.hp<BK.config.moths[m.kind].hp) burst(c,m.x,m.y,t,'#d9ffff',6); }); keeper(c,s.keeper,t);
    for(const e of s.events) { if(e.type==='kill') burst(c,e.x,e.y,t,'#c9e6e6',16); if(e.type==='bloom') { const b=s.beds[e.bed]; burst(c,b.x,b.y,t,'#ffe4aa',22); } }
    const v=c.createRadialGradient(640,400,240,640,400,730); v.addColorStop(0,'transparent'); v.addColorStop(1,'#020918b0'); c.fillStyle=v; c.fillRect(0,0,W,H);
    hud(c,s,muted);
    if(screen==='playing' && s.wave.phase==='waiting') { text(c,s.wave.number?'THE GARDEN TAKES A BREATH':'THE MOTHS ARE STIRRING',640,142,17,'#e5dbb4'); text(c,`Wave ${s.wave.number+1} · ${Math.max(1,Math.ceil(s.wave.timer))}`,640,168,15,'#aac8c4'); }
    if(screen!=='playing') panel(c,s,screen,t); c.restore();
  } };
})(globalThis.BK = globalThis.BK || {});
