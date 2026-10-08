/* Hub Pessoal - musica.js
   Página "Música": player com as músicas salvas no próprio aparelho (IndexedDB).
   Precisa ser carregado DEPOIS do script principal do index.html (e do index.js). */
const MU=(()=>{
const el=new Audio();el.preload='metadata';
let T=[],cur=-1,shuf=0,rep=0,url=null,seeking=0,fail=0;

/* ---- armazenamento (só neste aparelho; não entra no sync nem na exportação) ---- */
const dbp=new Promise((res,rej)=>{try{const r=indexedDB.open('hub-musicas',1);r.onupgradeneeded=()=>r.result.createObjectStore('t',{keyPath:'id',autoIncrement:true});r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)}catch(e){rej(e)}});
const tx=async(m,f)=>{const d=await dbp;return new Promise((res,rej)=>{const t=d.transaction('t',m),o=f(t.objectStore('t'));t.oncomplete=()=>res(o&&o.result);t.onerror=()=>rej(t.error);t.onabort=()=>rej(t.error)})};

/* ---- helpers ---- */
const tm=s=>isFinite(s)&&s>0?Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0'):'0:00';
const nm=n=>n.replace(/\.[^/.]+$/,'').replace(/_/g,' ').trim();
const mb=b=>(b/1048576).toFixed(1).replace('.',',')+' MB';
const draw=()=>{if(typeof page!='undefined'&&page=='mus')render()};
const isAudio=f=>f.type.startsWith('audio/')||/\.(mp3|m4a|ogg|wav|flac|aac|opus)$/i.test(f.name);

/* ---- reprodução ---- */
function play(i,auto=1){
  if(i<0||i>=T.length)return;
  cur=i;if(url)URL.revokeObjectURL(url);
  url=URL.createObjectURL(T[i].blob);el.src=url;
  if('mediaSession' in navigator)navigator.mediaSession.metadata=new MediaMetadata({title:nm(T[i].name)});
  if(auto)el.play().catch(()=>{});
  draw();
}
const nextI=d=>{if(!T.length)return -1;if(shuf&&T.length>1){let n;do{n=Math.floor(Math.random()*T.length)}while(n==cur);return n}return(cur+d+T.length)%T.length};
const next=()=>{const n=nextI(1);if(n>=0)play(n)};
const prev=()=>{if(el.currentTime>3)el.currentTime=0;else{const n=nextI(-1);if(n>=0)play(n)}};
function toggle(){if(cur<0){if(T.length)play(0);return}el.paused?el.play().catch(()=>{}):el.pause()}

el.addEventListener('play',draw);
el.addEventListener('pause',draw);
el.addEventListener('loadedmetadata',draw);
el.addEventListener('timeupdate',()=>{
  const s=$('#mu-s'),c=$('#mu-c');
  if(s&&!seeking)s.value=el.currentTime;
  if(c&&!seeking)c.textContent=tm(el.currentTime);
});
el.addEventListener('ended',()=>{
  if(shuf||cur<T.length-1)next();
  else if(rep)play(0);
  else draw();
});
if('mediaSession' in navigator){
  const ms=navigator.mediaSession;
  ms.setActionHandler('play',()=>el.play());
  ms.setActionHandler('pause',()=>el.pause());
  ms.setActionHandler('nexttrack',next);
  ms.setActionHandler('previoustrack',prev);
}

/* ---- biblioteca ---- */
async function add(files){
  const L=[...files].filter(isAudio);
  for(const f of L){
    const r={name:f.name,size:f.size,blob:f};
    try{r.id=await tx('readwrite',s=>s.add(r))}catch(e){alert('Não foi possível salvar "'+f.name+'". O armazenamento do navegador pode estar cheio.');continue}
    T.push(r);
  }
  if(cur<0&&T.length)play(0,0);else draw();
}
async function del(i){
  if(!confirm('Remover "'+nm(T[i].name)+'" deste aparelho?'))return;
  try{await tx('readwrite',s=>s.delete(T[i].id))}catch(e){return}
  if(i==cur){el.pause();el.removeAttribute('src');if(url){URL.revokeObjectURL(url);url=null}cur=-1}
  else if(i<cur)cur--;
  T.splice(i,1);draw();
}

/* ---- página ---- */
const view=()=>{
  const t=T[cur],pl=cur>=0&&!el.paused,d=isFinite(el.duration)?el.duration:0;
  return`<h1>Música</h1><div class=g2>
<div class=c><h2>${t?esc(nm(t.name)):'Nenhuma música tocando'}</h2><p class=s>${t?mb(t.size):'Adicione músicas para começar'}</p>
<div class=row style="margin:14px 0;flex-wrap:nowrap"><span class=s id=mu-c style="min-width:38px">${tm(el.currentTime)}</span><input id=mu-s type=range min=0 max=${d} step=.1 value=${el.currentTime||0} style="flex:1;width:auto" aria-label="Posição" oninput="MU.sk(this.value,1)" onchange="MU.sk(this.value)"><span class=s style="min-width:38px;text-align:right">${tm(d)}</span></div>
<div class=row><button class="b ${shuf?'':'g'} sm" onclick="MU.sh()" title="Aleatório">🔀</button><button class="b g" onclick="MU.pv()" title="Anterior">⏮</button><button class=b onclick="MU.tg()">${pl?'⏸ Pausar':'▶ Tocar'}</button><button class="b g" onclick="MU.nx()" title="Próxima">⏭</button><button class="b ${rep?'':'g'} sm" onclick="MU.rp()" title="Repetir lista">🔁</button></div>
<label style="margin-top:14px">Volume<input type=range min=0 max=1 step=.01 value=${el.volume} oninput="MU.vol(this.value)"></label></div>
<div class=c style="grid-column:1/-1"><h2>Biblioteca <label class="b sm" style="float:right;margin:0;cursor:pointer">+ Adicionar músicas<input type=file accept="audio/*" multiple hidden onchange="MU.add(this.files);this.value=''"></label></h2>
<p class=s style="margin-bottom:8px">${fail?'⚠ O armazenamento deste navegador não está disponível.':T.length+(T.length==1?' música':' músicas')+' · salvas só neste aparelho'}</p>
${T.map((x,i)=>`<div class=r><div class=f style="cursor:pointer" onclick="MU.pl(${i})"><div style="${i==cur?'color:var(--ac2);font-weight:600':''}">${i==cur&&pl?'🔊 ':''}${esc(nm(x.name))}</div><div class=s>${mb(x.size)}</div></div><button class="b g sm" onclick="MU.rm(${i})" aria-label="Remover">✕</button></div>`).join('')||'<p class=s>Nenhuma música ainda. Use “Adicionar músicas” e escolha os arquivos do aparelho.</p>'}</div></div>`;
};

/* ---- registro na página ---- */
if(!PG.some(p=>p[0]=='mus'))PG.splice(PG.length-1,0,['mus','🎵','Música']);
P.mus=view;
dbp.then(()=>tx('readonly',s=>s.getAll())).then(r=>{T=r||[];draw()}).catch(()=>{fail=1;draw()});

return{
  add,pl:i=>play(i),rm:del,tg:toggle,nx:next,pv:prev,
  sh(){shuf=!shuf;draw()},
  rp(){rep=!rep;draw()},
  vol(v){el.volume=+v},
  sk(v,live){if(live){seeking=1;const c=$('#mu-c');if(c)c.textContent=tm(+v)}else{el.currentTime=+v;seeking=0}}
};
})();