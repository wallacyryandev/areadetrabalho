/* Hub Pessoal - musica.js
   Página "Música": player com as músicas salvas no próprio aparelho (IndexedDB),
   + troca de músicas entre aparelhos conectados e controle remoto (estilo Spotify Connect).
   Usa a conexão direta do "Conectar dispositivo" (SY). Carregar DEPOIS de index.js. */
const MU=(()=>{
const el=new Audio();el.preload='metadata';
let T=[],cur=-1,shuf=0,rep=0,url=null,seeking=0,fail=0,blocked=0;
let RC=null,R={},XF='',lastX=0,lastB=0,bt=0,TID=0,cs='';

/* ---- armazenamento local (IndexedDB) ---- */
const dbp=new Promise((res,rej)=>{try{const r=indexedDB.open('hub-musicas',1);r.onupgradeneeded=()=>r.result.createObjectStore('t',{keyPath:'id',autoIncrement:true});r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)}catch(e){rej(e)}});
const tx=async(m,f)=>{const d=await dbp;return new Promise((res,rej)=>{const t=d.transaction('t',m),o=f(t.objectStore('t'));t.oncomplete=()=>res(o&&o.result);t.onerror=()=>rej(t.error);t.onabort=()=>rej(t.error)})};

/* ---- helpers ---- */
const tm=s=>isFinite(s)&&s>0?Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0'):'0:00';
const nm=n=>n.replace(/\.[^/.]+$/,'').replace(/_/g,' ').trim();
const mb=b=>(b/1048576).toFixed(1).replace('.',',')+' MB';
const draw=()=>{if(typeof page!='undefined'&&page=='mus')render()};
const isAudio=f=>f.type.startsWith('audio/')||/\.(mp3|m4a|ogg|wav|flac|aac|opus)$/i.test(f.name);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const hk=s=>{let h=5381;for(let i=0;i<s.length;i++)h=((h*33)^s.charCodeAt(i))>>>0;return h.toString(36)+'.'+s.length.toString(36)};
const key=x=>hk(x.name+'|'+x.size),man=()=>T.map(key);
const setXF=t=>{XF=t;lastX=Date.now();const e=$('#mu-xf');if(e)e.textContent=t};
const pr=t=>{XF=t;const n=Date.now();if(n-lastX>200){lastX=n;const e=$('#mu-xf');if(e)e.textContent=t}};

/* ---- playlists (só neste aparelho; guardam a chave da música, não o arquivo) ---- */
let PL=[],PV=null,ctx=null,KM=null;
try{PL=JSON.parse(localStorage.getItem('hub_playlists'))||[]}catch(e){PL=[]}
const savePL=()=>{try{localStorage.setItem('hub_playlists',JSON.stringify(PL))}catch(e){}};
const pget=id=>PL.find(p=>p.id==id);
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
function play(i,auto=1,c){
  if(i<0||i>=T.length)return;
  if(c!==undefined)ctx=c;
  cur=i;if(url)URL.revokeObjectURL(url);
  url=URL.createObjectURL(T[i].blob);el.src=url;
  if('mediaSession' in navigator)navigator.mediaSession.metadata=new MediaMetadata({title:nm(T[i].name)});
  if(auto)playEl();
  draw();
}
const nextI=d=>{const q=qOf(ctx);if(!q.length)return -1;if(shuf&&q.length>1){let n;do{n=q[Math.floor(Math.random()*q.length)]}while(n==cur);return n}const p=q.indexOf(cur);return p<0?(d>0?q[0]:q[q.length-1]):q[(p+d+q.length)%q.length]};
const next=()=>{const n=nextI(1);if(n>=0)play(n)};
const prev=()=>{if(el.currentTime>3)el.currentTime=0;else{const n=nextI(-1);if(n>=0)play(n)}};
function toggle(){if(cur<0){if(T.length)play(0);return}el.paused?playEl():el.pause()}

el.addEventListener('play',()=>{blocked=0;draw();bcast()});
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
  const ms=navigator.mediaSession;
  ms.setActionHandler('play',()=>playEl());
  ms.setActionHandler('pause',()=>el.pause());
  ms.setActionHandler('nexttrack',next);
  ms.setActionHandler('previoustrack',prev);
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
  const k=key(T[i]);PL.forEach(p=>{p.keys=p.keys.filter(x=>x!=k)});savePL();
  if(i==cur){el.pause();el.removeAttribute('src');if(url){URL.revokeObjectURL(url);url=null}cur=-1}
  else if(i<cur)cur--;
  T.splice(i,1);KM=null;draw();bls();
}

/* ---- estado enviado aos outros aparelhos (controle remoto) ---- */
const stNow=()=>({t:'mu-st',p:cur>=0&&!el.paused?1:0,i:cur,n:cur>=0&&T[cur]?nm(T[cur].name):'',pos:el.currentTime||0,dur:isFinite(el.duration)?el.duration:0,v:el.volume,sh:+shuf,rp:+rep,b:blocked});
const lsNow=()=>({t:'mu-ls',names:T.slice(0,150).map(x=>nm(x.name).slice(0,50))});
function bcast(){
  lastB=Date.now();
  const oc=openConns();if(!oc.length)return;
  const m=JSON.stringify(stNow());
  oc.forEach(c=>{try{c.send(m)}catch(e){}});
}
function bls(){const m=JSON.stringify(lsNow());openConns().forEach(c=>{try{c.send(m)}catch(e){}})}
const sched=()=>{clearTimeout(bt);bt=setTimeout(bcast,250)};

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
  if(m.t=='mu-st')onSt(id,m);
  else if(m.t=='mu-ls'){(R[id]=R[id]||{}).names=m.names||[];if(RC==id)draw()}
  else if(m.t=='mu-cmd')exec(m.a,m.v);
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
  else if(a=='sh')shuf=!shuf;else if(a=='rp')rep=!rep;
  draw();sched();
}
function onSt(id,m){
  const r=R[id]=R[id]||{},sg=[m.p,m.i,m.n,m.sh,m.rp,m.b,Math.round(m.dur)].join('|'),ch=r.sg!=sg;
  r.sg=sg;r.st=m;r.at=Date.now();
  if(RC==id&&!seeking){ch?draw():rtick()}
}
const rpos=r=>Math.min(r.st.dur||1e9,r.st.pos+(r.st.p?(Date.now()-r.at)/1000:0));
function rtick(){
  const r=R[RC];if(!r||!r.st||seeking)return;
  const p=rpos(r),c=$('#mu-c'),s=$('#mu-s'),v=$('#mu-v');
  if(c)c.textContent=tm(p);if(s)s.value=p;if(v&&document.activeElement!==v)v.value=r.st.v;
}
setInterval(()=>{if(RC&&typeof page!='undefined'&&page=='mus')rtick()},500);
function cmd(a,v){const c=openConns().find(x=>x.hid==RC);if(c)sendJ(c,{t:'mu-cmd',a,v})}

/* ---- novos aparelhos conectados / desconectados ---- */
function link(){
  if(!syOk())return;
  try{
    const oc=openConns(),ids=oc.map(c=>c.hid).sort().join(',');
    oc.forEach(c=>{if(!c._mu){c._mu=1;c.on('data',d=>onData(c,d));sendJ(c,lsNow());sendJ(c,stNow())}});
    Object.keys(R).forEach(id=>{if(!oc.some(c=>c.hid==id))delete R[id]});
    if(RC&&!oc.some(c=>c.hid==RC))RC=null;
    if(ids!=cs){cs=ids;draw()}
  }catch(e){}
}
setInterval(link,1000);

/* ---- telas ---- */
const ctrl=(l,pl,sh,rp)=>`<div class=row><button class="b ${sh?'':'g'} sm" onclick="${l}('sh')" title="Aleatório">🔀</button><button class="b g" onclick="${l}('pv')" title="Anterior">⏮</button><button class=b onclick="${l}('tg')">${pl?'⏸ Pausar':'▶ Tocar'}</button><button class="b g" onclick="${l}('nx')" title="Próxima">⏭</button><button class="b ${rp?'':'g'} sm" onclick="${l}('rp')" title="Repetir lista">🔁</button></div>`;
const bar=(p,d)=>`<div class=row style="margin:14px 0;flex-wrap:nowrap"><span class=s id=mu-c style="min-width:38px">${tm(p)}</span><input id=mu-s type=range min=0 max=${d} step=.1 value=${p||0} style="flex:1;width:auto" aria-label="Posição" oninput="MU.sk(this.value,1)" onchange="MU.sk(this.value)"><span class=s style="min-width:38px;text-align:right">${tm(d)}</span></div>`;

function pcard(){
  const t=T[cur],pl=cur>=0&&!el.paused,d=isFinite(el.duration)?el.duration:0;
  return`<div class=c><h2>${t?esc(nm(t.name)):'Nenhuma música tocando'}</h2><p class=s>${t?mb(t.size)+(ctx&&pget(ctx)?' · playlist '+esc(pget(ctx).name):''):'Adicione músicas para começar'}</p>${bar(el.currentTime,d)}${ctrl('MU.lc',pl,shuf,rep)}<label style="margin-top:14px">Volume<input type=range min=0 max=1 step=.01 value=${el.volume} oninput="MU.vol(this.value)"></label></div>`;
}
function lcard(){
  const pl=cur>=0&&!el.paused;
  return`<div class=c style="grid-column:1/-1"><h2>Biblioteca <label class="b sm" style="float:right;margin:0;cursor:pointer">+ Adicionar músicas<input type=file accept="audio/*" multiple hidden onchange="MU.add(this.files);this.value=''"></label></h2>
<p class=s style="margin-bottom:8px">${fail?'⚠ O armazenamento deste navegador não está disponível.':T.length+(T.length==1?' música':' músicas')+' · salvas só neste aparelho'}</p>
${T.map((x,i)=>`<div class=r><div class=f style="cursor:pointer" onclick="MU.pl(${i})"><div style="${i==cur?'color:var(--ac2);font-weight:600':''}">${i==cur&&pl?'🔊 ':''}${esc(nm(x.name))}</div><div class=s>${mb(x.size)}</div></div><button class="b g sm" onclick="MU.pt(${i})" title="Adicionar a uma playlist">＋ Playlist</button><button class="b g sm" onclick="MU.rm(${i})" aria-label="Remover">✕</button></div>`).join('')||'<p class=s>Nenhuma música ainda. Use “Adicionar músicas” e escolha os arquivos do aparelho.</p>'}</div>`;
}
function rcard(){
  const d=dev(RC),r=R[RC]||{},s=r.st,p=s?rpos(r):0;
  return`<div class=c><h2>🎛 Controlando ${esc(d.icon+' '+d.name)}</h2><p class=s>${s?(s.n?esc(s.n):'Nenhuma música tocando'):'Aguardando o aparelho…'}</p>${s&&s.b?'<p class=s style="color:var(--wa);margin-top:6px">⚠ O navegador do outro aparelho bloqueou o início da música. Toque na tela dele uma vez e tente de novo.</p>':''}${bar(p,s?s.dur:0)}${ctrl('MU.cmd',s&&s.p,s&&s.sh,s&&s.rp)}<label style="margin-top:14px">Volume<input id=mu-v type=range min=0 max=1 step=.01 value=${s?s.v:1} oninput="MU.vol(this.value)"></label><button class="b g" style="margin-top:14px" onclick="MU.back()">🔊 Tocar aqui</button></div>`;
}
function rlcard(){
  const d=dev(RC),r=R[RC]||{},s=r.st,L=r.names||[];
  return`<div class=c style="grid-column:1/-1"><h2>Biblioteca de ${esc(d.icon+' '+d.name)}</h2>${L.map((x,i)=>`<div class=r><div class=f style="cursor:pointer" onclick="MU.cmd('pl',${i})"><div style="${s&&i==s.i?'color:var(--ac2);font-weight:600':''}">${s&&i==s.i&&s.p?'🔊 ':''}${esc(x)}</div></div></div>`).join('')||'<p class=s>Esse aparelho ainda não tem músicas.</p>'}</div>`;
}
function dv(){
  const oc=openConns();
  return`<div class=c style="grid-column:1/-1"><h2>📲 Aparelhos</h2>${oc.length?oc.map(c=>{const d=dev(c.hid);return`<div class=r><div class=f>${esc(d.icon+' '+d.name)}<div class=s>${c.hid==RC?'controlando agora':'conectado'}</div></div><button class="b g sm" onclick="MU.sy('${c.hid}')">⇄ Sincronizar músicas</button>${c.hid==RC?'':`<button class="b sm" onclick="MU.ctl('${c.hid}')">🎛 Controlar</button>`}</div>`}).join(''):'<p class=s>Nenhum aparelho conectado. Conecte outro em Configurações → Dispositivos.</p><button class="b g sm" style="margin-top:8px" onclick="go(\'cfg\')">Ir para Configurações</button>'}
<p class=s id=mu-xf style="margin-top:8px">${esc(XF)}</p>
<p class=s style="margin-top:6px"><b>Sincronizar</b> troca entre os dois as músicas que faltam. <b>Controlar</b> faz o outro aparelho tocar e você manda nele daqui. Os dois precisam estar com o Hub aberto.</p></div>`;
}
function plcard(){
  const pl=cur>=0&&!el.paused;
  return`<div class=c><h2>🎶 Playlists <button class="b sm" style="float:right" onclick="MU.pn()">+ Nova playlist</button></h2>${PL.map(p=>{const n=p.keys.filter(k=>tIdx(k)>=0).length;return`<div class=r><div class=f style="cursor:pointer" onclick="MU.po('${p.id}')"><div style="${ctx==p.id?'color:var(--ac2);font-weight:600':''}">${ctx==p.id&&pl?'🔊 ':''}${esc(p.name)}</div><div class=s>${n} ${n==1?'música':'músicas'}</div></div><button class="b g sm" onclick="MU.pplay('${p.id}')" title="Tocar">▶</button><button class="b g sm" onclick="MU.pe('${p.id}')" title="Editar">✎</button></div>`}).join('')||'<p class=s>Crie uma playlist e adicione músicas da biblioteca.</p>'}</div>`;
}
function pdet(){
  const p=pget(PV);if(!p){PV=null;return plcard()}
  const pl=cur>=0&&!el.paused,L=p.keys.map(k=>({k,i:tIdx(k)})).filter(x=>x.i>=0);
  return`<div class=c><div class=row><button class="b g sm" onclick="MU.po(null)">‹ Playlists</button><b class=f>${esc(p.name)}</b><button class="b g sm" onclick="MU.pe('${p.id}')" title="Editar">✎</button></div><p class=s style="margin:8px 0">${L.length} ${L.length==1?'música':'músicas'}</p>${L.length?`<button class=b onclick="MU.pplay('${p.id}')">▶ Tocar playlist</button>`:''}<div style="margin-top:10px">${L.map(x=>`<div class=r><div class=f style="cursor:pointer" onclick="MU.pp('${p.id}',${x.i})"><div style="${x.i==cur&&ctx==p.id?'color:var(--ac2);font-weight:600':''}">${x.i==cur&&ctx==p.id&&pl?'🔊 ':''}${esc(nm(T[x.i].name))}</div></div><button class="b g sm" onclick="MU.pr('${p.id}','${x.k}')" aria-label="Tirar da playlist">✕</button></div>`).join('')||'<p class=s>Playlist vazia. Adicione músicas abaixo.</p>'}</div></div>`;
}
function padd(){
  const p=pget(PV),L=T.map((t,i)=>({t,i})).filter(x=>!p.keys.includes(key(x.t)));
  return`<div class=c style="grid-column:1/-1"><h2>Adicionar da biblioteca</h2>${L.map(x=>`<div class=r><div class=f>${esc(nm(x.t.name))}<div class=s>${mb(x.t.size)}</div></div><button class="b sm" onclick="MU.pa('${p.id}',${x.i})">+ Adicionar</button></div>`).join('')||`<p class=s>${T.length?'Todas as músicas da biblioteca já estão nesta playlist.':'Adicione músicas na biblioteca primeiro.'}</p>`}</div>`;
}
const view=()=>'<h1>Música</h1><div class=g2>'+(RC?rcard()+rlcard():PV&&pget(PV)?pcard()+pdet()+padd():pcard()+plcard()+lcard())+dv()+'</div>';

/* ---- ações de playlist ---- */
function newPL(then){
  fm('Nova playlist',[{k:'n',l:'Nome da playlist',v:'',r:1}],o=>{
    const p={id:uid(),name:o.n.trim()||'Playlist',keys:[]};PL.push(p);savePL();
    then?then(p):draw();
  });
}
function editPL(id){
  const p=pget(id);if(!p)return;
  fm('Editar playlist',[{k:'n',l:'Nome da playlist',v:p.name,r:1}],o=>{p.name=o.n.trim()||p.name;savePL();draw()},()=>{
    if(!confirm('Excluir a playlist "'+p.name+'"? As músicas continuam na biblioteca.'))return;
    PL=PL.filter(x=>x!=p);if(PV==id)PV=null;if(ctx==id)ctx=null;savePL();draw();
  });
}
function addTo(i){
  const k=key(T[i]),fin=p=>{if(!p)return;if(!p.keys.includes(k)){p.keys.push(k);savePL()}draw()};
  if(!PL.length)return newPL(fin);
  fm('Adicionar à playlist',[{k:'p',l:'Playlist',t:'select',v:PL[0].id,o:[...PL.map(p=>[p.id,p.name]),['__new','➕ Nova playlist…']]}],o=>{o.p=='__new'?newPL(fin):fin(pget(o.p))});
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
  pa(id,i){const p=pget(id);if(!p)return;const k=key(T[i]);if(!p.keys.includes(k)){p.keys.push(k);savePL()}draw()},
  pr(id,k){const p=pget(id);if(!p)return;p.keys=p.keys.filter(x=>x!=k);savePL();draw()},
  lc(a){if(a=='tg')toggle();else if(a=='nx')next();else if(a=='pv')prev();else if(a=='sh'){shuf=!shuf;draw();sched()}else if(a=='rp'){rep=!rep;draw();sched()}},
  vol(v){RC?cmd('vol',v):el.volume=+v},
  sk(v,live){if(live){seeking=1;const c=$('#mu-c');if(c)c.textContent=tm(+v)}else{RC?cmd('sk',v):el.currentTime=+v;seeking=0}},
  cmd,
  ctl(id){RC=id;el.pause();draw()},
  back(){cmd('ps');RC=null;draw()},
  sy(id){const c=openConns().find(x=>x.hid==id);if(!c)return;setXF('Verificando as músicas dos dois aparelhos…');sendJ(c,{t:'mu-man',items:man(),reply:1})}
};
})();