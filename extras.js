/* Hub Pessoal - extras.js
   1) Cotação do dólar (card na página Início, com conversor)
   2) Tempo de uso do app, somando os aparelhos (cards na página Estatísticas)
   Carregar DEPOIS de musica.js e ANTES do script que chama SY.init(). */
(()=>{

/* ================= TEMPO DE USO (somando todos os aparelhos) ================= */
/* Cada aparelho conta o PRÓPRIO tempo (só ele escreve na sua entrada) e todos
   guardam as entradas dos outros. Assim o total soma os aparelhos sem um apagar o do outro. */
const UK='hub_use',OK='hub_use_o';
let U;try{U=JSON.parse(localStorage.getItem(UK))}catch(e){}
U=U&&typeof U=='object'?U:{};U.t=+U.t||0;U.d=U.d&&typeof U.d=='object'?U.d:{};U.s=U.s||TD();
let O={};try{O=JSON.parse(localStorage.getItem(OK))||{}}catch(e){O={}}   /* entradas dos outros aparelhos */
const myId=()=>{try{return SY._c().id}catch(e){return null}};
const saveU=()=>{try{localStorage.setItem(UK,JSON.stringify(U))}catch(e){}};
let last=Date.now();
const count=force=>{
  const n=Date.now(),dt=Math.min(5,(n-last)/1000);last=n;
  if(!force&&document.visibilityState!='visible')return;
  if(dt>0){U.t+=dt;const k=TD();U.d[k]=(U.d[k]||0)+dt}
};
setInterval(()=>count(),1000);
setInterval(saveU,15000);
saveU();

/* grava a minha entrada em S.use (o Hub sincroniza S.use com os outros aparelhos) */
function pushUse(){
  const id=myId();if(!id)return;
  const lim=D(add(new Date(),-400)),d={};
  for(const k in U.d)if(k>=lim)d[k]=Math.round(U.d[k]);
  const nu={...O,[id]:{t:Math.round(U.t),s:U.s,d}};
  if(JSON.stringify(nu)===JSON.stringify(S.use))return;
  S.use=nu;sv();
}
/* chegou S.use de outro aparelho: guarda localmente as entradas dos outros */
function pullUse(){
  const id=myId();let ch=0;
  for(const k in (S.use||{})){
    if(k===id)continue;
    const e=S.use[k];if(!e||typeof e.t!='number')continue;
    if(!O[k]||e.t>O[k].t){O[k]=e;ch=1}
  }
  if(ch)try{localStorage.setItem(OK,JSON.stringify(O))}catch(e){}
}
setInterval(()=>{pullUse()},5000);
setInterval(()=>{pullUse();pushUse()},20000);
document.addEventListener('visibilitychange',()=>{if(document.hidden){count(1);saveU();pullUse();pushUse()}else last=Date.now()});
addEventListener('pagehide',()=>{count(1);saveU();pushUse()});

const ents=()=>[{id:myId(),t:U.t,d:U.d,s:U.s,me:1},...Object.entries(O).map(([id,e])=>({id,t:e.t||0,d:e.d||{},s:e.s}))];
const dayS=d=>ents().reduce((a,e)=>a+(e.d[d]||0),0);
const totS=()=>ents().reduce((a,e)=>a+(e.t||0),0);

function useCard(){
  const t=TD(),E=ents(),days=[6,5,4,3,2,1,0].map(i=>D(add(new Date(),-i))),
    w=days.reduce((a,d)=>a+dayS(d),0),
    m=E.reduce((a,e)=>a+Object.keys(e.d).filter(k=>k.startsWith(t.slice(0,7))).reduce((x,k)=>x+e.d[k],0),0),
    since=E.map(e=>e.s).filter(Boolean).sort()[0]||t,
    k=(a,b)=>`<div class=r><span class=f>${a}</span><b>${b}</b></div>`,
    C=(()=>{try{return SY._c()}catch(e){return{links:[]}}})(),
    dev=E.length>1?`<div style="margin-top:8px">${E.map(e=>{const l=e.me?C:(C.links.find(x=>x.id==e.id)||{icon:'📱',name:'Outro aparelho'});return k(esc((l.icon||'')+' '+(l.name||''))+(e.me?' <span class=s>· este</span>':''),fd(e.t))}).join('')}</div>`:'';
  return`<div class=c><h2>⏱ Tempo no app</h2>${k('Hoje',`<span id=uh>${fd(dayS(t))}</span>`)}${k('Últimos 7 dias',fd(w))}${k('Este mês',fd(m))}${k('Total',`<span id=ua>${fd(totS())}</span>`)}${dev}<p class=s style="margin-top:8px">Soma de todos os aparelhos conectados. Conta o tempo com o Hub aberto na tela, desde ${since.split('-').reverse().join('/')}.</p></div>
<div class=c><h2>Horas no app (7 dias)</h2>${chart(days.map(d=>+(dayS(d)/3600).toFixed(1)),days.map(d=>d.slice(8)))}</div>`;
}
/* atualiza os números ao vivo enquanto a página Estatísticas está aberta */
setInterval(()=>{
  const a=document.getElementById('uh'),b=document.getElementById('ua');
  if(a)a.textContent=fd(dayS(TD()));
  if(b)b.textContent=fd(totS());
},1000);

/* ================= DÓLAR ================= */
const FK='hub_fx';
let FX=null;try{FX=JSON.parse(localStorage.getItem(FK))}catch(e){}
let busy=0;
const brl=v=>'R$ '+Number(v).toFixed(2).replace('.',',');
const pct=v=>Math.abs(v).toFixed(2).replace('.',',')+'%';

function fxH(){
  if(!FX||!FX.v)return`<p class=s>${busy?'Carregando…':'Não foi possível carregar a cotação. Verifique a internet e toque em ↻.'}</p>`;
  const has=typeof FX.pct=='number'&&isFinite(FX.pct),
    hm=new Date(FX.at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}),
    parts=[];
  if(has)parts.push((FX.pct>0?'▲ ':FX.pct<0?'▼ ':'')+pct(FX.pct)+' hoje');
  if(FX.hi&&FX.lo)parts.push('máx '+brl(FX.hi)+' · mín '+brl(FX.lo));
  parts.push('atualizado às '+hm+(FX.err?' (sem conexão agora)':''));
  return`<div class=big>${brl(FX.v)}</div><p class=s>${parts.join(' · ')}</p>`;
}
const fxPaint=()=>{const e=document.getElementById('fx');if(e)e.innerHTML=fxH()};

async function fxLoad(force){
  if(busy)return;
  if(!force&&FX&&FX.v&&Date.now()-FX.at<5*60000)return;
  busy=1;
  if(force){const b=document.getElementById('fxb0');if(b)b.textContent='…'}
  try{
    let r;
    try{
      const res=await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL',{cache:'no-store'});
      if(!res.ok)throw new Error('http '+res.status);
      const u=(await res.json()).USDBRL;
      r={v:+u.bid,pct:+u.pctChange,hi:+u.high,lo:+u.low};
      if(!isFinite(r.v)||r.v<=0)throw new Error('valor inválido');
    }catch(e){
      const res=await fetch('https://open.er-api.com/v6/latest/USD');
      if(!res.ok)throw new Error('http '+res.status);
      const v=(await res.json()).rates.BRL;
      if(!isFinite(v)||v<=0)throw new Error('valor inválido');
      r={v:+v};
    }
    FX=Object.assign(r,{at:Date.now()});
    try{localStorage.setItem(FK,JSON.stringify(FX))}catch(e){}
  }catch(e){
    if(FX&&FX.v)FX.err=1;else FX={err:1,at:0};
  }
  busy=0;
  fxPaint();
  const b=document.getElementById('fxb0');if(b)b.textContent='↻';
}

/* conversor: digitar em um campo preenche o outro */
function fxConv(w){
  if(!FX||!FX.v)return;
  const u=document.getElementById('fxu'),b=document.getElementById('fxr');if(!u||!b)return;
  if(w=='u'){const x=parseFloat(u.value);b.value=isFinite(x)?(x*FX.v).toFixed(2):''}
  else{const x=parseFloat(b.value);u.value=isFinite(x)?(x/FX.v).toFixed(2):''}
}
window.FXX={load:fxLoad,c:fxConv};

const fxCard=()=>`<div class=c><h2>💵 Dólar <button class="b g sm" id=fxb0 style="float:right" onclick="FXX.load(1)" title="Atualizar">↻</button></h2><div id=fx>${fxH()}</div>
<div class=row style="margin-top:12px;flex-wrap:nowrap"><label style="flex:1;margin:0">US$<input id=fxu type=number step=any min=0 placeholder="1" oninput="FXX.c('u')"></label><label style="flex:1;margin:0">R$<input id=fxr type=number step=any min=0 placeholder="${FX&&FX.v?FX.v.toFixed(2):''}" oninput="FXX.c('r')"></label></div></div>`;

setInterval(()=>{if(typeof page!='undefined'&&page=='home')fxLoad()},60000);

/* ================= ENCAIXE NAS PÁGINAS ================= */
const home0=P.home,sta0=P.sta;
const inject=(h,c)=>h.replace(/<\/div>\s*$/,c+'</div>');
P.home=()=>{fxLoad();return inject(home0(),fxCard())};
P.sta=()=>inject(sta0(),useCard());
})();