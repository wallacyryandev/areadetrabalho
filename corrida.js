/* Hub Pessoal - corrida.js
   Página "Corrida": registre distância e tempo; o Hub calcula pace, velocidade média,
   totais por período, recordes e km por semana.
   Carregar DEPOIS de musica.js (e antes do script que chama SY.init()). */
(()=>{
S.runs=Array.isArray(S.runs)?S.runs:[];
let rf='mes';

/* ---- helpers ---- */
const pad=n=>String(n).padStart(2,'0');
const num=v=>{const x=parseFloat(String(v).replace(',','.'));return isFinite(x)?x:NaN};
/* "45" = 45 min · "45:30" = 45 min 30 s · "1:05:20" = 1 h 05 min 20 s */
const parseT=t=>{
  const p=String(t).trim().split(':').map(num);
  if(!p.length||p.length>3||p.some(x=>!isFinite(x)||x<0))return NaN;
  if(p.length==1)return Math.round(p[0]*60);
  if(p.length==2)return Math.round(p[0]*60+p[1]);
  return Math.round(p[0]*3600+p[1]*60+p[2]);
};
const fmT=s=>{s=Math.round(s);const h=Math.floor(s/3600),m=Math.floor(s%3600/60),c=s%60;return h?h+':'+pad(m)+':'+pad(c):m+':'+pad(c)};
const fmTu=s=>fmT(s)+(s>=3600?' h':' min');
const fmP=p=>{const s=Math.round(p);return Math.floor(s/60)+':'+pad(s%60)+' /km'};
const kmf=k=>String(+k.toFixed(2)).replace('.',',')+' km';
const pace=x=>x.km>0?fmP(x.sec/x.km):'—';
const spd=(sec,km)=>sec>0?(km/(sec/3600)).toFixed(1).replace('.',',')+' km/h':'—';
const TIPO={rua:'🛣 Rua',esteira:'🏃 Esteira',trilha:'⛰ Trilha',pista:'🏟 Pista'};
const dt=d=>d.split('-').reverse().join('/');
const mon=d=>{const x=new Date(d);x.setHours(12,0,0,0);x.setDate(x.getDate()-((x.getDay()+6)%7));return x};
const inR=d=>rf=='tudo'||(rf=='sem'&&d>=D(add(new Date(),-6)))||(rf=='mes'&&d.startsWith(TD().slice(0,7)));

/* ---- formulário (novo / editar) ---- */
const form=x=>[
  {k:'date',l:'Data',t:'date',v:x.date||TD(),r:1},
  {k:'km',l:'Distância (km)',t:'number',v:x.km??'',r:1},
  {k:'tempo',l:'Tempo (minutos, mm:ss ou h:mm:ss)',v:x.sec?fmT(x.sec):'',r:1},
  {k:'tipo',l:'Local',t:'select',v:x.tipo||'rua',o:Object.entries(TIPO)},
  {k:'obs',l:'Observação (opcional)',v:x.obs||''}
];
const read=o=>{
  const km=num(o.km),sec=parseT(o.tempo);
  if(!(km>0)||!(sec>0)){alert('Informe uma distância e um tempo válidos. Ex.: 5 km e 28:30.');return null}
  return{date:o.date,km:+km.toFixed(3),sec,tipo:o.tipo,obs:(o.obs||'').trim()};
};
const RUN={
  n(){fm('Nova corrida',form({}),o=>{const r=read(o);if(!r)return;S.runs.push({id:uid(),...r});RD()})},
  e(id){
    const x=S.runs.find(r=>r.id==id);if(!x)return;
    fm('Editar corrida',form(x),o=>{const r=read(o);if(!r)return;Object.assign(x,r);RD()},()=>{
      if(!confirm('Apagar esta corrida?'))return;
      S.runs=S.runs.filter(r=>r!=x);RD();
    });
  },
  f(v){rf=v;render()}
};
window.RUN=RUN;

/* ---- página ---- */
const row=(a,b)=>`<div class=r><span class=f>${a}</span><b>${b}</b></div>`;
function view(){
  const all=S.runs.slice().sort((a,b)=>a.date<b.date?1:a.date>b.date?-1:0),
    L=all.filter(x=>inR(x.date)),km=sum(L,'km'),sec=sum(L,'sec'),
    best=a=>a.filter(x=>x.km>=1).sort((p,q)=>p.sec/p.km-q.sec/q.km)[0],
    bp=best(L),far=L.slice().sort((a,b)=>b.km-a.km)[0],
    wk=[7,6,5,4,3,2,1,0].map(i=>mon(add(new Date(),-7*i))),
    wv=wk.map(m=>{const a=D(m),b=D(add(m,6));return +sum(S.runs.filter(x=>x.date>=a&&x.date<=b),'km').toFixed(1)}),
    wl=wk.map(m=>D(m).slice(8)+'/'+D(m).slice(5,7)),
    gb=best(all),gf=all.slice().sort((a,b)=>b.km-a.km)[0],gt=all.slice().sort((a,b)=>b.sec-a.sec)[0];
  return`<h1>Corrida <button class="b sm" onclick="RUN.n()">+</button></h1>
<div class=row style="margin:14px 0">${[['sem','7 dias'],['mes','Este mês'],['tudo','Tudo']].map(f=>`<span class="ch ${rf==f[0]?'on':''}" onclick="RUN.f('${f[0]}')">${f[1]}</span>`).join('')}</div>
<div class=g2>
<div class=c><h2>🏃 Resumo</h2>${row('Corridas',L.length)}${row('Distância',L.length?kmf(km):'—')}${row('Tempo total',L.length?fmTu(sec):'—')}${row('Pace médio',L.length?fmP(sec/km):'—')}${row('Velocidade média',L.length?spd(sec,km):'—')}${row('Maior corrida',far?kmf(far.km):'—')}${row('Melhor pace',bp?pace(bp)+' ('+kmf(bp.km)+')':'—')}${L.length?'':'<p class=s style="margin-top:8px">Nenhuma corrida neste período.</p>'}</div>
<div class=c><h2>Km por semana</h2>${chart(wv,wl)}<p class=s>Últimas 8 semanas (semana começa na segunda).</p></div>
<div class=c><h2>🏆 Recordes</h2>${row('Melhor pace',gb?pace(gb)+' · '+dt(gb.date):'—')}${row('Maior distância',gf?kmf(gf.km)+' · '+dt(gf.date):'—')}${row('Maior tempo',gt?fmTu(gt.sec)+' · '+dt(gt.date):'—')}${row('Total de corridas',all.length)}${row('Km acumulados',all.length?kmf(sum(all,'km')):'—')}<p class=s style="margin-top:8px">Melhor pace considera corridas de 1 km ou mais.</p></div>
<div class=c style="grid-column:1/-1"><h2>Histórico</h2>${all.slice(0,40).map(x=>`<div class=r><div class=f><b>${kmf(x.km)}</b> · ${fmTu(x.sec)} · <b style="color:var(--ac2)">${pace(x)}</b><div class=s>${dt(x.date)} · ${spd(x.sec,x.km)} · ${TIPO[x.tipo]||''}${x.obs?' · '+esc(x.obs):''}</div></div><button class="b g sm" onclick="RUN.e('${x.id}')">✎</button></div>`).join('')||'<p class=s>Nenhuma corrida registrada. Toque em + para registrar a primeira.</p>'}${all.length>40?`<p class=s style="margin-top:8px">Mostrando as 40 mais recentes de ${all.length}.</p>`:''}</div>
</div>`;
}

/* ---- registro na página (antes de Configurações) ---- */
if(!PG.some(p=>p[0]=='run'))PG.splice(PG.length-1,0,['run','🏃','Corrida']);
P.run=view;
})();