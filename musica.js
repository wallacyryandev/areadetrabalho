/* Hub Pessoal - musica.js
   Página "Música": player com as músicas salvas no próprio aparelho (IndexedDB),
   + troca de músicas entre aparelhos conectados e controle remoto (estilo Spotify Connect).
   Usa a conexão direta do "Conectar dispositivo" (SY). Carregar DEPOIS de index.js.

   NOVO nesta versão:
   - Só um aparelho toca por vez: ao dar play em um, os outros conectados pausam sozinhos.
   - "Tocar aqui": traz a música e a posição do outro aparelho para este.
   - Cartão do Chrome/Android mostra "Hub Pessoal" no lugar da URL (Media Session completa). */
const MU=(()=>{
const el=new Audio();el.preload='metadata';
let T=[],cur=-1,shuf=0,rep=1,url=null,seeking=0,fail=0,blocked=0,seen=new Set(),hist=[];
let RC=null,R={},XF='',lastX=0,lastB=0,bt=0,TID=0,cs='',myPlayAt=0;

/* ---- identidade do app no cartão de mídia do sistema ---- */
const APP='Hub Pessoal';
const ico=f=>{try{return new URL(f,location.href).href}catch(e){return f}};
const ART=[{src:ico('icon-192.png'),sizes:'192x192',type:'image/png'},{src:ico('icon-512.png'),sizes:'512x512',type:'image/png'}];

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
const dev=id=>(syOk()?SY._c().links:[]).find(l=>l.id==id)||{icon:'📱',name:'Outro aparelho'};
const sendJ=(c,o)=>{try{c.send(JSON.stringify(o))}catch(e){}};

/* ---- reprodução local ---- */
const playEl=()=>el.play().catch(e=>{if(e&&e.name=='NotAllowedError'){blocked=1;bcast()}});
function play(i,auto=1,c,back){
  if(i<0||i>=T.length)return;
  if(c!==undefined){if(c!==ctx)seen.clear();ctx=c}
  if(!back&&cur>=0&&cur!=i){hist.push(cur);if(hist.length>100)hist.shift()}
  seen.add(key(T[i]));
  cur=i;if(url)URL.revokeObjectURL(url);
  url=URL.createObjectURL(T[i].blob);el.src=url;
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

/* ---- só um aparelho toca por vez ---- */
/* Ao começar a tocar, aviso os outros. Quem estiver tocando pausa sozinho.
   Não depende do relógio dos aparelhos: se os dois começaram quase juntos (<1,5 s),
   desempata pelo id; senão, quem chegou depois assume. */
function act(){const m=JSON.stringify({t:'mu-act'});openConns().forEach(c=>{try{c.send(m)}catch(e){}})}
function onAct(c){
  if(cur<0||el.paused)return;
  if(Date.now()-myPlayAt<1500&&syOk()&&SY._c().id<c.hid)return;
  el.pause();
  const d=dev(c.hid);
  say('⏸ Agora tocando em '+d.icon+' '+d.name);
}

el.addEventListener('play',()=>{blocked=0;myPlayAt=Date.now();act();draw();bcast()});
el.addEventListener('pause',()=>{draw();bcast()});
el.addEventListener('loadedmetadata',()=>{draw();bcast()});
el.addEventListener('volumechange',()=>sched());
el.addEventListener('timeupdate',()=>{
  if(!RC){const s=$('#mu-s'),c=$('#mu-c');if(s&&!seeking)s.value=el.currentTime;if(c&&!seeking)c.textContent=tm(el.currentTime)}
  if(Date.now()-lastB>1000)bcast();
});
el.addEventListener('ended',()=>{
  const q=qOf(ctx),p=q.indexOf(cur);
  if(shuf||p<q.length-1)next();
  else if(rep&&q.length)play(q[0]);
  else{draw();bcast()}
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
  if(i==cur){el.pause();el.removeAttribute('src');if(url){URL.revokeObjectURL(url);url=null}cur=-1}
  else if(i<cur)cur--;
  T.splice(i,1);KM=null;hist=[];draw();bls();
}

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
  if(!l){PL.push({id:p.id,name:p.name||'Playlist',keys:p.keys||[],u:p.u||0,del:p.del?1:0});return true}
  if((p.u||0)>(l.u||0)){l.name=p.name||l.name;l.keys=p.keys||[];l.del=p.del?1:0;l.u=p.u;return true}
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
  else if(a=='sh'){shuf=!shuf;seen.clear()}else if(a=='rp')rep=!rep;
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

/* ---- telas ---- */
const ctrl=(l,pl,sh,rp)=>`<div class=row><button class="b ${sh?'':'g'} sm" onclick="${l}('sh')" title="Aleatório">🔀</button><button class="b g" onclick="${l}('pv')" title="Anterior">⏮</button><button class=b onclick="${l}('tg')">${pl?'⏸ Pausar':'▶ Tocar'}</button><button class="b g" onclick="${l}('nx')" title="Próxima">⏭</button><button class="b ${rp?'':'g'} sm" onclick="${l}('rp')" title="Repetir lista">🔁</button></div>`;
const bar=(p,d)=>`<div class=row style="margin:14px 0;flex-wrap:nowrap"><span class=s id=mu-c style="min-width:38px">${tm(p)}</span><input id=mu-s type=range min=0 max=${d} step=.1 value=${p||0} style="flex:1;width:auto" aria-label="Posição" oninput="MU.sk(this.value,1)" onchange="MU.sk(this.value)"><span class=s style="min-width:38px;text-align:right">${tm(d)}</span></div>`;

function ban(){
  const id=away();if(!id||(cur>=0&&!el.paused))return'';
  const d=dev(id),s=R[id].st;
  return`<div class=c style="grid-column:1/-1;border-color:var(--ac)"><h2>🔊 Tocando em ${esc(d.icon+' '+d.name)}</h2><p class=s>${esc(s.n||'')}</p><div class=row style="margin-top:8px"><button class=b onclick="MU.take('${id}')">Tocar aqui</button><button class="b g" onclick="MU.ctl('${id}')">🎛 Controlar</button></div></div>`;
}
function pcard(){
  const t=T[cur],pl=cur>=0&&!el.paused,d=isFinite(el.duration)?el.duration:0;
  return`<div class=c><h2>${t?esc(nm(t.name)):'Nenhuma música tocando'}</h2><p class=s>${t?mb(t.size)+(ctx&&pget(ctx)?' · playlist '+esc(pget(ctx).name):''):'Adicione músicas para começar'}</p>${bar(el.currentTime,d)}${ctrl('MU.lc',pl,shuf,rep)}<label style="margin-top:14px">Volume<input type=range min=0 max=1 step=.01 value=${el.volume} oninput="MU.vol(this.value)"></label></div>`;
}
const LIM=50,HINT='Digite o nome da música ou do artista para encontrar.';
const more=n=>n>LIM?`<p class=s>Mostrando ${LIM} de ${n}. Digite mais para refinar.</p>`:'';
const sbox=(id,v,fn)=>`<input id=${id} type=search placeholder="Buscar por música ou artista…" autocomplete=off value="${esc(v)}" oninput="${fn}(this.value)" style="margin-bottom:8px">`;
function resLib(){
  if(!T.length)return'<p class=s>Nenhuma música ainda. Use “Adicionar músicas” e escolha os arquivos do aparelho.</p>';
  const q=QL.trim();if(!q)return`<p class=s>${HINT}</p>`;
  const pl=cur>=0&&!el.paused,r=T.map((t,i)=>({t,i})).filter(x=>matches(x.t.name,q));
  if(!r.length)return`<p class=s>Nada encontrado para “${esc(q)}”.</p>`;
  return r.slice(0,LIM).map(x=>`<div class=r><div class=f style="cursor:pointer" onclick="MU.pl(${x.i})"><div style="${x.i==cur?'color:var(--ac2);font-weight:600':''}">${x.i==cur&&pl?'🔊 ':''}${esc(nm(x.t.name))}</div><div class=s>${mb(x.t.size)}</div></div><button class="b g sm" onclick="MU.pt(${x.i})" title="Adicionar a uma playlist">＋ Playlist</button><button class="b g sm" onclick="MU.rm(${x.i})" aria-label="Remover">✕</button></div>`).join('')+more(r.length);
}
function lcard(){
  return`<div class=c style="grid-column:1/-1"><h2>Biblioteca <label class="b sm" style="float:right;margin:0;cursor:pointer">+ Adicionar músicas<input type=file accept="audio/*" multiple hidden onchange="MU.add(this.files);this.value=''"></label></h2>
<p class=s style="margin-bottom:8px">${fail?'⚠ O armazenamento deste navegador não está disponível.':T.length+(T.length==1?' música':' músicas')+' · salvas só neste aparelho'}</p>${T.length?'':resLib()}</div>`;
}
function scard(){
  if(!T.length)return'';
  return`<div class=c style="grid-column:1/-1">${sbox('mu-q',QL,'MU.q')}<div id=mu-res>${resLib()}</div></div>`;
}
function rcard(){
  const d=dev(RC),r=R[RC]||{},s=r.st,p=s?rpos(r):0;
  return`<div class=c><h2>🎛 Controlando ${esc(d.icon+' '+d.name)}</h2><p class=s>${s?(s.n?esc(s.n):'Nenhuma música tocando'):'Aguardando o aparelho…'}</p>${s&&s.b?'<p class=s style="color:var(--wa);margin-top:6px">⚠ O navegador do outro aparelho bloqueou o início da música. Toque na tela dele uma vez e tente de novo.</p>':''}${bar(p,s?s.dur:0)}${ctrl('MU.cmd',s&&s.p,s&&s.sh,s&&s.rp)}<label style="margin-top:14px">Volume<input id=mu-v type=range min=0 max=1 step=.01 value=${s?s.v:1} oninput="MU.vol(this.value)"></label><button class="b g" style="margin-top:14px" onclick="MU.back()">🔊 Tocar aqui</button></div>`;
}
function resRem(){
  const r=R[RC]||{},s=r.st,L=r.names||[];
  if(!L.length)return'<p class=s>Esse aparelho ainda não tem músicas.</p>';
  const q=QR.trim();if(!q)return`<p class=s>${HINT}</p>`;
  const f=L.map((x,i)=>({x,i})).filter(o=>mt(o.x,q));
  if(!f.length)return`<p class=s>Nada encontrado para “${esc(q)}”.</p>`;
  return f.slice(0,LIM).map(o=>`<div class=r><div class=f style="cursor:pointer" onclick="MU.cmd('pl',${o.i})"><div style="${s&&o.i==s.i?'color:var(--ac2);font-weight:600':''}">${s&&o.i==s.i&&s.p?'🔊 ':''}${esc(o.x)}</div></div></div>`).join('')+more(f.length);
}
function rlcard(){
  const d=dev(RC);
  return`<div class=c style="grid-column:1/-1"><h2>Biblioteca de ${esc(d.icon+' '+d.name)}</h2>${sbox('mu-qr',QR,'MU.qr')}<div id=mu-resr>${resRem()}</div></div>`;
}
function dv(){
  const oc=openConns();
  return`<div class=c style="grid-column:1/-1"><h2>📲 Aparelhos</h2>${oc.length?oc.map(c=>{const d=dev(c.hid);return`<div class=r><div class=f>${esc(d.icon+' '+d.name)}<div class=s>${c.hid==RC?'controlando agora':'conectado'}</div></div><button class="b g sm" onclick="MU.sy('${c.hid}')">⇄ Sincronizar músicas</button>${c.hid==RC?'':`<button class="b sm" onclick="MU.ctl('${c.hid}')">🎛 Controlar</button>`}</div>`}).join(''):'<p class=s>Nenhum aparelho conectado. Conecte outro em Configurações → Dispositivos.</p><button class="b g sm" style="margin-top:8px" onclick="go(\'cfg\')">Ir para Configurações</button>'}
<p class=s id=mu-xf style="margin-top:8px">${esc(XF)}</p>
<p class=s style="margin-top:6px">Só um aparelho toca por vez: ao dar play em um, os outros pausam sozinhos. <b>Sincronizar</b> troca entre os dois as músicas que faltam. <b>Controlar</b> faz o outro aparelho tocar e você manda nele daqui. Os dois precisam estar com o Hub aberto.</p></div>`;
}
function plcard(){
  const pl=cur>=0&&!el.paused;
  return`<div class=c><h2>🎶 Playlists <button class="b sm" style="float:right" onclick="MU.pn()">+ Nova playlist</button></h2>${pls().map(p=>{const n=p.keys.filter(k=>tIdx(k)>=0).length;return`<div class=r><div class=f style="cursor:pointer" onclick="MU.po('${p.id}')"><div style="${ctx==p.id?'color:var(--ac2);font-weight:600':''}">${ctx==p.id&&pl?'🔊 ':''}${esc(p.name)}</div><div class=s>${n} ${n==1?'música':'músicas'}</div></div><button class="b g sm" onclick="MU.pplay('${p.id}')" title="Tocar">▶</button><button class="b g sm" onclick="MU.pe('${p.id}')" title="Editar">✎</button></div>`}).join('')||'<p class=s>Crie uma playlist e adicione músicas da biblioteca.</p>'}</div>`;
}
function pdet(){
  const p=pget(PV);if(!p){PV=null;return plcard()}
  const pl=cur>=0&&!el.paused,L=p.keys.map(k=>({k,i:tIdx(k)})).filter(x=>x.i>=0);
  return`<div class=c><div class=row><button class="b g sm" onclick="MU.po(null)">‹ Playlists</button><b class=f>${esc(p.name)}</b><button class="b g sm" onclick="MU.pe('${p.id}')" title="Editar">✎</button></div><p class=s style="margin:8px 0">${L.length} ${L.length==1?'música':'músicas'}</p>${L.length?`<button class=b onclick="MU.pplay('${p.id}')">▶ Tocar playlist</button>`:''}<div style="margin-top:10px">${L.map(x=>`<div class=r><div class=f style="cursor:pointer" onclick="MU.pp('${p.id}',${x.i})"><div style="${x.i==cur&&ctx==p.id?'color:var(--ac2);font-weight:600':''}">${x.i==cur&&ctx==p.id&&pl?'🔊 ':''}${esc(nm(T[x.i].name))}</div></div><button class="b g sm" onclick="MU.pr('${p.id}','${x.k}')" aria-label="Tirar da playlist">✕</button></div>`).join('')||'<p class=s>Playlist vazia. Busque e adicione músicas abaixo.</p>'}</div></div>`;
}
function resAdd(){
  const p=pget(PV);if(!p)return'';
  if(!T.length)return'<p class=s>Adicione músicas na biblioteca primeiro.</p>';
  const q=QA.trim();if(!q)return`<p class=s>${HINT}</p>`;
  const r=T.map((t,i)=>({t,i})).filter(x=>!p.keys.includes(key(x.t))&&matches(x.t.name,q));
  if(!r.length)return`<p class=s>Nada encontrado para “${esc(q)}” (ou já está na playlist).</p>`;
  return r.slice(0,LIM).map(x=>`<div class=r><div class=f>${esc(nm(x.t.name))}<div class=s>${mb(x.t.size)}</div></div><button class="b sm" onclick="MU.pa('${p.id}',${x.i})">+ Adicionar</button></div>`).join('')+more(r.length);
}
function padd(){
  return`<div class=c style="grid-column:1/-1"><h2>Adicionar da biblioteca</h2>${T.length?sbox('mu-qa',QA,'MU.qa'):''}<div id=mu-resa>${resAdd()}</div></div>`;
}
const view=()=>'<h1>Música</h1><div class=g2>'+(RC?rcard()+rlcard():PV&&pget(PV)?pcard()+pdet()+padd():scard()+ban()+pcard()+plcard()+lcard())+dv()+'</div>';

/* ---- ações de playlist ---- */
function newPL(then){
  fm('Nova playlist',[{k:'n',l:'Nome da playlist',v:'',r:1}],o=>{
    const p={id:uid(),name:o.n.trim()||'Playlist',keys:[],u:0};PL.push(p);touch(p);
    then?then(p):draw();
  });
}
function editPL(id){
  const p=pget(id);if(!p)return;
  fm('Editar playlist',[{k:'n',l:'Nome da playlist',v:p.name,r:1}],o=>{p.name=o.n.trim()||p.name;touch(p);draw()},()=>{
    if(!confirm('Excluir a playlist "'+p.name+'"? As músicas continuam na biblioteca.'))return;
    p.del=1;p.keys=[];if(PV==id)PV=null;if(ctx==id)ctx=null;touch(p);draw();
  });
}
function addTo(i){
  const k=key(T[i]),L=pls(),fin=p=>{if(!p)return;if(!p.keys.includes(k)){p.keys.push(k);touch(p)}draw()};
  if(!L.length)return newPL(fin);
  fm('Adicionar à playlist',[{k:'p',l:'Playlist',t:'select',v:L[0].id,o:[...L.map(p=>[p.id,p.name]),['__new','➕ Nova playlist…']]}],o=>{o.p=='__new'?newPL(fin):fin(pget(o.p))});
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
  pn:()=>newPL(),po(id){PV=id;draw()},pe:editPL,pt:addTo,pplay:playPL,
  pp:(id,i)=>play(i,1,id),
  pa(id,i){const p=pget(id);if(!p)return;const k=key(T[i]);if(!p.keys.includes(k)){p.keys.push(k);touch(p)}draw()},
  pr(id,k){const p=pget(id);if(!p)return;p.keys=p.keys.filter(x=>x!=k);touch(p);draw()},
  q(v){QL=v;const e=$('#mu-res');if(e)e.innerHTML=resLib()},
  qa(v){QA=v;const e=$('#mu-resa');if(e)e.innerHTML=resAdd()},
  qr(v){QR=v;const e=$('#mu-resr');if(e)e.innerHTML=resRem()},
  lc(a){if(a=='tg')toggle();else if(a=='nx')next();else if(a=='pv')prev();else if(a=='sh'){shuf=!shuf;seen.clear();draw();sched()}else if(a=='rp'){rep=!rep;draw();sched()}},
  vol(v){RC?cmd('vol',v):el.volume=+v},
  sk(v,live){if(live){seeking=1;const c=$('#mu-c');if(c)c.textContent=tm(+v)}else{RC?cmd('sk',v):el.currentTime=+v;seeking=0}},
  cmd,
  ctl(id){RC=id;el.pause();draw()},
  take,
  back(){take(RC)},
  sy(id){const c=openConns().find(x=>x.hid==id);if(!c)return;setXF('Verificando as músicas dos dois aparelhos…');sendJ(c,{t:'mu-man',items:man(),reply:1})}
};
})();