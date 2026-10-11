/* Hub Pessoal - musica.js
   Página "Música": player com as músicas salvas no próprio aparelho (IndexedDB),
   + troca de músicas entre aparelhos conectados e controle remoto (estilo Spotify Connect).
   Usa a conexão direta do "Conectar dispositivo" (SY). Carregar DEPOIS de index.js.

   Informações reais da reprodução:
   - Artista, álbum e capa lidos das tags ID3v2.3/2.4 do próprio MP3 (nada é inventado).
     Prioridade dos artistas: 1) tag do arquivo  2) padrão "Cantor - Música" do nome do arquivo  3) "Artista desconhecido".
     Título, artistas, participações (feat.) e produtor/DJ são campos separados; o título nunca vira artista.
   - Tempo no formato 01:24 / 03:45 e tempo de escuta da sessão atual na tela "Tocando agora".
   - Media Session (tela de bloqueio) com título, artista, capa e nome da playlist.
   Limitações: só MP3 com ID3v2.3/2.4 tem tags lidas (M4A/FLAC/OGG/ID3v2.2 usam o nome do arquivo).

   Estatísticas de escuta: gravadas em "células" (aparelho|dia|playlist|música) e sincronizadas entre os aparelhos
   pareados pelo canal do Hub. A mescla toma o MÁXIMO de cada campo (idempotente); os totais são sempre recalculados. */
const MU=(()=>{
const els=[new Audio(),new Audio()];els.forEach(a=>a.preload='metadata');
let el=els[0],pre=null,lk=0,lr=null;
let T=[],cur=-1,shuf=0,rep=1,seeking=0,fail=0,blocked=0,seen=new Set(),hist=[],DUP=0;
let RC=null,R={},XF='',lastX=0,lastB=0,bt=0,TID=0,cs='',myPlayAt=0,TAB='home',MENU=0,STV=0;
/* estado do painel de aparelhos */
let DSO=0,dsF=null,XS={},XE={};
/* estado da tela "Tocando agora" */
let NPO=0,NF=null;

/* ---- identidade do app no cartão de mídia do sistema ---- */
const APP='Hub Pessoal',UNK='Artista desconhecido';
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
  dev:sv_('M17 1H7a2 2 0 0 0-2 2v18a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2zm0 18H7V5h10v14z'),
  check:sv_('M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z'),
  home:sv_('M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z'),
  chevd:sv_('M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z'),
  /* ícone "Conectar a um aparelho" (tela + alto-falante), desenhado em traço */
  devs:'<svg class="o" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 17H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v6"/><rect x="13" y="12" width="8" height="9" rx="1.6"/><circle cx="17" cy="17.2" r="1.7"/><path d="M8 20h4"/></svg>'
};
I.info=sv_('M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z');

/* ---- armazenamento local (IndexedDB) ---- */
const dbp=new Promise((res,rej)=>{try{const r=indexedDB.open('hub-musicas',1);r.onupgradeneeded=()=>r.result.createObjectStore('t',{keyPath:'id',autoIncrement:true});r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)}catch(e){rej(e)}});
const tx=async(m,f)=>{const d=await dbp;return new Promise((res,rej)=>{const t=d.transaction('t',m),o=f(t.objectStore('t'));t.oncomplete=()=>res(o&&o.result);t.onerror=()=>rej(t.error);t.onabort=()=>rej(t.error)})};

/* ---- helpers ---- */
/* formato 01:24 */
const tm=s=>isFinite(s)&&s>0?String(Math.floor(s/60)).padStart(2,'0')+':'+String(Math.floor(s%60)).padStart(2,'0'):'00:00';
/* LIMPEZA CENTRAL DOS NOMES (usada por nm(), logo em todas as telas, buscas, estatísticas e aparelhos conectados).
   1) tira sufixos técnicos de download: (MP3 160K), (MP3 320K), [mp3 128kbps]... em qualquer caixa/espaçamento e em qualquer posição;
   2) tira o resíduo " 1" no final. Com sufixo técnico removido junto, sempre é resíduo. Sem sufixo, só é removido quando
      o título tem 2+ palavras ("Música Exemplo 1" -> "Música Exemplo"); título de 1 palavra ("Música 1", "007") fica intacto;
   3) tira espaços extras. Idempotente: cl(cl(x))==cl(x). Não mexe em (Prod. X), feat., números no meio ou no fim (≠1). */
const TECH=/[\(\[]\s*mp3\s*\d{2,3}\s*k(?:b(?:\/?s|ps)?)?\s*[\)\]]/gi;
const cl=s=>{
  const o=String(s==null?'':s).trim();let t=o,had=false;
  t=t.replace(TECH,()=>{had=true;return' '}).replace(/\s+/g,' ').trim();
  const nw=x=>{const m=x.match(/\s+[-–—]\s+(.*)$/);return (m?m[1]:x).split(' ').filter(Boolean).length};
  for(;;){const m=t.match(/^(.*\S)\s+1$/);if(!m)break;if(!had&&nw(m[1])<2)break;t=m[1]}
  return t||o;
};
const stem=n=>n.replace(/\.[^/.]+$/,'').replace(/_/g,' ').trim();
const nm=n=>cl(stem(n));
const mb=b=>(b/1048576).toFixed(1).replace('.',',')+' MB';

/* ---- título animado do mini player (uma linha; desliza só se for maior que o espaço) ---- */
let mqKey='',mqRO=null;
function mqSetup(){
  const box=document.querySelector('.sp-mini .sp-mq'),it=box&&box.firstElementChild;
  if(!box||!it)return;
  const dist=it.scrollWidth-box.clientWidth,
        red=matchMedia('(prefers-reduced-motion: reduce)').matches,
        k=it.textContent+'|'+box.clientWidth;
  if(dist>2&&!red){
    it.style.setProperty('--mqx',-(dist+8)+'px');
    it.style.setProperty('--mqd',Math.max(6,dist/9)+'s');
    if(!it.classList.contains('run')||k!==mqKey){it.classList.remove('run');void it.offsetWidth;it.classList.add('run')}
  }else it.classList.remove('run');
  mqKey=k;
  if(mqRO)mqRO.disconnect();
  if('ResizeObserver' in window){mqRO=new ResizeObserver(()=>requestAnimationFrame(mqSetup));mqRO.observe(box)}
}
addEventListener('resize',()=>requestAnimationFrame(mqSetup));
addEventListener('orientationchange',()=>setTimeout(mqSetup,200));

const draw=()=>{
  if(typeof page=='undefined'||page!='mus')return;
  const a=document.activeElement,id=a&&a.id,ss=a&&a.selectionStart;
  render();
  requestAnimationFrame(mqSetup);
  if(DSO)dsUpd();
  if(NPO)npUpd();
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
const hue=s=>parseInt(hk(String(s)),36)%360;
/* capa da playlist: foto, se tiver; senão a cor gerada */
const plSt=p=>p.img?'background:#222 url('+p.img+') center/cover no-repeat':cov(p.name);

/* ---- barra de navegação: some na página Música (a engrenagem abre a tela de menu) ---- */
const _render=render;
window.render=function(){
  if(page!='mus'){MENU=0;STV=0;if(DSO)dsh(0);if(NPO)nph(0)}
  document.body.classList.toggle('mu-full',page=='mus');
  _render();
};

/* ---- Media Session (cartão do Chrome / tela de bloqueio) ---- */
const msMeta=i=>{
  if(!('mediaSession' in navigator)||!T[i])return;
  try{
    const m=meta(T[i]),p=ctx&&pget(ctx);
    navigator.mediaSession.metadata=new MediaMetadata({title:m.title,artist:m.artist||UNK,album:p?p.name:(m.album||APP),artwork:m.cover?[{src:m.cover,sizes:'512x512'}]:ART});
  }catch(e){}
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
/* ---- pesquisas recentes (só neste aparelho; guardam a chave da música) ---- */
const SRL=50;let SR=[];
try{const a=JSON.parse(localStorage.getItem('hub_msearch'));if(Array.isArray(a))SR=a.filter(k=>typeof k=='string').slice(0,SRL)}catch(e){SR=[]}
const saveSR=()=>{try{localStorage.setItem('hub_msearch',JSON.stringify(SR))}catch(e){}};
const recAdd=k=>{SR=[k].concat(SR.filter(x=>x!=k)).slice(0,SRL);saveSR()};
const recDrop=k=>{if(SR.includes(k)){SR=SR.filter(x=>x!=k);saveSR()}};
const recList=()=>SR.map(tIdx).filter(i=>i>=0);
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

/* ---- atalhos de reprodução ---- */
const playing=()=>cur>=0&&!el.paused;
const curPos=()=>el.currentTime||0;
const curDur=()=>isFinite(el.duration)?el.duration:0;
const curVol=()=>el.volume;
const resumeNow=()=>playEl();
const pauseNow=()=>el.pause();
const seekTo=v=>{el.currentTime=+v;msPos()};
const setVol=v=>{el.volume=Math.max(0,Math.min(1,+v))};

/* ======================================================================
   IDENTIFICAÇÃO DE ARTISTAS
   Campos separados por faixa: título, artistas, participações (feat.), produtor/DJ.
   O título nunca é usado como artista. Sem informação segura => "Artista desconhecido".
   ====================================================================== */
/* chave de comparação de nomes (sem acento, minúsculas, espaços únicos) */
const ak=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').replace(/[.\s]+$/,'').trim();
/* divide uma lista de nomes. Só divide quando todos os pedaços parecem nomes (evita quebrar "AC/DC", "Tyler, The Creator", "MC X Brasil") */
const spl=(L,re,m)=>L.flatMap(p=>{const q=p.split(re).map(x=>x.trim()).filter(Boolean);return q.length>1&&q.every(x=>x.length>=m)?q:[p]});
const splitNames=s=>{
  let L=[String(s||'').trim()];
  L=spl(L,/\s*;\s*/,1);
  L=spl(L,/\s+x\s+/i,3);
  L=spl(L,/\s*,(?!\s*the\s)\s*/i,2);
  L=spl(L,/\s+&(?!\s*the\s)\s+/i,2);
  L=spl(L,/\//,3);
  return L.map(x=>x.replace(/\s+/g,' ').trim()).filter(Boolean);
};
const uniq=L=>{const s=new Set(),o=[];L.forEach(n=>{const k=ak(n);if(k&&!s.has(k)){s.add(k);o.push(n)}});return o};
/* marcadores de participação: feat. / ft. / featuring / part. / participação (especial) (de) */
const FW='(?:(?:feat|ft)\\b\\.?|featuring\\b|part\\.|participa[cç][aã]o\\b(?:\\s+especial)?(?:\\s+de)?)';
const RA=new RegExp('\\s*[\\(\\[]?\\s*\\b'+FW+'\\s*','i');
const RTb=new RegExp('\\s*[\\(\\[]\\s*'+FW+'\\s*([^\\)\\]]+)[\\)\\]]','ig');
const RTe=/\s+(?:(?:feat|ft)\b\.?|featuring\b)\s+(.+)$/i;
/* campo de artista ("MC Kevin feat. MC PH") => {main:[...],feat:[...]} */
function parseArt(s){
  s=String(s||'').trim();
  const P=s.split(new RegExp(RA.source,'ig'));
  const main=uniq(splitNames(P[0]));
  const feat=uniq(P.slice(1).flatMap(x=>splitNames(x.replace(/[\)\]]+\s*$/,''))));
  return{main,feat:feat.filter(n=>!main.some(m=>ak(m)==ak(n)))};
}
/* tira "(prod. DJ X)" do texto; devolve o texto limpo e os produtores */
function xProd(t){
  const P=[];
  t=String(t||'').replace(/\s*[\(\[]\s*prod(?:uced)?\b\.?\s*(?:by\b|por\b)?\s*:?\s*([^\)\]]+)[\)\]]/ig,(m,x)=>{P.push(...splitNames(x));return''});
  t=t.replace(/\s+prod(?:uced)?\b\.?\s*(?:by\b|por\b)?\s*:?\s+(.+)$/i,(m,x)=>{P.push(...splitNames(x));return''});
  return{t:t.trim(),p:P};
}
/* tira "(feat. X)" do título; devolve o título limpo e os convidados */
function xFeat(t){
  const F=[];
  t=String(t||'').replace(RTb,(m,x)=>{F.push(...splitNames(x));return''});
  t=t.replace(RTe,(m,x)=>{F.push(...splitNames(x));return''});
  return{t:t.replace(/\s+/g,' ').trim(),f:F};
}
/* nome do arquivo (sem extensão), padrão "Cantor - Música" */
function parseName(stem){
  stem=String(stem||'').trim();
  const pr=xProd(stem),s=pr.t,m=s.match(/^(.*?)\s+[-–—]\s+(.+)$/);
  const left=m?m[1].trim():'',raw=m?m[2].trim():s,tf=xFeat(raw),a=left?parseArt(left):{main:[],feat:[]};
  const feat=uniq(a.feat.concat(tf.f));
  return{title:tf.t||raw,left,raw,main:a.main,feat:feat.filter(n=>!a.main.some(x=>ak(x)==ak(n))),prod:uniq(pr.p)};
}
const disp=(M,F)=>M.length?M.join(', ')+(F.length?' feat. '+F.join(', '):''):F.join(', ');
const artOf=stem=>{const f=parseName(stem);return disp(f.main,f.feat)};
const crd=m=>uniq(m.artists.concat(m.feats));
/* monta os campos da faixa a partir das tags (m.tag) e do nome do arquivo.
   Prioridade: 1) tag do arquivo  2) nome do arquivo  3) desconhecido */
function build(m,name){
  const f=parseName(nm(name)),g=m.tag||{};
  const gt=g.title?cl(String(g.title)):'',gp=gt?xProd(gt):{t:'',p:[]},gx=gt?xFeat(gp.t):{t:'',f:[]},gk=ak(gx.t);
  let title=f.title,main=[],feat=[],src='';
  /* arquivo no formato "Música - Cantor": a tag de título confirma que o lado esquerdo é o título */
  const swap=!!(f.left&&gk&&ak(f.left)==gk&&ak(f.raw)!=gk);
  if(swap)title=xFeat(f.left).t||f.left;
  const ta=g.artist?parseArt(g.artist):null;
  if(ta&&ta.main.length+ta.feat.length){
    main=ta.main;feat=ta.feat.concat(f.feat,gx.f);src='tag';
  }else if(swap){
    const r=parseArt(f.raw);main=r.main;feat=r.feat.concat(gx.f);src='name';
  }else if(f.left){
    main=f.main;feat=f.feat.concat(gx.f);src='name';
  }else feat=f.feat.concat(gx.f);
  let prod=uniq(f.prod.concat(g.prod||[],gp.p));
  if(src!='tag'){
    /* só pelo nome do arquivo: "DJ X" junto de outros artistas é tratado como DJ/produtor, não como cantor */
    const dj=n=>/^dj\s/i.test(n);
    if(main.some(dj)&&main.some(n=>!dj(n))){prod=uniq(prod.concat(main.filter(dj)));main=main.filter(n=>!dj(n))}
    const pk=new Set(prod.map(ak));main=main.filter(n=>!pk.has(ak(n)));feat=feat.filter(n=>!pk.has(ak(n)));
  }
  /* o título nunca vira artista (exceto com confirmação explícita: artista do álbum igual) */
  const tk=ak(title),conf=g.albumArtist&&parseArt(g.albumArtist).main.some(n=>ak(n)==tk);
  if(!conf){main=main.filter(n=>ak(n)!=tk);feat=feat.filter(n=>ak(n)!=tk)}
  feat=uniq(feat).filter(n=>!main.some(x=>ak(x)==ak(n)));
  m.title=title;m.artists=main;m.feats=feat;m.prod=prod;m.src=(main.length||feat.length)?src||'name':'';
  m.album=g.album||'';m.artist=disp(main,feat);
}

/* ---- estatísticas de escuta ----
   O tempo vem da posição real da música (não de um relógio), então conta certo mesmo com a tela apagada
   ou o app em segundo plano. Uma "reprodução" conta quando você ouve 30 s (ou metade, nas músicas curtas).
   ARMAZENAMENTO EM CÉLULAS: cada aparelho grava células "aparelho|dia|playlist|música" -> {s segundos, p reproduções, ar artistas}.
   Só o aparelho dono escreve na sua célula e os valores só crescem. A mescla entre aparelhos/abas toma o MÁXIMO de cada
   campo (idempotente: receber duas vezes não soma duas vezes; valor atrasado não sobrescreve valor mais novo).
   Os totais (geral, por música, artista, dia, playlist) são SEMPRE recalculados a partir das células (stBuild).
   Tempo geral: cada intervalo ouvido conta UMA vez. Tempo por artista: cada artista da faixa (inclusive participações)
   recebe o intervalo inteiro.
   Histórico antigo (hub_mstats, formato agregado) é importado uma vez como "legado" do aparelho (CL.leg[idDoAparelho]) e
   a chave antiga NÃO é apagada. */
const STK='hub_mstats',CK='hub_mcells',STKEYS=['d','tr','pl','ar','a2','ad','aq'];
const stBlank=()=>({tot:0,d:{},tr:{},pl:{},ar:{},a2:{},ad:{},aq:{}});
/* soma recursiva: números somam, objetos descem, outros valores (texto/flag) substituem */
const stSum=(b,d)=>{Object.keys(d).forEach(k=>{const v=d[k];if(typeof v=='number')b[k]=(typeof b[k]=='number'?b[k]:0)+v;else if(v&&typeof v=='object'){if(!b[k]||typeof b[k]!='object')b[k]={};stSum(b[k],v)}else b[k]=v});return b};
/* normaliza (idempotente): campos obrigatórios; histórico por artista só dos últimos 120 dias;
   nomes antigos em tr (com "(MP3 160K) 1") passam para o nome limpo, somando tempos e reproduções */
function stNorm(s){
  s=Object.assign(stBlank(),s&&typeof s=='object'?s:{});
  if(typeof s.tot!='number'||!isFinite(s.tot))s.tot=0;
  STKEYS.forEach(k=>{if(!s[k]||typeof s[k]!='object')s[k]={}});
  const c=new Date();c.setDate(c.getDate()-120);const ck=c.getFullYear()+'-'+String(c.getMonth()+1).padStart(2,'0')+'-'+String(c.getDate()).padStart(2,'0');
  Object.keys(s.ad).forEach(k=>{if(k<ck)delete s.ad[k]});
  const o={};Object.keys(s.tr).forEach(k=>{const v=s.tr[k]||{},n=cl(k),e=o[n]||(o[n]={s:0,p:0});e.s+=v.s||0;e.p+=v.p||0});s.tr=o;
  return s;
}
/* lê o formato antigo: undefined = sem acesso ao armazenamento; null = nada salvo (ou ilegível) */
const stRead=()=>{let r;try{r=localStorage.getItem(STK)}catch(e){return undefined}if(r==null)return null;try{r=JSON.parse(r)}catch(e){return null}return r&&typeof r=='object'?r:null};
let stPos=-1,stT=0,stCur=-2,stAcc=0,stCnt=0,emT=0,stLast='',CLd=0,stB=1,STT=stBlank();
const stDay=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const ME=(typeof SY!='undefined'&&SY._c&&SY._c().id)||'local';

/* ---- células: armazenamento local + mescla (máximo por campo) ---- */
const clRead=()=>{try{const r=JSON.parse(localStorage.getItem(CK));return r&&r.c&&r.leg?r:null}catch(e){return null}};
const clOk=c=>c&&typeof c.n=='string'&&c.n.length<300&&typeof c.dv=='string'&&c.dv.length<40&&/^\d{4}-\d\d-\d\d$/.test(c.d)&&c.s>=0&&c.s<172800&&(c.p||0)>=0&&(c.p||0)<5000&&(!c.ar||(Array.isArray(c.ar)&&c.ar.length<=12&&c.ar.every(x=>typeof x=='string'&&x.length<120)));
const cKey=c=>c.dv+'|'+c.d+'|'+(c.pl||'')+'|'+c.n;
function clMerge(a,b){
  let ch=0;
  Object.keys(b.leg||{}).forEach(id=>{const x=a.leg[id],y=b.leg[id];if(!x||(!x.mig&&y.mig)){a.leg[id]=y;ch++}});
  Object.keys(b.c||{}).forEach(k=>{
    const x=a.c[k],y=b.c[k];if(!x){a.c[k]=y;ch++;return}
    const s=Math.max(x.s||0,y.s||0),p=Math.max(x.p||0,y.p||0),
      ar=(y.s||0)>(x.s||0)&&y.ar&&y.ar.length?y.ar:(x.ar&&x.ar.length?x.ar:(y.ar||[]));
    if(s!=x.s||p!=x.p||ar!==x.ar){x.s=s;x.p=p;x.ar=ar;x.u=Math.max(x.u||0,y.u||0);ch++}
  });
  return ch;
}
let CL=clRead()||{v:2,leg:{},c:{}};
if(!CL.leg[ME]){const o=stRead();CL.leg[ME]=stNorm(o);CLd=1}   /* histórico antigo deste aparelho, importado uma vez; hub_mstats não é apagado */
function clSave(){
  if(!CLd)return;
  const r=clRead();if(r)clMerge(CL,r);          /* traz o que outra aba gravou; nunca diminui */
  try{localStorage.setItem(CK,JSON.stringify(CL));CLd=0}catch(e){}  /* se falhar, CLd continua 1 e tenta de novo */
}
function saveST(){clSave()}
/* totais sempre derivados das células (nunca somados ao remoto) */
function stBuild(){
  const o=stBlank();
  Object.values(CL.leg).forEach(l=>stSum(o,l));
  Object.values(CL.c).forEach(c=>{
    const s=c.s||0;if(!(s>0)&&!c.p)return;
    o.tot+=s;o.d[c.d]=(o.d[c.d]||0)+s;
    const t=o.tr[c.n]||(o.tr[c.n]={s:0,p:0});t.s+=s;t.p+=c.p||0;
    if(c.pl)o.pl[c.pl]=(o.pl[c.pl]||0)+s;
    (c.ar||[]).forEach(n=>{const k=ak(n),e=o.a2[k]||(o.a2[k]={n,s:0});e.s+=s;const dd=o.ad[c.d]||(o.ad[c.d]={});dd[k]=(dd[k]||0)+s});
  });
  return stNorm(o);
}
const stGet=()=>{if(stB){STT=stBuild();stB=0}return STT};
/* atualiza o que está na tela e depende do tempo de escuta (texto da sessão e telas de estatísticas) */
function stUi(){
  const tt=$('#mu-tt');if(tt)tt.textContent=tline();
  if((MENU||STV)&&typeof page!='undefined'&&page=='mus'){
    const e=$('#mu-stats');
    if(e){const h=statsCard();if(h!==stLast){stLast=h;e.innerHTML=h}}
  }
}
function stEmit(){if(emT)return;emT=setTimeout(()=>{emT=0;stUi()},1000)}
/* grava o intervalo na célula (aparelho|dia|playlist|música); o tempo geral conta uma vez por célula */
let DQ=new Set(),DQt=0;
function cellAdd(dk,name,plId,dt,p,m){
  const k=ME+'|'+dk+'|'+(plId||'')+'|'+name;
  const c=CL.c[k]||(CL.c[k]={dv:ME,d:dk,pl:plId||'',n:name,s:0,p:0,ar:[]});
  c.s+=dt;c.p+=p;c.u=Date.now();
  if(m.rd)c.ar=crd(m);else{m.pend=m.pend||new Set();m.pend.add(k)}   /* artistas só depois de ler as tags */
  CLd=1;stB=1;DQ.add(k);if(!DQt)DQt=setTimeout(cflush,5000);stEmit();
}
/* enquanto as tags da faixa ainda não foram lidas, os artistas ficam pendentes (evita creditar um palpite do nome do arquivo) */
function flushPend(m){
  const p=m.pend;m.pend=null;if(!p)return;
  p.forEach(k=>{const c=CL.c[k];if(c){c.ar=crd(m);DQ.add(k)}});CLd=1;stB=1;
}
/* ---- sincronização entre aparelhos pareados (mesmo canal do Hub) ---- */
function csend(L,only){
  const oc=only?[only]:openConns();if(!oc.length)return;
  for(let i=0;i<L.length;i+=60){const m=JSON.stringify({t:'mu-sx',c:L.slice(i,i+60)});oc.forEach(c=>{try{c.send(m)}catch(e){}})}
}
function cflush(){DQt=0;clSave();if(!DQ.size)return;const L=[...DQ].map(k=>CL.c[k]).filter(Boolean);DQ.clear();csend(L)}
function digest(){const g={};Object.values(CL.c).forEach(c=>{const k=c.dv+'|'+c.d,e=g[k]||(g[k]=[0,0]);e[0]++;e[1]+=Math.round((c.s||0)*10)});return g}
const sendDigest=c=>sendJ(c,{t:'mu-sd',g:digest(),leg:Object.keys(CL.leg)});
function onDigest(c,m){
  const g=m.g||{},mine=digest(),L=Object.values(CL.c).filter(x=>{const k=x.dv+'|'+x.d,r=g[k],q=mine[k];return!r||r[0]!=q[0]||r[1]!=q[1]});
  if(L.length)csend(L,c);
  const lg={};Object.keys(CL.leg).forEach(id=>{if(id==ME||!(m.leg||[]).includes(id))lg[id]=CL.leg[id]});
  if(Object.keys(lg).length)sendJ(c,{t:'mu-sx',leg:lg});
}
function onSx(c,m){
  const t={leg:{},c:{}};
  Object.keys(m.leg||{}).slice(0,20).forEach(id=>{if(id.length<40&&m.leg[id]&&typeof m.leg[id]=='object')t.leg[id]=stNorm(m.leg[id])});
  (Array.isArray(m.c)?m.c:[]).slice(0,100).forEach(x=>{if(clOk(x))t.c[cKey(x)]={dv:x.dv,d:x.d,pl:String(x.pl||''),n:x.n,s:+x.s||0,p:+x.p||0,ar:(x.ar||[]).slice(),u:+x.u||0}});
  if(!clMerge(CL,t))return;
  CLd=1;stB=1;clSave();stEmit();
  openConns().forEach(x=>{if(x!==c)sendJ(x,m)});   /* repassa; só continua se algo mudou */
}
setInterval(()=>openConns().forEach(sendDigest),60000);
/* migra o formato antigo (cantor lido do nome do arquivo) uma única vez, só no legado deste aparelho.
   Lê as tags de todas as faixas (só o cabeçalho ID3) para saber quais "cantores" antigos eram, na verdade, títulos de música. */
let migRun=0;
async function migStats(){
  const L=CL.leg[ME];
  if(!L||L.mig||migRun||!T.length)return;
  migRun=1;
  try{
    const tt=new Set(),ar=new Set();
    for(const t of T){
      const f=parseName(nm(t.name));tt.add(ak(f.title));tt.add(ak(nm(t.name)));
      let g=null;try{g=await readTags(t.blob)}catch(e){}
      if(g){
        if(g.title)tt.add(ak(xFeat(xProd(g.title).t).t));
        if(g.artist){const a=parseArt(g.artist);a.main.concat(a.feat).forEach(n=>ar.add(ak(n)))}
      }else f.main.concat(f.feat).forEach(n=>ar.add(ak(n)));  /* sem tag: só o nome do arquivo, que vale como artista */
    }
    const L2=CL.leg[ME];if(L2.mig)return;
    const dd={mig:true,a2:{},aq:{}};
    Object.entries(L2.ar||{}).forEach(([n,s])=>{
      if(!(s>0))return;
      const k=ak(n);
      /* o "cantor" antigo é o título de uma música da biblioteca e nenhuma tag o confirma como artista: quarentena (aq), preservado */
      if(tt.has(k)&&!ar.has(k)){dd.aq[n]=(dd.aq[n]||0)+s;return}
      const p=parseArt(n);
      uniq(p.main.concat(p.feat)).forEach(x=>{const kk=ak(x),e=dd.a2[kk]||(dd.a2[kk]={n:x,s:0});e.s+=s});
    });
    stSum(L2,dd);CLd=1;stB=1;clSave();stEmit();
    openConns().forEach(c=>sendJ(c,{t:'mu-sx',leg:{[ME]:L2}}));
  }finally{migRun=0}
}

/* ---- metadados reais da faixa (tags ID3 do MP3) ---- */
let SESS=0; /* segundos ouvidos desde que o app foi aberto (zera ao reabrir) */
async function readTags(blob){ /* só ID3v2.3/2.4 (MP3) */
  const h=new Uint8Array(await blob.slice(0,10).arrayBuffer());
  if(h[0]!=73||h[1]!=68||h[2]!=51||h[3]<3)return null;
  const ver=h[3],sz=((h[6]&127)<<21)|((h[7]&127)<<14)|((h[8]&127)<<7)|(h[9]&127);
  const u=new Uint8Array(await blob.slice(10,10+Math.min(sz,4194304)).arrayBuffer()),dv=new DataView(u.buffer);
  const dec=(a,e)=>{try{
    let c=['iso-8859-1','utf-16le','utf-16be','utf-8'][e]||'utf-8';
    if(e==1&&a.length>1&&a[0]==254&&a[1]==255)c='utf-16be';
    return new TextDecoder(c).decode(a).replace(/\uFEFF/g,'');
  }catch(x){return''}};
  /* valores múltiplos vêm separados por \0 */
  const txt=(a,e)=>dec(a,e).split('\0').map(x=>x.trim()).filter(Boolean);
  const o={prod:[]};let p=0;
  if(h[5]&64){ /* cabeçalho estendido: pula */
    const es=ver==4?((u[0]&127)<<21)|((u[1]&127)<<14)|((u[2]&127)<<7)|(u[3]&127):dv.getUint32(0)+4;
    p=Math.min(es,u.length);
  }
  while(p+10<=u.length){
    const id=String.fromCharCode(u[p],u[p+1],u[p+2],u[p+3]);
    if(!/^[A-Z0-9]{4}$/.test(id))break;
    const fs=ver==4?((u[p+4]&127)<<21)|((u[p+5]&127)<<14)|((u[p+6]&127)<<7)|(u[p+7]&127):dv.getUint32(p+4);
    if(!fs||p+10+fs>u.length)break;
    const f=u.subarray(p+10,p+10+fs),e=f[0];
    if(id=='TIT2')o.title=txt(f.subarray(1),e)[0]||'';
    else if(id=='TPE1')o.artist=txt(f.subarray(1),e).join(';');
    else if(id=='TPE2')o.albumArtist=txt(f.subarray(1),e).join(';');
    else if(id=='TALB')o.album=txt(f.subarray(1),e)[0]||'';
    else if(id=='TIPL'||id=='IPLS'){ /* pares função/pessoa: só produtor, DJ e mixagem */
      const L=txt(f.subarray(1),e);
      for(let i=0;i+1<L.length;i+=2)if(/produc|dj|mix/i.test(L[i]))o.prod.push(...splitNames(L[i+1]));
    }
    else if(id=='APIC'&&!o.pic){
      let i=1;while(i<f.length&&f[i])i++;
      const mime=dec(f.subarray(1,i),0);i+=2;
      if(e==0||e==3){while(i<f.length&&f[i])i++;i++}else{while(i+1<f.length&&(f[i]||f[i+1]))i+=2;i+=2}
      if(i<f.length)o.pic=new Blob([f.subarray(i)],{type:/^image\//.test(mime)?mime:'image/jpeg'});
    }
    p+=10+fs;
  }
  return o;
}
const MC=new Map();
/* redesenha (com atraso) quando uma capa termina de carregar, para as listas mostrarem a imagem */
let cdt=0;
const covDraw=()=>{clearTimeout(cdt);cdt=setTimeout(()=>{if(seeking)return covDraw();draw()},400)};
/* cor predominante da capa (calculada uma única vez por faixa, em miniatura 32x32; blob local, sem CORS) */
function palette(blob){
  return new Promise(res=>{
    const im=new Image(),u=URL.createObjectURL(blob);
    im.onload=()=>{
      try{
        const S=32,c=document.createElement('canvas');c.width=c.height=S;
        const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(im,0,0,S,S);
        const d=g.getImageData(0,0,S,S).data,B=Array.from({length:12},()=>({w:0,x:0,y:0,s:0}));let n=0;
        for(let k=0;k<d.length;k+=4){
          if(d[k+3]<128)continue;n++;
          const r=d[k]/255,gg=d[k+1]/255,b=d[k+2]/255,mx=Math.max(r,gg,b),mn=Math.min(r,gg,b),df=mx-mn;
          if(df<.08)continue;
          const l=(mx+mn)/2,den=1-Math.abs(2*l-1),sat=den>0?Math.min(1,df/den):0;
          let h=mx==r?((gg-b)/df)%6:mx==gg?(b-r)/df+2:(r-gg)/df+4;h=(h*60+360)%360;
          const e=B[Math.floor(h/30)%12],a=h*Math.PI/180;
          e.w+=df;e.x+=Math.cos(a)*df;e.y+=Math.sin(a)*df;e.s+=sat*df;
        }
        URL.revokeObjectURL(u);
        let best=B[0];B.forEach(e=>{if(e.w>best.w)best=e});
        if(!n||best.w/n<.06){res(null);return}   /* capa quase sem cor: fundo neutro */
        res({h:(Math.atan2(best.y,best.x)*180/Math.PI+360)%360,s:best.s/best.w});
      }catch(e){URL.revokeObjectURL(u);res(null)}
    };
    im.onerror=()=>{URL.revokeObjectURL(u);res(null)};
    im.src=u;
  });
}
function meta(t){
  const k=key(t);let m=MC.get(k);if(m)return m;
  m={title:'',artist:'',artists:[],feats:[],prod:[],album:'',cover:'',pal:undefined,src:'',tag:null,rd:0,pend:null};
  build(m,t.name);
  MC.set(k,m);
  readTags(t.blob).then(async o=>{
    let ch=0;
    if(o){
      m.tag=o;build(m,t.name);ch=1;
      m.rd=1;flushPend(m);
      if(o.pic&&o.pic.size>0){m.cover=URL.createObjectURL(o.pic);m.pal=await palette(o.pic)}
    }
    if(m.pal===undefined)m.pal=null;
    if(!m.rd){m.rd=1;flushPend(m)}
    if(cur>=0&&T[cur]&&MC.get(key(T[cur]))===m){msMeta(cur);if(NPO)npBg()}
    if(ch)covDraw();
  }).catch(()=>{if(m.pal===undefined)m.pal=null;if(!m.rd){m.rd=1;flushPend(m)}});
  return m;
}
const artSt=t=>{const m=meta(t);return m.cover?'background:#222 url('+m.cover+') center/cover no-repeat':'background:#2a2a2a;color:#ffffff55'};
const artIc=t=>meta(t).cover?'':I.note;
/* capa da playlist: foto escolhida, se houver; senão grade 2x2 com as 4 primeiras músicas (mesma capa usada no player e na lista) */
const plcv=(p,st,at)=>{
  if(p.img)return'<div class=sp-cv style="'+plSt(p)+';'+(st||'')+'" '+(at||'')+'></div>';
  const L=p.keys.map(tIdx).filter(i=>i>=0).slice(0,4);let c='';
  for(let n=0;n<4;n++){const t=n<L.length?T[L[n]]:null;c+=t?'<div class=sp-mc style="'+artSt(t)+'">'+artIc(t)+'</div>':'<div class=sp-mc></div>'}
  return'<div class="sp-cv sp-mos" style="'+(st||'')+'" '+(at||'')+'>'+c+'</div>';
};
const tline=()=>tm(curPos())+' / '+tm(curDur())+' · Sessão: '+fT(SESS);

/* Conta o tempo pela posição real da música. fin=1: fecha o intervalo (pausa, fim, troca de música), mesmo com a música já pausada.
   Só conta avanço real da posição (dt>0) e limitado ao tempo de relógio decorrido: pulos (seek) e eventos repetidos não contam. */
function stTick(fin){
  if(cur<0||!T[cur]||(el.paused&&!fin)){stPos=-1;return}
  const p=el.currentTime,now=Date.now();
  if(stCur!==cur){stCur=cur;stAcc=0;stCnt=0;stPos=-1}
  const dt=stPos<0?0:p-stPos,wall=stPos<0?0:(now-stT)/1000;
  stPos=fin?-1:p;stT=now;
  if(dt<=0||dt>Math.max(2,wall*(el.playbackRate||1)+1))return;
  const t=T[cur],name=nm(t.name),dk=stDay(),m=meta(t),pl=ctx!=null?pget(ctx):null;
  SESS+=dt;stAcc+=dt;let pp=0;
  if(!stCnt&&stAcc>=Math.min(30,(curDur()||60)/2)){stCnt=1;pp=1}
  cellAdd(dk,name,pl?pl.id:'',dt,pp,m);   /* o total geral conta uma vez só; cada artista da faixa recebe o intervalo ao recalcular */
}
setInterval(saveST,10000);
addEventListener('pagehide',()=>{cflush()});
document.addEventListener('visibilitychange',()=>{if(document.hidden)cflush()});
/* outra aba gravou: traz as células para a memória e atualiza a tela */
addEventListener('storage',e=>{if(e.key==CK){const r=clRead();if(r&&clMerge(CL,r)){stB=1;stUi()}}});
const fT=s=>{s=Math.round(s);return s<60?s+' s':s<3600?Math.floor(s/60)+' min':Math.floor(s/3600)+' h '+String(Math.floor(s%3600/60)).padStart(2,'0')+' min'};
const topOf=(o,f)=>Object.entries(o).filter(e=>f?f(e):1).sort((a,b)=>(b[1].p-a[1].p)||((b[1].s!=null?b[1].s:b[1])-(a[1].s!=null?a[1].s:a[1])))[0];
/* ---- "Sua escuta" no estilo Spotify: tela "Sua Máquina do Tempo" e tela "Artistas mais tocados".
   Usa os mesmos dados de stGet() (células + legado, sincronizados entre aparelhos); nada é inventado.
   O mês é o mês atual. Totais do mês: STT.d (inclui legado). Artistas do mês: STT.ad (últimos 120 dias).
   Música do mês: só as células (o legado não tem data por música). Foto do artista = capa da faixa que ele mais tocou no mês. ---- */
const tByName=n=>T.find(t=>nm(t.name)==n);
const tint=t=>{const c=t&&meta(t).pal;return c?{h:Math.round(c.h),s:Math.round(Math.min(c.s,.55)*100)}:null};
const tintBg=(c,a)=>c?'linear-gradient('+(a||'180deg')+',hsl('+c.h+','+c.s+'%,24%) 0%,#181818 100%)':'linear-gradient('+(a||'180deg')+',#2a2a2a 0%,#181818 100%)';
const fTb=s=>{s=Math.round(s);const h=Math.floor(s/3600),m=Math.floor(s%3600/60);return h?'<b>'+h+'</b><small>h</small><b>'+m+'</b><small>min</small>':m?'<b>'+m+'</b><small>min</small>':'<b>'+s+'</b><small>s</small>'};
const dkey=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const MESES=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const KB="if(event.key=='Enter'||event.key==' '){event.preventDefault();this.click()}";
/* duração em linguagem natural: "3 horas e 14 minutos" */
const fN=s=>{s=Math.round(s);const h=Math.floor(s/3600),m=Math.floor(s%3600/60);
  if(h)return h+(h==1?' hora':' horas')+(m?' e '+m+(m==1?' minuto':' minutos'):'');
  if(m)return m+(m==1?' minuto':' minutos');
  return s+(s==1?' segundo':' segundos')};
/* estatísticas do mês atual, derivadas das mesmas células/legado de stGet() */
function monthStats(){
  const S=stGet(),mk=dkey(new Date()).slice(0,7),first=Object.keys(S.d).sort()[0];
  const prev=!!(first&&first.slice(0,7)<mk);
  let tot=0;Object.keys(S.d).forEach(d=>{if(d.slice(0,7)==mk)tot+=S.d[d]});
  const tr={},at={};
  Object.values(CL.c).forEach(c=>{
    if(c.d.slice(0,7)!=mk||!(c.s>0||c.p))return;
    const t=tr[c.n]||(tr[c.n]={s:0,p:0});t.s+=c.s||0;t.p+=c.p||0;
    (c.ar||[]).forEach(n=>{const k=ak(n),o=at[k]||(at[k]={});o[c.n]=(o[c.n]||0)+(c.s||0)});
  });
  const ar={};
  Object.keys(S.ad).forEach(d=>{if(d.slice(0,7)!=mk)return;Object.keys(S.ad[d]).forEach(k=>{ar[k]=(ar[k]||0)+S.ad[d][k]})});
  const tracks=Object.entries(tr).filter(e=>e[1].s>=5).sort((a,b)=>(b[1].p-a[1].p)||(b[1].s-a[1].s));
  tracks.forEach(e=>{const o=S.tr[e[0]];e[1].nv=!!(prev&&o&&o.s<=e[1].s+1)});
  const arts=Object.entries(ar).filter(e=>e[1]>=1).sort((a,b)=>b[1]-a[1]).map(e=>{
    const k=e[0],a2=S.a2[k],o=at[k]||{},img=Object.keys(o).sort((x,y)=>o[y]-o[x])[0]||'';
    return{k,n:a2?a2.n:k,s:e[1],img,nv:!!(prev&&a2&&a2.s<=e[1]+1)};
  });
  return{tot,tracks,arts};
}
const cvOf=t=>t&&meta(t).cover?t:null;
const circ=(t,n,cls)=>{t=cvOf(t);return`<div class="st-ci ${cls||''}" style="${t?artSt(t):''}">${t?'':esc(String(n||'').trim().charAt(0).toUpperCase()||'?')}</div>`};
const stBack=()=>`<div class=st-bk><button class=sp-ib onclick="MU.sback()" aria-label="Voltar">${I.back}</button></div>`;
function statsCard(){
  const M=monthStats(),d=new Date(),mes=MESES[d.getMonth()],ano=d.getFullYear(),mn=Math.round(M.tot/60),
        mins=mn+(mn==1?' minuto':' minutos');
  if(!STV){ /* resumo dentro da tela de configurações */
    return M.tot<5
      ?`<div class=st-card><div class=st-lb>Sua escuta</div><p class=st-sm style="margin-top:8px">Ouça algumas músicas para ver aqui o seu tempo de escuta.</p></div>`
      :`<div class="st-card st-pv" role=button tabindex=0 onclick="MU.sopen('main')" onkeydown="${KB}"><div><div class=st-lb>Sua escuta · ${mes}</div><div class=st-gr>${mins}</div></div>${I.chev}</div>`;
  }
  const head=(STV=='art'
    ?`<div class=st-ah><button class=sp-ib onclick="MU.sback()" aria-label="Voltar">${I.back}</button><div class=st-at>Artistas mais tocados</div><span></span></div><p class=st-sm style="margin:22px 0 0">${mes} ${ano}</p>`
    :`${stBack()}<h2 class=st-h1>Sua Máquina do Tempo</h2><p class=st-mo><span style="color:#fff">${mes}</span> <span>${ano}</span><button class="sp-ib st-info" onclick="MU.sinfo()" aria-label="Como o tempo é calculado">${I.info}</button></p>`);
  if(M.tot<5)return`<div class=st-pg>${head}<div class=st-card><p class=st-sm>Ouça algumas músicas este mês para ver aqui o seu tempo de escuta, o artista e a música mais ouvidos.</p></div></div>`;

  /* ---- tela 2: Artistas mais tocados ---- */
  if(STV=='art'){
    const n=M.arts.length;
    return`<div class=st-pg>${head}<h2 class=st-sum>${n?`Você ouviu <span class=st-blue>${n} ${n==1?'artista':'artistas'}</span> esse mês.`:'Ainda não há artistas identificados neste mês.'}</h2>
${!n?`<div class=st-card><p class=st-sm>Para identificar artistas, use MP3 com tag de artista ou nomeie os arquivos como "Cantor - Música".</p></div>`:''}
<div class=st-ls>${M.arts.slice(0,50).map((a,i)=>`<div class=st-ar><div class=st-rk>${i+1}</div><div class=st-rb><div class=st-rt2>${a.nv?'<span class=st-badge>Novidade</span>':''}<div class=st-an>${esc(a.n)}</div><div class=st-as><b>${fN(a.s)}</b> de escuta</div></div>${circ(a.img&&tByName(a.img),a.n,'st-c3')}</div></div>`).join('')}</div>
${n>50?`<p class=st-sm style="margin-top:10px">Mostrando 50 de ${n} artistas.</p>`:''}</div>`;
  }

  /* ---- tela 1: Sua Máquina do Tempo ---- */
  const ta=M.arts[0],tt=M.tracks[0],tk=tt&&tByName(tt[0]),tm_=tk?meta(tk):null,
        title=tt?(tm_?tm_.title:parseName(tt[0]).title):'',tart=tt?(tm_?tm_.artist:artOf(tt[0])):'';
  const sq=t=>`<div class="st-ci st-sq" style="${t?artSt(t):'background:#2a2a2a'}">${t?artIc(t):I.note}</div>`;
  return`<div class=st-pg>${head}
<div class="st-card st-time"><div class=st-lb>Tempo ouvindo</div><div class=st-gr>${mins}</div></div>
<div class=st-two2>
<div class="st-card st-c2"${ta?` role=button tabindex=0 onclick="MU.sopen('art')" onkeydown="${KB}"`:''}><div class=st-hd><div><div class=st-lb>Artista mais ouvido</div><div class="st-nmb st-blue">${ta?esc(ta.n):'—'}</div></div>${ta?I.chev:''}</div><div class=st-img>${circ(ta&&ta.img&&tByName(ta.img),ta?ta.n:'?')}</div></div>
<div class="st-card st-c2"><div class=st-hd><div><div class=st-lb>Música mais ouvida</div><div class="st-nmb st-yel">${tt?esc(title):'—'}</div></div></div><div class=st-img>${sq(tk)}${tt&&tt[1].nv?'<span class=st-badge>Novidade</span>':''}</div></div>
</div>
${tt?`<div class="st-card st-bigc"><div class=st-bg style="${tk?artSt(tk):'background:#2a2a2a'}">${tk?artIc(tk):I.note}</div><div class=st-bgt><div class=st-an>${esc(title)}</div>${tart?`<div class=st-sm>${esc(tart)}</div>`:''}<div class=st-as><b>${fN(tt[1].s)}</b> de escuta${tt[1].p?` · <b>${tt[1].p}</b> ${tt[1].p==1?'reprodução':'reproduções'}`:''}</div></div></div>`:''}</div>`;
}

/* ---- reprodução local ---- */
const playEl=()=>el.play().catch(e=>{if(e&&e.name=='NotAllowedError'){blocked=1;bcast()}});
function play(i,auto=1,c,back,pos){
  if(i<0||i>=T.length)return;
  if(cur>=0&&!el.paused)stTick(1);   /* fecha o intervalo da música anterior */
  stCur=i;stAcc=0;stCnt=0;stPos=-1;   /* nova sessão de contagem para esta música */
  if(c!==undefined){if(c!==ctx)seen.clear();ctx=c}
  if(!back&&cur>=0&&cur!=i){hist.push(cur);if(hist.length>100)hist.shift()}
  seen.add(key(T[i]));
  cur=i;dropPre();els.forEach(a=>{if(a!==el)killEl(a)});
  msMeta(i);
  setSrc(el,T[i].blob);
  if(pos)el.addEventListener('loadedmetadata',()=>{try{el.currentTime=pos}catch(e){}},{once:true});
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
const prev=()=>{if(curPos()>3)seekTo(0);else if(shuf&&hist.length){const h=hist.pop();if(h<T.length)play(h,1,undefined,1)}else{const n=nextI(-1);if(n>=0)play(n)}};
function toggle(){if(cur<0){if(T.length)play(0);return}playing()?pauseNow():resumeNow()}

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
  if(cur>=0&&!el.paused)stTick(1);
  stCur=i;stAcc=0;stCnt=0;stPos=-1;
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
  if(cur<0||!playing())return;
  if(Date.now()-myPlayAt<1500&&syOk()&&SY._c().id<c.hid)return;
  pauseNow();
  const d=dev(c.hid);
  say('Agora tocando em '+d.name);
}

on('play',()=>{blocked=0;myPlayAt=Date.now();act();keep(1);draw();bcast()});
on('pause',()=>{stTick(1);cflush();keep(0);draw();bcast();stUi()});
on('loadedmetadata',()=>{draw();bcast()});
on('seeking',()=>{stPos=-1}); /* pular para outro ponto não conta como tempo ouvido */
on('playing',()=>{stPos=el.currentTime;stT=Date.now()}); /* a contagem recomeça da posição em que a música retomou */
on('ended',()=>{stTick(1);stAcc=0;stCnt=0;stPos=-1});
on('volumechange',()=>sched());
on('timeupdate',()=>{
  stTick();
  const tt=$('#mu-tt');if(tt)tt.textContent=tline();
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
  h('play',()=>resumeNow());
  h('pause',()=>pauseNow());
  h('nexttrack',next);
  h('previoustrack',prev);
  h('seekto',d=>{if(d&&d.seekTime!=null)seekTo(d.seekTime)});
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
  migStats();bls();
}
async function del(i){
  if(!confirm('Remover "'+nm(T[i].name)+'" deste aparelho?'))return;
  try{await tx('readwrite',s=>s.delete(T[i].id))}catch(e){return}
  if(i==cur&&!el.paused)stTick(1);
  dropPre();if(i==cur){killEl(el);cur=-1}
  else if(i<cur)cur--;
  const dk=key(T[i]);T.splice(i,1);KM=null;hist=[];if(!T.some(x=>key(x)==dk))recDrop(dk);draw();bls();
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
const stNow=()=>({t:'mu-st',p:playing()?1:0,i:cur,n:cur>=0&&T[cur]?nm(T[cur].name):'',pos:curPos(),dur:curDur(),v:curVol(),sh:+shuf,rp:+rep,b:blocked});
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
function hello(c){sendJ(c,lsNow());sendJ(c,stNow());PL.forEach(p=>sendJ(c,{t:'mu-pl',p}));sendDigest(c)}
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
  else if(m.t=='mu-sd')onDigest(c,m);
  else if(m.t=='mu-sx')onSx(c,m);
  else if(m.t=='mu-go')onGo(c,m);
  else if(m.t=='mu-gf'){XE[id]='Esse aparelho não tem a música "'+String(m.n||'')+'". Use "Sincronizar" e tente de novo.';delete XS[id];if(RC==id)RC=null;draw();dsUpd()}
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
  if(a=='tg')toggle();else if(a=='ps')pauseNow();else if(a=='nx')next();else if(a=='pv')prev();else if(a=='pl')play(+v,1,null);
  else if(a=='sk')seekTo(+v);else if(a=='vol')setVol(v);
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
    const i=T.findIndex(x=>nm(x.name)==cl(s.n));
    if(i<0){const m='Essa música não está neste aparelho. Use "Sincronizar músicas" primeiro.';setXF(m);say(m);return}
    const p=rpos(r);
    if(c)sendJ(c,{t:'mu-cmd',a:'ps'});
    RC=null;
    play(i,1,null,0,p);
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
<p class=sp-s style="margin:8px 0">${G.length?G.length+(G.length==1?' grupo':' grupos')+' com nome igual. <span style="color:#f5a623">Idêntica</span> = mesmo nome e tamanho. <span style="color:#b3b3b3">Parecida</span> = mesmo nome, tamanho diferente (pode ser outra qualidade).':'Nenhuma música repetida encontrada.'}</p>
${ex?`<button class=sp-btn onclick="MU.rx()">Remover ${ex} ${ex==1?'cópia idêntica':'cópias idênticas'}</button>`:''}
${G.slice(0,100).map(a=>{const kc={};a.forEach(i=>{const k=key(T[i]);kc[k]=(kc[k]||0)+1});return`<div style="margin-top:14px"><div class=sp-s><b style="color:#fff">${esc(nm(T[a[0]].name))}</b></div>${a.map(i=>`<div class=sp-r><div class=sp-i><div class=sp-n>${esc(T[i].name)}</div><div class=sp-s>${mb(T[i].size)} · ${kc[key(T[i])]>1?'<span style="color:#f5a623">idêntica</span>':'<span style="color:#b3b3b3">parecida</span>'}</div></div><button class=sp-ib onclick="MU.rm(${i})" aria-label="Remover" title="Remover">${I.x}</button></div>`).join('')}</div>`}).join('')}
${G.length>100?`<p class=sp-s style="margin-top:10px">Mostrando 100 de ${G.length} grupos. Remova alguns para ver o resto.</p>`:''}</div>`;
}

/* ======================================================================
   PAINEL DE APARELHOS (bottom sheet) + transferência entre aparelhos do Hub
   ====================================================================== */
/* transfere a reprodução deste aparelho para outro aparelho do Hub (mesma música, posição e estado) */
function xfer(id){
  const c=openConns().find(x=>x.hid==id);
  if(!c){XE[id]='Esse aparelho está desconectado.';dsUpd();return}
  delete XE[id];
  const t=cur>=0?T[cur]:null;
  if(!t){ctl(id);dsh(0);return}
  const n=nm(t.name),rn=(R[id]||{}).names;
  if(rn&&!rn.includes(n.slice(0,50))){XE[id]='A música "'+n+'" não está nesse aparelho. Use "Sincronizar" e tente de novo.';dsUpd();return}
  const pos=curPos(),was=playing();
  XS[id]=Date.now();setTimeout(dsUpd,4100);
  sendJ(c,{t:'mu-go',n,pos,p:was?1:0});
  pauseNow();
  RC=id;TAB='home';draw();dsUpd();
  setTimeout(()=>{if(DSO)dsh(0)},1000);
}
/* o outro aparelho pediu para assumir a reprodução */
function onGo(c,m){
  if(!m||!m.n)return;
  const n50=String(m.n).slice(0,50),i=T.findIndex(x=>nm(x.name).slice(0,50)==n50||stem(x.name).slice(0,50)==n50);
  if(i<0){sendJ(c,{t:'mu-gf',n:m.n});say('Não tenho "'+m.n+'" aqui. Sincronize as músicas.');return}
  const p=+m.pos||0;
  play(i,m.p?1:0,null,0,p);
}
function ctl(id){pauseNow();RC=id;draw()}
function syncDev(id){const c=openConns().find(x=>x.hid==id);if(!c)return;setXF('Verificando as músicas dos dois aparelhos…');say('Verificando as músicas dos dois aparelhos…');sendJ(c,{t:'mu-man',items:man(),reply:1})}

/* CSS do painel: todas as classes usam o prefixo "ds-" para não colidir com o CSS global do Hub */
const DSCSS=`#mu-ds{position:fixed;inset:0;z-index:9999;visibility:hidden;pointer-events:none;transition:visibility 0s linear .35s;font-family:inherit}
#mu-ds.open{visibility:visible;pointer-events:auto;transition:none}
#mu-ds *{box-sizing:border-box}
#mu-ds .ds-bk{position:absolute;inset:0;background:rgba(0,0,0,.6);opacity:0;transition:opacity .3s ease}
#mu-ds.open .ds-bk{opacity:1}
#mu-ds .ds-sh{display:block;position:absolute;left:0;right:0;bottom:0;width:auto;max-width:560px;margin:0 auto;max-height:86vh;max-height:86dvh;overflow-y:auto;overscroll-behavior:contain;background:#121212;color:#fff;border-radius:20px 20px 0 0;box-shadow:0 -12px 40px rgba(0,0,0,.6);padding:0 14px calc(18px + env(safe-area-inset-bottom,0px));transform:translateY(100%);transition:transform .35s cubic-bezier(.22,.9,.3,1);outline:0}
#mu-ds.open .ds-sh{transform:translateY(0)}
#mu-ds .ds-sh.drag{transition:none}
#mu-ds .ds-gr{display:flex;justify-content:center;padding:10px 0 6px;touch-action:none;cursor:grab;position:sticky;top:0;background:#121212;z-index:1}
#mu-ds .ds-gr i{width:40px;height:4px;border-radius:2px;background:#5a5a5a}
#mu-ds .ds-hd{display:flex;justify-content:flex-end;padding:0 2px 4px}
#mu-ds svg{width:1em;height:1em;fill:currentColor;flex:none;pointer-events:none}
#mu-ds svg.o{fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
#mu-ds .ds-x{background:none;border:0;color:#b3b3b3;font-size:22px;padding:8px;border-radius:50%;cursor:pointer;display:inline-flex}
#mu-ds .ds-x:hover{color:#fff}
#mu-ds button:focus-visible,#mu-ds summary:focus-visible{outline:2px solid #1db954;outline-offset:2px}
#mu-ds .ds-h2{color:#b3b3b3;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin:18px 4px 6px}
#mu-ds .ds-r{display:flex;align-items:center;gap:6px;border-radius:12px;margin-bottom:4px}
#mu-ds .ds-r:hover{background:#1f1f1f}
#mu-ds .ds-r.on{background:#16261c}
#mu-ds .ds-m{flex:1;min-width:0;display:flex;align-items:center;gap:12px;background:none;border:0;color:inherit;font:inherit;text-align:left;padding:10px;border-radius:12px;cursor:pointer;min-height:56px}
#mu-ds .ds-m:disabled{cursor:default;opacity:.7}
#mu-ds .ds-r.off .ds-m{opacity:.55}
#mu-ds .ds-ic{width:40px;height:40px;border-radius:50%;background:#2a2a2a;display:flex;align-items:center;justify-content:center;font-size:20px;flex:none;color:#fff}
#mu-ds .ds-r.on .ds-ic{background:#1db954;color:#000}
#mu-ds .ds-t{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
#mu-ds .ds-t b{font-size:15px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#mu-ds .ds-r.on .ds-t b{color:#1db954}
#mu-ds .ds-t small{color:#b3b3b3;font-size:12.5px;line-height:1.35}
#mu-ds .ds-b{background:transparent;color:#fff;border:0;box-shadow:inset 0 0 0 1px #727272;border-radius:999px;padding:7px 13px;font:inherit;font-size:13px;font-weight:700;cursor:pointer;margin-right:8px;white-space:nowrap}
#mu-ds .ds-b:hover{box-shadow:inset 0 0 0 1px #fff}
#mu-ds .ds-ck{color:#1db954;font-size:22px;display:inline-flex}
#mu-ds .ds-eq{display:inline-flex;align-items:flex-end;gap:2px;height:16px;width:18px;flex:none}
#mu-ds .ds-eq i{flex:1;background:#1db954;border-radius:1px;animation:ds-eq 1s ease-in-out infinite;height:30%}
#mu-ds .ds-eq i:nth-child(2){animation-delay:-.4s}
#mu-ds .ds-eq i:nth-child(3){animation-delay:-.75s}
@keyframes ds-eq{0%,100%{height:25%}50%{height:100%}}
#mu-ds .ds-spin{width:20px;height:20px;border:2px solid #444;border-top-color:#1db954;border-radius:50%;animation:ds-sp .8s linear infinite;flex:none}
@keyframes ds-sp{to{transform:rotate(360deg)}}
#mu-ds .ds-e{color:#ff6b6b;font-size:13px;margin:2px 10px 8px;line-height:1.4}
#mu-ds .ds-n{color:#b3b3b3;font-size:13px;margin:4px 10px 8px;line-height:1.4}
#mu-ds .ds-hp{margin-top:16px;border-top:1px solid #2a2a2a;padding-top:10px;font-size:13px;color:#b3b3b3}
#mu-ds .ds-hp summary{cursor:pointer;font-weight:700;color:#fff;padding:6px 4px}
#mu-ds .ds-hp p{margin:6px 4px;line-height:1.5}
#mu-ds code{background:#2a2a2a;border-radius:4px;padding:1px 5px;word-break:break-all;color:#fff}
#mu-ds .ds-r{flex-wrap:wrap}
#mu-ds .ds-b{min-height:40px}
#mu-ds .ds-n{overflow-wrap:anywhere}
@media(max-width:480px){#mu-ds .ds-sh{padding-left:10px;padding-right:10px}#mu-ds .ds-m{flex:1 1 100%}#mu-ds .ds-r>.ds-b{margin:0 10px 10px 62px}#mu-ds .ds-t b{white-space:normal;overflow-wrap:anywhere}}
@media(max-height:480px){#mu-ds .ds-sh{max-height:94vh;max-height:94dvh}}
@media(prefers-reduced-motion:reduce){#mu-ds .ds-sh,#mu-ds .ds-bk{transition:none}#mu-ds .ds-eq i,#mu-ds .ds-spin{animation-duration:2.5s}}`;

const DSHELP=`<details class=ds-hp><summary>Como conectar a TV Samsung</summary><p>Abra o Hub no navegador da TV e conecte em Configurações → Dispositivos. Ela passa a aparecer em “Aparelhos do Hub” e recebe a reprodução com a música, a posição e o estado. As músicas precisam estar sincronizadas nela (botão Sincronizar).</p></details>`;

const dsRow=o=>{
  const ind=o.busy?'<span class=ds-spin role=status aria-label="Aguarde"></span>':o.on?(o.eq?'<span class=ds-eq aria-hidden=true><i></i><i></i><i></i></span>':'<span class=ds-ck aria-hidden=true>'+I.check+'</span>'):'';
  return`<div class="ds-r${o.on?' on':''}${o.dis?' off':''}"><button class=ds-m data-k="${o.k}" ${o.dis?'disabled':''} ${o.on?'aria-current=true':''} onclick="${o.fn||''}"><span class=ds-ic>${o.ic}</span><span class=ds-t><b>${esc(o.n)}</b><small>${o.s||''}</small></span>${ind}</button>${o.x||''}</div>`;
};
function dsHub(){
  const ln=syOk()?SY._c().links:[],oc=openConns();
  const ids=[...new Set([...ln.map(l=>l.id),...oc.map(c=>c.hid)])];
  let h='<div class=ds-h2>Aparelhos do Hub</div>';
  if(!ids.length)return h+'<div class=ds-n>Nenhum aparelho do Hub conectado.</div><button class=ds-b data-k=pair style="margin-left:10px" onclick="MU.dsel(\'pair\')">Conectar aparelho</button>';
  ids.forEach(id=>{
    const d=dev(id),open=oc.some(c=>c.hid==id),st=R[id]&&R[id].st,on=open&&RC==id;
    const rp=!!(open&&st&&st.p&&R[id].at&&Date.now()-R[id].at<15000);
    const busy=open&&!!XS[id]&&Date.now()-XS[id]<4000&&!rp;
    h+=dsRow({k:'hub:'+id,on,eq:on&&rp,busy,dis:!open,ic:I.dev,n:d.name,
      s:!open?'Desconectado — abra o Hub nesse aparelho':busy?'Transferindo…':rp?'Tocando agora':on?'Controlando':'Disponível — toque para transferir a reprodução',
      fn:"MU.dsel('hub','"+id+"')",
      x:open?'<button class=ds-b data-k="sy:'+id+'" onclick="MU.dsel(\'sync\',\''+id+'\')">Sincronizar</button>':''});
    if(XE[id])h+='<p class=ds-e role=alert>'+esc(XE[id])+'</p>';
  });
  return h;
}
function dsBody(){
  const pl=playing(),loc=!RC,t=cur>=0&&T[cur];
  return dsRow({k:'local',on:loc,eq:loc&&pl,ic:I.dev,n:'Este aparelho',s:loc?(t?(pl?'Tocando agora':'Pausado'):'Pronto para tocar'):'Tocar neste aparelho',fn:"MU.dsel('local')"})+dsHub()+DSHELP;
}
function dsUpd(){
  if(!DSO)return;
  const b=document.getElementById('mu-dsb');if(!b)return;
  const f=document.activeElement,k=f&&b.contains(f)?f.getAttribute('data-k'):null,open=b.querySelector('details[open]');
  b.innerHTML=dsBody();
  if(open){const d=b.querySelector('details');if(d)d.open=true}
  if(k){const n=b.querySelector('[data-k="'+k+'"]');if(n)n.focus()}
}
function dsMount(){
  if(document.getElementById('mu-ds'))return;
  const st=document.createElement('style');st.textContent=DSCSS;document.head.appendChild(st);
  const d=document.createElement('div');d.id='mu-ds';d.inert=true;d.setAttribute('aria-hidden','true');
  d.innerHTML=`<div class=ds-bk onclick="MU.dsh(0)"></div><div class=ds-sh role=dialog aria-modal=true aria-label="Conectar a um aparelho" tabindex=-1><div class=ds-gr id=mu-dsg><i></i></div><div class=ds-hd><button class=ds-x onclick="MU.dsh(0)" aria-label="Fechar">${I.x}</button></div><div id=mu-dsb></div></div>`;
  document.body.appendChild(d);
  d.addEventListener('keydown',e=>{
    if(e.key=='Escape'){e.preventDefault();dsh(0);return}
    if(e.key!='Tab')return;
    const f=[...d.querySelectorAll('button:not(:disabled),summary')];if(!f.length)return;
    const a=f[0],z=f[f.length-1],ac=document.activeElement,sh=d.querySelector('.ds-sh');
    if(e.shiftKey&&(ac===a||ac===sh)){e.preventDefault();z.focus()}
    else if(!e.shiftKey&&ac===z){e.preventDefault();a.focus()}
  });
  /* arrastar a alça para baixo fecha o painel */
  const sh=d.querySelector('.ds-sh'),g=d.querySelector('#mu-dsg');let y0=null,dy=0;
  g.addEventListener('pointerdown',e=>{y0=e.clientY;dy=0;sh.classList.add('drag');try{g.setPointerCapture(e.pointerId)}catch(x){}});
  g.addEventListener('pointermove',e=>{if(y0==null)return;dy=Math.max(0,e.clientY-y0);sh.style.transform='translateY('+dy+'px)'});
  const end=()=>{if(y0==null)return;y0=null;sh.classList.remove('drag');sh.style.transform='';if(dy>90)dsh(0);dy=0};
  g.addEventListener('pointerup',end);g.addEventListener('pointercancel',end);
}
function dsh(v){
  dsMount();
  const d=document.getElementById('mu-ds');if(!d)return;
  if(v){
    if(DSO)return;
    dsF=document.activeElement;DSO=1;
    d.inert=false;d.setAttribute('aria-hidden','false');
    dsUpd();
    void d.offsetHeight;
    d.classList.add('open');
    document.body.style.overflow='hidden';
    setTimeout(()=>{const s=d.querySelector('.ds-sh');if(s&&DSO)s.focus()},60);
  }else{
    if(!DSO)return;
    DSO=0;d.classList.remove('open');d.inert=true;d.setAttribute('aria-hidden','true');
    document.body.style.overflow=NPO?'hidden':'';
    if(dsF&&dsF.focus){try{dsF.focus()}catch(e){}}
  }
}
function dsel(k,id){
  if(k=='local'){
    if(RC)take(RC);
    setTimeout(()=>{if(DSO)dsh(0)},500);
  }else if(k=='hub')xfer(id);
  else if(k=='sync')syncDev(id);
  else if(k=='pair'){dsh(0);go('cfg')}
}
/* ======================================================================
   TELA "TOCANDO AGORA" (sobe ao tocar no mini player, estilo Spotify)
   ====================================================================== */
const NPCSS=`#mu-np{position:fixed;inset:0;z-index:9000;visibility:hidden;pointer-events:none;transition:visibility 0s linear .35s;font-family:inherit;background:#000}
#mu-np.open{visibility:visible;pointer-events:auto;transition:none}
#mu-np *{box-sizing:border-box}
#mu-np .np-sh{position:absolute;top:0;bottom:0;left:0;right:0;max-width:560px;margin:0 auto;background:#121212;color:#fff;overflow-y:auto;overscroll-behavior:contain;padding:0 20px calc(28px + env(safe-area-inset-bottom,0px));transform:translateY(100%);transition:transform .35s cubic-bezier(.22,.9,.3,1);outline:0}
#mu-np.open .np-sh{transform:translateY(0)}
#mu-np .np-sh.drag{transition:none}
#mu-np svg{width:1em;height:1em;fill:currentColor;flex:none;pointer-events:none;vertical-align:-.125em}
#mu-np svg.o{fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
#mu-np button:focus-visible{outline:2px solid #1db954;outline-offset:2px}
#mu-np .np-gr{display:flex;justify-content:center;padding:12px 0 6px;touch-action:none;cursor:grab}
#mu-np .np-gr i{width:40px;height:4px;border-radius:2px;background:#ffffff66}
#mu-np .np-top{display:flex;align-items:center;gap:8px;margin-bottom:10px}
#mu-np .np-x{background:none;border:0;color:#fff;font-size:28px;padding:6px;border-radius:50%;cursor:pointer;display:inline-flex}
#mu-np .np-c{flex:1;min-width:0;text-align:center;display:flex;flex-direction:column;gap:2px}
#mu-np .np-c small{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#ffffffb3}
#mu-np .np-c b{font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#mu-np .np-spc{width:40px;flex:none}
#mu-np .np-art{width:min(100%,360px,44vh);aspect-ratio:1;margin:6px auto 24px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:96px;box-shadow:0 16px 40px #0009;color:#ffffffaa}
#mu-np .np-ti{display:flex;align-items:center;gap:4px}
#mu-np .np-tt{flex:1;min-width:0}
#mu-np .np-tt b{display:block;font-size:22px;font-weight:800;overflow-wrap:anywhere}
#mu-np .np-tt span{color:#ffffffb3;font-size:14px}
#mu-np .np-ft{display:flex;align-items:center;justify-content:flex-start;margin-top:14px}
#mu-np .np-h{font-size:18px;font-weight:700;margin:26px 0 8px}
#mu-np .np-bg{position:absolute;top:0;left:0;right:0;height:100vh;height:100dvh;opacity:0;transition:opacity .8s ease;pointer-events:none}
#mu-np .np-gr,#mu-np #mu-npb{position:relative;z-index:1}
@media(prefers-reduced-motion:reduce){#mu-np .np-sh,#mu-np .np-bg{transition:none}}`;

function npQueue(){
  const p=ctx&&pget(ctx);
  let h='<div class=np-h>A seguir</div>';
  if(shuf)return h+'<p class=sp-s>Modo aleatório ligado: a próxima música é sorteada.</p>';
  const q=qOf(ctx),i=q.indexOf(cur),L=i<0?[]:q.slice(i+1,i+16);
  if(!L.length)return h+'<p class=sp-s>'+(rep&&q.length>1?'Depois desta, a lista volta ao início.':'Esta é a última música da lista.')+'</p>';
  return h+L.map(j=>`<div class=sp-r><div class=sp-cv style="${artSt(T[j])}" onclick="MU.qp(${j})">${artIc(T[j])}</div><div class=sp-i onclick="MU.qp(${j})"><div class=sp-n>${esc(meta(T[j]).title)}</div><p class=sp-s>${esc(meta(T[j]).artist||UNK)}</p></div></div>`).join('');
}
function npBody(){
  const t=T[cur];if(!t)return'';
  const pl=playing(),p=ctx&&pget(ctx),d=curDur(),m=meta(t);
  return`<div class=np-top><button class=np-x onclick="MU.nph(0)" aria-label="Minimizar">${I.chevd}</button><div class=np-c><small>${p?'Tocando da playlist':'Tocando agora'}</small><b>${p?esc(p.name):'Suas músicas'}</b></div><span class=np-spc></span></div>
<div class=np-art style="${artSt(t)}">${artIc(t)}</div>
<div class=np-ti><div class=np-tt><b>${esc(m.title)}</b><span>${esc(m.artist||UNK)}</span></div><button class=sp-ib onclick="MU.npa('add')" title="Adicionar a uma playlist" aria-label="Adicionar a uma playlist">${I.plus}</button></div>
${bar(curPos(),d)}${ctrl('MU.lc',pl,shuf,rep)}${vol('mu-npv',curVol())}
<div class=np-ft>${dbi()}</div><p class=sp-s id=mu-tt style="text-align:center;margin-top:10px">${tline()}</p>${npQueue()}`;
}
/* fundo da tela cheia: gradiente com a cor predominante da capa (cacheada), escurecendo até o fundo; troca com fade entre duas camadas */
let NBG='',NBF=0;
const bgOf=t=>{
  const c=meta(t).pal;
  if(!c)return'linear-gradient(180deg,hsl(0,0%,22%) 0%,hsl(0,0%,15%) 55%,#121212 100%)';
  const h=Math.round(c.h),sa=Math.round(Math.min(c.s,.55)*100);
  return'linear-gradient(180deg,hsl('+h+','+sa+'%,28%) 0%,hsl('+h+','+Math.round(sa*.85)+'%,17%) 55%,#121212 100%)';
};
function npBg(){
  const t=T[cur];if(!t)return;
  const g=bgOf(t);if(g===NBG)return;
  const a=document.getElementById('mu-nbg'+NBF),b=document.getElementById('mu-nbg'+(1-NBF));
  if(!a||!b)return;
  NBG=g;NBF=1-NBF;b.style.background=g;b.style.opacity=1;a.style.opacity=0;
}
function npUpd(){
  if(!NPO)return;
  if(RC||cur<0||!T[cur]){nph(0);return}
  if(seeking)return;
  const b=document.getElementById('mu-npb'),sh=document.querySelector('#mu-np .np-sh');if(!b||!sh)return;
  const a=document.activeElement,L=[...b.querySelectorAll('button,input,[role=button]')],fi=a&&b.contains(a)?L.indexOf(a):-1;
  npBg();
  b.innerHTML=npBody();
  if(fi>=0){const n=[...b.querySelectorAll('button,input,[role=button]')][fi];if(n)n.focus()}
}
function npMount(){
  if(document.getElementById('mu-np'))return;
  const st=document.createElement('style');st.textContent=NPCSS;document.head.appendChild(st);
  const d=document.createElement('div');d.id='mu-np';d.inert=true;d.setAttribute('aria-hidden','true');
  d.innerHTML=`<div class=np-sh role=dialog aria-modal=true aria-label="Tocando agora" tabindex=-1><div class=np-bg id=mu-nbg0></div><div class=np-bg id=mu-nbg1></div><div class=np-gr id=mu-npg><i></i></div><div id=mu-npb></div></div>`;
  document.body.appendChild(d);
  d.addEventListener('keydown',e=>{
    if(e.key=='Escape'){e.preventDefault();nph(0);return}
    if(e.key!='Tab')return;
    const f=[...d.querySelectorAll('button:not(:disabled),input,[role=button]')];if(!f.length)return;
    const a=f[0],z=f[f.length-1],ac=document.activeElement,sh=d.querySelector('.np-sh');
    if(e.shiftKey&&(ac===a||ac===sh)){e.preventDefault();z.focus()}
    else if(!e.shiftKey&&ac===z){e.preventDefault();a.focus()}
  });
  /* arrastar a alça para baixo minimiza */
  const sh=d.querySelector('.np-sh'),g=d.querySelector('#mu-npg');let y0=null,dy=0;
  g.addEventListener('pointerdown',e=>{y0=e.clientY;dy=0;sh.classList.add('drag');try{g.setPointerCapture(e.pointerId)}catch(x){}});
  g.addEventListener('pointermove',e=>{if(y0==null)return;dy=Math.max(0,e.clientY-y0);sh.style.transform='translateY('+dy+'px)'});
  const end=()=>{if(y0==null)return;y0=null;sh.classList.remove('drag');sh.style.transform='';if(dy>110)nph(0);dy=0};
  g.addEventListener('pointerup',end);g.addEventListener('pointercancel',end);
}
function nph(v){
  npMount();
  const d=document.getElementById('mu-np');if(!d)return;
  if(v){
    if(NPO||cur<0||!T[cur]||RC)return;
    NF=document.activeElement;NPO=1;
    d.inert=false;d.setAttribute('aria-hidden','false');
    npUpd();
    void d.offsetHeight;
    d.classList.add('open');
    document.body.style.overflow='hidden';
    setTimeout(()=>{const s=d.querySelector('.np-sh');if(s&&NPO&&!DSO)s.focus()},60);
  }else{
    if(!NPO)return;
    NPO=0;d.classList.remove('open');d.inert=true;d.setAttribute('aria-hidden','true');
    document.body.style.overflow=DSO?'hidden':'';
    if(NF&&NF.focus){try{NF.focus()}catch(e){}}
  }
}
/* adicionar à playlist: minimiza a tela para o formulário aparecer por cima */
function npa(a){const i=cur;nph(0);if(i<0)return;setTimeout(()=>addTo(i),150)}

/* rótulos do botão de aparelhos no player */
const dlabel=()=>RC?dev(RC).name:'Este aparelho';
const dbtn=()=>`<div class=sp-dvr><button class="sp-dvb${RC?' on':''}" onclick="MU.dsh(1)" aria-haspopup=dialog aria-label="Conectar a um aparelho. Aparelho atual: ${esc(dlabel())}">${I.devs}<span>${esc(dlabel())}</span></button></div>`;
const dbi=()=>`<button class="sp-dvb${RC?' on':''}" onclick="MU.dsh(1)" aria-haspopup=dialog aria-label="Conectar a um aparelho. Aparelho atual: ${esc(dlabel())}" title="Conectar a um aparelho">${I.devs}<span>${esc(dlabel())}</span></button>`;

/* ---- estilo (tema escuro estilo Spotify) ---- */
const CSS=`<style>
body.mu-full nav{display:none}
body.mu-full main{margin-left:0;max-width:none;padding-bottom:18px}
.sp{background:#121212;color:#fff;border-radius:16px;padding:16px 14px 14px;min-height:60vh}
.sp *{box-sizing:border-box}
.sp svg{width:1em;height:1em;fill:currentColor;vertical-align:-.125em;flex:none;pointer-events:none}
.sp svg.o{fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.sp button:focus-visible{outline:2px solid #1db954;outline-offset:2px}
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
/* capa 2x2 da playlist: as células precisam ESTICAR (o .sp-cv base usa align-items:center, que deixava as células vazias com altura 0 quando tinham só imagem de fundo) */
.sp-mos{display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:0;padding:0;overflow:hidden;align-items:stretch;justify-items:stretch;align-content:stretch;justify-content:stretch;aspect-ratio:1}
.sp-mc{display:flex;align-items:center;justify-content:center;background:#2a2a2a;color:#ffffff55;min-width:0;min-height:0;overflow:hidden}
.sp-mos>.sp-mc{width:100%;height:100%}
.sp .sp-mc svg{width:.55em;height:.55em}
.sp-q{width:100%;background:#2a2a2a;border:0;border-radius:999px;color:#fff;padding:11px 18px;font:inherit;font-size:15px;margin-bottom:10px;outline:0}
.sp-q:focus{box-shadow:0 0 0 2px #1db954}
.sp.hb{padding-bottom:160px}
.sp-bot{position:fixed;left:0;right:0;bottom:0;z-index:40;background:#121212;box-shadow:0 -8px 24px #000c}
.sp-bi{max-width:720px;margin:0 auto}
.sp-mini{position:relative;margin:8px 8px 4px;background:#282828;border-radius:10px;padding:8px 10px 12px;display:flex;align-items:center;gap:6px}
.sp-mini .sp-i,.sp-mini .sp-cv{cursor:pointer}
.sp-mini .sp-cv{width:40px;height:40px}
.sp-mini .sp-dvb{padding:6px 8px;font-size:12px;max-width:130px}
.sp-nav{display:flex;border-top:1px solid #242424;padding-bottom:env(safe-area-inset-bottom,0px)}
.sp-nb{flex:1;background:none;border:0;color:#b3b3b3;font:inherit;font-size:11px;font-weight:600;display:flex;flex-direction:column;align-items:center;gap:3px;padding:8px 4px 10px;cursor:pointer}
.sp-nb svg{font-size:24px}
.sp-nb:hover{color:#fff}
.sp-nb.on{color:#1db954}
@media(max-width:430px){.sp-mini .sp-dvb span{display:none}}
.sp-prog{position:absolute;left:10px;right:10px;bottom:4px;height:3px;border-radius:2px;background:#555;overflow:hidden}
.sp-prog i{display:block;height:100%;background:#1db954}
/* título do mini player: uma linha; desliza horizontalmente só quando maior que o espaço disponível */
.sp-mini .sp-i{overflow:hidden}
.sp-mq{white-space:nowrap;overflow:hidden;text-overflow:clip;line-height:1.3;height:1.3em}
.sp-mqi{display:inline-block;will-change:transform}
.sp-mqi.run{animation:sp-mq var(--mqd,8s) ease-in-out infinite}
@keyframes sp-mq{0%,15%{transform:translateX(0)}45%,60%{transform:translateX(var(--mqx))}90%,100%{transform:translateX(0)}}
.sp-mini .sp-s{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin:0}
@media(prefers-reduced-motion:reduce){.sp-mqi{display:block;overflow:hidden;text-overflow:ellipsis;animation:none!important}.sp-mq{text-overflow:ellipsis}}
.sp-prof{display:flex;align-items:center;gap:14px;margin:6px 0 18px}
.sp-av{width:64px;height:64px;border-radius:50%;background:#1db954;color:#000;font-size:28px;font-weight:800;display:flex;align-items:center;justify-content:center;flex:none}
.sp-mi{display:flex;align-items:center;gap:12px;padding:14px 8px;border-radius:8px;cursor:pointer;font-size:16px;font-weight:600}
.sp-mi:hover{background:#2a2a2a}
.sp-mi span{flex:1}
.sp-mi svg{color:#b3b3b3;font-size:22px}
.sp-warn{color:#f5a623;font-size:13px;margin-top:8px}
.sp-dvr{display:flex;justify-content:flex-end;margin-top:12px}
.sp-dvb{background:none;border:0;color:#b3b3b3;display:inline-flex;align-items:center;gap:8px;font:inherit;font-size:13px;font-weight:600;cursor:pointer;padding:8px 12px;border-radius:999px;max-width:100%}
.sp-dvb:hover{color:#fff;background:#2a2a2a}
.sp-dvb.on{color:#1db954}
.sp-dvb svg{font-size:20px}
.sp-dvb span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
/* ---- "Sua escuta" no estilo Spotify: Sua Máquina do Tempo e Artistas mais tocados ---- */
.st{padding-top:8px}
.st-pg{max-width:560px;margin:0 auto}
.st-bk{display:flex;align-items:center;min-height:44px;margin-left:-6px}
.st-bk .sp-ib,.st-ah .sp-ib{font-size:26px;color:#fff}
.st-h1{font-size:clamp(28px,8vw,36px);font-weight:800;letter-spacing:-.02em;line-height:1.1;margin:14px 0 22px}
.st-mo{display:flex;align-items:center;gap:6px;font-size:18px;font-weight:700;margin:0 0 18px}
.st-mo span{color:#8a8a8a}
.st-info{font-size:18px;padding:4px}
.st-card{background:#242424;border-radius:8px;padding:14px;min-width:0;color:#fff}
.st-pv{display:flex;align-items:center;justify-content:space-between;gap:8px;cursor:pointer}
.st-pv svg{color:#b3b3b3;font-size:22px}
.st-lb{font-size:12.5px;color:#fff}
.st-gr{font-size:clamp(28px,8vw,36px);font-weight:800;color:#1ed760;margin-top:10px;letter-spacing:-.02em}
.st-sm{font-size:13px;color:#b3b3b3;line-height:1.45;margin:0}
.st-two2{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}
.st-c2{display:flex;flex-direction:column;min-height:190px}
.st-c2[role=button]{cursor:pointer}
.st-hd{display:flex;justify-content:space-between;gap:6px}
.st-hd>div{min-width:0}
.st-hd svg{color:#b3b3b3;font-size:20px}
.st-nmb{font-size:15px;font-weight:700;margin-top:4px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow-wrap:anywhere}
.st-blue{color:#509bf5}
.st-yel{color:#f5d547}
.st-img{margin-top:auto;padding-top:10px;display:flex;align-items:flex-end;justify-content:space-between;gap:6px}
.st-ci{width:min(104px,100%);aspect-ratio:1;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:36px;font-weight:800;background:#2a2a2a;color:#ffffff88;flex:none}
.st-ci svg{width:.6em;height:.6em}
.st-sq{border-radius:4px;width:min(104px,70%)}
.st-badge{display:inline-block;background:#3a3a3a;color:#fff;font-size:11px;font-weight:600;border-radius:999px;padding:4px 10px;white-space:nowrap}
.st-bigc{margin-top:8px}
.st-bg{width:100%;aspect-ratio:1;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:96px;color:#ffffff55}
.st-bgt{margin-top:14px}
.st-an{font-size:18px;font-weight:800;overflow-wrap:anywhere}
.st-as{font-size:13px;color:#b3b3b3;margin-top:6px}
.st-as b{color:#fff;font-weight:500}
.st-ah{display:grid;grid-template-columns:44px 1fr 44px;align-items:center;margin-left:-6px}
.st-at{text-align:center;font-size:16px;font-weight:700}
.st-sum{font-size:clamp(26px,7.4vw,34px);font-weight:800;line-height:1.2;margin:10px 0 26px;letter-spacing:-.02em}
.st-ar{display:flex}
.st-rk{width:36px;flex:none;padding-top:22px;color:#509bf5;font-size:12px;font-weight:700}
.st-rb{flex:1;min-width:0;display:flex;align-items:center;gap:12px;padding:16px 0;border-top:1px solid #2e2e2e}
.st-ar:first-child .st-rb{border-top:0}
.st-rt2{flex:1;min-width:0}
.st-rt2 .st-badge{margin-bottom:8px}
.st-c3{width:84px;font-size:30px}
@media(min-width:720px){.st-c2{min-height:230px}.st-ci{width:132px}.st-c3{width:96px}}
</style>`;

/* ---- telas ---- */
const ctrl=(l,pl,sh,rp)=>`<div class=sp-ctl><button class="sp-ib ${sh?'on':''}" onclick="${l}('sh')" title="Aleatório" aria-label="Aleatório">${I.shuf}</button><button class=sp-ib onclick="${l}('pv')" title="Anterior" aria-label="Anterior">${I.prev}</button><button class=sp-pp onclick="${l}('tg')" title="${pl?'Pausar':'Tocar'}" aria-label="${pl?'Pausar':'Tocar'}">${pl?I.pause:I.play}</button><button class=sp-ib onclick="${l}('nx')" title="Próxima" aria-label="Próxima">${I.next}</button><button class="sp-ib ${rp?'on':''}" onclick="${l}('rp')" title="Repetir lista" aria-label="Repetir lista">${I.rep}</button></div>`;
const bar=(p,d)=>`<div class=sp-bar><span id=mu-c>${tm(p)}</span><input id=mu-s type=range min=0 max=${d} step=.1 value=${p||0} aria-label="Posição" oninput="MU.sk(this.value,1)" onchange="MU.sk(this.value)"><span style="text-align:right">${tm(d)}</span></div>`;
const vol=(id,v)=>`<label class=sp-vol>${I.vlo}<input ${id?'id='+id:''} type=range min=0 max=1 step=.01 value=${v} aria-label="Volume" oninput="MU.vol(this.value)">${I.spk}</label>`;

function ban(){
  const id=away();if(!id||(playing()))return'';
  const d=dev(id),s=R[id].st;
  return`<div class=sp-card style="box-shadow:inset 0 0 0 1px #1db954"><div class=sp-ti style="font-size:17px">Tocando em ${esc(d.name)}</div><p class=sp-s style="margin-top:4px">${esc(s.n||'')}</p><div class=sp-row style="margin-top:12px"><button class=sp-btn onclick="MU.take('${id}')">Tocar aqui</button><button class="sp-btn g" onclick="MU.ctl('${id}')">Controlar</button></div></div>`;
}
/* Mini player (barra fixa de baixo, em todas as abas) */
function mini(){
  const t=cur>=0&&T[cur],pl=playing(),w=curDur()>0?curPos()/curDur()*100:0;
  return`<div class=sp-mini><div class=sp-cv style="${t?artSt(t):'background:#2a2a2a'}" onclick="MU.nph(1)">${t?artIc(t):I.note}</div><div class=sp-i role=button tabindex=0 aria-label="Abrir Tocando agora" onclick="MU.nph(1)" onkeydown="if(event.key=='Enter'||event.key==' '){event.preventDefault();MU.nph(1)}"><div class="sp-n sp-mq"><span class=sp-mqi>${t?esc(meta(t).title):'Nada tocando'}</span></div><p class=sp-s>${t?esc(meta(t).artist||UNK):esc(APP)}</p></div>${dbi()}<button class=sp-ib onclick="MU.lc('pv')" aria-label="Anterior">${I.prev}</button><button class="sp-pp sm" onclick="MU.lc('tg')" aria-label="Tocar ou pausar">${pl?I.pause:I.play}</button><button class=sp-ib onclick="MU.lc('nx')" aria-label="Próxima">${I.next}</button><div class=sp-prog><i id=mu-mp style="width:${w}%"></i></div></div>`;
}
/* Barra de navegação do Música (fixa embaixo) */
const bnav=()=>`<div class=sp-nav>${[['home','Início',I.home],['lib','Músicas',I.note],['pls','Playlists',I.list],['dev','Aparelhos',I.dev]].map(a=>`<button class="sp-nb${TAB==a[0]?' on':''}" onclick="MU.tab('${a[0]}')"${TAB==a[0]?' aria-current=page':''}>${a[2]}<span>${a[1]}</span></button>`).join('')}</div>`;

const LIM=50;
const more=n=>n>LIM?`<p class=sp-s style="margin:8px 8px 0">Mostrando ${LIM} de ${n}. Digite para refinar.</p>`:'';
const sbox=(id,v,fn)=>`<input class=sp-q id=${id} type=search placeholder="O que você quer ouvir?" autocomplete=off value="${esc(v)}" oninput="${fn}(this.value)">`;
const none=q=>`<p class=sp-s style="padding:8px">Nada encontrado para “${esc(q)}”.</p>`;

/* Início: grade de playlists */
function plgrid(){
  const L=pls();
  if(!L.length)return`<div class=sp-h>Suas playlists</div><div class=sp-card><p class=sp-s>Crie sua primeira playlist com as músicas da biblioteca.</p><button class=sp-btn style="margin-top:10px" onclick="MU.pn()">Nova playlist</button></div>`;
  return`<div class=sp-h>Suas playlists<button class="sp-btn g sm" onclick="MU.pn()">Nova</button></div><div class=sp-grid>${L.map(p=>{const n=p.keys.filter(k=>tIdx(k)>=0).length;return`<div class=sp-pc onclick="MU.po('${p.id}')">${plcv(p)}<div class=sp-row style="flex-wrap:nowrap"><div class=sp-i><div class=sp-n>${esc(p.name)}</div><p class=sp-s>${n} ${n==1?'música':'músicas'}</p></div><button class="sp-pp sm" onclick="event.stopPropagation();MU.pplay('${p.id}')" aria-label="Tocar playlist">${I.play}</button></div></div>`}).join('')}</div>`;
}
function home(){
  return ban()+(T.length?'':`<div class=sp-card><p class=sp-s>Sua biblioteca está vazia.</p><label class=sp-btn style="margin-top:10px;cursor:pointer">Adicionar músicas<input type=file accept="audio/*" multiple hidden onchange="MU.add(this.files);this.value=''"></label></div>`)+plgrid();
}

/* Músicas (biblioteca) */
function resLib(){
  if(!T.length)return'<p class=sp-s style="padding:8px">Nenhuma música ainda. Use “Adicionar” e escolha os arquivos do aparelho.</p>';
  const q=QL.trim();
  const row=i=>`<div class="sp-r${i==cur?' on':''}"><div class=sp-cv style="${artSt(T[i])}" onclick="MU.sp(${i})">${artIc(T[i])}</div><div class=sp-i onclick="MU.sp(${i})"><div class=sp-n>${esc(nm(T[i].name))}</div><p class=sp-s>${mb(T[i].size)}</p></div><button class=sp-ib onclick="MU.pt(${i})" title="Adicionar a uma playlist" aria-label="Adicionar a uma playlist">${I.plus}</button><button class=sp-ib onclick="MU.rm(${i})" title="Remover" aria-label="Remover">${I.x}</button></div>`;
  if(!q){
    const L=recList();
    if(!L.length)return'<p class=sp-s style="padding:8px">Suas pesquisas recentes aparecerão aqui</p>';
    return'<p class=sp-s style="padding:4px 8px 6px"><b style="color:#fff">Pesquisas recentes</b></p>'+L.map(row).join('');
  }
  const r=T.map((t,i)=>({t,i})).filter(x=>matches(x.t.name,q));
  if(!r.length)return none(q);
  return r.slice(0,LIM).map(x=>row(x.i)).join('')+more(r.length);
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
  const pl=playing();
  return`<div class=sp-h style="margin-top:0">Playlists<button class="sp-btn sm" onclick="MU.pn()">Nova playlist</button></div>${pls().map(p=>{const n=p.keys.filter(k=>tIdx(k)>=0).length;return`<div class="sp-r${ctx==p.id?' on':''}">${plcv(p,'',`onclick="MU.po('${p.id}')"`)}<div class=sp-i onclick="MU.po('${p.id}')"><div class=sp-n>${esc(p.name)}</div><p class=sp-s>${n} ${n==1?'música':'músicas'}</p></div><button class="sp-pp sm" onclick="MU.pplay('${p.id}')" title="Tocar" aria-label="Tocar">${I.play}</button><button class=sp-ib onclick="MU.pe('${p.id}')" title="Editar" aria-label="Editar">${I.edit}</button></div>`}).join('')||'<p class=sp-s style="padding:8px">Crie uma playlist e adicione músicas da biblioteca.</p>'}`;
}
function pdet(){
  const p=pget(PV);if(!p){PV=null;return plcard()}
  const pl=playing(),L=p.keys.map(k=>({k,i:tIdx(k)})).filter(x=>x.i>=0);
  return`<div class=sp-card><div class=sp-row><button class="sp-btn g sm" onclick="MU.po(null)">Voltar</button><span class=sp-i></span><button class=sp-ib onclick="MU.pe('${p.id}')" title="Editar" aria-label="Editar">${I.edit}</button></div>
<div class=sp-row style="margin:16px 0;flex-wrap:nowrap">${plcv(p,'width:96px;height:96px;font-size:40px;cursor:default')}<div class=sp-i style="cursor:default"><div class=sp-ti style="text-align:left">${esc(p.name)}</div><p class=sp-s style="margin-top:4px">${L.length} ${L.length==1?'música':'músicas'}</p></div></div>
<div class=sp-row>${L.length?`<button class=sp-btn onclick="MU.pplay('${p.id}')">Tocar playlist</button>`:''}<label class="sp-btn g sm" style="cursor:pointer">${p.img?'Trocar foto':'Adicionar foto'}<input type=file accept="image/*" hidden onchange="MU.img('${p.id}',this.files[0]);this.value=''"></label>${p.img?`<button class="sp-btn g sm" onclick="MU.noimg('${p.id}')">Remover foto</button>`:''}</div></div>
${L.map(x=>`<div class="sp-r${x.i==cur&&ctx==p.id?' on':''}"><div class=sp-cv style="${artSt(T[x.i])}" onclick="MU.pp('${p.id}',${x.i})">${artIc(T[x.i])}</div><div class=sp-i onclick="MU.pp('${p.id}',${x.i})"><div class=sp-n>${esc(nm(T[x.i].name))}</div></div><button class=sp-ib onclick="MU.pr('${p.id}','${x.k}')" title="Tirar da playlist" aria-label="Tirar da playlist">${I.x}</button></div>`).join('')||'<p class=sp-s style="padding:8px">Playlist vazia. Busque e adicione músicas abaixo.</p>'}`;
}
function resAdd(){
  const p=pget(PV);if(!p)return'';
  if(!T.length)return'<p class=sp-s style="padding:8px">Adicione músicas na biblioteca primeiro.</p>';
  const q=QA.trim();if(!q)return'<p class=sp-s style="padding:8px">Digite o nome da música para adicionar.</p>';
  const r=T.map((t,i)=>({t,i})).filter(x=>!p.keys.includes(key(x.t))&&matches(x.t.name,q));
  if(!r.length)return`<p class=sp-s style="padding:8px">Nada encontrado para “${esc(q)}” (ou já está na playlist).</p>`;
  return r.slice(0,LIM).map(x=>`<div class=sp-r><div class=sp-cv style="${artSt(x.t)}">${artIc(x.t)}</div><div class=sp-i><div class=sp-n>${esc(nm(x.t.name))}</div><p class=sp-s>${mb(x.t.size)}</p></div><button class="sp-btn g sm" onclick="MU.pa('${p.id}',${x.i})">Adicionar</button></div>`).join('')+more(r.length);
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
  return`<div class=sp-row style="margin-bottom:12px"><button class="sp-btn g sm" onclick="MU.stop()">Voltar</button></div><div class="sp-card sp-np"><p class=sp-s>Controlando ${esc(d.name)}</p><div class=sp-art style="margin-top:14px;${s&&s.n?cov(s.n):'background:#2a2a2a'}">${I.note}</div><div class=sp-ti>${s?(s.n?esc(s.n):'Nenhuma música tocando'):'Aguardando o aparelho…'}</div>${s&&s.b?'<p class=sp-warn>O navegador do outro aparelho bloqueou o início da música. Toque na tela dele uma vez e tente de novo.</p>':''}${bar(p,s?s.dur:0)}${ctrl('MU.cmd',s&&s.p,s&&s.sh,s&&s.rp)}${vol('mu-v',s?s.v:1)}${dbtn()}<button class="sp-btn g" style="margin-top:16px" onclick="MU.back()">Tocar aqui</button></div>`;
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
<div class=sp-prof>${typeof S!='undefined'&&S.photo?`<div class=sp-av style="background:#222 url('${esc(S.photo)}') center/cover no-repeat" role=img aria-label="Foto de perfil"></div>`:`<div class=sp-av>${ini}</div>`}<div><div class=sp-ti>${esc(n)}</div><p class=sp-s>${esc(APP)}</p></div></div>
<div id=mu-stats>${(stLast=statsCard())}</div>
<div class=sp-s style="margin:18px 8px 6px">Ir para</div>
${L.map(p=>`<div class=sp-mi onclick="MU.goto('${p[0]}')"><span>${esc(p[2])}</span>${I.chev}</div>`).join('')}</div>`;
}
const view=()=>{
  if(STV)return CSS+'<div class="sp hb st"><div id=mu-stats>'+(stLast=statsCard())+'</div><div class=sp-bot><div class=sp-bi>'+mini()+bnav()+'</div></div></div>';
  if(MENU)return menuView();
  let b;
  if(RC)b=rcard()+rlcard();
  else if(TAB=='lib')b=lcard();
  else if(TAB=='pls')b=PV&&pget(PV)?pdet()+padd():plcard();
  else if(TAB=='dev')b=dv();
  else b=home();
  const top=`<div class=sp-top><div class=sp-t>Música</div><button class=sp-ib onclick="MU.menu(1)" title="Configurações" aria-label="Configurações">${I.gear}</button></div>`;
  const bot=RC?'':'<div class=sp-bot><div class=sp-bi>'+mini()+bnav()+'</div></div>';
  return CSS+'<div class="sp'+(RC?'':' hb')+'">'+top+b+bot+'</div>';
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
  fm('Editar playlist',[{k:'n',l:'Nome da playlist',v:p.name,r:1}],o=>{p.name=o.n.trim()||p.name;touch(p);if(T[cur])msMeta(cur);draw()},()=>{
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
dbp.then(()=>tx('readonly',s=>s.getAll())).then(r=>{T=r||[];KM=null;migStats();draw();bls()}).catch(()=>{fail=1;draw()});

return{
  add,pl:i=>play(i,1,null),rm:del,nx:next,pv:prev,
  sp(i){const t=T[i];if(!t)return;recAdd(key(t));play(i,1,null)},
  tab(k){STV=0;MENU=0;TAB=k;draw()},
  menu(v){MENU=v?1:0;draw();window.scrollTo(0,0)},
  goto(p){MENU=0;STV=0;go(p)},
  sopen(v){STV=v;draw();window.scrollTo(0,0)},
  sback(){if(STV=='art')STV='main';else{STV=0;MENU=1}draw();window.scrollTo(0,0)},
  sinfo(){say('O tempo vem da posição real das músicas e soma os aparelhos conectados. O mês é o atual.')},
  img:setImg,noimg:noImg,
  pn:()=>newPL(),po(id){PV=id;if(id)TAB='pls';draw()},pe:editPL,pt:addTo,pplay:playPL,
  pp:(id,i)=>play(i,1,id),
  pa(id,i){const p=pget(id);if(!p)return;const k=key(T[i]);if(!p.keys.includes(k)){p.keys.push(k);touch(p)}draw()},
  pr(id,k){const p=pget(id);if(!p)return;p.keys=p.keys.filter(x=>x!=k);touch(p);draw()},
  q(v){QL=v;const e=$('#mu-res');if(e)e.innerHTML=resLib()},
  qa(v){QA=v;const e=$('#mu-resa');if(e)e.innerHTML=resAdd()},
  qr(v){QR=v;const e=$('#mu-resr');if(e)e.innerHTML=resRem()},
  lc(a){if(a=='tg')toggle();else if(a=='nx')next();else if(a=='pv')prev();else if(a=='sh'){shuf=!shuf;seen.clear();dropPre();draw();sched()}else if(a=='rp'){rep=!rep;dropPre();draw();sched()}},
  vol(v){RC?cmd('vol',v):setVol(v)},
  sk(v,live){if(live){seeking=1;const c=$('#mu-c');if(c)c.textContent=tm(+v)}else{RC?cmd('sk',v):seekTo(v);seeking=0}},
  cmd,
  ctl,
  stop(){RC=null;TAB='dev';draw()},
  take,dp(){DUP=!DUP;draw()},rx:rmExact,
  back(){take(RC)},
  sy:syncDev,
  dsh,dsel,nph,npa,
  qp(i){play(i,1,ctx)},
  dbg:()=>({ME,cells:Object.keys(CL.c).length,leg:Object.keys(CL.leg),tot:stGet().tot})
};
})();