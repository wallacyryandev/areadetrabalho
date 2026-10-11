#!/usr/bin/env node
/* Aplica as correções de reprodução + a nova Home ao musica.js original.
   Uso:  node aplicar_patch.js musica.js            -> grava musica.novo.js
         node aplicar_patch.js musica.js saida.js   -> grava em saida.js
   Cada trecho precisa existir exatamente 1 vez; se algum falhar, NADA é gravado.
   (Os trechos ficam nas linhas "//|" no fim deste arquivo; não apague.) */
const fs=require('fs');
const inp=process.argv[2]||'musica.js',out=process.argv[3]||'musica.novo.js';
let s;try{s=fs.readFileSync(inp,'utf8')}catch(e){console.log('Não consegui abrir "'+inp+'". Rode o comando na pasta onde está o musica.js.');process.exit(1)}
const lines=fs.readFileSync(__filename,'utf8').split(/\r?\n/).filter(l=>l.startsWith('//|')).map(l=>l.slice(3));
const B=[];let cur=null,mode=0;
for(const l of lines){
  if(l.startsWith('@@FIND ')){cur={label:l.slice(7),find:'',rep:[]};mode=1;continue}
  if(l==='@@REPLACE'){mode=2;continue}
  if(l==='@@END'){cur.rep=cur.rep.join('\n');B.push(cur);cur=null;mode=0;continue}
  if(mode==1)cur.find=l;else if(mode==2)cur.rep.push(l);
}
const errs=[];
for(const b of B){
  const n=s.split(b.find).length-1;
  if(n!==1){errs.push(b.label+': trecho encontrado '+n+'x (esperado 1x)');continue}
  s=s.split(b.find).join(b.rep);
}
if(errs.length){console.log('FALHOU — nada foi gravado:');errs.forEach(e=>console.log(' - '+e));console.log('O musica.js enviado difere do original em algum ponto. Me mande esta mensagem.');process.exit(1)}
fs.writeFileSync(out,s);
console.log('OK: '+B.length+' alterações aplicadas. Arquivo completo gravado em '+out+' ('+s.length+' caracteres)');
process.exit(0);
//|@@FIND 1.1 estado
//|let DSO=0,dsF=null,XS={},XE={};
//|@@REPLACE
//|let DSO=0,dsF=null,XS={},XE={};
//|let LD=0,HMC=[],AUTO=0,AX=0;try{AUTO=localStorage.getItem('hub_mauto')=='1'?1:0}catch(e){}
//|@@END
//|@@FIND 1.2 TRCK
//|else if(id=='TALB')o.album=txt(f.subarray(1),e)[0]||'';
//|@@REPLACE
//|else if(id=='TALB')o.album=txt(f.subarray(1),e)[0]||'';
//|    else if(id=='TRCK')o.trk=parseInt(txt(f.subarray(1),e)[0],10)||0;
//|@@END
//|@@FIND 1.3 qOf
//|const qOf=c=>{const p=c&&pget(c);return p?p.keys.map(tIdx).filter(i=>i>=0):T.map((_,i)=>i)};
//|@@REPLACE
//|/* contexto de uma música avulsa: só ela. Com "Continuar com a biblioteca" ligado (ação do usuário), segue a biblioteca. */
//|const solo=i=>T[i]&&!AUTO?'one:'+key(T[i]):null;
//|const trk=m=>(m.tag&&m.tag.trk)||9999;
//|function ctxL(c){
//|  if(typeof c!='string')return null;
//|  if(c.startsWith('one:')){const i=tIdx(c.slice(4));return i<0?[]:[i]}
//|  const al=c.startsWith('al:'),ar=c.startsWith('ar:');
//|  if(!al&&!ar)return null;
//|  const k=c.slice(3),L=[];
//|  T.forEach((t,i)=>{const m=meta(t);if(al?(m.album&&ak(m.album)==k):crd(m).some(n=>ak(n)==k))L.push(i)});
//|  const nn_=i=>nm(T[i].name);
//|  return L.sort((a,b)=>{const x=meta(T[a]),y=meta(T[b]);
//|    return (al?0:String(x.album).localeCompare(String(y.album)))||(trk(x)-trk(y))||nn_(a).localeCompare(nn_(b))});
//|}
//|const qOf=c=>{const x=ctxL(c);if(x)return x;const p=c&&pget(c);return p?p.keys.map(tIdx).filter(i=>i>=0):T.map((_,i)=>i)};
//|@@END
//|@@FIND 1.4a play
//|function play(i,auto=1,c,back,pos){
//|@@REPLACE
//|function play(i,auto=1,c,back,pos){
//|  if(el._pl){el.removeEventListener('loadedmetadata',el._pl);el._pl=null}
//|@@END
//|@@FIND 1.4b ctx
//|if(c!==undefined){if(c!==ctx)seen.clear();ctx=c}
//|@@REPLACE
//|if(c!==undefined){if(c!==ctx)seen.clear();ctx=c;AX=0}
//|@@END
//|@@FIND 1.4c pos
//|if(pos)el.addEventListener('loadedmetadata',()=>{try{el.currentTime=pos}catch(e){}},{once:true});
//|@@REPLACE
//|if(pos){const f=()=>{try{el.currentTime=pos}catch(e){}el._pl=null};el._pl=f;el.addEventListener('loadedmetadata',f,{once:true})}
//|@@END
//|@@FIND 1.5 killEl
//|function killEl(a){try{a.pause()}catch(e){}
//|@@REPLACE
//|function killEl(a){if(a._pl){a.removeEventListener('loadedmetadata',a._pl);a._pl=null}try{a.pause()}catch(e){}
//|@@END
//|@@FIND 1.6a next
//|const next=()=>{const n=nextI(1);if(n>=0)play(n)};
//|@@REPLACE
//|const next=()=>{const q=qOf(ctx);if(q.length<2&&!rep){if(cur>=0){pauseNow();seekTo(0)}return}const n=nextI(1);if(n>=0)play(n)};
//|@@END
//|@@FIND 1.6b peek
//|const peek=()=>{const q=qOf(ctx);if(!q.length)return -1;const p=q.indexOf(cur);
//|@@REPLACE
//|const peek=()=>{const q=qOf(ctx);if(!q.length)return -1;if(q.length<2)return rep?q[0]:-1;const p=q.indexOf(cur);
//|@@END
//|@@FIND 1.6c toggle
//|function toggle(){if(cur<0){if(T.length)play(0);return}
//|@@REPLACE
//|function toggle(){if(cur<0){if(T.length)play(0,1,null);return}
//|@@END
//|@@FIND 1.6d ended
//|if(shuf||p<q.length-1)next();
//|@@REPLACE
//|if(q.length>1&&(shuf||p<q.length-1))next();
//|@@END
//|@@FIND 1.7a touch
//|const touch=p=>{p.u=Date.now();savePL();bpl(p)};
//|@@REPLACE
//|const touch=p=>{p.u=Date.now();savePL();bpl(p);if(ctx===p.id)dropPre()};
//|@@END
//|@@FIND 1.7b onPl
//|if(!mergePL(p))return;
//|@@REPLACE
//|if(!mergePL(p))return;if(ctx===p.id)dropPre();
//|@@END
//|@@FIND 1.7c take
//|play(i,1,null,0,p);
//|@@REPLACE
//|play(i,1,solo(i),0,p);
//|@@END
//|@@FIND 1.7d onGo
//|play(i,m.p?1:0,null,0,p);
//|@@REPLACE
//|play(i,m.p?1:0,solo(i),0,p);
//|@@END
//|@@FIND 1.7e exec
//|else if(a=='pl')play(+v,1,null);
//|@@REPLACE
//|else if(a=='pl')play(+v,1,solo(+v));
//|@@END
//|@@FIND 1.8a playPL
//|play(shuf?q[Math.floor(Math.random()*q.length)]:q[0],1,id);
//|@@REPLACE
//|seen.clear();play(shuf?q[Math.floor(Math.random()*q.length)]:q[0],1,id);
//|@@END
//|@@FIND 1.8b novas funções
//|function playPL(id){
//|@@REPLACE
//|function playSolo(i){if(!T[i])return;RC=null;play(i,1,solo(i));AX=AUTO}
//|function ptog(c){
//|  if(!c)return;const q=qOf(c);if(!q.length)return;
//|  if(!RC&&ctx===c&&cur>=0&&q.includes(cur)){toggle();return}
//|  playPL(c);
//|}
//|function setAuto(v){
//|  AUTO=v?1:0;try{localStorage.setItem('hub_mauto',AUTO?'1':'0')}catch(e){}
//|  if(cur>=0&&T[cur]){
//|    if(AUTO&&typeof ctx=='string'&&ctx.startsWith('one:')){ctx=null;seen.clear();AX=1}
//|    else if(!AUTO&&AX&&ctx===null){ctx='one:'+key(T[cur]);AX=0}
//|  }
//|  dropPre();draw();sched();
//|}
//|function cinfo(){
//|  if(typeof ctx=='string'){
//|    if(ctx.startsWith('al:')){const t=T[qOf(ctx)[0]];return{k:'Tocando do álbum',n:t?meta(t).album:'Álbum'}}
//|    if(ctx.startsWith('ar:')){const k=ctx.slice(3);let n='Artista';qOf(ctx).some(i=>crd(meta(T[i])).some(x=>ak(x)==k&&(n=x)));return{k:'Tocando do artista',n}}
//|    if(ctx.startsWith('one:'))return{k:'Tocando agora',n:'Música selecionada'};
//|  }
//|  const p=ctx&&pget(ctx);return{k:p?'Tocando da playlist':'Tocando agora',n:p?p.name:'Suas músicas'};
//|}
//|function playPL(id){
//|@@END
//|@@FIND 1.9a npBody
//|const pl=playing(),p=ctx&&pget(ctx),d=curDur(),m=meta(t);
//|@@REPLACE
//|const pl=playing(),p=ctx&&pget(ctx),d=curDur(),m=meta(t),ci=cinfo();
//|@@END
//|@@FIND 1.9b npBody rótulo
//|<small>${p?'Tocando da playlist':'Tocando agora'}</small><b>${p?esc(p.name):'Suas músicas'}</b>
//|@@REPLACE
//|<small>${ci.k}</small><b>${esc(ci.n)}</b>
//|@@END
//|@@FIND 1.9c npQueue
//|let h='<div class=np-h>A seguir</div>';
//|@@REPLACE
//|let h='<div class=np-h>A seguir</div>';
//|  if(typeof ctx=='string'&&ctx.startsWith('one:'))return h+'<p class=sp-s>Você escolheu uma música avulsa. Nada toca depois dela, a menos que você ligue “Continuar com a biblioteca”.</p><button class="sp-btn g sm" style="margin-top:10px" onclick="MU.auto()">Continuar com a biblioteca</button>';
//|@@END
//|@@FIND 1.10 lcard
//|${T.length>1?`<button class="sp-btn g sm" style="margin-bottom:12px" onclick="MU.dp()">
//|@@REPLACE
//|${T.length?`<div class=sp-row style="margin-bottom:12px"><button class="sp-btn sm" onclick="MU.pall()">Tocar biblioteca</button><button class="sp-btn g sm" role=switch aria-checked="${AUTO?'true':'false'}" onclick="MU.auto()">Continuar com a biblioteca: ${AUTO?'ligado':'desligado'}</button></div>`:''}
//|${T.length>1?`<button class="sp-btn g sm" style="margin-bottom:12px" onclick="MU.dp()">
//|@@END
//|@@FIND 1.11a export sp
//|sp(i){const t=T[i];if(!t)return;recAdd(key(t));RC=null;play(i,1,null)},
//|@@REPLACE
//|sp(i){const t=T[i];if(!t)return;recAdd(key(t));playSolo(i)},
//|  ps:playSolo,hs(i){if(!RC&&cur==i&&cur>=0){toggle();return}playSolo(i)},hp(n){ptog(HMC[n])},auto(){setAuto(!AUTO)},pall:()=>playPL(null),
//|@@END
//|@@FIND 1.11b export pl
//|pl:i=>{RC=null;play(i,1,null)},rm:del,
//|@@REPLACE
//|pl:playSolo,rm:del,
//|@@END
//|@@FIND 2.1 loader
//|dbp.then(()=>tx('readonly',s=>s.getAll())).then(r=>{T=r||[];KM=null;migStats();draw();bls()}).catch(()=>{fail=1;draw()});
//|@@REPLACE
//|dbp.then(()=>tx('readonly',s=>s.getAll())).then(r=>{T=r||[];KM=null;LD=1;migStats();draw();bls()}).catch(()=>{fail=1;LD=1;draw()});
//|@@END
//|@@FIND 2.2 home
//|function home(){
//|@@REPLACE
//|/* ---- Home (estilo Spotify). Só usa dados reais: biblioteca, playlists, tags ID3 e histórico de escuta (células). ---- */
//|const hmGreet=()=>{const h=new Date().getHours();return h<5?'Boa madrugada':h<12?'Bom dia':h<18?'Boa tarde':'Boa noite'};
//|const hmReg=c=>{HMC.push(c);return HMC.length-1};
//|const hmOn=c=>!RC&&cur>=0&&ctx===c&&playing();
//|const hmCv=t=>`<div class=hm-cv style="${t?artSt(t):'background:var(--mu-hi)'}">${t?artIc(t):I.note}</div>`;
//|const hmSk=(n,r)=>'<div class=hm-row>'+Array(n).fill(0).map(()=>'<div class="hm-c hm-sk"><div class="hm-im'+(r?' r':'')+'"></div><div class=hm-n>&nbsp;</div><div class=hm-s>&nbsp;</div></div>').join('')+'</div>';
//|const hmSec=(t,body,act)=>`<section class=hm-sec><div class=hm-h><h2>${t}</h2>${act||''}</div>${body}</section>`;
//|const hmCard=o=>`<div class="hm-c${o.pl?' on':''}" role=button tabindex=0 onclick="${o.go}" onkeydown="${KB}" aria-label="${esc(o.n)}"><div class="hm-im${o.r?' r':''}">${o.cv}<button class="hm-pb${o.pl?' on':''}" onclick="event.stopPropagation();${o.fn}" aria-label="${o.pl?'Pausar':'Tocar'} ${esc(o.n)}">${o.pl?I.pause:I.play}</button></div><div class=hm-n>${esc(o.n)}</div><div class=hm-s>${esc(o.s)}</div></div>`;
//|const hmMsg=t=>`<p class=sp-s style="padding:4px 2px 8px">${t}</p>`;
//|/* histórico real: células de escuta (sincronizadas entre aparelhos), só faixas que existem neste aparelho */
//|function hmHist(){
//|  const ix=new Map(T.map((t,i)=>[nm(t.name),i]));
//|  return Object.values(CL.c).filter(c=>c.u>0&&(c.s>=10||c.p)&&ix.has(c.n)).sort((a,b)=>b.u-a.u).map(c=>({i:ix.get(c.n),pl:c.pl&&pget(c.pl)?c.pl:''}));
//|}
//|/* álbuns e artistas vêm das tags/nomes já identificados (meta) */
//|function hmGroups(){
//|  const S=stGet(),al=new Map(),ar=new Map();
//|  T.forEach((t,i)=>{
//|    const m=meta(t),sec=(S.tr[nm(t.name)]||{}).s||0;
//|    if(m.album){const k=ak(m.album);let g=al.get(k);if(!g){g={k,n:m.album,L:[],s:0,A:new Map(),aa:''};al.set(k,g)}
//|      g.L.push(i);g.s+=sec;m.artists.forEach(n=>g.A.set(ak(n),n));if(!g.aa&&m.tag&&m.tag.albumArtist)g.aa=parseArt(m.tag.albumArtist).main.join(', ')}
//|    crd(m).forEach(n=>{const k=ak(n);let g=ar.get(k);if(!g){g={k,n,L:[],s:0};ar.set(k,g)}g.L.push(i)});
//|  });
//|  ar.forEach(g=>{g.s=(S.a2[g.k]||{}).s||0});
//|  const by=(a,b)=>(b.s-a.s)||(b.L.length-a.L.length)||a.n.localeCompare(b.n);
//|  return{al:[...al.values()].sort(by).slice(0,20),ar:[...ar.values()].sort(by).slice(0,20)};
//|}
//|function hmChip(s){
//|  if(s.p){const p=pget(s.p);if(!p)return'';const c=p.id,r=hmReg(c),on=hmOn(c);
//|    return`<div class="hm-ch${on?' on':''}" role=button tabindex=0 onclick="MU.po('${p.id}')" onkeydown="${KB}">${plcv(p)}<span class=hm-cn>${esc(p.name)}</span><button class="hm-pb sm${on?' on':''}" onclick="event.stopPropagation();MU.hp(${r})" aria-label="${on?'Pausar':'Tocar'} ${esc(p.name)}">${on?I.pause:I.play}</button></div>`}
//|  const t=T[s.i];if(!t)return'';const on=!RC&&cur==s.i&&playing();
//|  return`<div class="hm-ch${on?' on':''}" role=button tabindex=0 onclick="MU.hs(${s.i})" onkeydown="${KB}"><div class=sp-cv style="${artSt(t)}">${artIc(t)}</div><span class=hm-cn>${esc(meta(t).title)}</span><button class="hm-pb sm${on?' on':''}" onclick="event.stopPropagation();MU.hs(${s.i})" aria-label="${on?'Pausar':'Tocar'} ${esc(meta(t).title)}">${on?I.pause:I.play}</button></div>`;
//|}
//|function home(){
//|  HMC=[];
//|  const head=`<h1 class=hm-hi>${hmGreet()}</h1>`;
//|  if(fail)return ban()+head+`<div class="sp-card hm-err" role=alert><div class=sp-ti style="font-size:17px">Não foi possível abrir a biblioteca</div><p class=sp-s style="margin:6px 0 12px">O armazenamento deste navegador não está disponível (modo privado ou bloqueado), então as músicas não podem ser carregadas.</p><button class=sp-btn onclick="location.reload()">Tentar de novo</button></div>`;
//|  if(!LD)return head+hmSec('Carregando sua música…',hmSk(6));
//|  const L=pls(),H=hmHist(),pend=T.some(t=>!meta(t).rd),G=hmGroups();
//|  /* atalhos: contextos ouvidos há pouco (playlist ou faixa), completados com playlists */
//|  const sc=[],ks=new Set(),add=(k,o)=>{if(!ks.has(k)&&sc.length<8){ks.add(k);sc.push(o)}};
//|  H.forEach(h=>h.pl?add('p'+h.pl,{p:h.pl}):add('t'+h.i,{i:h.i}));
//|  L.slice().sort((a,b)=>(b.u||0)-(a.u||0)).forEach(p=>add('p'+p.id,{p:p.id}));
//|  /* faixas recentes sem repetir */
//|  const rs=new Set(),rec=[];H.forEach(h=>{if(!rs.has(h.i)&&rec.length<12){rs.add(h.i);rec.push(h.i)}});
//|  const recH=rec.map(i=>{const t=T[i],m=meta(t);return hmCard({go:`MU.hs(${i})`,fn:`MU.hs(${i})`,n:m.title,s:m.artist||UNK,cv:hmCv(t),pl:!RC&&cur==i&&playing()})}).join('');
//|  const plH=L.map(p=>{const n=p.keys.filter(k=>tIdx(k)>=0).length,r=hmReg(p.id);
//|    return hmCard({go:`MU.po('${p.id}')`,fn:`MU.hp(${r})`,n:p.name,s:n+(n==1?' música':' músicas'),cv:plcv(p),pl:hmOn(p.id)})}).join('');
//|  const alH=G.al.map(g=>{const r=hmReg('al:'+g.k),t=g.L.map(i=>T[i]).find(t=>meta(t).cover)||T[g.L[0]],sub=g.aa||(g.A.size>1?'Vários artistas':([...g.A.values()][0]||UNK));
//|    return hmCard({go:`MU.hp(${r})`,fn:`MU.hp(${r})`,n:g.n,s:sub+' · '+g.L.length+(g.L.length==1?' música':' músicas'),cv:hmCv(t),pl:hmOn('al:'+g.k)})}).join('');
//|  const arH=G.ar.map(g=>{const r=hmReg('ar:'+g.k),t=g.L.map(i=>T[i]).find(t=>meta(t).cover);
//|    return hmCard({go:`MU.hp(${r})`,fn:`MU.hp(${r})`,n:g.n,s:g.L.length+(g.L.length==1?' música':' músicas'),r:1,
//|      cv:t?hmCv(t):`<div class=hm-cv style="background:var(--mu-hi)">${esc(g.n.trim().charAt(0).toUpperCase()||'?')}</div>`,pl:hmOn('ar:'+g.k)})}).join('');
//|  const sk=(h,n,r)=>h?`<div class=hm-row>${h}</div>`:(pend?hmSk(n,r):null);
//|  return ban()+head
//|   +(!T.length?`<div class=sp-card><p class=sp-s>Sua biblioteca está vazia.</p><label class=sp-btn style="margin-top:10px;cursor:pointer">Adicionar músicas<input type=file accept="audio/*" multiple hidden onchange="MU.add(this.files);this.value=''"></label></div>`:'')
//|   +(sc.length?`<div class=hm-sc>${sc.map(hmChip).join('')}</div>`:'')
//|   +(T.length?hmSec('Tocadas recentemente',recH?`<div class=hm-row>${recH}</div>`:hmMsg('Quando você ouvir músicas, elas aparecem aqui.')):'')
//|   +hmSec('Suas playlists',plH?`<div class=hm-row>${plH}</div>`:hmMsg('Você ainda não criou playlists.'),`<button class="sp-btn g sm" onclick="MU.pn()">Nova</button>`)
//|   +(T.length?hmSec('Álbuns',sk(alH,5)||hmMsg('Nenhum álbum identificado. O álbum é lido das tags de MP3 (ID3v2.3/2.4).')):'')
//|   +(T.length?hmSec('Artistas',sk(arH,5,1)||hmMsg('Nenhum artista identificado. Use MP3 com tag de artista ou nomes “Cantor - Música”.')):'');
//|}
//|function homeOld(){
//|@@END
//|@@FIND 2.3 css
//|@media(min-width:720px){.st-c2{min-height:230px}.st-ci{width:132px}.st-c3{width:96px}}
//|@@REPLACE
//|@media(min-width:720px){.st-c2{min-height:230px}.st-ci{width:132px}.st-c3{width:96px}}
//|.hm-hi{font-size:clamp(24px,6vw,32px);font-weight:800;letter-spacing:-.02em;margin:4px 0 16px}
//|.hm-sec{margin-bottom:6px}
//|.hm-h{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:24px 0 12px}
//|.hm-h h2{font-size:20px;font-weight:700;margin:0}
//|.hm-sc{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
//|@media(min-width:720px){.hm-sc{grid-template-columns:repeat(4,minmax(0,1fr))}}
//|.hm-ch{display:flex;align-items:center;gap:10px;height:56px;background:#ffffff14;border-radius:6px;overflow:hidden;cursor:pointer;transition:background .2s;padding-right:8px}
//|.hm-ch:hover,.hm-ch:focus-visible{background:#ffffff26}
//|.hm-ch .sp-cv{width:56px;height:56px;border-radius:0;font-size:20px;flex:none;cursor:inherit}
//|.hm-cn{flex:1;min-width:0;font-size:13px;font-weight:700;line-height:1.25;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere}
//|.hm-ch.on .hm-cn,.hm-c.on .hm-n{color:#1db954}
//|.hm-row{display:flex;gap:12px;overflow-x:auto;padding:2px 2px 10px;scroll-snap-type:x proximity;overscroll-behavior-x:contain;scrollbar-width:thin;scrollbar-color:#444 transparent}
//|.hm-c{flex:0 0 148px;scroll-snap-align:start;background:var(--mu-panel);border-radius:10px;padding:12px;cursor:pointer;transition:background .2s;min-width:0}
//|@media(min-width:720px){.hm-c{flex-basis:180px}}
//|.hm-c:hover,.hm-c:focus-visible{background:var(--mu-hi)}
//|.hm-im{position:relative;width:100%;aspect-ratio:1;border-radius:8px;box-shadow:0 8px 20px #0006;margin-bottom:12px;background:var(--mu-hi)}
//|.hm-im.r{border-radius:50%}
//|.hm-cv{width:100%;height:100%;border-radius:inherit;display:flex;align-items:center;justify-content:center;font-size:40px;font-weight:800;color:#ffffff88;overflow:hidden}
//|.hm-im .sp-cv{width:100%;height:100%;border-radius:inherit;cursor:inherit}
//|.hm-pb{position:absolute;right:8px;bottom:8px;width:44px;height:44px;border-radius:50%;background:#1db954;color:#000;border:0;font-size:20px;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 8px 16px #0006;opacity:0;transform:translateY(8px);transition:opacity .2s,transform .2s,background .15s}
//|.hm-pb.sm{position:static;width:36px;height:36px;font-size:16px;flex:none;box-shadow:none;transform:none}
//|.hm-c:hover .hm-pb,.hm-c:focus-within .hm-pb,.hm-ch:hover .hm-pb,.hm-ch:focus-within .hm-pb,.hm-pb.on{opacity:1;transform:none}
//|.hm-pb:hover{background:#1ed760}
//|@media(hover:none){.hm-pb{opacity:1;transform:none;width:40px;height:40px}.hm-pb.sm{width:36px;height:36px}}
//|.hm-n{font-size:15px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
//|.hm-s{font-size:13px;color:var(--mu-dim);margin-top:4px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
//|.hm-sk{pointer-events:none}
//|.hm-sk .hm-im,.hm-sk .hm-n,.hm-sk .hm-s{background:linear-gradient(90deg,#2a2a2a,#353535,#2a2a2a);background-size:200% 100%;animation:hm-sh 1.4s linear infinite;color:transparent;border-radius:6px}
//|.hm-sk .hm-im.r{border-radius:50%}
//|@keyframes hm-sh{to{background-position:-200% 0}}
//|.hm-err{box-shadow:inset 0 0 0 1px #ff6b6b66}
//|@media(prefers-reduced-motion:reduce){.hm-sk *{animation:none!important}.hm-pb,.hm-c,.hm-ch{transition:none}}
//|@@END