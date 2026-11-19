/* GREEK THE ANIMATION — js/main.js */
(() => {
'use strict';
const MAIL = 'hello@greektheanimation.com'; // <-- change to your real email (also in index.html)
const $  = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const isTouch = matchMedia('(pointer:coarse)').matches;
const reduce  = matchMedia('(prefers-reduced-motion: reduce)').matches;
const lowEnd  = (navigator.hardwareConcurrency || 4) <= 2 || (navigator.deviceMemory || 4) <= 2;

function hasWebGL(){
  try{const c=document.createElement('canvas');
    return !!(window.WebGLRenderingContext&&(c.getContext('webgl')||c.getContext('experimental-webgl')));}
  catch(e){return false;}
}
const use3D = hasWebGL() && typeof THREE !== 'undefined' && !lowEnd;
if(!use3D) document.body.classList.add('no3d');

gsap.registerPlugin(ScrollTrigger);
$('#yr').textContent = new Date().getFullYear();

/* ---------- Smooth scroll (Lenis, desktop) ---------- */
let lenis = null;
if(typeof Lenis !== 'undefined' && !reduce && !isTouch){
  lenis = new Lenis({lerp:.085});
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t*1000));
  gsap.ticker.lagSmoothing(0);
}

/* ---------- Procedural studio environment (reflections) ---------- */
function makeEnv(){
  const faces=[];
  for(let i=0;i<6;i++){
    const c=document.createElement('canvas');c.width=c.height=128;
    const x=c.getContext('2d');
    const g=x.createLinearGradient(0,0,0,128);g.addColorStop(0,'#24143f');g.addColorStop(1,'#050308');
    x.fillStyle=g;x.fillRect(0,0,128,128);
    x.globalAlpha=.9;x.fillStyle=i%2?'#ffffff':'#a56bff';x.fillRect(18+i*6,16,44,14);
    x.globalAlpha=.7;x.fillStyle='#6a2cff';x.fillRect(70,72,38,10);
    x.globalAlpha=.5;x.fillStyle='#4aa8ff';x.fillRect(10,96,30,8);
    faces.push(c);
  }
  const t=new THREE.CubeTexture(faces);t.needsUpdate=true;return t;
}

/* ---------- Split text ---------- */
$$('[data-split]').forEach(el=>{
  const words=el.textContent.trim().split(/\s+/);
  el.innerHTML=words.map(w=>`<span class="w">${[...w].map(ch=>`<span class="c">${ch}</span>`).join('')}</span>`).join(' ');
  gsap.set($$('.c',el),{yPercent:115});
  if(!el.closest('.hero')){
    gsap.to($$('.c',el),{yPercent:0,duration:1,stagger:.018,ease:'power4.out',
      scrollTrigger:{trigger:el,start:'top 85%',once:true}});
  }
});

/* ---------- Audio (muted by default, generated — no files) ---------- */
let ac=null,master=null,soundOn=false;
function audioInit(){
  ac=new (window.AudioContext||window.webkitAudioContext)();
  master=ac.createGain();master.gain.value=0;master.connect(ac.destination);
  const f=ac.createBiquadFilter();f.type='lowpass';f.frequency.value=420;f.connect(master);
  [55,82.4,110.3].forEach((hz,i)=>{
    const o=ac.createOscillator();o.type=i?'sine':'sawtooth';o.frequency.value=hz;
    const g=ac.createGain();g.gain.value=i?.25:.1;o.connect(g);g.connect(f);o.start();
    const l=ac.createOscillator();l.frequency.value=.07+i*.03;
    const lg=ac.createGain();lg.gain.value=14;l.connect(lg);lg.connect(o.detune);l.start();
  });
}
function blip(freq=660,d=.09){
  if(!soundOn||!ac)return;
  const o=ac.createOscillator(),g=ac.createGain(),t=ac.currentTime;
  o.type='sine';o.frequency.value=freq;
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.09,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+d);
  o.connect(g);g.connect(master);o.start(t);o.stop(t+d+.02);
}
$('#snd').addEventListener('click',e=>{
  if(!ac)audioInit();
  soundOn=!soundOn;ac.resume();
  master.gain.linearRampToValueAtTime(soundOn?.35:0,ac.currentTime+.6);
  e.currentTarget.classList.toggle('on',soundOn);
  blip(880);
});

/* ---------- HERO 3D SCENE ---------- */
const mouse={x:0,y:0,tx:0,ty:0};
addEventListener('pointermove',e=>{
  mouse.tx=(e.clientX/innerWidth-.5)*2;mouse.ty=-(e.clientY/innerHeight-.5)*2;
  document.body.style.setProperty('--mx',e.clientX+'px');
  document.body.style.setProperty('--my',e.clientY+'px');
});

function heroScene(){
  const canvas=$('#hero3d');
  const R=new THREE.WebGLRenderer({canvas,antialias:!isTouch,alpha:true,powerPreference:'high-performance'});
  R.setPixelRatio(Math.min(devicePixelRatio||1,isTouch?1.5:2));
  R.toneMapping=THREE.ACESFilmicToneMapping;R.toneMappingExposure=1.15;
  R.shadowMap.enabled=!isTouch;R.shadowMap.type=THREE.PCFSoftShadowMap;

  const S=new THREE.Scene();S.fog=new THREE.FogExp2(0x07050d,.038);
  const cam=new THREE.PerspectiveCamera(50,1,.1,120);
  const env=makeEnv();

  S.add(new THREE.AmbientLight(0x3a2266,.8));
  const key=new THREE.SpotLight(0xffffff,2.2,40,.55,.6);key.position.set(5,9,6);
  key.castShadow=!isTouch;key.shadow.mapSize.set(1024,1024);S.add(key);
  const p1=new THREE.PointLight(0x8b3dff,3.2,26);S.add(p1);
  const p2=new THREE.PointLight(0x4aa8ff,2,26);p2.position.set(5,-1,-3);S.add(p2);

  const purple=new THREE.MeshPhysicalMaterial({color:0x1c1236,metalness:1,roughness:.16,clearcoat:1,clearcoatRoughness:.08,
    envMap:env,envMapIntensity:1.6,emissive:0x2b0d66,emissiveIntensity:.35});
  const chrome=new THREE.MeshStandardMaterial({color:0xc9ccd6,metalness:1,roughness:.12,envMap:env,envMapIntensity:1.4});

  const hero=new THREE.Group();S.add(hero);
  const knot=new THREE.Mesh(new THREE.TorusKnotGeometry(1.1,.36,isTouch?110:240,isTouch?14:30),purple);
  knot.castShadow=true;knot.rotation.x=.35;hero.add(knot);
  const cage=new THREE.Mesh(new THREE.IcosahedronGeometry(2.1,1),
    new THREE.MeshBasicMaterial({color:0xa66bff,wireframe:true,transparent:true,opacity:.18}));hero.add(cage);
  const rings=[0,1,2].map(i=>{
    const m=new THREE.Mesh(new THREE.TorusGeometry(2.6+i*.55,.012,8,160),
      new THREE.MeshBasicMaterial({color:i?0xc9ccd6:0xb388ff,transparent:true,opacity:.7}));
    m.rotation.set(Math.random()*3,Math.random()*3,0);hero.add(m);return m;
  });

  // Floor + mirrored reflection
  const FY=-2.4;
  const floor=new THREE.Mesh(new THREE.CircleGeometry(14,64),
    new THREE.MeshStandardMaterial({color:0x0b0814,metalness:.9,roughness:.35,envMap:env,transparent:true,opacity:.82}));
  floor.rotation.x=-Math.PI/2;floor.position.y=FY;floor.receiveShadow=true;S.add(floor);
  const grid=new THREE.GridHelper(28,56,0x6a2cff,0x2a1a4d);
  grid.position.y=FY+.01;grid.material.transparent=true;grid.material.opacity=.35;S.add(grid);
  const mGroup=new THREE.Group();S.add(mGroup);
  const mirror=new THREE.Mesh(knot.geometry,purple);mirror.scale.y=-1;mGroup.add(mirror);

  // Floating objects
  const geos=[new THREE.IcosahedronGeometry(.35,0),new THREE.OctahedronGeometry(.4),new THREE.TetrahedronGeometry(.42),
    new THREE.TorusGeometry(.28,.1,12,32),new THREE.BoxGeometry(.4,.4,.4),new THREE.DodecahedronGeometry(.34)];
  const floaters=[];const N=isTouch?10:18;
  for(let i=0;i<N;i++){
    const m=new THREE.Mesh(geos[i%geos.length],i%3===0?chrome:purple);
    const a=Math.random()*Math.PI*2,r=3.6+Math.random()*3.6;
    m.position.set(Math.cos(a)*r,-1.2+Math.random()*5,-3+Math.sin(a)*r*.6);
    m.userData={y:m.position.y,s:.5+Math.random()*.8,ph:Math.random()*6,rs:(Math.random()-.5)*.02};
    m.castShadow=!isTouch;S.add(m);floaters.push(m);
  }

  // Particles
  const PN=isTouch?600:1600,pos=new Float32Array(PN*3);
  for(let i=0;i<PN;i++){pos[i*3]=(Math.random()-.5)*30;pos[i*3+1]=Math.random()*14-3;pos[i*3+2]=(Math.random()-.5)*30;}
  const pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.BufferAttribute(pos,3));
  const pts=new THREE.Points(pg,new THREE.PointsMaterial({color:0xb388ff,size:.035,transparent:true,opacity:.85,
    blending:THREE.AdditiveBlending,depthWrite:false}));S.add(pts);

  const st={k:2};
  function size(){
    const w=innerWidth,h=innerHeight;
    R.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix();
  }
  size();addEventListener('resize',size);

  const clock=new THREE.Clock();
  (function loop(){
    requestAnimationFrame(loop);
    const p=Math.min(scrollY/innerHeight,1.5);
    if(p>1.3||document.hidden)return;
    const t=clock.getElapsedTime();
    mouse.x+=(mouse.tx-mouse.x)*.05;mouse.y+=(mouse.ty-mouse.y)*.05;

    knot.rotation.y=t*.35;
    const bob=Math.sin(t*.8)*.18;hero.position.y=bob;
    hero.rotation.y=mouse.x*.45;cage.rotation.y=-t*.1;cage.rotation.x=t*.07;
    rings.forEach((r,i)=>{r.rotation.x+=.004*(i+1);r.rotation.y+=.003*(i+1)});
    purple.emissiveIntensity=.3+Math.sin(t*2)*.1;

    mGroup.rotation.y=hero.rotation.y;
    mirror.rotation.set(-knot.rotation.x,knot.rotation.y,0);
    mirror.position.y=2*FY-hero.position.y;

    p1.position.set(Math.cos(t*.6)*6,1+Math.sin(t*.4)*2,Math.sin(t*.6)*5);
    floaters.forEach(m=>{const u=m.userData;
      m.position.y=u.y+Math.sin(t*u.s+u.ph)*.4;m.rotation.x+=u.rs;m.rotation.y+=u.rs*1.3;});
    pts.rotation.y=t*.02;

    const base=cam.aspect<.8?12:8;
    cam.position.set(mouse.x*1.4,.6+(st.k-1)*3+mouse.y*.6-p*.8,base*st.k+p*5);
    cam.lookAt(0,-1.1,0);
    R.render(S,cam);
  })();

  return {intro(){gsap.to(st,{k:1,duration:2.6,ease:'power3.out'});}};
}

/* ---------- SHOWCASE 3D ---------- */
function showcaseScene(){
  const canvas=$('#showcase3d'),box=canvas.parentElement;
  const R=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
  R.setPixelRatio(Math.min(devicePixelRatio||1,isTouch?1.5:2));R.toneMapping=THREE.ACESFilmicToneMapping;
  const S=new THREE.Scene(),cam=new THREE.PerspectiveCamera(45,1,.1,50);cam.position.set(0,0,6.5);
  const env=makeEnv();
  S.add(new THREE.AmbientLight(0x442288,.7));
  const key=new THREE.PointLight(0xffffff,2.5,30);key.position.set(3,3,5);S.add(key);
  const rim=new THREE.PointLight(0x8b3dff,3,30);rim.position.set(-4,-1,-2);S.add(rim);

  const mats={
    chrome:{color:0xc9ccd6,emissive:0x000000,metalness:1,roughness:.1,ei:0},
    violet:{color:0x2a1360,emissive:0x3a0f8f,metalness:1,roughness:.18,ei:.35},
    neon:{color:0x120a2a,emissive:0x8b3dff,metalness:.6,roughness:.3,ei:.8}
  };
  const mat=new THREE.MeshPhysicalMaterial({envMap:env,envMapIntensity:1.5,clearcoat:1,clearcoatRoughness:.1});
  function setMat(k){const m=mats[k];mat.color.setHex(m.color);mat.emissive.setHex(m.emissive);
    mat.metalness=m.metalness;mat.roughness=m.roughness;mat.emissiveIntensity=m.ei;}
  setMat('violet');

  const geos={
    knot:()=>new THREE.TorusKnotGeometry(1.1,.38,200,28),
    ico:()=>new THREE.IcosahedronGeometry(1.6,0),
    torus:()=>new THREE.TorusGeometry(1.2,.5,32,96),
    crystal:()=>new THREE.OctahedronGeometry(1.7,0)
  };
  let mesh=new THREE.Mesh(geos.knot(),mat);S.add(mesh);
  function setModel(k){
    const rot={x:mesh.rotation.x,y:mesh.rotation.y};
    S.remove(mesh);mesh.geometry.dispose();
    mesh=new THREE.Mesh(geos[k](),mat);mesh.rotation.set(rot.x,rot.y,0);S.add(mesh);
    gsap.fromTo(mesh.scale,{x:.1,y:.1,z:.1},{x:1,y:1,z:1,duration:.8,ease:'back.out(1.6)'});
  }

  $$('[data-m]').forEach(b=>b.addEventListener('click',()=>{
    $$('[data-m]').forEach(x=>x.classList.remove('on'));b.classList.add('on');setModel(b.dataset.m);blip(520);}));
  $$('[data-mat]').forEach(b=>b.addEventListener('click',()=>{
    $$('[data-mat]').forEach(x=>x.classList.remove('on'));b.classList.add('on');setMat(b.dataset.mat);blip(700);}));
  $('#light').addEventListener('input',e=>{key.intensity=+e.target.value;});
  $('#wire').addEventListener('change',e=>{mat.wireframe=e.target.checked;});
  let auto=true;$('#auto').addEventListener('change',e=>{auto=e.target.checked;});

  let drag=false,lx=0,ly=0,vx=0,vy=0;
  canvas.addEventListener('pointerdown',e=>{drag=true;lx=e.clientX;ly=e.clientY;canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{
    if(!drag)return;
    vx=(e.clientX-lx)*.01;vy=(e.clientY-ly)*.01;lx=e.clientX;ly=e.clientY;
    mesh.rotation.y+=vx;mesh.rotation.x+=vy;});
  const up=()=>{drag=false};
  canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);

  function size(){const w=box.clientWidth,h=box.clientHeight;R.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix();}
  size();new ResizeObserver(size).observe(box);

  let visible=false;
  new IntersectionObserver(en=>{visible=en[0].isIntersecting;},{threshold:.05}).observe(box);

  (function loop(){
    requestAnimationFrame(loop);
    if(!visible||document.hidden)return;
    if(!drag){
      mesh.rotation.y+=vx;mesh.rotation.x+=vy;vx*=.95;vy*=.95;
      if(auto)mesh.rotation.y+=.006;
    }
    R.render(S,cam);
  })();
}

let heroApi=null;
if(use3D){
  try{heroApi=heroScene();showcaseScene();}
  catch(err){console.warn('3D disabled:',err);document.body.classList.add('no3d');}
}

/* ---------- Loader + intro ---------- */
const num=$('.ld-num'),bar=$('.ld-bar i'),prog={v:0};
gsap.to(prog,{v:100,duration:reduce?.3:2.4,ease:'power2.inOut',
  onUpdate(){const v=Math.round(prog.v);num.textContent=v;bar.style.width=v+'%';},
  onComplete:intro});
function intro(){
  gsap.timeline()
    .to('#loader',{yPercent:-100,duration:1,ease:'power4.inOut'})
    .add(()=>{if(heroApi)heroApi.intro();},'-=.5')
    .to('.hero .c',{yPercent:0,stagger:.03,duration:1,ease:'power4.out'},'-=.4')
    .from('.hero .tag,.hero .lead,.hero .btn',{y:30,opacity:0,stagger:.12,duration:.9,ease:'power3.out'},'-=.7')
    .from('.nav',{y:-40,opacity:0,duration:.9,ease:'power3.out'},'-=.9')
    .set('#loader',{display:'none'});
}

/* ---------- Custom cursor (desktop) ---------- */
if(!isTouch){
  document.body.classList.add('has-cursor');
  const dx=gsap.quickTo('.cur-dot','x',{duration:.1}),dy=gsap.quickTo('.cur-dot','y',{duration:.1});
  const rx=gsap.quickTo('.cur-ring','x',{duration:.5,ease:'power3'}),ry=gsap.quickTo('.cur-ring','y',{duration:.5,ease:'power3'});
  addEventListener('pointermove',e=>{dx(e.clientX);dy(e.clientY);rx(e.clientX);ry(e.clientY);});
  const sel='a,button,.card-in,input,textarea,.drag,.s-card';
  document.addEventListener('pointerover',e=>{if(e.target.closest(sel)){document.body.classList.add('cur-big');}});
  document.addEventListener('pointerout',e=>{if(e.target.closest(sel)){document.body.classList.remove('cur-big');}});
}

/* ---------- Magnetic buttons ---------- */
if(!isTouch){
  $$('.magnetic').forEach(b=>{
    b.addEventListener('pointermove',e=>{
      const r=b.getBoundingClientRect();
      gsap.to(b,{x:(e.clientX-r.left-r.width/2)*.3,y:(e.clientY-r.top-r.height/2)*.4,duration:.4,ease:'power3.out'});});
    b.addEventListener('pointerleave',()=>gsap.to(b,{x:0,y:0,duration:.7,ease:'elastic.out(1,.4)'}));
  });
}

/* ---------- 3D card tilt + video preview ---------- */
$$('.tilt').forEach(el=>{
  const v=$('video',el);
  el.addEventListener('pointermove',e=>{
    if(isTouch)return;
    const r=el.getBoundingClientRect(),px=(e.clientX-r.left)/r.width-.5,py=(e.clientY-r.top)/r.height-.5;
    el.style.setProperty('--ry',(px*14)+'deg');el.style.setProperty('--rx',(-py*14)+'deg');});
  el.addEventListener('pointerenter',()=>{
    blip(440,.06);
    if(v&&v.dataset.src){if(!v.src)v.src=v.dataset.src;v.play().catch(()=>{});v.classList.add('on');}});
  el.addEventListener('pointerleave',()=>{
    el.style.setProperty('--rx','0deg');el.style.setProperty('--ry','0deg');
    if(v&&v.classList.contains('on')){v.pause();v.classList.remove('on');}});
});
$$('.s-card').forEach(c=>c.addEventListener('pointermove',e=>{
  const r=c.getBoundingClientRect();c.style.setProperty('--x',(e.clientX-r.left)+'px');c.style.setProperty('--y',(e.clientY-r.top)+'px');}));

/* ---------- Filters ---------- */
$$('.f-btn').forEach(b=>b.addEventListener('click',()=>{
  $$('.f-btn').forEach(x=>x.classList.remove('on'));b.classList.add('on');
  const f=b.dataset.f;blip(600);
  $$('.card').forEach(c=>{
    const show=f==='all'||c.dataset.cat===f;
    if(show){c.style.display='';gsap.fromTo(c,{opacity:0,y:30,scale:.95},{opacity:1,y:0,scale:1,duration:.5,clearProps:'all'});}
    else c.style.display='none';
  });
  ScrollTrigger.refresh();
}));

/* ---------- Scroll animations ---------- */
$$('.reveal').forEach(el=>gsap.from(el,{y:50,opacity:0,duration:1,ease:'power3.out',clearProps:'all',
  scrollTrigger:{trigger:el,start:'top 88%',once:true}}));
$$('.card').forEach((el,i)=>gsap.from(el,{y:60,opacity:0,duration:.9,delay:(i%4)*.08,ease:'power3.out',clearProps:'all',
  scrollTrigger:{trigger:el,start:'top 92%',once:true}}));
$$('[data-count]').forEach(el=>{
  const o={v:0},end=+el.dataset.count;
  ScrollTrigger.create({trigger:el,start:'top 90%',once:true,onEnter:()=>
    gsap.to(o,{v:end,duration:2,ease:'power2.out',onUpdate:()=>{el.textContent=Math.round(o.v);}})});
});
// Parallax on section titles and the marquee
$$('.sec-t').forEach(el=>gsap.to(el,{y:-40,ease:'none',scrollTrigger:{trigger:el,start:'top bottom',end:'bottom top',scrub:true}}));
gsap.to('.marquee div',{xPercent:-8,ease:'none',scrollTrigger:{trigger:'.marquee',start:'top bottom',end:'bottom top',scrub:true}});
gsap.to('.hero-bot',{y:-80,opacity:.2,ease:'none',scrollTrigger:{trigger:'.hero',start:'top top',end:'bottom top',scrub:true}});

/* ---------- Navigation + page transition ---------- */
const burger=$('#burger'),menu=$('#menu');
function closeMenu(){burger.classList.remove('open');menu.classList.remove('open');}
burger.addEventListener('click',()=>{burger.classList.toggle('open');menu.classList.toggle('open');blip(500);});
$$('[data-nav]').forEach(a=>a.addEventListener('click',e=>{
  const t=$(a.getAttribute('href'));if(!t)return;
  e.preventDefault();closeMenu();blip(520);
  const top=t.getBoundingClientRect().top+scrollY;
  gsap.timeline()
    .set('.wipe',{transformOrigin:'50% 100%'})
    .to('.wipe',{scaleY:1,duration:.55,ease:'power4.inOut'})
    .add(()=>{lenis?lenis.scrollTo(top,{immediate:true}):window.scrollTo(0,top);ScrollTrigger.update();})
    .set('.wipe',{transformOrigin:'50% 0%'})
    .to('.wipe',{scaleY:0,duration:.6,ease:'power4.inOut'});
}));

/* ---------- Contact form (opens the visitor's email app) ---------- */
$('#contactForm').addEventListener('submit',e=>{
  e.preventDefault();
  const f=new FormData(e.target);
  const sub=encodeURIComponent('Project enquiry from '+f.get('name'));
  const body=encodeURIComponent(f.get('message')+'\n\n— '+f.get('name')+' ('+f.get('email')+')');
  location.href=`mailto:${MAIL}?subject=${sub}&body=${body}`;
});
})();
