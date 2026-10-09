/* Hub Pessoal - musica.js
   Página "Música": player com as músicas salvas no próprio aparelho (IndexedDB),
   + troca de músicas entre aparelhos conectados e controle remoto (estilo Spotify Connect).
   Usa a conexão direta do "Conectar dispositivo" (SY). Carregar DEPOIS de index.js.

   NOVO nesta versão:
   - Renomear música (biblioteca e "Tocando agora"). Atualiza as playlists e os aparelhos conectados.
   - Foto (capa) nas playlists: aba Playlists > abrir a playlist > "Adicionar foto".
   - Emojis dos botões trocados por ícones desenhados (SVG).
   - Na página Música a barra de navegação some; o botão de engrenagem (canto superior direito)
     abre uma tela própria (estilo configurações do Spotify) com o perfil e a lista de páginas. */
const MU=(()=>{
const els=[new Audio(),new Audio()];els.forEach(a=>a.preload='metadata');
let el=els[0],pre=null,lk=0,lr=null;
let T=[],cur=-1,shuf=0,rep=1,seeking=0,fail=0,blocked=0,seen=new Set(),hist=[],DUP=0;
let RC=null,R={},XF='',lastX=0,lastB=0,bt=0,TID=0,cs='',myPlayAt=0,TAB='home',MENU=0;

/* ---- identidade do app no cartão de mídia do sistema ---- */
const APP='Hub Pessoal';
const ico=f=>{try{return new URL(f,location.href).href}catch(e){return f}};
const ART=[{src:ico('icon-192.png'),sizes:'192x192',type:'image/png'},{src:ico('icon-512.png'),sizes:'512x512',type:'image/png'}];

/* ---- ícones (SVG, herdam a cor do texto) ---- */
const sv_=p=>'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="'+p+'"/></svg>';
const I={
  play:sv_('M8 5v14l11-7z'),
  pause:sv_('M6 5h4v14H6zM14 5h4v14h-4z'),
  next:sv_('M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z'),
  prev:sv_('M6 6h2v12H6zM9.5 12l8.5 6V6l-8.5 6z'),
  shuf:sv_('M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z'),
  rep:sv_('M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z'),
  plus:sv_('M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z'),
  x:sv_('M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z'),
  edit:sv_('M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z'),
  gear:sv_('M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z'),
  note:sv_('M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z'),
  list:sv_('M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z'),
  spk:sv_('M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02z'),
  vlo:sv_('M3 9v6h4l5 5V4L7 9H3z'),
  chev:sv_('M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z'),
  back:sv_('M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z'),
  dev:sv_('M17 1H7a2 2 0 0 0-2 2v18a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2zm0 18H7V5h10v14z')
};

/* ---- armazenamento local (IndexedDB) ---- */
const dbp=new Promise((res,rej)=>{try{const r=indexedDB.open('hub-musicas',1);r.onupgradeneeded=()=>r.result.createObjectStore('t',{keyPath:'id',autoIncrement:true});r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)}catch(e){rej(e)}});
const tx=async(m,f)=>{const d=await dbp;return new Promise((res,rej)=>{const t=d.transaction('t',m),o=f(t.objectStore('t'));t.oncomplete=()=>res(o&&o.result);t.onerror=()=>rej(t.error);t.onabort=()=>rej(t.error)})};

/* ---- helpers ---- */
const tm=s=>isFinite(s)&&s>0?Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0'):'0:00';
const nm=n=>n.replace(/\.[^/.]+$/,'').replace(/_/g,' ').trim();
const mb=b=>(b/1048576).toFixed(1).replace('.',',')+' MB';
const draw=()=>{
  if(typeof page=='undefined'||page!='mus')return;
  const a=document.activeElement,id=a&&a.id,ss=a&&a.selectionStart;
  render();
  if(id&&id.indexOf('mu-q')==0){const n=document.getElementById(id);if(n){n.focus();try{n.setSelectionRange(ss,ss)}catch(e){}}}
};
const isAudio=f=>f.type.startsWith('audio/')||/\.(mp3|m4a|ogg|wav|flac|aac|opus)$/i.test(f.name);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const hk=s=>{let h=5381;for(let i=0;i<s.length;i++)h=((h*33)^s.charCodeAt(i))>>>0;return h.toString(36)+'.'+s.length.toString(36)};
const key=x=>hk(x.name+'|'+x.size),man=()=>T.map(key);
const setXF=t=>{XF=t;lastX=Date.now();const e=$('#mu-xf');if(e)e.textContent=t};
const pr=t=>{XF=t;const n=Date.now();if(n-lastX>200){lastX=n;const e=$('#mu-xf');if(e)e.textContent=t}};
const say=m=>{try{typeof toast=='function'&&toast(m)}catch(e){}};
/* capa colorida gerada pelo nome (cada música/playlist tem a sua cor) */
const cov=s=>{const h=parseInt(hk(String(s)),36)%360;return'background:linear-gradient(135deg,hsl('+h+',55%,42%),hsl('+((h+45)%360)+',55%,22%))'};
/* capa da playlist: foto, se tiver; senão a cor gerada */
const plSt=p=>p.img?'background:#222 url('+p.img+') center/cover no-repeat':cov(p.name);

/* ---- barra de navegação: some na página Música (a engrenagem abre a tela de menu) ---- */
const _render=render;
window.render=function(){
  if(page!='mus')MENU=0;
  document.body.classList.toggle('mu-full',page=='mus');
  _render();
};

/* ---- Media Session (cartão do Chrome / tela de bloqueio) ---- */
const msMeta=i=>{
  if(!('mediaSession' in navigator))return;
  try{navigator.mediaSession.metadata=new MediaMetadata({title:nm(T[i].name),artist:APP,album:APP,artwork:ART})}catch(e){}
};
const msPos=()=>{
  if(!('mediaSession' in navigator))return;
  try{
    navigator.mediaSession.playbackState=cur<0?'none':el.paused?'paused':'playing';
    if(isFinite(el.duration)&&el.duration>0)navigator.mediaSession.setPositionState({duration:el.duration,playbackRate:el.playbackRate||1,position:Math.min(el.currentTime||0,el.duration)});
  }catch(e){}
};

/* ---- playlists (só neste aparelho; guardam a chave da música, não o arquivo) ---- */
let PL=[],PV=null,ctx=null,KM=null,QL='',QA='',QR='';
try{PL=JSON.parse(localStorage.getItem('hub_playlists'))||[]}catch(e){PL=[]}
const savePL=()=>{try{localStorage.setItem('hub_playlists',JSON.stringify(PL))}catch(e){}};
PL.forEach(p=>{if(!p.u)p.u=Date.now()});savePL();
const pls=()=>PL.filter(p=>!p.del);
const pget=id=>PL.find(p=>p.id==id&&!p.del);
const touch=p=>{p.u=Date.now();savePL();bpl(p)};
const mt=(s,q)=>{const n=x=>String(x).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();const t=n(s).replace(/[-–_]+/g,' ');return n(q).split(/\s+/).filter(Boolean).every(w=>t.includes(w))};
const matches=(name,q)=>mt(nm(name),q);
const kmap=()=>KM||(KM=new Map(T.map((x,i)=>[key(x),i])));
const tIdx=k=>{const i=kmap().get(k);return i==null?-1:i};
const qOf=c=>{const p=c&&pget(c);return p?p.keys.map(tIdx).filter(i=>i>=0):T.map((_,i)=>i)};

/* ---- conexões (vêm do SY, do index.js) ---- */
const syOk=()=>typeof SY!='undefined'&&SY._conns&&SY._c;
const openConns=()=>syOk()?Object.values(SY._conns()).filter(c=>c.open&&c.hid):[];
const dev=id=>(syOk()?SY._c().links:[]).find(l=>l.id==id)||{icon:'',name:'Outro aparelho'};
const sendJ=(c,o)=>{try{c.send(JSON.stringify(o))}catch(e){}};

/* ---- reprodução local ---- */
const playEl=()=>el.play().catch(e=>{if(e&&e.name=='NotAllowedError'){blocked=1;bcast()}});
function play(i,auto=1,c,back){
  if(i<0||i>=T.length)return;
  if(c!==undefined){if(c!==ctx)seen.clear();ctx=c}
  if(!back&&cur>=0&&cur!=i){hist.push(cur);if(hist.length>100)hist.shift()}
  seen.add(key(T[i]));
  cur=i;dropPre();els.forEach(a=>{if(a!==el)killEl(a)});
  setSrc(el,T[i].blob);
  msMeta(i);
  if(auto)playEl();
  draw();
}
const nextI=d=>{
  const q=qOf(ctx);if(!q.length)return -1;
  if(shuf&&q.length>1){
    let c=q.filter(i=>i!=cur&&!seen.has(key(T[i])));
    if(!c.length){seen.clear();if(cur>=0&&T[cur])seen.add(key(T[cur]));c=q.filter(i=>i!=cur)}
    return c[Math.floor(Math.random()*c.length)];
  }
  const p=q.indexOf(cur);return p<0?(d>0?q[0]:q[q.length-1]):q[(p+d+q.length)%q.length];
};
const next=()=>{const n=nextI(1);if(n>=0)play(n)};
const prev=()=>{if(el.currentTime>3)el.currentTime=0;else if(shuf&&hist.length){const h=hist.pop();if(h<T.length)play(h,1,undefined,1)}else{const n=nextI(-1);if(n>=0)play(n)}};
function toggle(){if(cur<0){if(T.length)play(0);return}el.paused?playEl():el.pause()}

/* ---- troca de música sem pausa ---- */
function killEl(a){try{a.pause()}catch(e){}a.removeAttribute('src');try{a.load()}catch(e){}if(a._u){URL.revokeObjectURL(a._u);a._u=null}}
function setSrc(a,blob){if(a._u)URL.revokeObjectURL(a._u);a._u=URL.createObjectURL(blob);a.src=a._u}
function dropPre(){if(pre){killEl(pre.a);pre=null}}
const peek=()=>{const q=qOf(ctx);if(!q.length)return -1;const p=q.indexOf(cur);if(!shuf&&p>=q.length-1&&!rep)return -1;return nextI(1)};
function prep(){
  if(pre||cur<0||RC)return;
  const i=peek();if(i<0||i>=T.length)return;
  const a=els[0]===el?els[1]:els[0];
  setSrc(a,T[i].blob);a.preload='auto';a.volume=el.volume;
  pre={i,a};
}
function handoff(){
  if(!pre)return false;
  const{i,a}=pre;pre=null;
  if(cur>=0&&cur!=i){hist.push(cur);if(hist.length>100)hist.shift()}
  seen.add(key(T[i]));
  cur=i;el=a;
  msMeta(i);playEl();draw();
  return true;
}
function keep(on){
  if(!navigator.locks)return;
  try{
    if(on){if(lk)return;lk=1;navigator.locks.request('hub-keepalive',()=>new Promise(r=>{if(!lk)return r();lr=r})).catch(()=>{lk=0;lr=null})}
    else{lk=0;if(lr){lr();lr=null}}
  }catch(e){lk=0;lr=null}
}
const on=(ev,fn)=>els.forEach(a=>a.addEventListener(ev,e=>{if(a===el)fn(e);else if(ev=='ended')killEl(a)}));

/* ---- só um aparelho toca por vez ---- */
function act(){const m=JSON.stringify({t:'mu-act'});openConns().forEach(c=>{try{c.send(m)}catch(e){}})}
function onAct(c){
  if(cur<0||el.paused)return;
  if(Date.now()-myPlayAt<1500&&syOk()&&SY._c().id<c.hid)return;
  el.pause();
  const d=dev(c.hid);
  say('Agora tocando em '+d.name);
}

on('play',()=>{blocked=0;myPlayAt=Date.now();act();keep(1);draw();bcast()});
on('pause',()=>{keep(0);draw();bcast()});
on('loadedmetadata',()=>{draw();bcast()});
on('volumechange',()=>sched());
on('timeupdate',()=>{
  const rem=el.duration-el.currentTime;
  if(isFinite(rem)&&!el.paused){if(rem<20)prep();if(pre&&rem<0.35)handoff()}
  const mp=$('#mu-mp');if(mp&&el.duration>0)mp.style.width=(el.currentTime/el.duration*100)+'%';
  if(!RC){const s=$('#mu-s'),c=$('#mu-c');if(s&&!seeking)s.value=el.currentTime;if(c&&!seeking)c.textContent=tm(el.currentTime)}
  if(Date.now()-lastB>1000)bcast();
});
on('ended',()=>{
  if(pre){handoff();return}
  const q=qOf(ctx),p=q.indexOf(cur);
  if(shuf||p<q.length-1)next();
  else if(rep&&q.length)play(q[0]);
  else{keep(0);draw();bcast()}
});
if('mediaSession' in navigator){
  const ms=navigator.mediaSession,h=(a,f)=>{try{ms.setActionHandler(a,f)}catch(e){}};
  h('play',()=>playEl());
  h('pause',()=>el.pause());
  h('nexttrack',next);
  h('previoustrack',prev);
  h('seekto',d=>{if(d&&d.seekTime!=null){el.currentTime=d.seekTime;msPos()}});
}

/* ---- biblioteca local ---- */
async function add(files){
  const L=[...files].filter(isAudio);
  for(const f of L){
    const r={name:f.name,size:f.size,blob:f};
    try{r.id=await tx('readwrite',s=>s.add(r))}catch(e){alert('Não foi possível salvar "'+f.name+'". O armazenamento do navegador pode estar cheio.');continue}
    T.push(r);KM=null;
  }
  if(cur<0&&T.length)play(0,0);else draw();
  bls();
}
async function del(i){
  if(!confirm('Remover "'+nm(T[i].name)+'" deste aparelho?'))return;
  try{await tx('readwrite',s=>s.delete(T[i].id))}catch(e){return}
  dropPre();if(i==cur){killEl(el);cur=-1}
  else if(i<cur)cur--;
  T.splice(i,1);KM=null;hist=[];draw();bls();
}

/* ---- renomear música ----
   O nome novo mantém a extensão do arquivo (.mp3 etc.). Como a "chave" da música depende do nome,
   as playlists são atualizadas e os aparelhos conectados recebem o aviso para renomear também. */
async function applyRen(i,name,remote){
  const t=T[i];if(!t||name==t.name)return;
  const old=key(t),rec={id:t.id,name,size:t.size,blob:t.blob};
  try{await tx('readwrite',s=>s.put(rec))}catch(e){say('Não foi possível renomear.');return}
  const had=seen.delete(old);
  t.name=name;KM=null;
  const nk=key(t);if(had)seen.add(nk);
  if(!remote)openConns().forEach(c=>sendJ(c,{t:'mu-rn',ok:old,name,size:t.size}));
  PL.forEach(p=>{
    const j=p.keys.indexOf(old);if(j<0)return;
    if(p.keys.includes(nk))p.keys.splice(j,1);else p.keys[j]=nk;
    remote?savePL():touch(p);
  });
  if(T[cur]===t)msMeta(cur);
  draw();bls();
}
function ren(i){
  const t=T[i];if(!t)return;
  fm('Renomear música',[{k:'n',l:'Novo nome',v:nm(t.name),r:1}],o=>{
    const b=o.n.trim().replace(/[\\\/]+/g,' ');if(!b)return;
    const m=t.name.match(/\.[^/.]+$/);
    applyRen(T.indexOf(t),b+(m?m[0]:''));
  });
}
function onRn(m){
  if(!m||!m.ok||!m.name)return;
  const i=T.findIndex(x=>key(x)==m.ok);
  if(i>=0)applyRen(i,String(m.name),1);
}

/* ---- foto da playlist (reduzida para 256x256 para ficar leve) ---- */
function pimg(file,cb){
  const im=new Image(),u=URL.createObjectURL(file);
  im.onload=()=>{
    const S=256,c=document.createElement('canvas');c.width=c.height=S;
    const x=c.getContext('2d'),m=Math.min(im.width,im.height);
    x.drawImage(im,(im.width-m)/2,(im.height-m)/2,m,m,0,0,S,S);
    URL.revokeObjectURL(u);
    cb(c.toDataURL('image/jpeg',.75));
  };
  im.onerror=()=>{URL.revokeObjectURL(u);say('Não foi possível ler essa imagem.')};
  im.src=u;
}
function setImg(id,f){
  const p=pget(id);if(!p||!f)return;
  if(!(f.type||'').startsWith('image/')){say('Escolha um arquivo de imagem.');return}
  pimg(f,d=>{p.img=d;touch(p);draw()});
}
function noImg(id){const p=pget(id);if(!p)return;p.img='';touch(p);draw()}

/* ---- estado enviado aos outros aparelhos (controle remoto) ---- */
const stNow=()=>({t:'mu-st',p:cur>=0&&!el.paused?1:0,i:cur,n:cur>=0&&T[cur]?nm(T[cur].name):'',pos:el.currentTime||0,dur:isFinite(el.duration)?el.duration:0,v:el.volume,sh:+shuf,rp:+rep,b:blocked});
const lsNow=()=>({t:'mu-ls',names:T.slice(0,150).map(x=>nm(x.name).slice(0,50))});
function bcast(){
  lastB=Date.now();
  msPos();
  const oc=openConns();if(!oc.length)return;
  const m=JSON.stringify(stNow());
  oc.forEach(c=>{try{c.send(m)}catch(e){}});
}
function bls(){const m=JSON.stringify(lsNow());openConns().forEach(c=>{try{c.send(m)}catch(e){}})}
const sched=()=>{clearTimeout(bt);bt=setTimeout(bcast,250)};

/* ---- playlists: sincronização (vale a alteração mais recente de cada playlist) ---- */
function hello(c){sendJ(c,lsNow());sendJ(c,stNow());PL.forEach(p=>sendJ(c,{t:'mu-pl',p}))}
function bpl(p){openConns().forEach(c=>sendJ(c,{t:'mu-pl',p}))}
function mergePL(p){
  if(!p||!p.id)return false;
  const l=PL.find(x=>x.id==p.id);
  if(!l){PL.push({id:p.id,name:p.name||'Playlist',keys:p.keys||[],u:p.u||0,del:p.del?1:0,img:p.img||''});return true}
  if((p.u||0)>(l.u||0)){l.name=p.name||l.name;l.keys=p.keys||[];l.del=p.del?1:0;l.img=p.img||'';l.u=p.u;return true}
  return false;
}
function onPl(c,p){
  if(!mergePL(p))return;
  savePL();if(PV&&!pget(PV))PV=null;
  openConns().forEach(x=>{if(x!==c)sendJ(x,{t:'mu-pl',p})});
  draw();
}

/* ---- recebimento ---- */
function onData(c,d){
  if(typeof d!='string'){
    if(!(d instanceof ArrayBuffer)||d.byteLength<4)return;
    const tid=new DataView(d).getUint32(0),r=c._rx&&c._rx[tid];
    if(!r)return;
    if(!r.skip)r.parts.push(d.slice(4));
    r.got+=d.byteLength-4;
    pr('Recebendo "'+nm(r.name)+'" — '+Math.min(100,Math.round(r.got/r.size*100))+'%');
    return;
  }
  if(d[0]!='{')return;
  let m;try{m=JSON.parse(d)}catch(e){return}
  if(!m||typeof m.t!='string'||m.t.slice(0,3)!='mu-')return;
  const id=c.hid;
  if(!c._h){c._h=1;hello(c)}
  if(m.t=='mu-st')onSt(id,m);
  else if(m.t=='mu-act')onAct(c);
  else if(m.t=='mu-ls'){(R[id]=R[id]||{}).names=m.names||[];if(RC==id)draw()}
  else if(m.t=='mu-cmd')exec(m.a,m.v);
  else if(m.t=='mu-pl')onPl(c,m.p);
  else if(m.t=='mu-rn')onRn(m);
  else if(m.t=='mu-man')onMan(c,m);
  else if(m.t=='mu-f'){c._rx=c._rx||{};c._rx[m.tid]={name:m.name,size:m.size,type:m.type,parts:[],got:0,skip:T.some(x=>key(x)==hk(m.name+'|'+m.size))}}
  else if(m.t=='mu-e')endRx(c,m.tid);
}
async function endRx(c,tid){
  const r=c._rx&&c._rx[tid];if(!r)return;delete c._rx[tid];
  if(r.skip)return;
  if(r.got!=r.size)return setXF('Falha ao receber "'+nm(r.name)+'". Tente sincronizar de novo.');
  const rec={name:r.name,size:r.size,blob:new Blob(r.parts,{type:r.type||'audio/mpeg'})};
  try{rec.id=await tx('readwrite',s=>s.add(rec))}catch(e){return setXF('Não foi possível salvar "'+nm(r.name)+'". O armazenamento pode estar cheio.')}
  T.push(rec);KM=null;setXF('Recebida: '+nm(r.name));bls();draw();
}

/* ---- envio de músicas ---- */
function onMan(c,m){
  const items=m.items||[],mine=new Set(T.map(key)),th=new Set(items);
  const out=T.filter(x=>!th.has(key(x))),need=items.filter(k=>!mine.has(k)).length;
  if(m.reply)sendJ(c,{t:'mu-man',items:man(),reply:0});
  if(out.length)enq(c,out);
  setXF(!need&&!out.length?'As músicas já estão iguais nos dois aparelhos.':[need?'Recebendo '+need+' música(s)…':'',out.length?'Enviando '+out.length+' música(s)…':''].filter(Boolean).join(' '));
}
const enq=(c,list)=>{c._q=(c._q||Promise.resolve()).then(()=>sendFiles(c,list)).catch(()=>{})};
async function sendFiles(c,list){
  const CH=16000;
  for(let n=0;n<list.length;n++){
    const x=list[n];if(!c.open)return;
    const tid=++TID;
    sendJ(c,{t:'mu-f',tid,name:x.name,size:x.size,type:x.blob.type});
    for(let o=0;o<x.size;o+=CH){
      if(!c.open)return;
      while(c.dataChannel&&c.dataChannel.bufferedAmount>524288){await sleep(15);if(!c.open)return}
      const ab=await x.blob.slice(o,o+CH).arrayBuffer(),b=new Uint8Array(4+ab.byteLength);
      new DataView(b.buffer).setUint32(0,tid);b.set(new Uint8Array(ab),4);
      try{c.send(b.buffer)}catch(e){return}
      pr('Enviando '+(n+1)+'/'+list.length+': "'+nm(x.name)+'" — '+Math.min(100,Math.round((o+CH)/x.size*100))+'%');
    }
    sendJ(c,{t:'mu-e',tid});
  }
  setXF('Envio concluído ('+list.length+').');
}

/* ---- controle remoto ---- */
function exec(a,v){
  if(a=='tg')toggle();else if(a=='ps')el.pause();else if(a=='nx')next();else if(a=='pv')prev();else if(a=='pl')play(+v,1,null);
  else if(a=='sk')el.currentTime=+v;else if(a=='vol')el.volume=Math.max(0,Math.min(1,+v));
  else if(a=='sh'){shuf=!shuf;seen.clear();dropPre()}else if(a=='rp'){rep=!rep;dropPre()}
  draw();sched();
}
function onSt(id,m){
  const r=R[id]=R[id]||{},sg=[m.p,m.i,m.n,m.sh,m.rp,m.b,Math.round(m.dur)].join('|'),ch=r.sg!=sg;
  r.sg=sg;r.st=m;r.at=Date.now();
  if(RC==id&&!seeking){ch?draw():rtick()}
  else if(ch)draw();
}
const rpos=r=>Math.min(r.st.dur||1e9,r.st.pos+(r.st.p?(Date.now()-r.at)/1000:0));
function rtick(){
  const r=R[RC];if(!r||!r.st||seeking)return;
  const p=rpos(r),c=$('#mu-c'),s=$('#mu-s'),v=$('#mu-v');
  if(c)c.textContent=tm(p);if(s)s.value=p;if(v&&document.activeElement!==v)v.value=r.st.v;
}
setInterval(()=>{if(RC&&typeof page!='undefined'&&page=='mus')rtick()},500);
function cmd(a,v){const c=openConns().find(x=>x.hid==RC);if(c)sendJ(c,{t:'mu-cmd',a,v})}

/* ---- transferir a reprodução de outro aparelho para este ("Tocar aqui") ---- */
const away=()=>{
  for(const id in R){const r=R[id];
    if(r.st&&r.st.p&&Date.now()-r.at<15000&&openConns().some(c=>c.hid==id))return id}
  return null;
};
function take(id){
  const r=R[id],s=r&&r.st,c=openConns().find(x=>x.hid==id);
  TAB='home';
  if(s&&s.n){
    const i=T.findIndex(x=>nm(x.name)==s.n);
    if(i<0){const m='Essa música não está neste aparelho. Use "Sincronizar músicas" primeiro.';setXF(m);say(m);return}
    const p=rpos(r);
    if(c)sendJ(c,{t:'mu-cmd',a:'ps'});
    RC=null;
    play(i,1,null);
    el.addEventListener('loadedmetadata',()=>{try{el.currentTime=p}catch(e){}},{once:true});
    return;
  }
  if(c)sendJ(c,{t:'mu-cmd',a:'ps'});
  RC=null;draw();
}

/* ---- novos aparelhos conectados / desconectados ---- */
function link(){
  if(!syOk())return;
  try{
    const oc=openConns(),ids=oc.map(c=>c.hid).sort().join(',');
    oc.forEach(c=>{if(!c._mu){c._mu=1;c.on('data',d=>onData(c,d));hello(c)}});
    Object.keys(R).forEach(id=>{if(!oc.some(c=>c.hid==id))delete R[id]});
    if(RC&&!oc.some(c=>c.hid==RC))RC=null;
    if(ids!=cs){cs=ids;draw()}
  }catch(e){}
}
setInterval(link,1000);

/* ---- músicas repetidas ---- */
const nn=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\.[^/.]+$/,'').replace(/\s*[\(\[]?\b(copy|copia)\b[\)\]]?/g,'').replace(/\s*\(\d+\)\s*$/,'').replace(/[^a-z0-9]+/g,' ').trim();
function dups(){
  const g=new Map();
  T.forEach((t,i)=>{const k=nn(t.name);if(!k)return;let a=g.get(k);if(!a){a=[];g.set(k,a)}a.push(i)});
  return [...g.values()].filter(a=>a.length>1);
}
async function rmExact(){
  const sk=new Set(),L=[];
  T.forEach((t,i)=>{const k=key(t);sk.has(k)?L.push(i):sk.add(k)});
  if(!L.length)return;
  if(!confirm('Remover '+L.length+' cópia(s) idêntica(s) (mesmo nome e tamanho)? Fica uma de cada.'))return;
  const gone=new Set(),ct=cur>=0?T[cur]:null;
  for(const i of L){try{await tx('readwrite',s=>s.delete(T[i].id));gone.add(i)}catch(e){}}
  T=T.filter((_,i)=>!gone.has(i));KM=null;hist=[];dropPre();
  if(ct){const k=key(ct);cur=T.indexOf(ct);if(cur<0)cur=T.findIndex(x=>key(x)==k)}
  draw();bls();
}
function dcard(){
  const G=dups(),sk=new Set();let ex=0;
  T.forEach(t=>{const k=key(t);sk.has(k)?ex++:sk.add(k)});
  return`<div class=sp-card><div class=sp-row><b class=sp-i style="font-size:17px;cursor:default">Músicas repetidas</b><button class="sp-btn g sm" onclick="MU.dp()">Fechar</button></div>
<p class=sp-s style="margin:8px 0">${G.length?G.length+(G.length==1?' grupo':' grupos')+' com nome igual. <span style="color:#f5a623">Idêntica</span> = mesmo nome e tamanho. <span style="color:#5aa9ff">Parecida</span> = mesmo nome, tamanho diferente (pode ser outra qualidade).':'Nenhuma música repetida encontrada.'}</p>
${ex?`<button class=sp-btn onclick="MU.rx()">Remover ${ex} ${ex==1?'cópia idêntica':'cópias idênticas'}</button>`:''}
${G.slice(0,100).map(a=>{const kc={};a.forEach(i=>{const k=key(T[i]);kc[k]=(kc[k]||0)+1});return`<div style="margin-top:14px"><div class=sp-s><b style="color:#fff">${esc(nm(T[a[0]].name))}</b></div>${a.map(i=>`<div class=sp-r><div class=sp-i><div class=sp-n>${esc(T[i].name)}</div><div class=sp-s>${mb(T[i].size)} · ${kc[key(T[i])]>1?'<span style="color:#f5a623">idêntica</span>':'<span style="color:#5aa9ff">parecida</span>'}</div></div><button class=sp-ib onclick="MU.rm(${i})" aria-label="Remover" title="Remover">${I.x}</button></div>`).join('')}</div>`}).join('')}
${G.length>100?`<p class=sp-s style="margin-top:10px">Mostrando 100 de ${G.length} grupos. Remova alguns para ver o resto.</p>`:''}</div>`;
}

/* ---- estilo (tema escuro estilo Spotify) ---- */
const CSS=`<style>
body.mu-full nav{display:none}
body.mu-full main{margin-left:0;max-width:none;padding-bottom:18px}
.sp{background:#121212;color:#fff;border-radius:16px;padding:16px 14px 14px;min-height:60vh}
.sp *{box-sizing:border-box}
.sp svg{width:1em;height:1em;fill:currentColor;vertical-align:-.125em;flex:none;pointer-events:none}
.sp-top{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:2px 0 12px}
.sp-t{font-size:26px;font-weight:800}
.sp-tabs{display:flex;gap:8px;overflow-x:auto;margin-bottom:16px;padding-bottom:2px}
.sp-chip{background:#2a2a2a;color:#fff;border:0;border-radius:999px;padding:8px 16px;font:inherit;font-size:14px;font-weight:600;cursor:pointer;white-space:nowrap}
.sp-chip.on{background:#1db954;color:#000}
.sp-h{font-size:20px;font-weight:700;margin:22px 0 12px;display:flex;align-items:center;justify-content:space-between;gap:8px}
.sp-card{background:#181818;border-radius:12px;padding:14px;margin-bottom:14px}
.sp-s{color:#b3b3b3;font-size:13px;margin:0}
.sp-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.sp-r{display:flex;align-items:center;gap:12px;padding:6px 8px;border-radius:8px}
.sp-r:hover{background:#2a2a2a}
.sp-r.on .sp-n{color:#1db954}
.sp-cv{width:46px;height:46px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:20px;flex:none;cursor:pointer;color:#ffffffcc}
.sp-i{flex:1;min-width:0;cursor:pointer}
.sp-n{font-size:15px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sp-ib{background:none;border:0;color:#b3b3b3;font:inherit;font-size:20px;cursor:pointer;padding:6px 9px;border-radius:50%;line-height:1;display:inline-flex;align-items:center;justify-content:center}
.sp-ib:hover{color:#fff}
.sp-ib.on{color:#1db954}
.sp-pp{width:58px;height:58px;border-radius:50%;background:#1db954;color:#000;border:0;font-size:24px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex:none}
.sp-pp:hover{background:#1ed760;transform:scale(1.05)}
.sp-pp.sm{width:40px;height:40px;font-size:18px}
.sp-btn{background:#1db954;color:#000;border:0;border-radius:999px;padding:10px 18px;font:inherit;font-size:14px;font-weight:700;cursor:pointer;display:inline-block}
.sp-btn:hover{background:#1ed760}
.sp-btn.g{background:transparent;color:#fff;box-shadow:inset 0 0 0 1px #727272}
.sp-btn.g:hover{box-shadow:inset 0 0 0 1px #fff;background:transparent}
.sp-btn.sm{padding:7px 13px;font-size:13px}
.sp-np{text-align:center}
.sp-art{width:min(260px,70%);aspect-ratio:1;margin:6px auto 16px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:72px;box-shadow:0 12px 32px #0008;color:#ffffffaa}
.sp-ti{font-size:22px;font-weight:800;overflow-wrap:anywhere}
.sp-bar{display:flex;align-items:center;gap:8px;margin:14px 0 8px}
.sp-bar input,.sp-vol input{flex:1;width:auto;accent-color:#1db954}
.sp-bar span{min-width:38px;font-size:12px;color:#b3b3b3}
.sp-ctl{display:flex;align-items:center;justify-content:center;gap:8px}
.sp-ctl .sp-ib{font-size:24px}
.sp-vol{display:flex;align-items:center;gap:8px;margin-top:16px;color:#b3b3b3;font-size:18px}
.sp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px}
.sp-pc{background:#181818;border-radius:10px;padding:12px;cursor:pointer}
.sp-pc:hover{background:#282828}
.sp-pc .sp-cv{width:100%;height:auto;aspect-ratio:1;font-size:40px;margin-bottom:10px}
.sp-q{width:100%;background:#2a2a2a;border:0;border-radius:999px;color:#fff;padding:11px 18px;font:inherit;font-size:15px;margin-bottom:10px;outline:0}
.sp-q:focus{box-shadow:0 0 0 2px #1db954}
.sp-mini{position:sticky;bottom:8px;margin-top:16px;background:#282828;border-radius:10px;padding:8px 10px 12px;display:flex;align-items:center;gap:6px;box-shadow:0 6px 20px #000a}
.sp-prog{position:absolute;left:10px;right:10px;bottom:4px;height:3px;border-radius:2px;background:#555;overflow:hidden}
.sp-prog i{display:block;height:100%;background:#1db954}
.sp-prof{display:flex;align-items:center;gap:14px;margin:6px 0 18px}
.sp-av{width:64px;height:64px;border-radius:50%;background:#1db954;color:#000;font-size:28px;font-weight:800;display:flex;align-items:center;justify-content:center;flex:none}
.sp-mi{display:flex;align-items:center;gap:12px;padding:14px 8px;border-radius:8px;cursor:pointer;font-size:16px;font-weight:600}
.sp-mi:hover{background:#2a2a2a}
.sp-mi span{flex:1}
.sp-mi svg{color:#b3b3b3;font-size:22px}
.sp-warn{color:#f5a623;font-size:13px;margin-top:8px}
</style>`;

/* ---- telas ---- */
const ctrl=(l,pl,sh,rp)=>`<div class=sp-ctl><button class="sp-ib ${sh?'on':''}" onclick="${l}('sh')" title="Aleatório" aria-label="Aleatório">${I.shuf}</button><button class=sp-ib onclick="${l}('pv')" title="Anterior" aria-label="Anterior">${I.prev}</button><button class=sp-pp onclick="${l}('tg')" title="${pl?'Pausar':'Tocar'}" aria-label="${pl?'Pausar':'Tocar'}">${pl?I.pause:I.play}</button><button class=sp-ib onclick="${l}('nx')" title="Próxima" aria-label="Próxima">${I.next}</button><button class="sp-ib ${rp?'on':''}" onclick="${l}('rp')" title="Repetir lista" aria-label="Repetir lista">${I.rep}</button></div>`;
const bar=(p,d)=>`<div class=sp-bar><span id=mu-c>${tm(p)}</span><input id=mu-s type=range min=0 max=${d} step=.1 value=${p||0} aria-label="Posição" oninput="MU.sk(this.value,1)" onchange="MU.sk(this.value)"><span style="text-align:right">${tm(d)}</span></div>`;
const vol=(id,v)=>`<label class=sp-vol>${I.vlo}<input ${id?'id='+id:''} type=range min=0 max=1 step=.01 value=${v} aria-label="Volume" oninput="MU.vol(this.value)">${I.spk}</label>`;

function ban(){
  const id=away();if(!id||(cur>=0&&!el.paused))return'';
  const d=dev(id),s=R[id].st;
  return`<div class=sp-card style="box-shadow:inset 0 0 0 1px #1db954"><div class=sp-ti style="font-size:17px">Tocando em ${esc(d.name)}</div><p class=sp-s style="margin-top:4px">${esc(s.n||'')}</p><div class=sp-row style="margin-top:12px"><button class=sp-btn onclick="MU.take('${id}')">Tocar aqui</button><button class="sp-btn g" onclick="MU.ctl('${id}')">Controlar</button></div></div>`;
}
/* Tocando agora (aba Início) */
function pcard(){
  const t=T[cur],pl=cur>=0&&!el.paused,d=isFinite(el.duration)?el.duration:0;
  return`<div class="sp-card sp-np"><div class=sp-art style="${t?cov(t.name):'background:#2a2a2a'}">${I.note}</div><div class=sp-ti>${t?esc(nm(t.name)):'Nada tocando'}</div><p class=sp-s style="margin-top:4px">${t?esc(APP)+(ctx&&pget(ctx)?' · '+esc(pget(ctx).name):''):'Adicione músicas para começar'}</p>${t?`<button class="sp-btn g sm" style="margin-top:10px" onclick="MU.ren(${cur})">Renomear</button>`:''}${bar(el.currentTime,d)}${ctrl('MU.lc',pl,shuf,rep)}${vol('',el.volume)}</div>`;
}
/* Mini player (outras abas) */
function mini(){
  if(cur<0||!T[cur]||TAB=='home'||RC)return'';
  const pl=!el.paused,w=el.duration>0?el.currentTime/el.duration*100:0;
  return`<div class=sp-mini><div class=sp-cv style="${cov(T[cur].name)}" onclick="MU.tab('home')">${I.note}</div><div class=sp-i onclick="MU.tab('home')"><div class=sp-n>${esc(nm(T[cur].name))}</div><p class=sp-s>${esc(APP)}</p></div><button class=sp-ib onclick="MU.lc('pv')" aria-label="Anterior">${I.prev}</button><button class="sp-pp sm" onclick="MU.lc('tg')" aria-label="Tocar ou pausar">${pl?I.pause:I.play}</button><button class=sp-ib onclick="MU.lc('nx')" aria-label="Próxima">${I.next}</button><div class=sp-prog><i id=mu-mp style="width:${w}%"></i></div></div>`;
}
const tabs=()=>`<div class=sp-tabs>${[['home','Início'],['lib','Músicas'],['pls','Playlists'],['dev','Aparelhos']].map(a=>`<button class="sp-chip${TAB==a[0]?' on':''}" onclick="MU.tab('${a[0]}')">${a[1]}</button>`).join('')}</div>`;

const LIM=50;
const more=n=>n>LIM?`<p class=sp-s style="margin:8px 8px 0">Mostrando ${LIM} de ${n}. Digite para refinar.</p>`:'';
const sbox=(id,v,fn)=>`<input class=sp-q id=${id} type=search placeholder="O que você quer ouvir?" autocomplete=off value="${esc(v)}" oninput="${fn}(this.value)">`;
const none=q=>`<p class=sp-s style="padding:8px">Nada encontrado para “${esc(q)}”.</p>`;

/* Início: grade de playlists */
function plgrid(){
  const L=pls();
  if(!L.length)return`<div class=sp-h>Suas playlists</div><div class=sp-card><p class=sp-s>Crie sua primeira playlist com as músicas da biblioteca.</p><button class=sp-btn style="margin-top:10px" onclick="MU.pn()">Nova playlist</button></div>`;
  return`<div class=sp-h>Suas playlists<button class="sp-btn g sm" onclick="MU.pn()">Nova</button></div><div class=sp-grid>${L.map(p=>{const n=p.keys.filter(k=>tIdx(k)>=0).length;return`<div class=sp-pc onclick="MU.po('${p.id}')"><div class=sp-cv style="${plSt(p)}">${p.img?'':I.list}</div><div class=sp-row style="flex-wrap:nowrap"><div class=sp-i><div class=sp-n>${esc(p.name)}</div><p class=sp-s>${n} ${n==1?'música':'músicas'}</p></div><button class="sp-pp sm" onclick="event.stopPropagation();MU.pplay('${p.id}')" aria-label="Tocar playlist">${I.play}</button></div></div>`}).join('')}</div>`;
}
function home(){
  return ban()+pcard()+(T.length?'':`<div class=sp-card><p class=sp-s>Sua biblioteca está vazia.</p><label class=sp-btn style="margin-top:10px;cursor:pointer">Adicionar músicas<input type=file accept="audio/*" multiple hidden onchange="MU.add(this.files);this.value=''"></label></div>`)+plgrid();
}

/* Músicas (biblioteca) */
function resLib(){
  if(!T.length)return'<p class=sp-s style="padding:8px">Nenhuma música ainda. Use “Adicionar” e escolha os arquivos do aparelho.</p>';
  const q=QL.trim(),pl=cur>=0&&!el.paused,r=T.map((t,i)=>({t,i})).filter(x=>!q||matches(x.t.name,q));
  if(!r.length)return none(q);
  return r.slice(0,LIM).map(x=>`<div class="sp-r${x.i==cur?' on':''}"><div class=sp-cv style="${cov(x.t.name)}" onclick="MU.pl(${x.i})">${x.i==cur&&pl?I.spk:I.note}</div><div class=sp-i onclick="MU.pl(${x.i})"><div class=sp-n>${esc(nm(x.t.name))}</div><p class=sp-s>${mb(x.t.size)}</p></div><button class=sp-ib onclick="MU.ren(${x.i})" title="Renomear" aria-label="Renomear">${I.edit}</button><button class=sp-ib onclick="MU.pt(${x.i})" title="Adicionar a uma playlist" aria-label="Adicionar a uma playlist">${I.plus}</button><button class=sp-ib onclick="MU.rm(${x.i})" title="Remover" aria-label="Remover">${I.x}</button></div>`).join('')+more(r.length);
}
function lcard(){
  const n=dups().length;
  return`<div class=sp-h style="margin-top:0">Suas músicas<label class="sp-btn sm" style="cursor:pointer">Adicionar<input type=file accept="audio/*" multiple hidden onchange="MU.add(this.files);this.value=''"></label></div>
<p class=sp-s style="margin-bottom:10px">${fail?'O armazenamento deste navegador não está disponível.':T.length+(T.length==1?' música':' músicas')+' · salvas só neste aparelho'}</p>
${T.length>1?`<button class="sp-btn g sm" style="margin-bottom:12px" onclick="MU.dp()">Ver músicas repetidas${n?' ('+n+')':''}</button>`:''}
${DUP?dcard():''}
${T.length?sbox('mu-q',QL,'MU.q'):''}<div id=mu-res>${resLib()}</div>`;
}

/* Playlists */
function plcard(){
  const pl=cur>=0&&!el.paused;
  return`<div class=sp-h style="margin-top:0">Playlists<button class="sp-btn sm" onclick="MU.pn()">Nova playlist</button></div>${pls().map(p=>{const n=p.keys.filter(k=>tIdx(k)>=0).length;return`<div class="sp-r${ctx==p.id?' on':''}"><div class=sp-cv style="${plSt(p)}" onclick="MU.po('${p.id}')">${ctx==p.id&&pl?I.spk:(p.img?'':I.list)}</div><div class=sp-i onclick="MU.po('${p.id}')"><div class=sp-n>${esc(p.name)}</div><p class=sp-s>${n} ${n==1?'música':'músicas'}</p></div><button class="sp-pp sm" onclick="MU.pplay('${p.id}')" title="Tocar" aria-label="Tocar">${I.play}</button><button class=sp-ib onclick="MU.pe('${p.id}')" title="Editar" aria-label="Editar">${I.edit}</button></div>`}).join('')||'<p class=sp-s style="padding:8px">Crie uma playlist e adicione músicas da biblioteca.</p>'}`;
}
function pdet(){
  const p=pget(PV);if(!p){PV=null;return plcard()}
  const pl=cur>=0&&!el.paused,L=p.keys.map(k=>({k,i:tIdx(k)})).filter(x=>x.i>=0);
  return`<div class=sp-card><div class=sp-row><button class="sp-btn g sm" onclick="MU.po(null)">Voltar</button><span class=sp-i></span><button class=sp-ib onclick="MU.pe('${p.id}')" title="Editar" aria-label="Editar">${I.edit}</button></div>
<div class=sp-row style="margin:16px 0;flex-wrap:nowrap"><div class=sp-cv style="${plSt(p)};width:96px;height:96px;font-size:40px;cursor:default">${p.img?'':I.list}</div><div class=sp-i style="cursor:default"><div class=sp-ti style="text-align:left">${esc(p.name)}</div><p class=sp-s style="margin-top:4px">${L.length} ${L.length==1?'música':'músicas'}</p></div></div>
<div class=sp-row>${L.length?`<button class=sp-btn onclick="MU.pplay('${p.id}')">Tocar playlist</button>`:''}<label class="sp-btn g sm" style="cursor:pointer">${p.img?'Trocar foto':'Adicionar foto'}<input type=file accept="image/*" hidden onchange="MU.img('${p.id}',this.files[0]);this.value=''"></label>${p.img?`<button class="sp-btn g sm" onclick="MU.noimg('${p.id}')">Remover foto</button>`:''}</div></div>
${L.map(x=>`<div class="sp-r${x.i==cur&&ctx==p.id?' on':''}"><div class=sp-cv style="${cov(T[x.i].name)}" onclick="MU.pp('${p.id}',${x.i})">${x.i==cur&&ctx==p.id&&pl?I.spk:I.note}</div><div class=sp-i onclick="MU.pp('${p.id}',${x.i})"><div class=sp-n>${esc(nm(T[x.i].name))}</div></div><button class=sp-ib onclick="MU.ren(${x.i})" title="Renomear" aria-label="Renomear">${I.edit}</button><button class=sp-ib onclick="MU.pr('${p.id}','${x.k}')" title="Tirar da playlist" aria-label="Tirar da playlist">${I.x}</button></div>`).join('')||'<p class=sp-s style="padding:8px">Playlist vazia. Busque e adicione músicas abaixo.</p>'}`;
}
function resAdd(){
  const p=pget(PV);if(!p)return'';
  if(!T.length)return'<p class=sp-s style="padding:8px">Adicione músicas na biblioteca primeiro.</p>';
  const q=QA.trim();if(!q)return'<p class=sp-s style="padding:8px">Digite o nome da música para adicionar.</p>';
  const r=T.map((t,i)=>({t,i})).filter(x=>!p.keys.includes(key(x.t))&&matches(x.t.name,q));
  if(!r.length)return`<p class=sp-s style="padding:8px">Nada encontrado para “${esc(q)}” (ou já está na playlist).</p>`;
  return r.slice(0,LIM).map(x=>`<div class=sp-r><div class=sp-cv style="${cov(x.t.name)}">${I.note}</div><div class=sp-i><div class=sp-n>${esc(nm(x.t.name))}</div><p class=sp-s>${mb(x.t.size)}</p></div><button class="sp-btn g sm" onclick="MU.pa('${p.id}',${x.i})">Adicionar</button></div>`).join('')+more(r.length);
}
function padd(){
  return`<div class=sp-h>Adicionar músicas</div>${T.length?sbox('mu-qa',QA,'MU.qa'):''}<div id=mu-resa>${resAdd()}</div>`;
}

/* Aparelhos */
function dv(){
  const oc=openConns();
  return`<div class=sp-h style="margin-top:0">Aparelhos</div>${oc.length?oc.map(c=>{const d=dev(c.hid);return`<div class=sp-card><div class=sp-row><div class=sp-cv style="background:#2a2a2a;cursor:default">${I.dev}</div><div class=sp-i style="cursor:default"><div class=sp-n>${esc(d.name)}</div><p class=sp-s>${c.hid==RC?'controlando agora':'conectado'}</p></div></div><div class=sp-row style="margin-top:12px"><button class="sp-btn g sm" onclick="MU.sy('${c.hid}')">Sincronizar músicas</button>${c.hid==RC?'':`<button class="sp-btn sm" onclick="MU.ctl('${c.hid}')">Controlar</button>`}</div></div>`}).join(''):'<div class=sp-card><p class=sp-s>Nenhum aparelho conectado. Conecte outro em Configurações → Dispositivos.</p><button class="sp-btn g sm" style="margin-top:10px" onclick="go(\'cfg\')">Ir para Configurações</button></div>'}
<p class=sp-s id=mu-xf style="margin-top:8px">${esc(XF)}</p>
<p class=sp-s style="margin-top:8px">Só um aparelho toca por vez: ao dar play em um, os outros pausam sozinhos. <b style="color:#fff">Sincronizar</b> troca entre os dois as músicas que faltam. <b style="color:#fff">Controlar</b> faz o outro aparelho tocar e você manda nele daqui. Os dois precisam estar com o Hub aberto.</p>`;
}

/* Controle remoto */
function rcard(){
  const d=dev(RC),r=R[RC]||{},s=r.st,p=s?rpos(r):0;
  return`<div class=sp-row style="margin-bottom:12px"><button class="sp-btn g sm" onclick="MU.stop()">Voltar</button></div><div class="sp-card sp-np"><p class=sp-s>Controlando ${esc(d.name)}</p><div class=sp-art style="margin-top:14px;${s&&s.n?cov(s.n):'background:#2a2a2a'}">${I.note}</div><div class=sp-ti>${s?(s.n?esc(s.n):'Nenhuma música tocando'):'Aguardando o aparelho…'}</div>${s&&s.b?'<p class=sp-warn>O navegador do outro aparelho bloqueou o início da música. Toque na tela dele uma vez e tente de novo.</p>':''}${bar(p,s?s.dur:0)}${ctrl('MU.cmd',s&&s.p,s&&s.sh,s&&s.rp)}${vol('mu-v',s?s.v:1)}<button class="sp-btn g" style="margin-top:16px" onclick="MU.back()">Tocar aqui</button></div>`;
}
function resRem(){
  const r=R[RC]||{},s=r.st,L=r.names||[];
  if(!L.length)return'<p class=sp-s style="padding:8px">Esse aparelho ainda não tem músicas.</p>';
  const q=QR.trim(),f=L.map((x,i)=>({x,i})).filter(o=>!q||mt(o.x,q));
  if(!f.length)return none(q);
  return f.slice(0,LIM).map(o=>`<div class="sp-r${s&&o.i==s.i?' on':''}"><div class=sp-cv style="${cov(o.x)}" onclick="MU.cmd('pl',${o.i})">${s&&o.i==s.i&&s.p?I.spk:I.note}</div><div class=sp-i onclick="MU.cmd('pl',${o.i})"><div class=sp-n>${esc(o.x)}</div></div></div>`).join('')+more(f.length);
}
function rlcard(){
  const d=dev(RC);
  return`<div class=sp-h>Biblioteca de ${esc(d.name)}</div>${sbox('mu-qr',QR,'MU.qr')}<div id=mu-resr>${resRem()}</div>`;
}

/* Tela de menu (abre pela engrenagem): perfil + lista de páginas do app */
function menuView(){
  const n=(typeof S!='undefined'&&S.name)||'Você',ini=esc(String(n).trim().charAt(0).toUpperCase()||'?');
  const L=PG.filter(p=>p[0]!='mus');
  return CSS+`<div class=sp><div class=sp-top><button class="sp-ib" onclick="MU.menu(0)" title="Voltar" aria-label="Voltar">${I.back}</button><div class=sp-t style="flex:1;margin-left:4px">Configurações</div></div>
<div class=sp-prof><div class=sp-av>${ini}</div><div><div class=sp-ti>${esc(n)}</div><p class=sp-s>${esc(APP)}</p></div></div>
<div class=sp-s style="margin:0 8px 6px">Ir para</div>
${L.map(p=>`<div class=sp-mi onclick="MU.goto('${p[0]}')"><span>${esc(p[2])}</span>${I.chev}</div>`).join('')}</div>`;
}
const view=()=>{
  if(MENU)return menuView();
  let b;
  if(RC)b=rcard()+rlcard();
  else if(TAB=='lib')b=lcard();
  else if(TAB=='pls')b=PV&&pget(PV)?pdet()+padd():plcard();
  else if(TAB=='dev')b=dv();
  else b=home();
  const top=`<div class=sp-top><div class=sp-t>Música</div><button class=sp-ib onclick="MU.menu(1)" title="Configurações" aria-label="Configurações">${I.gear}</button></div>`;
  return CSS+'<div class=sp>'+top+(RC?'':tabs())+b+mini()+'</div>';
};

/* ---- ações de playlist ---- */
function newPL(then){
  fm('Nova playlist',[{k:'n',l:'Nome da playlist',v:'',r:1}],o=>{
    const p={id:uid(),name:o.n.trim()||'Playlist',keys:[],u:0,img:''};PL.push(p);touch(p);
    then?then(p):draw();
  });
}
function editPL(id){
  const p=pget(id);if(!p)return;
  fm('Editar playlist',[{k:'n',l:'Nome da playlist',v:p.name,r:1}],o=>{p.name=o.n.trim()||p.name;touch(p);draw()},()=>{
    if(!confirm('Excluir a playlist "'+p.name+'"? As músicas continuam na biblioteca.'))return;
    p.del=1;p.keys=[];p.img='';if(PV==id)PV=null;if(ctx==id)ctx=null;touch(p);draw();
  });
}
function addTo(i){
  const k=key(T[i]),L=pls(),fin=p=>{if(!p)return;if(!p.keys.includes(k)){p.keys.push(k);touch(p)}draw()};
  if(!L.length)return newPL(fin);
  fm('Adicionar à playlist',[{k:'p',l:'Playlist',t:'select',v:L[0].id,o:[...L.map(p=>[p.id,p.name]),['__new','+ Nova playlist…']]}],o=>{o.p=='__new'?newPL(fin):fin(pget(o.p))});
}
function playPL(id){
  const q=qOf(id);if(!q.length)return;
  play(shuf?q[Math.floor(Math.random()*q.length)]:q[0],1,id);
}

/* ---- registro na página ---- */
if(!PG.some(p=>p[0]=='mus'))PG.splice(PG.length-1,0,['mus','🎵','Música']);
P.mus=view;
dbp.then(()=>tx('readonly',s=>s.getAll())).then(r=>{T=r||[];KM=null;draw();bls()}).catch(()=>{fail=1;draw()});

return{
  add,pl:i=>play(i,1,null),rm:del,nx:next,pv:prev,
  tab(k){TAB=k;draw()},
  menu(v){MENU=v?1:0;draw();window.scrollTo(0,0)},
  goto(p){MENU=0;go(p)},
  ren,img:setImg,noimg:noImg,
  pn:()=>newPL(),po(id){PV=id;if(id)TAB='pls';draw()},pe:editPL,pt:addTo,pplay:playPL,
  pp:(id,i)=>play(i,1,id),
  pa(id,i){const p=pget(id);if(!p)return;const k=key(T[i]);if(!p.keys.includes(k)){p.keys.push(k);touch(p)}draw()},
  pr(id,k){const p=pget(id);if(!p)return;p.keys=p.keys.filter(x=>x!=k);touch(p);draw()},
  q(v){QL=v;const e=$('#mu-res');if(e)e.innerHTML=resLib()},
  qa(v){QA=v;const e=$('#mu-resa');if(e)e.innerHTML=resAdd()},
  qr(v){QR=v;const e=$('#mu-resr');if(e)e.innerHTML=resRem()},
  lc(a){if(a=='tg')toggle();else if(a=='nx')next();else if(a=='pv')prev();else if(a=='sh'){shuf=!shuf;seen.clear();dropPre();draw();sched()}else if(a=='rp'){rep=!rep;dropPre();draw();sched()}},
  vol(v){RC?cmd('vol',v):el.volume=+v},
  sk(v,live){if(live){seeking=1;const c=$('#mu-c');if(c)c.textContent=tm(+v)}else{RC?cmd('sk',v):el.currentTime=+v;seeking=0}},
  cmd,
  ctl(id){RC=id;el.pause();draw()},
  stop(){RC=null;TAB='dev';draw()},
  take,dp(){DUP=!DUP;draw()},rx:rmExact,
  back(){take(RC)},
  sy(id){const c=openConns().find(x=>x.hid==id);if(!c)return;setXF('Verificando as músicas dos dois aparelhos…');sendJ(c,{t:'mu-man',items:man(),reply:1})}
};
})();