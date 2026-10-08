/* Hub Pessoal - extras.js
   1) Cotação do dólar (card na página Início, com conversor)
   2) Tempo de uso do app (cards na página Estatísticas)
   Carregar DEPOIS de musica.js e ANTES do script que chama SY.init(). */
(()=>{

/* ================= TEMPO DE USO ================= */
/* Conta o tempo com o Hub visível na tela. Fica salvo só neste aparelho. */
const UK='hub_use';
let U;try{U=JSON.parse(localStorage.getItem(UK))}catch(e){}
U=U&&typeof U=='object'?U:{};U.t=+U.t||0;U.d=U.d&&typeof U.d=='object'?U.d:{};U.s=U.s||TD();
const saveU=()=>{try{localStorage.setItem(UK,JSON.stringify(U))}catch(e){}};
let last=Date.now();
const count=force=>{
  const n=Date.now(),dt=Math.min(5,(n-last)/1000);last=n;
  if(!force&&document.visibilityState!='visible')return;
  if(dt>0){U.t+=dt;const k=TD();U.d[k]=(U.d[k]||0)+dt}
};
setInterval(()=>count(),1000);
setInterval(saveU,15000);
document.addEventListener('visibilitychange',()=>{if(document.hidden){count(1);saveU()}else last=Date.now()});
addEventListener('pagehide',()=>{count(1);saveU()});
saveU();

function useCard(){
  const t=TD(),days=[6,5,4,3,2,1,0].map(i=>D(add(new Date(),-i))),
    w=days.reduce((a,d)=>a+(U.d[d]||0),0),
    m=Object.keys(U.d).filter(k=>k.startsWith(t.slice(0,7))).reduce((a,k)=>a+U.d[k],0),
    k=(a,b)=>`<div class=r><span class=f>${a}</span><b>${b}</b></div>`;
  return`<div class=c><h2>⏱ Tempo no app</h2>${k('Hoje',`<span id=uh>${fd(U.d[t]||0)}</span>`)}${k('Últimos 7 dias',fd(w))}${k('Este mês',fd(m))}${k('Total',`<span id=ua>${fd(U.t)}</span>`)}<p class=s style="margin-top:8px">Conta o tempo com o Hub aberto na tela, só neste aparelho, desde ${U.s.split('-').reverse().join('/')}.</p></div>
<div class=c><h2>Horas no app (7 dias)</h2>${chart(days.map(d=>+((U.d[d]||0)/3600).toFixed(1)),days.map(d=>d.slice(8)))}</div>`;
}
/* atualiza os números ao vivo enquanto a página Estatísticas está aberta */
setInterval(()=>{
  const a=document.getElementById('uh'),b=document.getElementById('ua');
  if(a)a.textContent=fd(U.d[TD()]||0);
  if(b)b.textContent=fd(U.t);
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