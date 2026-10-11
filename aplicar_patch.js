#!/usr/bin/env node
/* PATCH 2: gênero + reprodução automática com artistas variados. Rode DEPOIS do aplicar_patch2.js.
   Uso:  node aplicar_patch2.js musica.js            -> grava musica.novo.js
         node aplicar_patch2.js musica.js saida.js   -> grava em saida.js
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
if(errs.length){console.log('FALHOU — nada foi gravado:');errs.forEach(e=>console.log(' - '+e));console.log('Você já rodou o aplicar_patch.js (primeiro) e está usando o musica.js que ele gerou? Se sim, me mande esta mensagem.');process.exit(1)}
fs.writeFileSync(out,s);
console.log('OK: '+B.length+' alterações aplicadas. Arquivo completo gravado em '+out+' ('+s.length+' caracteres)');
process.exit(0);
//|@@FIND A estado
//|let LD=0,HMC=[],AUTO=0,AX=0;try{AUTO=localStorage.getItem('hub_mauto')=='1'?1:0}catch(e){}
//|@@REPLACE
//|let LD=0,HMC=[],AUTO=1,AX=0,AP=null,APQ=[],RP=[],GU={},apT=0;try{AUTO=localStorage.getItem('hub_mauto')=='0'?0:1}catch(e){}try{GU=JSON.parse(localStorage.getItem('hub_mgenre'))||{}}catch(e){GU={}}
//|@@END
//|@@FIND B TCON
//|else if(id=='TRCK')o.trk=parseInt(txt(f.subarray(1),e)[0],10)||0;
//|@@REPLACE
//|else if(id=='TRCK')o.trk=parseInt(txt(f.subarray(1),e)[0],10)||0;
//|    else if(id=='TCON')o.genre=txt(f.subarray(1),e).join(';');
//|@@END
//|@@FIND C funções
//|const solo=i=>T[i]&&!AUTO?'one:'+key(T[i]):null;
//|@@REPLACE
//|/* ---- gênero + reprodução automática (mesmo gênero, artistas variados) ----
//|   Gênero vem SÓ de dados reais: (1) gênero definido pelo usuário, (2) tag TCON do MP3. Sem nenhum dos dois:
//|   usa as playlists do usuário em que a faixa está (curadoria dele). Sem nenhum dado: não escolhe nada (não inventa). */
//|const ID3G=['Blues','Classic Rock','Country','Dance','Disco','Funk','Grunge','Hip-Hop','Jazz','Metal','New Age','Oldies','Other','Pop','R&B','Rap','Reggae','Rock','Techno','Industrial','Alternative','Ska','Death Metal','Pranks','Soundtrack','Euro-Techno','Ambient','Trip-Hop','Vocal','Jazz+Funk','Fusion','Trance','Classical','Instrumental','Acid','House','Game','Sound Clip','Gospel','Noise','AlternRock','Bass','Soul','Punk','Space','Meditative','Instrumental Pop','Instrumental Rock','Ethnic','Gothic','Darkwave','Techno-Industrial','Electronic','Pop-Folk','Eurodance','Dream','Southern Rock','Comedy','Cult','Gangsta','Top 40','Christian Rap','Pop/Funk','Jungle','Native American','Cabaret','New Wave','Psychadelic','Rave','Showtunes','Trailer','Lo-Fi','Tribal','Acid Punk','Acid Jazz','Polka','Retro','Musical','Rock & Roll','Hard Rock'];
//|const GBAD=new Set(['other','outros','outro','unknown','desconhecido','genre','genero','none','various','misc','miscellaneous','undefined','null','n a','music','musica','mp3','download','youtube']);
//|const GAL={'funk carioca':'funk','funk brasileiro':'funk','baile funk':'funk','funk ostentacao':'funk','funk melody':'funk','mandelao':'funk'};
//|const gnorm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9 ]+/g,' ').replace(/\s+/g,' ').trim();
//|/* "(13)", "13", "Trap", "Funk;Brega" -> [{k:chave,n:nome}] (descarta valores genéricos como "Other") */
//|function gList(raw){
//|  let x=String(raw||'').replace(/\((\d{1,3})\)/g,(m,n)=>';'+(ID3G[+n]||'')+';');
//|  if(/^\d{1,3}$/.test(x.trim()))x=ID3G[+x.trim()]||'';
//|  const o=[];
//|  x.split(/[;\/,|]+/).forEach(p=>{let k=gnorm(p);k=GAL[k]||k;if(k.length>=2&&!GBAD.has(k)&&!o.some(e=>e.k==k))o.push({k,n:p.trim()})});
//|  return o;
//|}
//|const gOf=t=>{const k=key(t),u=GU[k];if(u!=null&&String(u).trim())return{src:'user',L:gList(u)};const m=meta(t);return{src:'tag',L:m.tag&&m.tag.genre?gList(m.tag.genre):[]}};
//|/* referência da reprodução automática: fixada na música ESCOLHIDA (não "deriva" com as faixas seguintes) */
//|function apSeed(i){
//|  const t=T[i];if(!t)return;
//|  const g=gOf(t),sk=key(t);
//|  AP={sk,rd:!!meta(t).rd||g.src=='user',g:new Set(g.L.map(e=>e.k)),pk:null,label:'',basis:''};
//|  if(g.L.length){AP.label=g.L.map(e=>e.n).join(' / ');AP.basis=(g.src=='user'?'gênero definido por você':'gênero da tag do arquivo')+' ('+AP.label+')'}
//|  else{
//|    const pk=new Set();pls().forEach(p=>{if(p.keys.includes(sk))p.keys.forEach(k=>{if(k!=sk)pk.add(k)})});
//|    AP.pk=pk;if(pk.size){AP.label='Playlists em comum';AP.basis='as playlists em que esta música está (ela não tem tag de gênero)'}
//|  }
//|  APQ=[];
//|}
//|const apOk=t=>AP.g.size?gOf(t).L.some(e=>AP.g.has(e.k)):!!(AP.pk&&AP.pk.has(key(t)));
//|const apArs=i=>{const m=meta(T[i]),L=crd(m).map(ak).filter(Boolean);return L.length?L:['~'+key(T[i])]};
//|/* escolhe a próxima: mesmo gênero, artista diferente dos últimos, sem repetir faixa recente. Sorteia o ARTISTA primeiro (cada artista
//|   pesa igual, para quem tem mais músicas não dominar) e depois a faixa dele. Se tudo foi tocado, recicla as mais antigas. */
//|function apPick(pool,planned){
//|  const rk=RP.concat(planned.map(i=>key(T[i]))),lp=i=>rk.lastIndexOf(key(T[i]));
//|  const ra=rk.slice(-4).map(k=>{const i=tIdx(k);return i<0?[]:apArs(i)});
//|  const near=(i,w)=>{if(!w)return false;const a=apArs(i);return ra.slice(-w).some(s=>s.some(x=>a.includes(x)))};
//|  const choose=c=>{const G=new Map();c.forEach(i=>{const k=apArs(i)[0];if(!G.has(k))G.set(k,[]);G.get(k).push(i)});const g=[...G.values()],l=g[Math.floor(Math.random()*g.length)];return l[Math.floor(Math.random()*l.length)]};
//|  const free=pool.filter(i=>!planned.includes(i));
//|  if(!free.length)return -1;
//|  for(const w of [3,2,1,0]){const c=free.filter(i=>lp(i)<0&&!near(i,w));if(c.length)return choose(c)}
//|  free.sort((a,b)=>lp(a)-lp(b));
//|  const old=free.slice(0,Math.max(1,Math.ceil(free.length/2))),c2=old.filter(i=>!near(i,1));
//|  return choose(c2.length?c2:old);
//|}
//|function apFill(){
//|  if(ctx!=='auto'||!AP||cur<0)return;
//|  APQ=APQ.filter(i=>i>=0&&i<T.length&&i!=cur);
//|  const pool=[];T.forEach((t,i)=>{if(i!=cur&&apOk(t))pool.push(i)});
//|  const pl=APQ.slice();
//|  while(pl.length<6){const i=apPick(pool,pl);if(i<0)break;pl.push(i)}
//|  APQ=pl;
//|}
//|function noteStart(i){
//|  if(!T[i])return;
//|  RP.push(key(T[i]));if(RP.length>80)RP.shift();
//|  if(ctx==='auto'){APQ=APQ.filter(x=>x!==i);apFill()}
//|}
//|/* tags de outras faixas terminam de ser lidas depois: replaneja (com atraso) */
//|function apRefresh(){
//|  clearTimeout(apT);
//|  apT=setTimeout(()=>{
//|    if(ctx!=='auto'||!AP||cur<0||!T[cur])return;
//|    const si=tIdx(AP.sk);if(!AP.rd&&si>=0&&meta(T[si]).rd)apSeed(si);
//|    APQ=[];apFill();dropPre();
//|    if(NPO)npUpd();
//|    if(typeof page!='undefined'&&page=='mus')draw();
//|  },400);
//|}
//|function genBox(){
//|  const t=cur>=0&&T[cur];if(!t)return'';
//|  const g=gOf(t),x=g.L.length?g.L.map(e=>esc(e.n)).join(' / ')+' · '+(g.src=='user'?'definido por você':'tag do arquivo'):'não identificado (a tag do arquivo não informa)';
//|  return'<p class=sp-s style="margin:12px 0 6px">Gênero: '+x+'</p><button class="sp-btn g sm" onclick="MU.sg()">Definir gênero</button>';
//|}
//|function apQueueHtml(h){
//|  const L=APQ.filter(j=>T[j]);
//|  const b=AP&&AP.basis?'<p class=sp-s style="margin-bottom:8px">Baseada em '+esc(AP.basis)+'. Artistas diferentes, sem repetir músicas recentes. A classificação vem dos dados do arquivo e pode não ser exata.</p>':'';
//|  const off='<div style="margin-top:12px"><button class="sp-btn g sm" onclick="MU.auto()">Desligar reprodução automática</button></div>';
//|  if(!L.length)return h+b+'<p class=sp-s>'+(AP&&(AP.g.size||(AP.pk&&AP.pk.size))?'Não há outras músicas desse estilo, de artistas diferentes, na biblioteca.':'Esta música não tem gênero confiável (tag ausente) nem playlist em comum, então não há de onde escolher. Defina o gênero abaixo.')+'</p>'+genBox()+off;
//|  return h+b+L.map(j=>`<div class=sp-r><div class=sp-cv style="${artSt(T[j])}" onclick="MU.qp(${j})">${artIc(T[j])}</div><div class=sp-i onclick="MU.qp(${j})"><div class=sp-n>${esc(meta(T[j]).title)}</div><p class=sp-s>${esc(meta(T[j]).artist||UNK)}</p></div></div>`).join('')+genBox()+off;
//|}
//|function setGenreUi(){
//|  const t=cur>=0&&T[cur];if(!t)return;
//|  const k=key(t);
//|  nph(0);
//|  setTimeout(()=>fm('Gênero da música',[{k:'g',l:'Gênero (ex.: Trap, Funk). Vazio = usar a tag do arquivo.',v:GU[k]||''}],o=>{
//|    const v=String(o.g||'').trim();if(v)GU[k]=v;else delete GU[k];
//|    try{localStorage.setItem('hub_mgenre',JSON.stringify(GU))}catch(e){}
//|    if(ctx==='auto'&&AP&&AP.sk==k)apSeed(cur);
//|    apRefresh();draw();
//|  }),150);
//|}
//|const solo=i=>{if(!T[i])return null;if(AUTO){apSeed(i);return'auto'}return'one:'+key(T[i])};
//|@@END
//|@@FIND D qOf
//|const qOf=c=>{const x=ctxL(c);if(x)return x;
//|@@REPLACE
//|const qOf=c=>{if(c==='auto')return cur>=0&&T[cur]?[cur].concat(APQ):[];const x=ctxL(c);if(x)return x;
//|@@END
//|@@FIND E nextI
//|if(shuf&&q.length>1){
//|@@REPLACE
//|if(shuf&&q.length>1&&ctx!=='auto'){
//|@@END
//|@@FIND F prev
//|const prev=()=>{if(curPos()>3)seekTo(0);else if(shuf&&hist.length){const h=hist.pop();if(h<T.length)play(h,1,undefined,1)}else{const n=nextI(-1);if(n>=0)play(n)}};
//|@@REPLACE
//|const prev=()=>{if(curPos()>3)seekTo(0);else if((shuf||ctx==='auto')&&hist.length){const h=hist.pop();if(h<T.length)play(h,1,undefined,1)}else if(ctx==='auto')seekTo(0);else{const n=nextI(-1);if(n>=0)play(n)}};
//|@@END
//|@@FIND G play
//|cur=i;dropPre();els.forEach(a=>{if(a!==el)killEl(a)});
//|@@REPLACE
//|cur=i;dropPre();els.forEach(a=>{if(a!==el)killEl(a)});noteStart(i);
//|@@END
//|@@FIND H handoff
//|cur=i;el=a;
//|@@REPLACE
//|cur=i;el=a;noteStart(i);
//|@@END
//|@@FIND I meta
//|if(cur>=0&&T[cur]&&MC.get(key(T[cur]))===m){msMeta(cur);if(NPO)npBg();lyLoad()}
//|@@REPLACE
//|if(ctx==='auto')apRefresh();if(cur>=0&&T[cur]&&MC.get(key(T[cur]))===m){msMeta(cur);if(NPO)npBg();lyLoad()}
//|@@END
//|@@FIND J rótulo
//|Continuar com a biblioteca: ${AUTO?'ligado':'desligado'}
//|@@REPLACE
//|Reprodução automática (mesmo gênero): ${AUTO?'ligada':'desligada'}
//|@@END
//|@@FIND K npQueue avulsa
//|Você escolheu uma música avulsa. Nada toca depois dela, a menos que você ligue “Continuar com a biblioteca”.</p><button class="sp-btn g sm" style="margin-top:10px" onclick="MU.auto()">Continuar com a biblioteca</button>
//|@@REPLACE
//|Reprodução automática desligada: nada toca depois desta música.</p><button class="sp-btn g sm" style="margin-top:10px" onclick="MU.auto()">Ligar reprodução automática</button>'+genBox()+'
//|@@END
//|@@FIND L npQueue auto
//|let h='<div class=np-h>A seguir</div>';
//|@@REPLACE
//|let h='<div class=np-h>A seguir</div>';
//|  if(ctx==='auto')return apQueueHtml(h);
//|@@END
//|@@FIND M setAuto on
//|if(AUTO&&typeof ctx=='string'&&ctx.startsWith('one:')){ctx=null;seen.clear();AX=1}
//|@@REPLACE
//|if(AUTO&&typeof ctx=='string'&&ctx.startsWith('one:')){apSeed(cur);ctx='auto';seen.clear();AX=1;apFill()}
//|@@END
//|@@FIND N setAuto off
//|else if(!AUTO&&AX&&ctx===null){ctx='one:'+key(T[cur]);AX=0}
//|@@REPLACE
//|else if(!AUTO&&ctx==='auto'){ctx='one:'+key(T[cur]);APQ=[];AX=0}
//|@@END
//|@@FIND O cinfo
//|if(ctx.startsWith('one:'))return{k:'Tocando agora',n:'Música selecionada'};
//|@@REPLACE
//|if(ctx==='auto')return{k:'Reprodução automática',n:AP&&AP.label?AP.label:'Mesmo gênero'};
//|    if(ctx.startsWith('one:'))return{k:'Tocando agora',n:'Música selecionada'};
//|@@END
//|@@FIND P export
//|auto(){setAuto(!AUTO)},
//|@@REPLACE
//|auto(){setAuto(!AUTO)},sg(){setGenreUi()},
//|@@END
//|@@FIND Q del
//|const dk=key(T[i]);T.splice(i,1);KM=null;hist=[];
//|@@REPLACE
//|const dk=key(T[i]);T.splice(i,1);KM=null;hist=[];APQ=[];if(ctx==='auto')apRefresh();
//|@@END
//|@@FIND R rmExact
//|T=T.filter((_,i)=>!gone.has(i));KM=null;hist=[];dropPre();
//|@@REPLACE
//|T=T.filter((_,i)=>!gone.has(i));KM=null;hist=[];APQ=[];if(ctx==='auto')apRefresh();dropPre();
//|@@END