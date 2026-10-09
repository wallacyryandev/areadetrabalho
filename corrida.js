/* Hub Pessoal - corrida.js (v4)
   Página "Corrida": gravação ao vivo com GPS, trajeto desenhado a partir das coordenadas reais,
   cartão PNG e exportação do trajeto com fundo transparente, registro manual, histórico e recordes.
   Visual de feed (estilo Strava) com barra fixa "Gravar"; barra de navegação do Hub some nesta página e a
   engrenagem (canto superior direito) abre a tela de menu, igual à página Música.
   Tudo roda no aparelho: sem mapa online, sem backend, sem bibliotecas.
   Carregar DEPOIS de musica.js (e antes do script que chama SY.init()). GPS exige HTTPS ou localhost.
   O CSS está embutido (injetado uma vez, todo escopado em .rn / .rn-m / .rn-t): não precisa de arquivo extra. */
(()=>{
'use strict';
S.runs=Array.isArray(S.runs)?S.runs:[];

/* =====================================================================
   1. ESTADO E CONSTANTES
   ===================================================================== */
const LK='hub_run_live';
/* acc: precisão máx (m) · step: passo mín (m) · vmax: velocidade máx (m/s) · win: janela do ritmo atual (s)
   gap: intervalo (s) sem pontos que abre novo trecho · weak: segundos sem posição = sinal fraco · cap: máx. de pontos salvos */
const GP={acc:25,step:3,vmax:12,win:30,gap:90,weak:15,minKm:.02,minSec:10,cap:400};
let rf='mes',rv=null,LV=null,wid=null,wlk=null,wtok=0,starting=false,lim=20,fresh=false,lastSave=0,
    gps={err:null,fix:0,acc:NaN,gap:0},shr=null,bk={b:'',m:''},MENU=0;

/* barra de navegação do Hub some na página Corrida (igual à Música); a engrenagem abre a tela de menu */
const _render=render;
window.render=function(){
  const on=typeof page!='undefined'&&page=='run';
  if(!on)MENU=0;
  document.body.classList.toggle('rn-full',on);
  _render();
};

/* =====================================================================
   2. CÁLCULOS E FORMATAÇÃO
   ===================================================================== */
const pad=n=>String(n).padStart(2,'0');
const num=v=>{const x=parseFloat(String(v).replace(',','.'));return isFinite(x)?x:NaN};
/* "45" = 45 min · "45:30" = 45 min 30 s · "1:05:20" = 1 h 05 min 20 s */
const parseT=t=>{
  const s=String(t==null?'':t).trim();
  if(!/^\d+([.,]\d+)?(:\d{1,2}([.,]\d+)?){0,2}$/.test(s))return NaN;
  const p=s.split(':').map(num);
  if(p.some(x=>!isFinite(x)||x<0))return NaN;
  if(p.length==1)return Math.round(p[0]*60);
  if(p.length==2)return p[1]>=60?NaN:Math.round(p[0]*60+p[1]);
  return p[1]>=60||p[2]>=60?NaN:Math.round(p[0]*3600+p[1]*60+p[2]);
};
const fmT=s=>{if(!isFinite(s)||s<0)return'—';s=Math.round(s);const h=Math.floor(s/3600),m=Math.floor(s%3600/60),c=s%60;return h?h+':'+pad(m)+':'+pad(c):m+':'+pad(c)};
const fmTu=s=>isFinite(s)&&s>=0?fmT(s)+(s>=3600?' h':' min'):'—';
const pcs=(sec,km)=>km>0&&sec>0?sec/km:NaN;                       /* segundos por km (NaN se inválido) */
const fmPn=p=>{if(!isFinite(p)||p<=0||p>5999)return'—';const s=Math.round(p);return Math.floor(s/60)+':'+pad(s%60)};
const fmP=p=>isFinite(p)&&p>0&&p<=5999?fmPn(p)+' /km':'—';
const kmn=k=>isFinite(k)?k.toFixed(2).replace('.',','):'—';
const kmf=k=>isFinite(k)?String(+k.toFixed(2)).replace('.',',')+' km':'—';
const spdn=(sec,km)=>sec>0&&km>0?(km/(sec/3600)).toFixed(1).replace('.',','):'—';
const spd=(sec,km)=>{const v=spdn(sec,km);return v=='—'?v:v+' km/h'};
const pace=x=>fmP(pcs(x.sec,x.km));
const TIPO={rua:'Rua',esteira:'Esteira',trilha:'Trilha',pista:'Pista'};
const dt=d=>String(d||'').split('-').reverse().join('/');
const dlong=d=>{try{const v=new Date(d+'T12:00:00');if(isNaN(v))return dt(d);const s=v.toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});return s.charAt(0).toUpperCase()+s.slice(1)}catch(e){return dt(d)}};
const mon=d=>{const x=new Date(d);x.setHours(12,0,0,0);x.setDate(x.getDate()-((x.getDay()+6)%7));return x};
const inR=d=>rf=='tudo'||(rf=='sem'&&d>=D(add(new Date(),-6)))||(rf=='mes'&&String(d).startsWith(TD().slice(0,7)));
const hv=(a,b,c,d)=>{const r=Math.PI/180,x=(c-a)*r,y=(d-b)*r,h=Math.sin(x/2)**2+Math.cos(a*r)*Math.cos(c*r)*Math.sin(y/2)**2;return 12742000*Math.asin(Math.sqrt(h))};
const sf=(f,...a)=>{try{return f(...a)}catch(e){console.error('[corrida]',e);return''}};   /* falha em recurso secundário não derruba a tela */

/* =====================================================================
   3. ÍCONES SVG
   ===================================================================== */
const IC={
  play:'<path d="M8 5.5v13l11-6.5z" fill="currentColor" stroke="none"/>',
  pause:'<rect x="6.5" y="5" width="4" height="14" rx="1.2" fill="currentColor" stroke="none"/><rect x="13.5" y="5" width="4" height="14" rx="1.2" fill="currentColor" stroke="none"/>',
  stop:'<rect x="6" y="6" width="12" height="12" rx="2.5" fill="currentColor" stroke="none"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  back:'<path d="M15 5l-7 7 7 7"/>',
  share:'<path d="M12 15V4M8 8l4-4 4 4M5 13v6h14v-6"/>',
  edit:'<path d="M4 20h4L19.5 8.5l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
  trash:'<path d="M5 7h14M10 7V4.5h4V7M7 7l.8 12.5h8.4L17 7"/>',
  trophy:'<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5v1.5A3 3 0 0 0 8 10.5M16 6h3v1.5a3 3 0 0 1-3 3M12 13v4M8.5 20h7"/>',
  clock:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  gauge:'<path d="M4 17a8 8 0 1 1 16 0"/><path d="M12 17l4-5"/>',
  route:'<circle cx="6" cy="18" r="2.2"/><circle cx="18" cy="6" r="2.2"/><path d="M8.2 18H14a3.5 3.5 0 0 0 0-7h-4a3.5 3.5 0 0 1 0-7h5.8"/>',
  pulse:'<path d="M3 12h4l2.5-7 5 14 2.5-7h4"/>',
  pin:'<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
  cal:'<rect x="4" y="5.5" width="16" height="14.5" rx="2.5"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>',
  check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  alert:'<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17v.01"/>',
  gear:'<circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  chev:'<path d="M9 5l7 7-7 7"/>',
  hash:'<path d="M5 9h14M5 15h14M10 4L8 20M16 4l-2 16"/>',
  img:'<rect x="4" y="5" width="16" height="14" rx="2.5"/><circle cx="9" cy="10" r="1.6"/><path d="M5 17l4.5-4.5 3 3 2.5-2.5L19 16"/>'
};
const I=(n,s=20)=>`<svg class="rn-i" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[n]||''}</svg>`;

/* =====================================================================
   4. TRAJETO: simplificação, projeção, suavização (SVG e Canvas)
   P = [[lat,lon,seg],...]  (mesmo formato salvo em S.runs[].rota)
   ===================================================================== */
/* Douglas-Peucker por trecho (seg), tolerância em metros: tira pontos redundantes sem deformar o percurso */
const simp=(P,tol)=>{
  if(P.length<3)return P.slice();
  const la=P.reduce((s,p)=>s+p[0],0)/P.length,kx=111320*Math.cos(la*Math.PI/180),ky=110540,
    X=P.map(p=>p[1]*kx),Y=P.map(p=>p[0]*ky),keep=new Uint8Array(P.length);
  let a=0;
  for(let i=1;i<=P.length;i++){
    if(i<P.length&&P[i][2]==P[a][2])continue;
    keep[a]=1;keep[i-1]=1;
    const st=[[a,i-1]];
    while(st.length){
      const[s,e]=st.pop(),dx=X[e]-X[s],dy=Y[e]-Y[s],L=dx*dx+dy*dy;
      let m=-1,md=tol;
      for(let j=s+1;j<e;j++){
        let d;
        if(L==0)d=Math.hypot(X[j]-X[s],Y[j]-Y[s]);
        else{const t=Math.max(0,Math.min(1,((X[j]-X[s])*dx+(Y[j]-Y[s])*dy)/L));d=Math.hypot(X[j]-X[s]-t*dx,Y[j]-Y[s]-t*dy)}
        if(d>md){md=d;m=j}
      }
      if(m>=0){keep[m]=1;st.push([s,m],[m,e])}
    }
    a=i;
  }
  return P.filter((_,i)=>keep[i]);
};
/* guarda no máximo GP.cap pontos por corrida (cabe no localStorage e sincroniza com o resto do Hub) */
const ds=pts=>{
  const P=pts.map(p=>[p[1],p[2],p[3]]);let tol=2.5,o=simp(P,tol);
  while(o.length>GP.cap&&tol<500){tol*=1.5;o=simp(P,tol)}
  return o.map(p=>[+p[0].toFixed(5),+p[1].toFixed(5),p[2]]);
};
const rlen=P=>{let d=0;for(let i=1;i<P.length;i++)if(P[i][2]==P[i-1][2])d+=hv(P[i-1][0],P[i-1][1],P[i][0],P[i][1]);return d};
/* só desenha trajeto quando há pontos suficientes para ser verdadeiro */
const routeOk=P=>Array.isArray(P)&&P.length>=4&&P.every(p=>Array.isArray(p)&&isFinite(p[0])&&isFinite(p[1]))&&rlen(P)>=50;

/* projeção equirretangular local, ajustada ao quadro w×h com margem pd (não deforma o percurso) */
const proj=(P,w,h,pd)=>{
  if(!P||P.length<2)return[];
  const k=Math.cos(P.reduce((s,p)=>s+p[0],0)/P.length*Math.PI/180),
    X=P.map(p=>p[1]*k),Y=P.map(p=>-p[0]),x0=Math.min(...X),y0=Math.min(...Y),
    dw=Math.max(Math.max(...X)-x0,1e-9),dh=Math.max(Math.max(...Y)-y0,1e-9),
    s=Math.min((w-2*pd)/dw,(h-2*pd)/dh),ox=(w-dw*s)/2,oy=(h-dh*s)/2;
  return P.map((p,i)=>[ox+(X[i]-x0)*s,oy+(Y[i]-y0)*s,p[2]||0]);
};
const segs=Q=>{const o=[];let c=[];Q.forEach((q,i)=>{if(i&&q[2]!=Q[i-1][2]){o.push(c);c=[]}c.push(q)});if(c.length)o.push(c);return o.filter(s=>s.length>1)};
/* suavização por pontos médios (curvas quadráticas): linha limpa, passa rente aos pontos reais */
const spath=Q=>segs(Q).map(s=>{
  const f=v=>v.toFixed(1),n=s.length;
  let d='M'+f(s[0][0])+' '+f(s[0][1]);
  if(n==2)return d+'L'+f(s[1][0])+' '+f(s[1][1]);
  for(let i=1;i<n-1;i++)d+='Q'+f(s[i][0])+' '+f(s[i][1])+' '+f((s[i][0]+s[i+1][0])/2)+' '+f((s[i][1]+s[i+1][1])/2);
  return d+'L'+f(s[n-1][0])+' '+f(s[n-1][1]);
}).join('');
const cpath=(g,Q)=>segs(Q).forEach(s=>{
  const n=s.length;g.moveTo(s[0][0],s[0][1]);
  if(n==2){g.lineTo(s[1][0],s[1][1]);return}
  for(let i=1;i<n-1;i++)g.quadraticCurveTo(s[i][0],s[i][1],(s[i][0]+s[i+1][0])/2,(s[i][1]+s[i+1][1])/2);
  g.lineTo(s[n-1][0],s[n-1][1]);
});

/* SVG do trajeto (sem fundo, usa as cores do tema). o: {w,h,pd,msg,live,thumb} */
function rsvg(P,o){
  o=o||{};const w=o.w||600,h=o.h||400,pd=o.pd==null?28:o.pd,ok=o.live?!!P&&P.length>=2:routeOk(P);
  if(!ok)return`<div class="rn-nor">${I('pin',o.thumb?18:26)}${o.thumb?'':`<span>${o.msg||'Sem trajeto GPS.'}</span>`}</div>`;
  const Q=proj(P,w,h,pd);if(!Q.length)return`<div class="rn-nor">${I('pin',26)}<span>${o.msg||'Sem trajeto GPS.'}</span></div>`;
  const d=spath(Q),a=Q[0],b=Q[Q.length-1],
    dot=(q,c)=>`<path class="rn-dot rg" d="M${q[0].toFixed(1)} ${q[1].toFixed(1)}h0"/><path class="rn-dot ${c}" d="M${q[0].toFixed(1)} ${q[1].toFixed(1)}h0"/>`;
  return`<svg class="rn-svg${o.thumb?' th':''}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Trajeto da corrida"><path class="rn-lc" d="${d}"/><path class="rn-lw2" d="${d}"/>${o.thumb?'':dot(a,'s')+(o.live?`<path class="rn-dot pu" d="M${b[0].toFixed(1)} ${b[1].toFixed(1)}h0"/>`+dot(b,'cu'):dot(b,'e'))}</svg>`;
}

/* =====================================================================
   5. IMAGENS PNG (Canvas, 100% local)
   ===================================================================== */
const accent=()=>{try{const v=getComputedStyle(document.body).getPropertyValue('--ac2').trim();return v||'#fc4c02'}catch(e){return'#fc4c02'}};
const rgbOf=c=>{try{const k=document.createElement('canvas');k.width=k.height=1;const t=k.getContext('2d');t.fillStyle='#fc4c02';t.fillStyle=c;t.fillRect(0,0,1,1);const d=t.getImageData(0,0,1,1).data;return[d[0],d[1],d[2]]}catch(e){return[252,76,2]}};
const ra=(c,a)=>`rgba(${c[0]},${c[1]},${c[2]},${a})`;
const FF='system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif';
/* reduz a fonte até o texto caber em maxW */
const fit=(g,txt,font,size,maxW)=>{do{g.font=font.replace('%',size);if(g.measureText(txt).width<=maxW||size<=20)break;size-=4}while(true);return size};
const mkCv=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');if(!g)throw new Error('Canvas indisponível neste navegador.');return[c,g]};
const toB=c=>new Promise((ok,no)=>{try{c.toBlob(b=>b?ok(b):no(new Error('Falha ao gerar a imagem.')),'image/png')}catch(e){no(e)}});

/* marcadores de início e chegada no canvas */
function cmarks(g,Q,line,r){
  [[Q[0],'#22c55e'],[Q[Q.length-1],'#f59e0b']].forEach(([q,c])=>{
    g.fillStyle=line;g.beginPath();g.arc(q[0],q[1],r,0,Math.PI*2);g.fill();
    g.fillStyle=c;g.beginPath();g.arc(q[0],q[1],r*.52,0,Math.PI*2);g.fill();
  });
}

/* cartão completo 1080×1350 */
function cvCard(x){
  const W=1080,H=1350,[c,g]=mkCv(W,H),A=accent(),AR=rgbOf(A),R=x.rota||[],has=routeOk(R);
  g.fillStyle='#0a0d12';g.fillRect(0,0,W,H);
  let gr=g.createRadialGradient(W*.88,H*.1,0,W*.88,H*.1,W*.95);gr.addColorStop(0,ra(AR,.34));gr.addColorStop(1,ra(AR,0));g.fillStyle=gr;g.fillRect(0,0,W,H);
  gr=g.createRadialGradient(W*.05,H*.95,0,W*.05,H*.95,W*.7);gr.addColorStop(0,ra(AR,.16));gr.addColorStop(1,ra(AR,0));g.fillStyle=gr;g.fillRect(0,0,W,H);
  g.strokeStyle='rgba(255,255,255,.04)';g.lineWidth=2;
  for(let i=1;i<=7;i++){g.beginPath();g.arc(W*.88,H*.1,i*150,0,Math.PI*2);g.stroke()}
  /* cabeçalho */
  g.fillStyle=A;g.fillRect(80,88,10,52);
  g.textBaseline='alphabetic';g.textAlign='left';g.fillStyle='#fff';g.font='700 44px '+FF;g.fillText(TIPO[x.tipo]?'Corrida · '+TIPO[x.tipo]:'Corrida',108,128);
  g.textAlign='right';g.fillStyle='rgba(255,255,255,.62)';g.font='500 40px '+FF;g.fillText(dt(x.date),1000,128);g.textAlign='left';
  /* trajeto */
  if(has){
    const Q=proj(R,920,600,56);
    g.save();g.translate(80,200);g.lineCap='round';g.lineJoin='round';
    [[46,ra(AR,.16)],[16,A]].forEach(([w,s])=>{g.lineWidth=w;g.strokeStyle=s;g.beginPath();cpath(g,Q);g.stroke()});
    cmarks(g,Q,'#ffffff',20);g.restore();
  }
  /* distância */
  const k=kmn(x.km),by=has?1030:760,font='italic 800 %px '+FF;
  const sz=fit(g,k,font,has?220:320,700);
  g.fillStyle='rgba(255,255,255,.62)';g.font='600 36px '+FF;g.fillText('Distância',80,by-Math.round(sz*.78)-28);
  g.fillStyle='#fff';g.font=font.replace('%',sz);g.fillText(k,80,by);
  const kw=g.measureText(k).width;g.fillStyle=A;g.font='700 72px '+FF;g.fillText('km',80+kw+24,by);
  /* métricas */
  g.fillStyle='rgba(255,255,255,.14)';g.fillRect(80,by+60,920,2);
  const cols=[[fmT(x.sec),'Tempo'],[fmPn(pcs(x.sec,x.km)),'Ritmo (min/km)'],[spdn(x.sec,x.km),'Velocidade (km/h)']];
  cols.forEach(([v,l],i)=>{
    const cx=80+i*320;g.fillStyle='#fff';g.font='700 %px '.replace('%',fit(g,v,'700 %px '+FF,70,290))+FF;g.fillText(v,cx,by+150);
    g.fillStyle='rgba(255,255,255,.62)';g.font='500 32px '+FF;g.fillText(l,cx,by+200);
  });
  return c;
}

/* somente o trajeto, 1080×1080, FUNDO TRANSPARENTE REAL (nenhum fillRect de fundo: o canal alfa fica 0) */
function cvRoute(x,col){
  const S0=1080,[c,g]=mkCv(S0,S0),Q=proj(x.rota||[],S0,S0,130);
  if(!Q.length)throw new Error('Não há pontos suficientes para exportar o trajeto.');
  const L={white:'#ffffff',dark:'#111111',acc:accent()}[col]||'#ffffff';
  g.lineCap='round';g.lineJoin='round';g.lineWidth=20;g.strokeStyle=L;
  g.shadowColor=col=='dark'?'rgba(255,255,255,.55)':'rgba(0,0,0,.5)';g.shadowBlur=20;g.shadowOffsetY=6;
  g.beginPath();cpath(g,Q);g.stroke();
  g.shadowColor='transparent';g.shadowBlur=0;g.shadowOffsetY=0;
  cmarks(g,Q,L,24);
  return c;
}

/* =====================================================================
   6. GRAVAÇÃO AO VIVO: estado, GPS, filtros
   LV = {t0, pm (ms pausados), pa (início da pausa), seg, m (metros), pts:[[ts,lat,lon,seg]], st:'rec'|'pau', rc, hb}
   ===================================================================== */
const saveLV=()=>{lastSave=Date.now();try{LV?localStorage.setItem(LK,JSON.stringify(LV)):localStorage.removeItem(LK)}catch(e){}};
/* tempo ativo: relógio menos pausas; durante a pausa o valor fica congelado em LV.pa */
const el=()=>LV?Math.max(0,Math.round(((LV.pa||Date.now())-LV.t0-LV.pm)/1000)):0;
/* ritmo atual: últimos ~30 s do trecho atual; NaN se ainda não dá para calcular */
const cp=()=>{
  const P=LV.pts,n=P.length;if(n<2)return NaN;
  const z=P[n-1];let d=0,f=z;
  for(let i=n-2;i>=0;i--){const p=P[i];if(p[3]!=z[3])break;d+=hv(p[1],p[2],P[i+1][1],P[i+1][2]);f=p;if(z[0]-p[0]>=GP.win*1000)break}
  const t=(z[0]-f[0])/1000,v=d>=15&&t>=5?t/(d/1000):NaN;
  return isFinite(v)&&v>0&&v<=5999?v:NaN;
};

/* recuperação: se o app foi fechado no meio da corrida, volta pausada; o tempo com o app fechado NÃO conta.
   A pausa começa no último sinal de vida conhecido (último ponto ou batimento salvo). */
try{LV=JSON.parse(localStorage.getItem(LK))}catch(e){LV=null}
if(LV&&isFinite(LV.t0)&&Array.isArray(LV.pts)){
  LV.pts=LV.pts.filter(p=>Array.isArray(p)&&p.length>=4&&isFinite(p[0])&&isFinite(p[1])&&isFinite(p[2]));
  LV.pm=isFinite(LV.pm)?LV.pm:0;LV.m=isFinite(LV.m)&&LV.m>=0?LV.m:0;LV.seg=isFinite(LV.seg)?LV.seg:0;
  if(LV.st=='rec'){
    const l=LV.pts[LV.pts.length-1],alive=Math.max(l?l[0]:0,LV.hb||0,LV.t0+LV.pm);
    LV.st='pau';LV.pa=Math.min(alive,Date.now());LV.rc=1;saveLV();
  }else if(LV.st!='pau'){LV=null;saveLV()}
}else if(LV){LV=null;saveLV()}

const onPos=p=>{
  if(!LV||LV.st!='rec')return;
  const c=p.coords,ts=p.timestamp||Date.now();
  gps.fix=Date.now();gps.acc=c.accuracy;gps.err=null;
  if(!isFinite(c.latitude)||!isFinite(c.longitude)||!(c.accuracy<=GP.acc)||ts<LV.t0)return;   /* sinal ruim */
  const l=LV.pts[LV.pts.length-1];
  if(l&&l[3]==LV.seg){
    const dts=(ts-l[0])/1000,d=hv(l[1],l[2],c.latitude,c.longitude);
    if(dts<=0)return;
    if(dts>GP.gap){LV.seg++;gps.gap=Date.now()}                       /* ficou muito tempo sem ponto: novo trecho, sem ligar em linha reta */
    else{
      if(d<Math.max(GP.step,c.accuracy*.35)||d/dts>GP.vmax)return;     /* parado/tremida ou salto de GPS */
      LV.m+=d;
    }
  }
  LV.pts.push([ts,+c.latitude.toFixed(6),+c.longitude.toFixed(6),LV.seg]);
  if(Date.now()-lastSave>3000)saveLV();
  upd();
};
const er=e=>{
  if(!LV||!e)return;
  if(e.code==1){                                                       /* permissão negada: pausa para não inventar tempo sem dados */
    gps.err='denied';stopW();
    if(LV.st=='rec'){LV.st='pau';LV.pa=Date.now()}
    saveLV();render();
  }else gps.err=e.code==3?'timeout':'unavail';
};
function stopW(){
  wtok++;
  if(wid!=null){try{navigator.geolocation.clearWatch(wid)}catch(e){}wid=null}
  if(wlk){try{wlk.release().catch(()=>{})}catch(e){}wlk=null}
}
function startW(){
  stopW();const t=wtok;                                                /* garante um único observador */
  try{wid=navigator.geolocation.watchPosition(onPos,er,{enableHighAccuracy:true,maximumAge:0,timeout:30000})}catch(e){gps.err='unavail'}
  try{navigator.wakeLock&&navigator.wakeLock.request('screen').then(l=>{
    if(t!==wtok||!LV||LV.st!='rec'){try{l.release().catch(()=>{})}catch(e){}return}
    wlk=l;
  }).catch(()=>{})}catch(e){}                                          /* tela acesa */
}
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){if(LV)saveLV();return}
  if(LV&&LV.st=='rec')startW();                                        /* reabre GPS e bloqueio de tela ao voltar */
});
window.addEventListener('pagehide',()=>{if(LV)saveLV()});

/* =====================================================================
   7. TELA AO VIVO: atualização contínua
   ===================================================================== */
const setT=(id,t)=>{const e=document.getElementById(id);if(e&&e.textContent!==t)e.textContent=t};
const liveState=()=>{
  if(LV.st=='pau')return LV.rc?'int':'pau';
  if(!LV.pts.length&&!gps.fix)return'busca';
  if(gps.fix&&(Date.now()-gps.fix)/1000>GP.weak)return'fraco';
  return'rec';
};
const STL={busca:'Procurando GPS',rec:'Gravando',fraco:'Sinal fraco',pau:'Em pausa',int:'Corrida interrompida'};
function banners(st){
  const o=[];
  if(LV.rc)o.push(['wa','Corrida interrompida','O app foi fechado durante a gravação. O tempo com o app fechado não foi contado. Retome, finalize ou descarte.']);
  if(gps.err=='denied')o.push(['er','Permissão de localização negada','Libere a localização para este site nas configurações do navegador e toque em Retomar.']);
  else if(gps.err=='unavail')o.push(['wa','Posição indisponível','O aparelho não conseguiu obter a posição. Vá para um local aberto.']);
  else if(gps.err=='timeout')o.push(['wa','O GPS demorou a responder','Continuamos tentando. Se persistir, vá para um local aberto.']);
  if(window.isSecureContext===false)o.push(['er','Conexão não segura','O GPS só funciona em HTTPS ou localhost.']);
  if(st=='fraco')o.push(['wa','Sinal fraco','Sem posição recente. Pontos imprecisos são ignorados para não distorcer a distância.']);
  if(gps.gap&&Date.now()-gps.gap<12000)o.push(['wa','Lacuna no GPS','O GPS ficou sem registrar por um tempo. O trecho sem dados não entrou na distância.']);
  return o.map(b=>`<div class="rn-bn ${b[0]}" role="alert">${I('alert',20)}<div><b>${b[1]}</b><span>${b[2]}</span></div></div>`).join('');
}
function upd(){
  if(!LV)return;const r=document.getElementById('rl');if(!r)return;
  const s=el(),k=LV.m/1000,paused=LV.st=='pau',cur=paused?NaN:cp(),avg=k>=GP.minKm&&s>0?s/k:NaN,st=liveState();
  r.dataset.s=st;
  setT('rt',fmT(s));setT('rk',kmn(k));setT('rp',fmPn(cur));setT('ra',fmPn(avg));
  document.getElementById('rp').parentNode.classList.toggle('na',!isFinite(cur));
  document.getElementById('ra').parentNode.classList.toggle('na',!isFinite(avg));
  setT('rstt',STL[st]);
  /* indicador do sinal */
  let q=0,ql='Sem sinal';
  if(paused){ql='Em espera'}
  else if(gps.fix){const age=(Date.now()-gps.fix)/1000;if(age>GP.weak||gps.acc>GP.acc){q=1;ql='Fraco'}else if(gps.acc<=10){q=3;ql='Forte'}else{q=2;ql='Bom'}}
  const sg=document.getElementById('rsg');if(sg)sg.dataset.q=q;setT('rsq',ql);
  const b=banners(st),bb=document.getElementById('rbn');
  if(bb&&bk.b!==b){bk.b=b;bb.innerHTML=b}
  /* trajeto em tempo real: só redesenha quando muda */
  const key=LV.pts.length+'|'+LV.st;
  if(bk.m!==key){
    bk.m=key;let P=LV.pts.map(q=>[q[1],q[2],q[3]]);if(P.length>300)P=simp(P,3);
    const m=document.getElementById('rm');if(m)m.innerHTML=rsvg(P,{w:600,h:460,pd:34,live:1,msg:'O trajeto aparece quando o GPS pegar sinal.'});
  }
}
function tick(){
  try{
    if(LV&&LV.st=='rec'){LV.hb=Date.now();if(Date.now()-lastSave>5000)saveLV()}   /* batimento: base para a recuperação */
    upd();
  }catch(e){console.error('[corrida]',e)}
}
setInterval(tick,500);

/* =====================================================================
   8. FEEDBACK: toast e confirmação
   ===================================================================== */
function toast(msg,kind){
  let box=document.getElementById('rn-tb');
  if(!box){box=document.createElement('div');box.id='rn-tb';box.className='rn-t';box.setAttribute('role','status');box.setAttribute('aria-live','polite');document.body.appendChild(box)}
  const t=document.createElement('div');t.className='rn-ti '+(kind||'');t.innerHTML=(kind=='er'?I('alert',18):I('check',18))+'<span>'+esc(msg)+'</span>';
  box.appendChild(t);setTimeout(()=>{t.classList.add('out');setTimeout(()=>t.remove(),250)},kind=='er'?5200:3200);
}
function cfm(title,msg,okL,danger){
  return new Promise(res=>{
    const m=document.createElement('div');m.className='rn-m';m.setAttribute('role','alertdialog');m.setAttribute('aria-modal','true');
    m.innerHTML=`<div class="rn-bx rn-cf"><h3>${esc(title)}</h3><p>${esc(msg)}</p><div class="rn-ab"><button type="button" class="rn-btn gh" id="rn-cn">Cancelar</button><button type="button" class="rn-btn ${danger?'dg2':'pri'}" id="rn-ok">${esc(okL)}</button></div></div>`;
    const kd=e=>{if(e.key=='Escape'){e.stopPropagation();end(false)}},
      end=v=>{document.removeEventListener('keydown',kd,true);m.remove();res(v)};
    document.addEventListener('keydown',kd,true);
    m.addEventListener('click',e=>{if(e.target===m)end(false)});
    document.body.appendChild(m);
    m.querySelector('#rn-cn').onclick=()=>end(false);
    const ok=m.querySelector('#rn-ok');ok.onclick=()=>end(true);ok.focus();
  });
}

/* =====================================================================
   9. FORMULÁRIO (novo / editar) — usa o fm() do Hub
   ===================================================================== */
const form=x=>[
  {k:'date',l:'Data',t:'date',v:x.date||TD(),r:1},
  {k:'km',l:'Distância (km)',t:'number',v:x.km??'',r:1},
  {k:'tempo',l:'Tempo (minutos, mm:ss ou h:mm:ss)',v:x.sec?fmT(x.sec):'',r:1},
  {k:'tipo',l:'Local',t:'select',v:x.tipo||'rua',o:Object.entries(TIPO)},
  {k:'obs',l:'Observação (opcional)',v:x.obs||''}
];
const read=o=>{
  const bad=m=>{toast(m,'er');return null};
  const d=String(o.date||'').trim();
  if(!/^\d{4}-\d{2}-\d{2}$/.test(d)||isNaN(new Date(d+'T12:00:00')))return bad('Informe uma data válida.');
  if(d>TD())return bad('A data não pode estar no futuro.');
  const km=num(o.km);
  if(!(km>0))return bad('Informe a distância em km. Ex.: 5 ou 5,2.');
  if(km>500)return bad('Distância acima de 500 km. Confira o valor.');
  const sec=parseT(o.tempo);
  if(!(sec>0))return bad('Tempo inválido. Use 30, 30:45 ou 1:05:30 (segundos até 59).');
  if(sec>86400)return bad('Tempo acima de 24 horas. Confira o valor.');
  if(sec/km<120)return bad('Esse ritmo (menos de 2:00 /km) não é possível. Confira distância e tempo.');
  return{date:d,km:+km.toFixed(3),sec,tipo:TIPO[o.tipo]?o.tipo:'rua',obs:String(o.obs||'').trim().slice(0,300)};
};

/* =====================================================================
   10. COMPARTILHAR: folha com prévia, cartão completo ou só o trajeto transparente
   ===================================================================== */
function shDraw(){
  const m=document.getElementById('rn-sh');if(!m||!shr)return;
  const x=shr.x,has=routeOk(x.rota),mode=has?shr.mode:'card',can=!!navigator.share;
  m.innerHTML=`<div class="rn-bx rn-shb"><div class="rn-shh"><h3>Compartilhar corrida</h3><button type="button" class="rn-btn gh ic" data-a="shx" aria-label="Fechar">${I('plus',20).replace('<svg ','<svg style="transform:rotate(45deg)" ')}</button></div>
<div class="rn-seg" role="tablist"><button type="button" role="tab" aria-selected="${mode=='card'}" class="${mode=='card'?'on':''}" data-a="shm" data-id="card">Cartão completo</button><button type="button" role="tab" aria-selected="${mode=='route'}" class="${mode=='route'?'on':''}" data-a="shm" data-id="route"${has?'':' disabled title="Disponível só para corridas com trajeto GPS"'}>Só o trajeto</button></div>
${mode=='route'?`<div class="rn-sw" role="group" aria-label="Cor do traçado">${[['white','Branco'],['dark','Preto'],['acc','Cor do app']].map(c=>`<button type="button" class="${shr.col==c[0]?'on':''}" data-a="shc" data-id="${c[0]}">${c[1]}</button>`).join('')}</div>`:''}
<div class="rn-pv${mode=='route'?' chk':''}"><div class="rn-sp" aria-label="Gerando imagem"></div></div>
<p class="rn-note">${mode=='route'?'PNG com fundo transparente de verdade (canal alfa), 1080 × 1080 px. A prévia usa um xadrez só para mostrar a transparência.':'Imagem PNG 1080 × 1350 px, gerada neste aparelho.'}${has?'':' Sem trajeto: esta corrida foi registrada sem GPS.'}</p>
<div class="rn-ab">${can?`<button type="button" class="rn-btn pri" data-a="shs" id="rn-shs">${I('share',18)} Compartilhar</button>`:''}<button type="button" class="rn-btn ${can?'':'pri'}" data-a="shd" id="rn-shd">${I('img',18)} Baixar PNG</button></div></div>`;
  const pv=m.querySelector('.rn-pv');
  setTimeout(()=>{
    if(!document.getElementById('rn-sh')||!shr)return;
    try{shr.cv=mode=='route'?cvRoute(x,shr.col):cvCard(x);shr.mode2=mode;pv.innerHTML='';pv.appendChild(shr.cv)}
    catch(e){console.error('[corrida]',e);shr.cv=null;pv.innerHTML=`<div class="rn-bn er">${I('alert',20)}<div><b>Não foi possível gerar a imagem</b><span>${esc(e&&e.message||'Erro desconhecido.')}</span></div></div>`;
      ['rn-shs','rn-shd'].forEach(i=>{const b=document.getElementById(i);if(b)b.disabled=true})}
  },30);
}
const dl=(b,nm)=>{const a=document.createElement('a'),u=URL.createObjectURL(b);a.href=u;a.download=nm;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),5000)};
const shName=()=>(shr.mode2=='route'?'trajeto-':'corrida-')+shr.x.date+'.png';

/* =====================================================================
   11. AÇÕES (RUN) — compatível com o objeto global anterior
   ===================================================================== */
const RUN={
  n(){fm('Nova corrida',form({}),o=>{const r=read(o);if(!r)return;S.runs.push({id:uid(),...r});RD();toast('Corrida salva.')})},
  e(id){
    const x=S.runs.find(r=>r.id==id);if(!x)return;
    fm('Editar corrida',form(x),o=>{const r=read(o);if(!r)return;Object.assign(x,r);RD();toast('Alterações salvas.')},()=>{
      cfm('Excluir corrida?','Esta corrida será apagada deste aparelho. Isso não pode ser desfeito.','Excluir',1).then(ok=>{
        if(!ok)return;S.runs=S.runs.filter(r=>r!==x);if(rv==x.id)rv=null;RD();toast('Corrida excluída.');
      });
    });
  },
  del(id){
    const x=S.runs.find(r=>r.id==id);if(!x)return;
    cfm('Excluir corrida?','Esta corrida será apagada deste aparelho. Isso não pode ser desfeito.','Excluir',1).then(ok=>{
      if(!ok)return;S.runs=S.runs.filter(r=>r!==x);rv=null;fresh=false;RD();toast('Corrida excluída.');
    });
  },
  f(v){rf=v;lim=20;render()},
  v(id){rv=id;fresh=false;render();try{window.scrollTo(0,0)}catch(e){}},
  b(){rv=null;fresh=false;render()},
  more(){lim+=20;render()},
  menu(v){MENU=v==1;render();try{window.scrollTo(0,0)}catch(e){}},
  goto(pg){MENU=0;if(typeof go=='function')go(pg)},
  rec(){const e=document.getElementById('rn-rec');if(e&&e.scrollIntoView)e.scrollIntoView({behavior:'smooth',block:'start'})},
  go(){
    if(LV||starting)return;
    if(!navigator.geolocation){toast('Este navegador não oferece GPS.','er');return}
    if(window.isSecureContext===false){toast('O GPS só funciona em HTTPS ou localhost. Abra o Hub por um endereço seguro.','er');return}
    const start=()=>{
      starting=false;if(LV)return;
      LV={t0:Date.now(),pm:0,pa:null,seg:0,m:0,pts:[],st:'rec',hb:Date.now()};
      gps={err:null,fix:0,acc:NaN,gap:0};bk={b:'',m:''};saveLV();startW();render();
    };
    starting=true;
    try{
      if(navigator.permissions&&navigator.permissions.query)
        navigator.permissions.query({name:'geolocation'}).then(p=>{
          if(p.state=='denied'){starting=false;toast('Localização bloqueada. Libere o GPS para este site nas configurações do navegador.','er')}
          else start();
        },start);
      else start();
    }catch(e){start()}
  },
  pz(){
    if(!LV)return;
    if(LV.st=='rec'){LV.st='pau';LV.pa=Date.now();stopW()}
    else{LV.pm+=Date.now()-(LV.pa||Date.now());LV.pa=null;LV.seg++;LV.st='rec';LV.rc=0;gps={err:null,fix:0,acc:NaN,gap:0};startW()}
    saveLV();bk={b:'',m:''};render();
  },
  fin(){
    if(!LV)return;
    cfm('Finalizar a corrida?','O trajeto e as métricas serão salvos no histórico.','Finalizar').then(ok=>{
      if(!ok||!LV)return;
      const wasRec=LV.st=='rec';if(wasRec){LV.pa=Date.now()}            /* congela o tempo no instante da finalização */
      stopW();
      const sec=el(),km=LV.m/1000;
      if(km<GP.minKm||sec<GP.minSec){LV=null;saveLV();toast('Corrida muito curta: não foi salva.','er');render();return}
      const r={id:uid(),date:D(new Date(LV.t0)),km:+km.toFixed(3),sec,tipo:'rua',obs:''};
      if(LV.pts.length>=2)r.rota=ds(LV.pts);
      S.runs.push(r);LV=null;saveLV();rv=r.id;fresh=true;RD();
    });
  },
  dc(){
    if(!LV)return;
    cfm('Descartar esta atividade?','O trajeto e as métricas gravados serão perdidos.','Descartar',1).then(ok=>{
      if(!ok||!LV)return;stopW();LV=null;saveLV();gps={err:null,fix:0,acc:NaN,gap:0};render();toast('Atividade descartada.');
    });
  },
  sh(id){
    const x=S.runs.find(r=>r.id==id);if(!x)return;
    const old=document.getElementById('rn-sh');if(old)old.remove();
    shr={x,mode:'card',col:'white',cv:null};
    const m=document.createElement('div');m.className='rn-m';m.id='rn-sh';m.setAttribute('role','dialog');m.setAttribute('aria-modal','true');
    m.addEventListener('click',e=>{if(e.target===m)RUN.shx()});
    document.body.appendChild(m);shDraw();
  },
  shm(id){if(!shr)return;shr.mode=id=='route'?'route':'card';shDraw()},
  shc(id){if(!shr)return;shr.col=id;shDraw()},
  shx(){const m=document.getElementById('rn-sh');if(m)m.remove();shr=null},
  async shd(){
    if(!shr||!shr.cv)return;
    try{const b=await toB(shr.cv);dl(b,shName());toast('Imagem baixada.')}
    catch(e){console.error('[corrida]',e);toast('Não foi possível baixar a imagem.','er')}
  },
  async shs(){
    if(!shr||!shr.cv)return;
    try{
      const b=await toB(shr.cv),nm=shName();let f=null;
      try{f=new File([b],nm,{type:'image/png'})}catch(e){}
      if(f&&navigator.canShare&&navigator.canShare({files:[f]})){
        try{await navigator.share({files:[f],title:'Minha corrida'});return}
        catch(e){if(e&&e.name=='AbortError')return;throw e}
      }
      dl(b,nm);toast('Compartilhar não está disponível aqui. A imagem foi baixada.');
    }catch(e){console.error('[corrida]',e);toast('Não foi possível compartilhar a imagem. Tente baixar o PNG.','er')}
  }
};
window.RUN=RUN;

/* =====================================================================
   12. TELAS
   ===================================================================== */
const tile=(ic,v,l,dim)=>`<div class="rn-tl${dim?' dim':''}"><span class="rn-tic">${I(ic,18)}</span><b>${v}</b><span class="rn-lab">${l}</span></div>`;

/* ---- tela imersiva da corrida ---- */
function live(){
  bk={b:'',m:''};setTimeout(tick,0);
  const pau=LV.st=='pau';
  return`<div class="rn rn-live" id="rl" data-s="${liveState()}">
<div class="rn-lt"><span class="rn-pill"><i></i><span id="rstt">${STL[liveState()]}</span></span><span class="rn-sg" id="rsg" data-q="0" title="Sinal do GPS"><i></i><i></i><i></i><span id="rsq">Sem sinal</span></span></div>
<div class="rn-lb" id="rbn"></div>
<div class="rn-lbody">
  <div class="rn-lm" id="rm"></div>
  <div class="rn-ls">
    <div class="rn-tm"><b class="rn-time" id="rt">0:00</b><span class="rn-lab">Tempo ativo</span></div>
    <div class="rn-ds"><div class="rn-dist"><b id="rk">0,00</b><small>km</small></div><span class="rn-lab">Distância</span></div>
    <div class="rn-pc"><div class="rn-pb na"><b id="rp">—</b><span class="rn-lab">Ritmo atual (min/km)</span></div><div class="rn-pb na"><b id="ra">—</b><span class="rn-lab">Ritmo médio (min/km)</span></div></div>
  </div>
</div>
<div class="rn-ctl">
  <div class="rn-cw"><button type="button" class="rn-rb sm" data-a="dc" aria-label="Descartar atividade">${I('trash',24)}</button><span>Descartar</span></div>
  <div class="rn-cw"><button type="button" class="rn-rb main" data-a="pz" aria-label="${pau?'Retomar':'Pausar'}">${I(pau?'play':'pause',34)}</button><span>${pau?'Retomar':'Pausar'}</span></div>
  <div class="rn-cw"><button type="button" class="rn-rb sm fin" data-a="fin" aria-label="Finalizar corrida">${I('stop',24)}</button><span>Finalizar</span></div>
</div>
<p class="rn-note c">Mantenha esta tela aberta. Ela fica acesa durante a gravação, mas o navegador pode pausar o GPS se a tela for bloqueada.${'wakeLock' in navigator?'':' Este navegador não consegue manter a tela acesa sozinho.'}</p>
</div>`;
}

/* ---- detalhes de uma corrida ---- */
function det(x){
  const R=Array.isArray(x.rota)?x.rota:[],has=routeOk(R),pc=pcs(x.sec,x.km);
  const map=has?rsvg(R,{w:640,h:430,pd:36}):R.length?`<div class="rn-nor">${I('pin',26)}<span>Poucos pontos GPS para desenhar o trajeto.</span></div>`:`<div class="rn-nor">${I('pin',26)}<b>Sem trajeto GPS</b><span>Esta corrida foi registrada manualmente, sem coordenadas.</span></div>`;
  return`<div class="rn">
<div class="rn-top"><button type="button" class="rn-btn gh sm" data-a="b">${I('back',18)} Corridas</button></div>
${fresh?`<div class="rn-bn ok" role="status">${I('check',20)}<div><b>Corrida finalizada e salva</b><span>Ela já está no seu histórico. Compartilhe o cartão ou o trajeto.</span></div></div>`:''}
<section class="rn-dh"><div class="rn-dmap">${map}</div>
<div class="rn-dinfo"><span class="rn-lab">${esc(dlong(x.date))}</span><div class="rn-bign"><b>${kmn(x.km)}</b><small>km</small></div><div class="rn-chips"><span class="rn-chip">${esc(TIPO[x.tipo]||'Corrida')}</span>${has?`<span class="rn-chip a">${I('pin',14)} GPS</span>`:''}</div></div></section>
<section class="rn-tiles">${tile('clock',fmTu(x.sec),'Tempo ativo')}${tile('gauge',fmPn(pc)+(isFinite(pc)?' /km':''),'Ritmo médio',!isFinite(pc))}${tile('pulse',spd(x.sec,x.km),'Velocidade média')}${tile('cal',dt(x.date),'Data')}${tile('route',esc(TIPO[x.tipo]||'—'),'Atividade')}</section>
${x.obs?`<section class="rn-card"><span class="rn-lab">Observações</span><p class="rn-obs">${esc(x.obs)}</p></section>`:''}
<div class="rn-act"><button type="button" class="rn-btn pri" data-a="sh" data-id="${esc(x.id)}">${I('share',18)} Compartilhar</button><button type="button" class="rn-btn" data-a="e" data-id="${esc(x.id)}">${I('edit',18)} Editar</button><button type="button" class="rn-btn gh dg" data-a="del" data-id="${esc(x.id)}">${I('trash',18)} Excluir</button></div>
</div>`;
}

/* ---- gráfico de km por semana (barras HTML/CSS, sem dependências) ---- */
function bars(v,l){
  const mx=Math.max(...v,1);
  return`<div class="rn-bars" role="img" aria-label="Quilômetros por semana nas últimas 8 semanas">${v.map((n,i)=>`<div class="rn-bc${i==v.length-1?' cur':''}"><span class="rn-bv">${n?String(n).replace('.',','):''}</span><div class="rn-bt"><div class="rn-bf${n?'':' z'}" style="height:${n?Math.max(5,n/mx*100):0}%"></div></div><span class="rn-bl">${l[i]}</span></div>`).join('')}</div>`;
}
const recRow=(ic,l,v,sub,x)=>`<div class="rn-rc"${x?` role="button" tabindex="0" data-a="v" data-id="${esc(x.id)}"`:''}><span class="rn-tic">${I(ic,18)}</span><div class="rn-rt"><span class="rn-lab">${l}</span><b>${v}</b></div><span class="rn-mu">${sub}</span></div>`;

const who=()=>(typeof S!='undefined'&&S.name&&String(S.name).trim())||'Você';
const TT={rua:'Corrida na rua',esteira:'Corrida na esteira',trilha:'Corrida na trilha',pista:'Corrida na pista'};
/* atividade no feed (estilo Strava): autor, título, métricas e trajeto real quando houver GPS */
function feed(x){
  const R=x.rota,has=routeOk(R),pc=pcs(x.sec,x.km),n=who();
  return`<article class="rn-fc" role="button" tabindex="0" data-a="v" data-id="${esc(x.id)}" aria-label="Abrir corrida de ${kmf(x.km)} em ${dt(x.date)}">
<div class="rn-fh"><div class="rn-av">${esc(n.charAt(0).toUpperCase())}</div><div class="rn-fn"><b>${esc(n)}</b><span>${esc(dlong(x.date))}</span></div>${has?`<span class="rn-chip a" title="Possui trajeto GPS">${I('pin',13)} GPS</span>`:''}</div>
<h3 class="rn-ft">${esc(x.obs?String(x.obs).slice(0,60):(TT[x.tipo]||'Corrida'))}</h3>
<div class="rn-fs"><div><span class="rn-lab">Distância</span><b>${kmn(x.km)} <small>km</small></b></div><div><span class="rn-lab">Ritmo</span><b>${fmPn(pc)}${isFinite(pc)?' <small>/km</small>':''}</b></div><div><span class="rn-lab">Tempo</span><b>${fmT(x.sec)}</b></div></div>
${has?`<div class="rn-fm">${rsvg(R,{w:640,h:360,pd:30})}</div>`:''}</article>`;
}
/* barra fixa de baixo: Gravar em destaque */
const recBar=()=>`<div class="rn-bb" role="toolbar" aria-label="Gravar corrida"><div class="rn-bbi"><button type="button" class="rn-bm" data-a="n" aria-label="Registrar corrida manualmente">${I('plus',22)}<span>Manual</span></button><button type="button" class="rn-rec" data-a="go">${I('play',22)} Gravar</button><button type="button" class="rn-bm" data-a="rec" aria-label="Ver recordes">${I('trophy',22)}<span>Recordes</span></button></div></div>`;

/* tela de menu (engrenagem): perfil + páginas do Hub, igual à da Música */
function menuView(){
  const n=who(),L=PG.filter(p=>p[0]!='run');
  return`<div class="rn"><div class="rn-mh"><button type="button" class="rn-ib" data-a="menu" data-id="0" aria-label="Voltar">${I('back',24)}</button><h1 style="flex:1;font-size:26px">Configurações</h1></div>
<div class="rn-prof"><div class="rn-av">${esc(n.charAt(0).toUpperCase())}</div><div><b style="font-size:20px">${esc(n)}</b><p class="rn-mu">Hub Pessoal</p></div></div>
<p class="rn-mu" style="margin:0 12px 6px!important">Ir para</p>
${L.map(p=>`<div class="rn-mi" role="button" tabindex="0" data-a="goto" data-id="${esc(p[0])}"><span>${esc(p[2])}</span>${I('chev',20)}</div>`).join('')}</div>`;
}

function view(){
  if(LV)return live();
  if(MENU)return menuView();
  if(rv){const x=S.runs.find(r=>r.id==rv);if(x)return det(x);rv=null;fresh=false}
  const all=S.runs.slice().reverse().sort((a,b)=>a.date<b.date?1:a.date>b.date?-1:0),
    L=all.filter(x=>inR(x.date)),km=sum(L,'km'),sec=sum(L,'sec'),
    best=a=>a.filter(x=>x.km>=1&&x.sec>0).sort((p,q)=>p.sec/p.km-q.sec/q.km)[0],
    bp=best(L),far=L.slice().sort((a,b)=>b.km-a.km)[0],
    gb=best(all),gf=all.slice().sort((a,b)=>b.km-a.km)[0],gt=all.slice().sort((a,b)=>b.sec-a.sec)[0],
    PL={sem:'Últimos 7 dias',mes:'Este mês',tudo:'Todo o histórico'}[rf]||'';
  const head=`<header class="rn-hd rn-hdr"><div><h1>Corrida</h1>${all.length?`<p class="rn-sub">${all.length} ${all.length==1?'corrida':'corridas'} · ${kmf(sum(all,'km'))} no total</p>`:''}</div><button type="button" class="rn-ib" data-a="menu" data-id="1" aria-label="Configurações" title="Configurações">${I('gear',24)}</button></header>`;

  if(!all.length)return`<div class="rn rn-pg">${head}
<section class="rn-empty"><svg viewBox="0 0 220 140" width="220" height="140" aria-hidden="true"><path d="M20 112c28 0 34-34 62-34s30 26 56 26 28-60 62-60" fill="none" stroke="var(--rn-a)" stroke-width="6" stroke-linecap="round" stroke-opacity=".22"/><path d="M20 112c28 0 34-34 62-34s30 26 56 26 28-60 62-60" fill="none" stroke="var(--rn-a)" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="1 9"/><circle cx="20" cy="112" r="7" fill="var(--rn-ok)"/><circle cx="200" cy="44" r="7" fill="var(--rn-a)"/></svg>
<h2>Sua primeira corrida começa aqui</h2><p>Toque em <b>Gravar</b> para usar o GPS, ou em <b>Manual</b> para registrar uma corrida que você já fez. O trajeto é desenhado neste aparelho, sem mapa e sem internet.</p>
${window.isSecureContext===false?`<p class="rn-note">O GPS só funciona em HTTPS ou localhost.</p>`:''}</section>${recBar()}</div>`;

  const wk=[7,6,5,4,3,2,1,0].map(i=>mon(add(new Date(),-7*i))),
    wv=wk.map(m=>{const a=D(m),b=D(add(m,6));return +sum(S.runs.filter(x=>x.date>=a&&x.date<=b),'km').toFixed(1)}),
    wl=wk.map(m=>D(m).slice(8)+'/'+D(m).slice(5,7));

  const kpi=sf(()=>`<section class="rn-kpi"><div class="rn-km"><span class="rn-lab">Distância · ${PL}</span><div class="rn-bign"><b>${L.length?kmn(km):'—'}</b><small>km</small></div>${L.length?'':'<p class="rn-mu">Nenhuma corrida neste período.</p>'}</div>
<div class="rn-tiles">${tile('clock',L.length?fmTu(sec):'—','Tempo total',!L.length)}${tile('gauge',L.length?fmPn(pcs(sec,km))+' /km':'—','Ritmo médio',!L.length)}${tile('pulse',L.length?spd(sec,km):'—','Velocidade média',!L.length)}${tile('hash',L.length,'Corridas',!L.length)}${tile('route',far?kmf(far.km):'—','Maior distância',!far)}${tile('trophy',bp?pace(bp):'—','Melhor ritmo'+(bp?' ('+kmf(bp.km)+')':''),!bp)}</div></section>`);
  const chart=sf(()=>`<section class="rn-card"><div class="rn-ch"><h2>Km por semana</h2><span class="rn-mu">Últimas 8 semanas</span></div>${bars(wv,wl)}</section>`);
  const recs=sf(()=>`<section class="rn-card" id="rn-rec"><div class="rn-ch"><h2>Recordes pessoais</h2></div>
${recRow('trophy','Melhor ritmo',gb?pace(gb):'—',gb?dt(gb.date):'Corridas de 1 km ou mais',gb)}${recRow('route','Maior distância',gf?kmf(gf.km):'—',gf?dt(gf.date):'',gf)}${recRow('clock','Maior tempo',gt?fmTu(gt.sec):'—',gt?dt(gt.date):'',gt)}${recRow('hash','Km acumulados',kmf(sum(all,'km')),all.length+(all.length==1?' corrida':' corridas'))}</section>`);
  const acts=sf(()=>`<section><div class="rn-ch"><h2>Atividades</h2><span class="rn-mu">${PL}</span></div>${L.length?`<div class="rn-feed">${L.slice(0,lim).map(feed).join('')}</div>`:`<div class="rn-emp2 rn-card"><p>Nenhuma corrida neste período.</p>${rf!='tudo'?`<button type="button" class="rn-btn gh sm" data-a="f" data-id="tudo">Ver todo o histórico</button>`:''}</div>`}${L.length>lim?`<div class="rn-more"><button type="button" class="rn-btn gh" data-a="more">Mostrar mais (${L.length-lim})</button></div>`:''}</section>`);

  return`<div class="rn rn-pg">${head}
<div class="rn-seg" role="tablist" aria-label="Período">${[['sem','7 dias'],['mes','Este mês'],['tudo','Histórico completo']].map(f=>`<button type="button" role="tab" aria-selected="${rf==f[0]}" class="${rf==f[0]?'on':''}" data-a="f" data-id="${f[0]}">${f[1]}</button>`).join('')}</div>
${window.isSecureContext===false?`<div class="rn-bn wa" role="status">${I('alert',20)}<div><b>GPS indisponível nesta conexão</b><span>O GPS só funciona em HTTPS ou localhost. Você ainda pode registrar manualmente.</span></div></div>`:''}
${kpi}${chart}${acts}${recs}${recBar()}</div>`;
}

/* =====================================================================
   13. EVENTOS (delegação única) E CSS
   ===================================================================== */
const ACT=['menu','goto','rec','go','n','e','f','v','b','pz','fin','dc','sh','del','more','shm','shc','shx','shs','shd'];
if(!window.__rnEv){
  window.__rnEv=1;
  document.addEventListener('click',ev=>{
    const e=ev.target.closest&&ev.target.closest('[data-a]');if(!e||e.disabled)return;
    const a=e.getAttribute('data-a'),R=window.RUN;
    if(!R||ACT.indexOf(a)<0||typeof R[a]!='function')return;
    ev.preventDefault();
    try{R[a](e.getAttribute('data-id'))}catch(err){console.error('[corrida]',err);toast('Algo deu errado. Tente de novo.','er')}
  });
  document.addEventListener('keydown',ev=>{
    if(ev.key=='Escape'&&document.getElementById('rn-sh')&&!document.querySelector('.rn-cf')){window.RUN&&window.RUN.shx();return}
    if(ev.key!='Enter'&&ev.key!=' ')return;
    const e=ev.target;if(e&&e.getAttribute&&e.getAttribute('role')=='button'&&e.hasAttribute('data-a')){ev.preventDefault();e.click()}
  });
}

if(!document.getElementById('rn-css')){
  const st=document.createElement('style');st.id='rn-css';
  st.textContent=`
.rn,.rn-m,.rn-t{--rn-a:var(--ac2,#fc4c02);--rn-ok:var(--ok,#22c55e);--rn-wa:var(--wa,#f59e0b);--rn-er:#ef4444;--rn-s1:rgba(127,127,127,.09);--rn-s2:rgba(127,127,127,.16);--rn-ln:rgba(127,127,127,.26)}
.rn{max-width:1080px;margin:0 auto;padding-bottom:48px;font-variant-numeric:tabular-nums;-webkit-font-smoothing:antialiased}
.rn *,.rn-m *{box-sizing:border-box}
.rn h1{font-size:clamp(28px,6vw,40px);font-weight:800;letter-spacing:-.03em;line-height:1.1;margin:0}
.rn h2{font-size:16px;font-weight:700;margin:0;letter-spacing:-.01em}
.rn p{margin:0}
.rn-i{flex:none;display:block}
.rn-hd{margin:4px 0 18px}.rn-sub{opacity:.62;margin-top:6px!important;font-size:14px}
.rn-lab{font-size:12.5px;opacity:.62;line-height:1.3}
.rn-mu{opacity:.62;font-size:13px}
.rn-note{font-size:12.5px;opacity:.62;line-height:1.45;margin-top:10px!important}
.rn-note.c{text-align:center;margin:0!important}
/* navegação igual à Música: barra do Hub some nesta página */
body.rn-full nav{display:none}
body.rn-full main{margin-left:0;max-width:none;padding-bottom:18px}
.rn-pg{padding-bottom:120px}
.rn-hdr{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}
.rn-ib{flex:none;width:44px;height:44px;border:0;border-radius:50%;background:transparent;color:inherit;opacity:.8;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;transition:background .15s,opacity .15s}
.rn-ib:hover{background:var(--rn-s2);opacity:1}.rn-ib:focus-visible{outline:2px solid var(--rn-a);outline-offset:2px}
/* menu */
.rn-mh{display:flex;align-items:center;gap:6px;margin:4px 0 18px}
.rn-prof{display:flex;align-items:center;gap:14px;margin:6px 12px 18px}
.rn-prof .rn-av{width:64px;height:64px;font-size:28px}
.rn-mi{display:flex;align-items:center;gap:12px;padding:15px 12px;border-radius:14px;cursor:pointer;font-size:16px;font-weight:600}
.rn-mi:hover{background:var(--rn-s2)}.rn-mi:focus-visible{outline:2px solid var(--rn-a)}.rn-mi span{flex:1}.rn-mi .rn-i{opacity:.55}
/* feed de atividades (estilo Strava) */
.rn-feed{display:grid;gap:14px;grid-template-columns:repeat(auto-fill,minmax(min(100%,340px),1fr));margin-bottom:16px}
.rn-fc{display:flex;flex-direction:column;gap:12px;padding:16px;border:1px solid var(--rn-ln);border-radius:22px;background:var(--rn-s1);cursor:pointer;transition:background .15s;-webkit-tap-highlight-color:transparent}
.rn-fc:hover{background:var(--rn-s2)}.rn-fc:focus-visible{outline:2px solid var(--rn-a);outline-offset:2px}
.rn-fh{display:flex;align-items:center;gap:10px}
.rn-av{flex:none;width:40px;height:40px;border-radius:50%;background:var(--rn-a);color:#fff;font-weight:800;display:flex;align-items:center;justify-content:center}
.rn-fn{flex:1;min-width:0;display:flex;flex-direction:column}.rn-fn b{font-size:15px}.rn-fn span{font-size:12.5px;opacity:.62;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rn-ft{margin:0;font-size:19px;font-weight:800;letter-spacing:-.02em;overflow-wrap:anywhere}
.rn-fs{display:grid;grid-template-columns:1.2fr 1fr 1fr;gap:10px}.rn-fs div{display:flex;flex-direction:column;gap:2px;min-width:0}
.rn-fs b{font-size:22px;font-weight:800;letter-spacing:-.02em;white-space:nowrap}.rn-fs small{font-size:12px;font-weight:600;opacity:.6}
.rn-fm{aspect-ratio:16/9;border-radius:16px;border:1px solid var(--rn-ln);background-color:var(--rn-s1);background-image:radial-gradient(var(--rn-ln) 1px,transparent 1px);background-size:18px 18px;display:flex;overflow:hidden}
/* barra fixa de baixo com o botão Gravar */
.rn-bb{position:fixed;left:0;right:0;bottom:0;z-index:45;padding:10px 16px max(12px,env(safe-area-inset-bottom));background:var(--bg);border-top:1px solid var(--rn-ln)}
.rn-bbi{max-width:560px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:10px}
.rn-bm{flex:0 0 74px;display:flex;flex-direction:column;align-items:center;gap:3px;padding:6px 0;border:0;border-radius:12px;background:transparent;color:inherit;font:inherit;font-size:12px;font-weight:600;opacity:.75;cursor:pointer;-webkit-tap-highlight-color:transparent}
.rn-bm:hover{opacity:1}.rn-bm:focus-visible,.rn-rec:focus-visible{outline:2px solid var(--rn-a);outline-offset:2px}
.rn-rec{flex:1;max-width:260px;min-height:56px;border:0;border-radius:99px;background:var(--rn-a);color:#fff;font:inherit;font-size:18px;font-weight:800;display:inline-flex;align-items:center;justify-content:center;gap:10px;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,.28);transition:transform .12s,filter .15s;-webkit-tap-highlight-color:transparent}
.rn-rec:hover{filter:brightness(1.08)}.rn-rec:active{transform:scale(.97)}
/* botões */
.rn-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px;padding:11px 18px;border:1px solid transparent;border-radius:14px;background:var(--rn-s2);color:inherit;font:inherit;font-weight:700;font-size:15px;cursor:pointer;transition:transform .12s ease,background .15s ease,filter .15s ease,opacity .15s ease;-webkit-tap-highlight-color:transparent}
.rn-btn:hover{background:var(--rn-ln)}.rn-btn:active{transform:scale(.97)}
.rn-btn:focus-visible,.rn-it:focus-visible,.rn-rc:focus-visible,.rn-seg button:focus-visible,.rn-rb:focus-visible,.rn-sw button:focus-visible{outline:2px solid var(--rn-a);outline-offset:2px}
.rn-btn.pri{background:var(--rn-a);color:#fff}.rn-btn.pri:hover{background:var(--rn-a);filter:brightness(1.1)}
.rn-btn.gh{background:transparent;border-color:var(--rn-ln)}.rn-btn.gh:hover{background:var(--rn-s1)}
.rn-btn.dg,.rn-btn.dg:hover{color:var(--rn-er)}
.rn-btn.dg2{background:var(--rn-er);color:#fff}.rn-btn.dg2:hover{background:var(--rn-er);filter:brightness(1.1)}
.rn-btn.sm{min-height:38px;padding:8px 14px;font-size:14px}
.rn-btn.ic{min-height:40px;width:40px;padding:0}
.rn-btn.xl{min-height:60px;padding:16px 30px;font-size:18px;border-radius:18px}
.rn-btn[disabled],.rn-seg button[disabled]{opacity:.45;pointer-events:none}
/* hero e controle de período */
.rn-hero{position:relative;overflow:hidden;border:1px solid var(--rn-ln);border-radius:24px;padding:22px;margin-bottom:16px;display:flex;flex-direction:column;gap:16px}
.rn-hero::before{content:"";position:absolute;inset:0;background:var(--rn-a);opacity:.1;pointer-events:none}
.rn-hero>*{position:relative}
.rn-hero-t{display:flex;flex-direction:column;gap:4px}.rn-hero-t b{font-size:20px;letter-spacing:-.02em}.rn-hero-t span{opacity:.7;font-size:14px}
.rn-hero-a{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
.rn-seg{display:flex;gap:4px;padding:4px;border-radius:16px;background:var(--rn-s1);border:1px solid var(--rn-ln);margin:0 0 16px}
.rn-seg button{flex:1;min-height:40px;padding:8px 10px;border:0;border-radius:12px;background:transparent;color:inherit;font:inherit;font-weight:600;font-size:14px;cursor:pointer;opacity:.7;transition:background .15s,opacity .15s}
.rn-seg button.on{background:var(--rn-a);color:#fff;opacity:1}
/* indicadores */
.rn-kpi{display:grid;gap:12px;margin-bottom:16px}
.rn-km{padding:6px 2px}
.rn-bign{display:flex;align-items:baseline;gap:8px;line-height:1}
.rn-bign b{font-size:clamp(56px,14vw,96px);font-weight:800;letter-spacing:-.05em;font-style:italic}
.rn-bign small{font-size:22px;font-weight:700;color:var(--rn-a)}
.rn-tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:16px}
.rn-kpi .rn-tiles{margin:0}
.rn-tl{display:flex;flex-direction:column;gap:2px;padding:14px;border-radius:18px;background:var(--rn-s1);border:1px solid var(--rn-ln);min-width:0}
.rn-tl b{font-size:21px;font-weight:800;letter-spacing:-.02em;margin-top:8px;overflow-wrap:anywhere}
.rn-tl.dim b{opacity:.4}
.rn-tic{display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:10px;background:var(--rn-s2);color:var(--rn-a)}
.rn-2{display:grid;gap:16px;margin-bottom:16px}
.rn-card{padding:18px;border-radius:22px;background:var(--rn-s1);border:1px solid var(--rn-ln);margin-bottom:16px}
.rn-2 .rn-card{margin:0}
.rn-ch{display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-bottom:14px}
.rn-bars{display:grid;grid-template-columns:repeat(8,1fr);gap:6px;height:190px;align-items:end}
.rn-bc{display:flex;flex-direction:column;align-items:center;gap:4px;height:100%;min-width:0}
.rn-bt{flex:1;width:100%;display:flex;align-items:flex-end;justify-content:center}
.rn-bf{width:min(100%,34px);border-radius:8px 8px 4px 4px;background:var(--rn-a);opacity:.45;transition:height .5s ease}
.rn-bc.cur .rn-bf{opacity:1}.rn-bf.z{height:3px!important;background:var(--rn-ln);opacity:1}
.rn-bv{font-size:11px;font-weight:700;height:14px;white-space:nowrap}.rn-bl{font-size:11px;opacity:.6}
.rn-rc{display:flex;align-items:center;gap:12px;padding:12px 4px;border-top:1px solid var(--rn-ln)}
.rn-rc:first-of-type{border-top:0}.rn-rc[role=button]{cursor:pointer;border-radius:12px}.rn-rc[role=button]:hover{background:var(--rn-s1)}
.rn-rt{flex:1;display:flex;flex-direction:column;min-width:0}.rn-rt b{font-size:19px;font-weight:800;letter-spacing:-.02em}
/* histórico */
.rn-it{display:flex;align-items:center;gap:14px;padding:12px;margin:0 -8px;border-radius:16px;cursor:pointer;transition:background .15s;-webkit-tap-highlight-color:transparent}
.rn-it+.rn-it{border-top:1px solid var(--rn-ln);border-top-left-radius:0;border-top-right-radius:0}
.rn-it:hover{background:var(--rn-s1)}.rn-it:active{background:var(--rn-s2)}
.rn-th{flex:none;width:58px;height:58px;border-radius:16px;background:var(--rn-s2);display:flex;align-items:center;justify-content:center;color:var(--rn-a);overflow:hidden}
.rn-th .rn-svg{width:100%;height:100%}
.rn-th .rn-nor{display:none}
.rn-im{flex:1;min-width:0}.rn-id{display:flex;align-items:baseline;gap:5px;flex-wrap:wrap}
.rn-id b{font-size:24px;font-weight:800;letter-spacing:-.03em;font-style:italic}.rn-id small{font-size:13px;font-weight:700;opacity:.7;margin-right:4px}
.rn-is{font-size:13px;opacity:.62;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rn-ir{flex:none;text-align:right;display:flex;flex-direction:column}.rn-ir b{font-size:17px;font-weight:800}.rn-ir span{font-size:13px;color:var(--rn-a);font-weight:700}
.rn-chip{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:99px;background:var(--rn-s2);font-size:12px;font-weight:700}
.rn-chip.a{color:var(--rn-a)}
.rn-chips{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
.rn-more,.rn-emp2{text-align:center;padding-top:12px}.rn-emp2{display:flex;flex-direction:column;align-items:center;gap:12px;padding:20px 0;opacity:.85}
.rn-empty{display:flex;flex-direction:column;align-items:center;text-align:center;gap:14px;padding:36px 20px;border:1px dashed var(--rn-ln);border-radius:26px}
.rn-empty h2{font-size:22px;letter-spacing:-.02em}.rn-empty p{max-width:420px;opacity:.7;line-height:1.5;font-size:14.5px}
.rn-empty .rn-hero-a{justify-content:center;margin-top:6px}
/* detalhe */
.rn-top{margin:0 0 14px}
.rn-dh{display:grid;gap:14px;margin-bottom:16px}
.rn-dmap{border-radius:24px;border:1px solid var(--rn-ln);background-color:var(--rn-s1);background-image:radial-gradient(var(--rn-ln) 1px,transparent 1px);background-size:18px 18px;aspect-ratio:3/2;display:flex;align-items:center;justify-content:center;overflow:hidden}
.rn-dinfo{display:flex;flex-direction:column;justify-content:center}.rn-dinfo .rn-bign{margin-top:8px}
.rn-obs{margin-top:8px!important;line-height:1.5;white-space:pre-wrap;overflow-wrap:anywhere}
.rn-act{display:flex;flex-wrap:wrap;gap:10px}
.rn-nor{display:flex;flex-direction:column;align-items:center;gap:6px;padding:20px;text-align:center;opacity:.65;font-size:14px}
/* trajeto SVG */
.rn-svg{display:block;width:100%;height:100%}
.rn-svg path{fill:none;stroke-linecap:round;stroke-linejoin:round;vector-effect:non-scaling-stroke}
.rn-lc{stroke:var(--rn-a);stroke-opacity:.2;stroke-width:13px}
.rn-lw2{stroke:var(--rn-a);stroke-width:4.5px}
.rn-svg.th .rn-lc{display:none}.rn-svg.th .rn-lw2{stroke-width:3px}
.rn-dot.rg{stroke:#fff;stroke-width:20px}
.rn-dot.s{stroke:var(--rn-ok);stroke-width:12px}.rn-dot.e{stroke:var(--rn-wa);stroke-width:12px}.rn-dot.cu{stroke:var(--rn-a);stroke-width:12px}
.rn-dot.pu{stroke:var(--rn-a);stroke-opacity:.35;stroke-width:28px;animation:rnpu 1.6s ease-out infinite}
/* avisos */
.rn-bn{display:flex;gap:12px;align-items:flex-start;padding:12px 14px;border-radius:16px;border:1px solid var(--rn-ln);background:var(--rn-s1);margin-bottom:12px;font-size:14px;line-height:1.4}
.rn-bn div{display:flex;flex-direction:column;gap:2px}.rn-bn span{opacity:.75}
.rn-bn.wa{border-color:var(--rn-wa)}.rn-bn.wa .rn-i{color:var(--rn-wa)}
.rn-bn.er{border-color:var(--rn-er)}.rn-bn.er .rn-i{color:var(--rn-er)}
.rn-bn.ok{border-color:var(--rn-ok)}.rn-bn.ok .rn-i{color:var(--rn-ok)}
/* tela ao vivo */
.rn-live{position:fixed;inset:0;z-index:60;max-width:none;margin:0;padding:max(14px,env(safe-area-inset-top)) 16px max(16px,env(safe-area-inset-bottom));background:var(--bg);display:flex;flex-direction:column;gap:12px;overflow:auto}
.rn-lt{display:flex;align-items:center;justify-content:space-between;gap:10px}
.rn-pill{display:inline-flex;align-items:center;gap:8px;padding:8px 14px;border-radius:99px;background:var(--rn-s2);font-weight:700;font-size:14px}
.rn-pill i{width:10px;height:10px;border-radius:50%;background:var(--rn-wa)}
.rn-live[data-s=busca] .rn-pill i,.rn-live[data-s=fraco] .rn-pill i{background:var(--rn-wa);animation:rnbl 1.1s infinite}
.rn-live[data-s=rec] .rn-pill i{background:var(--rn-ok);animation:rnbl 1.6s infinite}
.rn-live[data-s=pau] .rn-pill i{background:#60a5fa}
.rn-live[data-s=int] .rn-pill i{background:var(--rn-er)}
.rn-sg{display:inline-flex;align-items:flex-end;gap:3px;font-size:13px;font-weight:600}
.rn-sg i{width:5px;border-radius:2px;background:var(--rn-ln)}.rn-sg i:nth-child(1){height:8px}.rn-sg i:nth-child(2){height:13px}.rn-sg i:nth-child(3){height:18px}
.rn-sg span{margin-left:8px;opacity:.75;line-height:1}
.rn-sg[data-q="1"] i:nth-child(-n+1),.rn-sg[data-q="2"] i:nth-child(-n+2),.rn-sg[data-q="3"] i{background:var(--rn-ok)}
.rn-sg[data-q="1"] i:nth-child(1){background:var(--rn-wa)}
.rn-lb:empty{display:none}.rn-lb .rn-bn{margin-bottom:8px}
.rn-lbody{flex:1;min-height:0;display:flex;flex-direction:column;gap:14px}
.rn-lm{flex:1 1 150px;min-height:130px;border-radius:24px;background-color:var(--rn-s1);background-image:radial-gradient(var(--rn-ln) 1px,transparent 1px);background-size:18px 18px;border:1px solid var(--rn-ln);display:flex;align-items:center;justify-content:center;overflow:hidden;padding:6px}
.rn-ls{display:flex;flex-direction:column;gap:10px}
.rn-tm,.rn-ds{display:flex;flex-direction:column;gap:2px}
.rn-time{font-size:clamp(60px,19vw,120px);font-weight:800;letter-spacing:-.05em;line-height:1}
.rn-dist{display:flex;align-items:baseline;gap:8px;line-height:1}.rn-dist b{font-size:clamp(46px,14vw,84px);font-weight:800;letter-spacing:-.04em;font-style:italic}.rn-dist small{font-size:22px;font-weight:700;color:var(--rn-a)}
.rn-live[data-s=pau] .rn-time,.rn-live[data-s=int] .rn-time{opacity:.5}
.rn-pc{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.rn-pb{padding:12px 14px;border-radius:18px;background:var(--rn-s1);border:1px solid var(--rn-ln);display:flex;flex-direction:column;gap:2px}.rn-pb b{font-size:30px;font-weight:800;letter-spacing:-.03em}.rn-pb.na b{opacity:.35}
.rn-ctl{display:flex;justify-content:center;align-items:flex-start;gap:clamp(18px,8vw,48px);padding-top:2px}
.rn-cw{display:flex;flex-direction:column;align-items:center;gap:6px;font-size:12.5px;opacity:.9}.rn-cw span{opacity:.7}
.rn-rb{display:inline-flex;align-items:center;justify-content:center;border:0;border-radius:50%;background:var(--rn-s2);color:inherit;cursor:pointer;transition:transform .12s,filter .15s;-webkit-tap-highlight-color:transparent;margin-top:12px}
.rn-rb:active{transform:scale(.94)}
.rn-rb.sm{width:62px;height:62px;margin-top:22px}.rn-rb.main{width:88px;height:88px;background:var(--rn-a);color:#fff;margin-top:0}.rn-rb.main:hover{filter:brightness(1.1)}
.rn-rb.fin{background:var(--rn-er);color:#fff}
.rn-live[data-s=pau] .rn-rb.fin,.rn-live[data-s=int] .rn-rb.fin{box-shadow:0 0 0 4px rgba(239,68,68,.25)}
/* modais, toast */
.rn-m{position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.58);display:flex;align-items:center;justify-content:center;padding:16px;overflow:auto;animation:rnfi .15s ease}
.rn-bx{width:100%;max-width:440px;background:var(--bg);color:inherit;border:1px solid var(--rn-ln);border-radius:24px;padding:20px;display:flex;flex-direction:column;gap:14px;animation:rnup .2s ease;max-height:calc(100vh - 32px);overflow:auto}
.rn-bx h3{margin:0;font-size:19px;letter-spacing:-.02em}.rn-bx p{margin:0;line-height:1.5;opacity:.8;font-size:14.5px}
.rn-shb{max-width:520px}.rn-shh{display:flex;align-items:center;justify-content:space-between}
.rn-ab{display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap}.rn-ab .rn-btn{flex:1 1 auto}
.rn-pv{border-radius:18px;background:var(--rn-s1);border:1px solid var(--rn-ln);display:flex;align-items:center;justify-content:center;min-height:180px;overflow:hidden}
.rn-pv.chk{background-color:#bbb;background-image:linear-gradient(45deg,#8886 25%,transparent 25%,transparent 75%,#8886 75%),linear-gradient(45deg,#8886 25%,transparent 25%,transparent 75%,#8886 75%);background-size:20px 20px;background-position:0 0,10px 10px}
.rn-pv canvas{display:block;max-width:100%;max-height:48vh;width:auto;height:auto}
.rn-sw{display:flex;gap:8px}.rn-sw button{flex:1;min-height:38px;border-radius:12px;border:1px solid var(--rn-ln);background:transparent;color:inherit;font:inherit;font-size:13.5px;font-weight:600;cursor:pointer}.rn-sw button.on{border-color:var(--rn-a);box-shadow:inset 0 0 0 1px var(--rn-a)}
.rn-sp{width:30px;height:30px;border-radius:50%;border:3px solid var(--rn-ln);border-top-color:var(--rn-a);animation:rnsp .7s linear infinite}
.rn-bx .rn-seg{margin:0}.rn-bx .rn-bn{margin:0}
.rn-t{position:fixed;left:0;right:0;bottom:max(92px,calc(80px + env(safe-area-inset-bottom)));z-index:10001;display:flex;flex-direction:column;align-items:center;gap:8px;pointer-events:none;padding:0 16px}
.rn-ti{display:flex;align-items:center;gap:10px;max-width:440px;padding:12px 16px;border-radius:14px;background:#17191d;color:#fff;font-size:14px;line-height:1.35;box-shadow:0 8px 28px rgba(0,0,0,.35);animation:rnup .2s ease;transition:opacity .25s}
.rn-ti .rn-i{color:var(--rn-ok)}.rn-ti.er .rn-i{color:#ff8a80}.rn-ti.out{opacity:0}
@keyframes rnbl{50%{opacity:.35}}@keyframes rnsp{to{transform:rotate(360deg)}}@keyframes rnfi{from{opacity:0}}
@keyframes rnup{from{opacity:0;transform:translateY(10px)}}@keyframes rnpu{0%{stroke-width:12px;stroke-opacity:.5}100%{stroke-width:40px;stroke-opacity:0}}
@media(min-width:720px){
 .rn-kpi{grid-template-columns:minmax(240px,.9fr) 2fr;align-items:center}
 .rn-hero{flex-direction:row;align-items:center;justify-content:space-between}
 .rn-dh{grid-template-columns:1.5fr 1fr}
 .rn-bars{height:220px}
}
@media(min-width:900px){
 .rn-2{grid-template-columns:1.2fr 1fr}
 .rn-live{padding-left:32px;padding-right:32px}
 .rn-lbody{flex-direction:row;align-items:stretch}.rn-lm{flex:1.4 1 0}.rn-ls{flex:1 1 0;justify-content:center;gap:18px}
}
@media(max-width:380px){.rn-tl b{font-size:18px}.rn-id b{font-size:21px}.rn-ir b{font-size:15px}.rn-th{width:50px;height:50px}}
@media(max-height:620px) and (max-width:719px){.rn-time{font-size:56px}.rn-dist b{font-size:42px}.rn-rb.main{width:72px;height:72px}.rn-rb.sm{width:54px;height:54px;margin-top:16px}.rn-pb b{font-size:24px}}
@media(prefers-reduced-motion:reduce){.rn *,.rn-m,.rn-m *,.rn-ti{animation:none!important;transition:none!important}}
`;
  document.head.appendChild(st);
}

/* =====================================================================
   14. REGISTRO NA PÁGINA (antes de Configurações)
   ===================================================================== */
if(!PG.some(p=>p[0]=='run'))PG.splice(PG.length-1,0,['run','🏃','Corrida']);
P.run=()=>{
  try{return view()}
  catch(e){
    console.error('[corrida]',e);
    return`<div class="rn"><header class="rn-hd"><h1>Corrida</h1></header><div class="rn-bn er" role="alert">${I('alert',20)}<div><b>Não foi possível exibir a tela</b><span>Seus dados continuam salvos neste aparelho. Atualize a página para tentar de novo.</span></div></div></div>`;
  }
};
})();