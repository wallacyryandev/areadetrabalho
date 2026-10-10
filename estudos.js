/* Hub Pessoal - estudos.js (v2)
   Área Estudos universal: matérias, foco (Pomodoro / livre / regressiva), planejamento, flashcards, questões, notas, estatísticas.
   Carregar DEPOIS de academia.js e antes do <script> final que chama SY.init().
   Reaproveita: S.subjects, S.sessions, S.qs, fm(), UI, toast(), opts(), sn(), tokens de cor do Hub.
   Dados novos: S.est2 (sincronizável, se 'est2' estiver em SYK). A sessão em andamento fica só neste aparelho (localStorage 'hub_est_run'). */
(()=>{
const U=UI,I=U.i,IB=U.ib,CT=U.ct,EM=U.em;
const COLS=[['#2F6FED','Azul'],['#34B36B','Verde'],['#E8A33D','Âmbar'],['#E5534B','Vermelho'],['#9B6BEA','Roxo'],['#2BB5B5','Turquesa'],['#E26BA6','Rosa'],['#8A94A3','Cinza']];
const SN=['Não iniciado','Em andamento','Concluído'];
const TABS=[['ov','Início'],['mat','Matérias'],['foc','Foco'],['pl','Planejamento'],['rev','Flashcards'],['qs','Questões'],['nt','Anotações'],['st','Estatísticas']];
const PRI={alta:'var(--er)',media:'var(--wa)',baixa:'var(--ok)'};
const RK='hub_est_run',CIRC=628.32;

const ES={tab:'ov',sid:null,q:'',arch:0,pm:'week',pd:new Date(),pday:null,deck:null,rq:null,rt:0,rn:0,sh:0,nid:null,nq:'',nsid:'',narch:0,sp:'7',qp:'30',qsid:'',last:null,run:null,fo:0,annSeq:0,saving:0};
window.ES=ES;

/* ---------- dados ---------- */
const PREF=()=>({pomo:{f:25,s:5,l:15,n:4,autoB:1,autoN:0},count:{h:0,m:30,s:0},snd:{on:1,vol:60},th:'dark',mode:'pomo',key:'|'});
const EMPTY=()=>({goal:120,prefs:PREF(),plans:[],tasks:[],decks:[],cards:[],notes:[],revlog:[]});
const fill=(t,d)=>{for(const k in d){const v=d[k];if(v&&typeof v=='object'&&!Array.isArray(v)){if(!t[k]||typeof t[k]!='object')t[k]=v;else fill(t[k],v)}else if(t[k]==null)t[k]=v}};
const dat=()=>{const e=S.est2;if(e&&typeof e=='object'){fill(e,EMPTY());return e}return EMPTY()};
const W=fn=>{if(!S.est2||typeof S.est2!='object')S.est2=EMPTY();fn(dat())};
const say=m=>{toast(m);clearTimeout(TT);TT=setTimeout(()=>{const e=$('#tt');e&&e.classList.remove('on')},2600)};
const bad=m=>say(m);
const save=()=>{try{SY.chk();localStorage.setItem('hub',JSON.stringify(S));return true}catch(e){bad('Erro ao salvar: o armazenamento do navegador está cheio ou bloqueado.');return false}};
const commit=m=>{if(!save())return false;m&&say(m);render();return true};

/* ---------- ajudantes ---------- */
const subj=id=>S.subjects.find(s=>s.id==id);
const col=s=>s.col||COLS[[...String(s.id)].reduce((a,c)=>a+c.charCodeAt(0),0)%COLS.length][0];
const key=o=>(o.sid||'')+'|'+(o.tid||'');
const spl=k=>{const[a,b]=(k||'|').split('|');return{sid:a||'',tid:b||''}};
const sk=k=>sn(k);
const ft=s=>{s=Math.round(s);const h=Math.floor(s/3600),m=Math.floor(s%3600/60);return h?h+'h '+String(m).padStart(2,'0')+'min':m+'min'};
const hms=s=>{s=Math.max(0,s);const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;return(h?h+':'+String(m).padStart(2,'0'):String(m).padStart(2,'0'))+':'+String(x).padStart(2,'0')};
const hm=ms=>{const d=new Date(ms);return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')};
const dm=s=>s?s.split('-').reverse().slice(0,2).join('/'):'';
const df=s=>s?s.split('-').reverse().join('/'):'';
const secF=f=>sum(S.sessions.filter(f),'sec');
const today=()=>D();
const gid=x=>x.grp||x.id;
const eff=(s,t)=>{const c=s.topics.filter(x=>x.parent==t.id);return c.length?Math.round(sum(c.map(x=>({p:x.p||0})),'p')/c.length):(t.p||0)};
const stOf=(s,t)=>{const hasC=s.topics.some(x=>x.parent==t.id);if(!hasC&&t.st!=null)return t.st;const p=eff(s,t);return p>=100?2:p>0?1:0};
const leaf=s=>s.topics.filter(t=>!s.topics.some(x=>x.parent==t.id));
const prog=s=>{const l=leaf(s);return l.length?Math.round(sum(l.map(t=>({p:t.p||0})),'p')/l.length):0};
const tree=s=>{const ids=new Set(s.topics.map(t=>t.id)),r=s.topics.filter(t=>!t.parent||!ids.has(t.parent));return r.flatMap(t=>[[t,0],...s.topics.filter(c=>c.parent==t.id).map(c=>[c,1])])};
const dueCards=()=>dat().cards.filter(c=>(c.due||'')<=today());
const bar=p=>`<div class="bar"><i style="width:${Math.max(0,Math.min(100,p))}%"></i></div>`;
const dot=c=>`<span class=e-dot style="background:${c}"></span>`;
const lateB='<span class=bd><i style="background:var(--er)"></i>Atrasada</span>';
const from=p=>p=='7'?D(add(new Date(),-6)):p=='30'?D(add(new Date(),-29)):p=='m'?today().slice(0,8)+'01':'';
const chips=(cur,arr,fn)=>`<div class="row chips">${arr.map(a=>`<button type=button class="ch ${cur==a[0]?'on':''}" onclick="${fn}('${a[0]}')">${a[1]}</button>`).join('')}</div>`;
const FM=(t,f,cb,del,chk)=>fm(t,f,o=>{const er=chk&&chk(o);if(er){bad(er);FM(t,f.map(x=>({...x,v:o[x.k]})),cb,del,chk);return}cb(o)},del);
const mdl=(html,on)=>{const m=$('#md');m.onclick=null;m.innerHTML='<form class=box>'+html+'</form>';m.className='on';const f=m.firstChild;f.onsubmit=e=>{e.preventDefault();on&&on(f)};const c=f.querySelector('#cn');c&&(c.onclick=()=>{m.className=''});return f};
const wkBars=(vals,labels,hi)=>{const m=Math.max(...vals,1);return`<div class=e-wk>${vals.map((v,i)=>`<div class="${i==hi?'on':''}" title="${labels[i]||''}: ${ft(v)}"><div class=bx><i style="height:${v?Math.max(4,v/m*100):0}%"></i></div><span>${labels[i]||''}</span></div>`).join('')}</div>`};

/* ---------- CSS ---------- */
const st=document.createElement('style');st.textContent=`
button.ch{border:0;font-family:inherit}
.e-dot{width:9px;height:9px;border-radius:50%;flex:none;display:inline-block}
.e-hero{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap;margin:2px 0 4px}
.e-hero h1{font-size:30px;letter-spacing:-.025em;line-height:1.15}
.e-date{color:var(--t2);font-size:14px;margin-top:4px}
.e-lead{color:var(--t2);font-size:14px;margin-top:2px}
.e-big{height:44px;padding:0 22px;font-size:15px;border-radius:10px}
.e-acts{display:flex;gap:6px;flex-wrap:wrap;margin:12px 0 0}
.e-tabs{display:flex;gap:2px;overflow-x:auto;scrollbar-width:none;border-bottom:1px solid var(--bd);margin:16px 0 16px}
.e-tabs::-webkit-scrollbar{display:none}
.e-tab{flex:none;padding:9px 12px;border:0;background:none;color:var(--t2);font:inherit;font-size:14px;font-weight:500;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px;transition:color .15s,border-color .15s}
.e-tab:hover{color:var(--tx)}
.e-tab[aria-selected=true]{color:var(--tx);border-color:var(--ac)}
.e-tab:focus-visible{outline:2px solid var(--ac2);outline-offset:-2px;border-radius:6px}
.e-root .ct h2{font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--t2)}
.e-root .c{padding:18px}
.e-body{animation:f .2s}
.e-grid{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:12px}
.e-num{font-size:40px;font-weight:700;letter-spacing:-.03em;line-height:1.05;font-variant-numeric:tabular-nums}
.e-wk{display:flex;align-items:stretch;gap:6px;height:112px}
.e-wk>div{flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;min-width:0}
.e-wk .bx{flex:1;width:100%;display:flex;align-items:flex-end;justify-content:center}
.e-wk i{display:block;width:100%;max-width:36px;border-radius:5px 5px 2px 2px;background:var(--bd);transition:height .3s}
.e-wk .on i{background:var(--ac)}
.e-wk span{font-size:11px;color:var(--t2);height:14px;overflow:hidden;white-space:nowrap}
.e-empty{text-align:center;padding:44px 16px}
.e-empty h2{font-size:20px;margin-bottom:6px}
.e-empty p{color:var(--t2);max-width:420px;margin:0 auto 18px}
.e-banner{display:flex;align-items:center;gap:10px;padding:10px 14px;margin-bottom:12px;border:1px solid var(--bd);border-radius:10px;background:var(--rs);font-size:14px;cursor:pointer}
.e-banner b{font-variant-numeric:tabular-nums}
.e-lk{cursor:pointer}.e-lk:hover{background:var(--hv)}
.e-sc{display:flex;align-items:center;gap:8px;margin-bottom:12px}.e-sc h1{margin:0}
.e-n{font-size:12px;color:var(--t2)}
.e-ed{width:100%;min-height:52vh}
.e-ti{font-size:20px;font-weight:600;height:46px;margin-bottom:10px}
.e-card{min-height:170px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:28px 16px;font-size:20px;line-height:1.5;white-space:pre-wrap;word-break:break-word}
.e-g{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.e-g .b{flex-direction:column;height:auto;padding:10px 4px;gap:2px}.e-g .b small{font-weight:400;font-size:11px;opacity:.85}
.e-ck{display:flex;align-items:center;gap:10px;color:var(--tx);font-size:14px;margin-bottom:10px}
.e-sec{font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--t2);margin:16px 0 8px}
.e-sum{background:var(--rs);border-radius:10px;padding:14px;margin-bottom:12px}
.e-sum .e-num{font-size:34px}
/* foco */
.e-seg{display:inline-flex;background:var(--rs);border-radius:10px;padding:3px;gap:2px}
.e-seg button{border:0;background:none;color:var(--t2);font:inherit;font-size:13px;font-weight:500;padding:7px 14px;border-radius:8px;cursor:pointer;transition:background .15s,color .15s}
.e-seg button[aria-pressed=true]{background:var(--card);color:var(--tx);box-shadow:0 1px 2px rgba(0,0,0,.18)}
.e-seg button:disabled{opacity:.45;cursor:not-allowed}
.e-stage,.e-fo{--ph:var(--ac)}
.e-stage[data-ph=short],.e-fo[data-ph=short]{--ph:var(--ok)}
.e-stage[data-ph=long],.e-fo[data-ph=long]{--ph:var(--wa)}
.e-stage{display:flex;flex-direction:column;align-items:center;gap:18px;padding:10px 0 4px}
.e-ring{position:relative;width:min(76vw,300px);aspect-ratio:1}
.e-ring svg{width:100%;height:100%;transform:rotate(-90deg)}
.e-ring circle{fill:none;stroke-width:5}
.e-ring .trk{stroke:var(--bd)}
.e-ring .prg{stroke:var(--ph);stroke-linecap:round;transition:stroke-dashoffset .3s linear,stroke .3s}
.e-tc{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px}
.e-tm{font-size:clamp(46px,13vw,66px);font-weight:300;letter-spacing:.01em;font-variant-numeric:tabular-nums;font-feature-settings:"tnum";line-height:1;min-width:6ch;text-align:center}
.e-pl{font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--ph)}
.e-ps{font-size:12px;color:var(--t2);font-variant-numeric:tabular-nums}
.e-dots{display:flex;gap:6px;justify-content:center}.e-dots i{width:8px;height:8px;border-radius:50%;background:var(--bd)}.e-dots i.on{background:var(--ph)}
.e-ctl{display:flex;gap:10px;align-items:center;justify-content:center;flex-wrap:wrap}
.e-play{height:48px;min-width:150px;font-size:16px;border-radius:12px;background:var(--ph)}
.e-sel{max-width:340px;text-align:center}
.e-cnt{display:flex;gap:8px;align-items:center}.e-cnt input{width:68px;text-align:center}
.e-fo{display:none;position:fixed;inset:0;z-index:8;background:var(--bg);color:var(--tx);flex-direction:column;align-items:center;justify-content:center;gap:22px;padding:20px;text-align:center;height:100vh;height:100dvh;overflow:auto}
.e-fo.on{display:flex;animation:f .2s}
.e-fo[data-th=dark]{--bg:#0A0C0F;--card:#12161B;--rs:#1B2027;--bd:#262B33;--tx:#E8EAED;--t2:#9AA3AE;--hv:rgba(255,255,255,.06);color-scheme:dark}
.e-fo .e-ring{width:min(74vw,58vh,520px)}
.e-fo .e-tm{font-size:clamp(54px,min(15vw,15vh),150px)}
.e-fo .fx{transition:opacity .5s}
.e-fo.idle .fx{opacity:.1}.e-fo.idle{cursor:none}
.e-ofr{display:flex;gap:8px;justify-content:center;flex-wrap:wrap}
.e-chip{font-size:12px;color:var(--t2);letter-spacing:.06em;text-transform:uppercase}
#md.on{z-index:25}
@media(max-width:760px){.e-grid{grid-template-columns:1fr}.e-hero h1{font-size:26px}.e-num{font-size:34px}}
@media(max-width:520px){.e-g{grid-template-columns:repeat(2,1fr)}}`;
document.head.appendChild(st);
const ofo=document.createElement('div');ofo.id='efo';ofo.className='e-fo';ofo.setAttribute('role','dialog');ofo.setAttribute('aria-label','Modo de foco');document.body.appendChild(ofo);

/* ================= MOTOR DO CRONÔMETRO =================
   Estado: ES.run (persistido em localStorage 'hub_est_run'). Todo tempo é calculado a partir de timestamps:
   fase = acc (ms já acumulados na fase) + (agora - seg) se estiver correndo. Nada depende de contar segundos. */
const loadRun=()=>{try{const r=JSON.parse(localStorage.getItem(RK));return r&&r.v==2&&typeof r.t0=='number'&&typeof r.acc=='number'?r:null}catch(e){return null}};
const putRun=()=>{try{ES.run?localStorage.setItem(RK,JSON.stringify(ES.run)):localStorage.removeItem(RK);return true}catch(e){bad('Não foi possível guardar o cronômetro neste navegador.');return false}};
const pe=(r,n)=>r.acc+(r.seg!=null?Math.max(0,n-r.seg):0);
const ftot=(r,n)=>r.fd+(r.ph=='focus'?pe(r,n):0);
function adv(r,n){let ch=0;for(let g=0;g<500&&r.seg!=null&&r.dur>0;g++){const el=r.acc+Math.max(0,n-r.seg);if(el<r.dur)break;ch=1;const end=r.seg+(r.dur-r.acc),ended=r.ph;r.seq=(r.seq||0)+1;r.last={seq:r.seq,t:end,ph:ended};
 if(r.mode=='count'){r.acc=r.dur;r.seg=null;r.fin=1;break}
 const c=r.cfg;let nx;if(ended=='focus'){r.fd+=r.dur;r.cy++;nx=r.cy%c.n==0?'long':'short'}else nx='focus';
 r.ph=nx;r.dur=(nx=='focus'?c.f:nx=='long'?c.l:c.s)*60000;r.acc=0;if(nx=='focus'?c.autoN:c.autoB){r.seg=end}else{r.seg=null;r.wait=1}}
return ch}
const flush=(r,k,n)=>{const t=ftot(r,n);r.parts[r.key]=(r.parts[r.key]||0)+(t-r.mk);r.mk=t;r.key=k};
function view(){const r=ES.run,n=Date.now(),p=dat().prefs;
if(!r){const m=p.mode,s=m=='pomo'?p.pomo.f*60:m=='count'?p.count.h*3600+p.count.m*60+p.count.s:0;return{ph:'focus',label:'Pronto',time:hms(s),prog:0,sess:'',run:0,mode:m,free:m=='free'}}
const e=pe(r,n),tot=ftot(r,n);let t,prog=0;if(r.dur){t=hms(Math.ceil(Math.max(0,r.dur-e)/1000));prog=Math.min(1,e/r.dur)}else t=hms(Math.floor(e/1000));
const nm={focus:'Foco',short:'Pausa curta',long:'Pausa longa'}[r.ph];
const label=r.fin?'Contagem concluída':r.wait?(r.ph=='focus'?'Foco pronto':nm+' pronta'):r.seg==null?nm+' · pausado':nm;
return{ph:r.ph,label,time:t,prog,sess:'Sessão: '+hms(Math.floor(tot/1000))+' de foco',run:r.seg!=null,wait:r.wait,fin:r.fin,mode:r.mode,free:r.mode=='free',r}}
const modeName=m=>({pomo:'Pomodoro',free:'Cronômetro livre',count:'Contagem regressiva'})[m];

/* ---------- som, tela cheia, wake lock ---------- */
let AC2;const unlock=()=>{try{AC2=AC2||new(window.AudioContext||window.webkitAudioContext)();if(AC2.state=='suspended')AC2.resume()}catch(e){}};
['pointerdown','keydown','touchstart'].forEach(e=>document.addEventListener(e,unlock,{passive:true}));
function chime(test,vol){const s=dat().prefs.snd;if(!test&&!s.on)return;unlock();if(!AC2)return;const v=(vol!=null?vol:s.vol)/100*.45;if(v<=0)return;const t=AC2.currentTime;[[660,0],[880,.3],[1100,.6]].forEach(([f,d])=>{const o=AC2.createOscillator(),g=AC2.createGain();o.type='sine';o.frequency.value=f;g.gain.setValueAtTime(.0001,t+d);g.gain.exponentialRampToValueAtTime(v,t+d+.03);g.gain.exponentialRampToValueAtTime(.0001,t+d+.45);o.connect(g);g.connect(AC2.destination);o.start(t+d);o.stop(t+d+.5)})}
let WK=null;function wl2(){try{const need=ES.run&&ES.run.seg!=null;if(need&&!WK&&!document.hidden&&navigator.wakeLock){WK=1;navigator.wakeLock.request('screen').then(l=>{WK=l;l.onrelease=()=>{WK=null}}).catch(()=>{WK=null})}else if(!need&&WK&&WK.release){WK.release();WK=null}}catch(e){WK=null}}
const canFs=()=>!!(ofo.requestFullscreen||ofo.webkitRequestFullscreen);
const inFs=()=>!!(document.fullscreenElement||document.webkitFullscreenElement);
function reqFs(){try{const f=ofo.requestFullscreen||ofo.webkitRequestFullscreen,p=f&&f.call(ofo);p&&p.catch&&p.catch(()=>{})}catch(e){}}
function exFs(){try{const f=document.exitFullscreen||document.webkitExitFullscreen,p=f&&f.call(document);p&&p.catch&&p.catch(()=>{})}catch(e){}}
let IT;const wake=()=>{if(!ES.fo)return;ofo.classList.remove('idle');clearTimeout(IT);IT=setTimeout(()=>{if(ES.run&&ES.run.seg!=null&&ES.fo)ofo.classList.add('idle')},3000)};
['pointermove','pointerdown','keydown','touchstart'].forEach(e=>document.addEventListener(e,wake,{passive:true}));

/* ---------- peças visuais do foco ---------- */
const ring=(p,v)=>`<div class=e-ring><svg viewBox="0 0 220 220" aria-hidden=true><circle class=trk cx=110 cy=110 r=100 ${v.free?'style="opacity:.5"':''}></circle><circle id=${p}g class=prg cx=110 cy=110 r=100 stroke-dasharray=${CIRC} stroke-dashoffset=${(CIRC*(1-v.prog)).toFixed(2)} ${v.free?'style="visibility:hidden"':''}></circle></svg><div class=e-tc><div id=${p}l class=e-pl>${esc(v.label)}</div><div id=${p}t class=e-tm role=timer aria-live=off>${v.time}</div><div id=${p}s class=e-ps>${esc(v.sess)}</div></div></div>`;
const dots=v=>{if(v.mode!='pomo')return'';const r=v.r,c=r?r.cfg:dat().prefs.pomo,n=c.n,cy=r?r.cy:0,fo=!r||r.ph=='focus',cur=fo?(cy%n)+1:(cy%n==0?n:cy%n),fl=fo?cy%n:cur;return`<div class=e-dots aria-label="Ciclo ${cur} de ${n}">${Array.from({length:n},(_,i)=>`<i class="${i<fl?'on':''}"></i>`).join('')}</div><div class=e-n>Ciclo ${cur} de ${n}${r&&r.cy?' · '+r.cy+' concluído'+(r.cy==1?'':'s')+' na sessão':''}</div>`};
const selK=()=>{const r=ES.run,k=r?r.key:dat().prefs.key;return`<select class=e-sel aria-label="Matéria e tópico" onchange="ES.kset(this.value)">${opts(1).map(o=>`<option value="${esc(o[0])}"${o[0]==k?' selected':''}>${esc(o[1])}</option>`).join('')}</select>`};
const ctl=()=>{const v=view(),r=ES.run,pl=!r?'Iniciar':v.fin?'Finalizar':v.run?'Pausar':v.wait?(r.ph=='focus'?'Iniciar foco':'Iniciar pausa'):'Retomar',ic=!r?'play':v.fin?'stop':v.run?'pause':'play';
return`<div class=e-ctl><button type=button class="b e-play" onclick="ES.rPrimary()">${I(ic)}${pl}</button>${r&&!v.fin?`<button type=button class="b g" onclick="ES.rFin()">${I('stop')}Finalizar</button>`:''}${r&&r.mode=='count'?`<button type=button class="b g" onclick="ES.rRestart()" title="O tempo já estudado continua na sessão">Reiniciar</button>`:''}${r&&r.ph!='focus'?`<button type=button class="b g" onclick="ES.rSkip()">Pular pausa</button>`:''}</div>`};
function ovHtml(){const v=view(),r=ES.run,k=r?r.key:dat().prefs.key;
return`<div class="fx e-chip">${modeName(v.mode)}</div>${ring('o',v)}${dots(v)}<div class=fx><div style="font-size:16px;font-weight:600">${esc(sk(k))}</div></div><div class=fx>${selK()}</div><div class=fx>${ctl()}</div><div class="fx e-ofr">${canFs()?`<button type=button class="b g sm" onclick="ES.fsToggle()">${I('max')}${inFs()?'Sair da tela cheia':'Tela cheia'}</button>`:''}<button type=button class="b g sm" onclick="ES.focusOff()">${I('x')}Sair do foco</button></div>`}
function ofr(){if(!ES.fo)return;const v=view();ofo.dataset.ph=v.ph;ofo.dataset.th=dat().prefs.th;ofo.innerHTML=ovHtml()}
ES.focusOn=()=>{ES.fo=1;ofo.classList.add('on');ofo.classList.remove('idle');ofr();wake();reqFs();try{history.pushState({p:'est'},'')}catch(e){}wl2()};
ES.focusOff=()=>{ES.fo=0;ofo.classList.remove('on');exFs();clearTimeout(IT);wl2()};
ES.fsToggle=()=>{inFs()?exFs():reqFs()};
document.addEventListener('fullscreenchange',()=>ofr());document.addEventListener('webkitfullscreenchange',()=>ofr());
window.addEventListener('popstate',()=>{if(ES.fo)ES.focusOff()});
ES.refresh=()=>{if(page=='est')render();ofr();wl2()};

/* ---------- ações do cronômetro ---------- */
ES.mode=m=>{if(ES.run)return say('Finalize ou descarte a sessão atual para trocar de modo.');W(d=>{d.prefs.mode=m});commit()};
ES.cnt=(k,v)=>{v=Math.max(0,Math.round(+v||0));if(k!='h')v=Math.min(59,v);else v=Math.min(23,v);W(d=>{d.prefs.count[k]=v});commit()};
ES.kset=v=>{const r=ES.run;W(d=>{d.prefs.key=v});if(r){const n=Date.now();if(adv(r,n))trans(r,n);if(r.key!=v){flush(r,v,n);putRun();say('A partir de agora o tempo será registrado em: '+sk(v))}}save();ofr();if(page=='est'&&ES.tab=='foc')paint()};
ES.rStart=pid=>{if(ES.run)return say('Já existe uma sessão em andamento.');const p=dat().prefs,m=p.mode;let dur=0;
if(m=='pomo')dur=p.pomo.f*60000;else if(m=='count'){dur=(p.count.h*3600+p.count.m*60+p.count.s)*1000;if(dur<1000)return bad('Defina a duração da contagem regressiva.')}
const n=Date.now();ES.run={v:2,mode:m,key:p.key||'|',t0:n,ph:'focus',dur,acc:0,seg:n,fd:0,cy:0,wait:0,fin:0,cfg:{...p.pomo},parts:{},mk:0,plan:pid||null,seq:0,last:null,end:null};ES.annSeq=0;unlock();putRun();ES.refresh()};
ES.rPrimary=()=>{const r=ES.run;if(!r)return ES.rStart();const n=Date.now();if(adv(r,n))trans(r,n);if(r.fin)return ES.rFin();
if(r.seg!=null){r.acc+=Math.max(0,n-r.seg);r.seg=null}else{r.seg=n;r.wait=0;r.end=null}putRun();ES.refresh()};
ES.rRestart=()=>{const r=ES.run;if(!r||r.mode!='count')return;const n=Date.now();if(adv(r,n))trans(r,n);const was=r.seg!=null||r.fin;r.fd+=pe(r,n);r.acc=0;r.fin=0;r.seg=was?n:null;r.end=null;putRun();ES.refresh()};
ES.rSkip=()=>{const r=ES.run;if(!r||r.ph=='focus')return;const n=Date.now();if(adv(r,n))trans(r,n);if(r.ph=='focus')return;r.ph='focus';r.dur=r.cfg.f*60000;r.acc=0;r.seg=n;r.wait=0;r.end=null;putRun();ES.refresh()};
ES.rFin=()=>{const r=ES.run;if(!r)return;const n=Date.now();if(adv(r,n))trans(r,n);if(r.seg!=null){r.acc+=Math.max(0,n-r.seg);r.seg=null}r.end=r.end||n;putRun();if(inFs())exFs();ES.refresh();sumModal()};
function sumModal(){const r=ES.run;if(!r)return;const end=r.end||Date.now(),tot=ftot(r,end),pr={...r.parts};pr[r.key]=(pr[r.key]||0)+(tot-r.mk);const ents=Object.entries(pr).filter(([k,v])=>v>=500).sort((a,b)=>b[1]-a[1]),ok=ents.length>0;
const f=mdl(`<h3>Finalizar sessão</h3><div class=e-sum><div class=e-num>${hms(Math.round(tot/1000))}</div><div class=s>tempo efetivo de foco${r.mode!='free'?' (pausas não contam)':''}</div></div>
<div class=r><span class=f>Matéria</span><span style="text-align:right">${ents.length>1?ents.map(([k,v])=>esc(sk(k))+' · '+hms(Math.round(v/1000))).join('<br>'):esc(sk(ents[0]?ents[0][0]:r.key))}</span></div>
<div class=r><span class=f>Início</span><b>${hm(r.t0)}</b></div><div class=r><span class=f>Término</span><b>${hm(end)}</b></div>
${r.mode=='pomo'?`<div class=r><span class=f>Ciclos concluídos</span><b>${r.cy}</b></div>`:''}
<label class=mt>O que você estudou? (opcional)<textarea name=obs rows=3></textarea></label>
${ok?'':'<p class=s style="color:var(--er)">Não há tempo de foco para salvar nesta sessão.</p>'}
<div class=row><button class=b ${ok?'':'disabled'}>Salvar sessão</button><button type=button class="b g" id=cn>Voltar à sessão</button><button type=button class="b er" id=ds>Descartar</button></div>`,()=>ES.rSave());
f.querySelector('#ds').onclick=()=>ES.rDiscard()}
ES.rSave=()=>{const r=ES.run;if(!r||ES.saving)return;ES.saving=1;try{const f=$('#md form'),obs=(f&&f.obs?f.obs.value:'').trim(),end=r.end||Date.now(),tot=ftot(r,end),pr={...r.parts};pr[r.key]=(pr[r.key]||0)+(tot-r.mk);
const ents=Object.entries(pr).filter(([k,v])=>v>=500);if(!ents.length)return bad('Não há tempo de foco para salvar.');
const grp=uid(),date=D(new Date(r.t0)),main=ents.slice().sort((a,b)=>b[1]-a[1])[0][0];let first=null,total=0;
ents.forEach(([k,v])=>{const sp=spl(k),s={id:uid(),grp,date,sid:sp.sid,tid:sp.tid,sec:Math.max(1,Math.round(v/1000)),obs,mode:r.mode,cy:k==main?r.cy:0,st:r.t0,en:end};first=first||s;total+=s.sec;S.sessions.push(s)});
W(d=>{const p=r.plan&&d.plans.find(x=>x.id==r.plan);if(p){p.done=true;p.sess=first.id;p.dn=today()}});
ES.last={sec:total,cy:r.cy,obs,mode:r.mode,key:main,st:r.t0,en:end,date};ES.run=null;putRun();$('#md').className='';ES.fo&&ES.focusOff();commit('Sessão salva: '+ft(total));wl2()}finally{ES.saving=0}};
ES.rDiscard=()=>{if(!ES.run)return;if(!confirm('Descartar esta sessão? O tempo registrado nela será perdido e não entrará no histórico.'))return;ES.run=null;putRun();$('#md').className='';ES.fo&&ES.focusOff();ES.refresh();say('Sessão descartada.')};
ES.resume=(sid,tid)=>{if(ES.run)say('Há uma sessão em andamento. Ela continua sendo contada.');else W(d=>{d.prefs.key=sid+'|'+(tid||'')});ES.tab='foc';ES.sid=null;ES.q='';commit();window.scrollTo(0,0)};

/* ---------- transições, avisos e loop ---------- */
let TI;function trans(r,n){const L=r.last;if(!L||L.seq<=ES.annSeq)return;ES.annSeq=L.seq;if(n-L.t>20000)return;
const msg=r.mode=='count'?'Contagem concluída.':L.ph=='focus'?'Foco concluído. '+(r.ph=='long'?'Hora da pausa longa.':'Hora da pausa.'):'Pausa concluída. Hora de voltar ao foco.';
say(msg);chime();try{navigator.vibrate&&navigator.vibrate([250,120,250])}catch(e){}
const t0=document.title;let k=0;clearInterval(TI);TI=setInterval(()=>{document.title=k++%2?t0:msg;if(k>8||(!document.hidden&&k>4)){clearInterval(TI);document.title=t0}},800)}
function paint(){const v=view();for(const p of['r','o']){const t=$('#'+p+'t');if(!t)continue;if(t.textContent!=v.time)t.textContent=v.time;const l=$('#'+p+'l');if(l&&l.textContent!=v.label)l.textContent=v.label;const s=$('#'+p+'s');if(s&&s.textContent!=v.sess)s.textContent=v.sess;const g=$('#'+p+'g');if(g)g.setAttribute('stroke-dashoffset',(CIRC*(1-v.prog)).toFixed(2))}
const b=$('#eb');if(b)b.textContent=v.time}
function tick(){const r=ES.run;if(!r)return;const n=Date.now();if(adv(r,n)){putRun();trans(r,n);ES.refresh()}paint()}
ES.annSeq=0;ES.run=loadRun();ES.annSeq=ES.run?ES.run.seq||0:0;
/* migração segura: cronômetro antigo em andamento vira sessão livre */
(()=>{const T=S.timer;if(!ES.run&&T&&(T.start||T.acc>=1000)){const n=Date.now();ES.run={v:2,mode:'free',key:T.sel||'|',t0:n-(T.acc+(T.start?n-T.start:0)),ph:'focus',dur:0,acc:T.acc,seg:T.start||null,fd:0,cy:0,wait:0,fin:0,cfg:{...PREF().pomo},parts:{},mk:0,plan:null,seq:0,last:null,end:null};T.acc=0;T.start=null;try{localStorage.setItem('hub',JSON.stringify(S))}catch(e){}putRun()}})();
setInterval(tick,250);
document.addEventListener('visibilitychange',()=>{tick();wl2()});
window.addEventListener('storage',e=>{if(e.key==RK){ES.run=loadRun();ES.annSeq=ES.run?ES.run.seq||0:0;ES.refresh()}});

/* ---------- configurações do foco ---------- */
ES.cfgOpen=()=>{const p=dat().prefs,n=(k,l,v,min,max)=>`<label>${l}<input name=${k} type=number min=${min} max=${max} value="${v}"></label>`;
mdl(`<h3>Configurações do foco</h3>${ES.run?'<p class=s style="margin-bottom:10px">As durações alteradas valem a partir da próxima sessão.</p>':''}
<div class=e-sec style="margin-top:0">Pomodoro</div><div class=g2 style="grid-template-columns:1fr 1fr">${n('f','Foco (min)',p.pomo.f,1,180)}${n('s','Pausa curta (min)',p.pomo.s,1,60)}${n('l','Pausa longa (min)',p.pomo.l,1,120)}${n('n','Ciclos até a pausa longa',p.pomo.n,2,12)}</div>
<label class=e-ck><input type=checkbox name=autoB ${p.pomo.autoB?'checked':''}>Iniciar as pausas automaticamente</label><label class=e-ck><input type=checkbox name=autoN ${p.pomo.autoN?'checked':''}>Iniciar o próximo foco automaticamente</label>
<div class=e-sec>Som</div><label class=e-ck><input type=checkbox name=son ${p.snd.on?'checked':''}>Tocar um som ao terminar</label><label>Volume<input type=range name=vol min=0 max=100 value="${p.snd.vol}" style="--v:${p.snd.vol}%" oninput="this.style.setProperty('--v',this.value+'%')"></label><button type=button class="b g sm" onclick="ES.tsnd()">Testar som</button>
<div class=e-sec>Modo de foco</div><label>Tema<select name=th><option value=dark ${p.th=='dark'?'selected':''}>Escuro</option><option value=auto ${p.th=='auto'?'selected':''}>Seguir o tema do Hub</option></select></label>
<div class=row><button class=b>Salvar</button><button type=button class="b g" id=cn>Cancelar</button></div>`,f=>{const g=k=>+f[k].value,v={f:g('f'),s:g('s'),l:g('l'),n:g('n')},rg=(x,a,b)=>Number.isInteger(x)&&x>=a&&x<=b;
if(!rg(v.f,1,180)||!rg(v.s,1,60)||!rg(v.l,1,120)||!rg(v.n,2,12))return bad('Valores fora do limite: foco 1–180, pausas 1–60 e 1–120, ciclos 2–12.');
W(d=>{Object.assign(d.prefs.pomo,v,{autoB:f.autoB.checked?1:0,autoN:f.autoN.checked?1:0});d.prefs.snd={on:f.son.checked?1:0,vol:Math.max(0,Math.min(100,g('vol')||0))};d.prefs.th=f.th.value});$('#md').className='';commit('Configurações salvas.');ofr()})};
ES.tsnd=()=>{const i=$('#md [name=vol]');chime(true,i?+i.value:null)};

/* ================= ABAS ================= */
ES.go=t=>{ES.nflush();ES.tab=t;ES.sid=null;ES.nid=null;ES.q='';ES.rq=null;render();window.scrollTo(0,0)};
ES.sq=v=>{ES.nflush();ES.q=v;render();const i=$('#esq');if(i){i.focus();i.setSelectionRange(v.length,v.length)}};

/* ---------- Início ---------- */
function ov(){const d=dat(),t=today(),goal=d.goal*60,sec=secF(x=>x.date==t),pend=d.tasks.filter(x=>!x.done).length,rv=dueCards().length;
const pl=d.plans.filter(p=>!p.done&&p.date<=t).sort((a,b)=>(a.date+(a.time||''))>(b.date+(b.time||''))?1:-1),
tk=d.tasks.filter(x=>!x.done&&(!x.date||x.date<=t)).sort((a,b)=>(a.date||'9')>(b.date||'9')?1:-1),done=d.plans.filter(p=>p.date==t&&p.done),
nx=d.plans.filter(p=>!p.done&&p.date>=t).sort((a,b)=>(a.date+(a.time||'99'))>(b.date+(b.time||'99'))?1:-1)[0];
const rec=[];for(let i=S.sessions.length-1;i>=0&&rec.length<4;i--){const x=S.sessions[i],s=x.sid&&subj(x.sid);if(s&&!s.arch&&!rec.some(r=>r.sid==x.sid))rec.push(x)}
const w=[6,5,4,3,2,1,0].map(i=>D(add(new Date(),-i))),wl=['D','S','T','Q','Q','S','S'],wv=w.map(k=>secF(x=>x.date==k));
if(!S.subjects.length&&!S.sessions.length&&!d.plans.length&&!d.tasks.length)return`<div class="c e-empty"><h2>Comece por aqui</h2><p>Crie uma matéria para organizar tópicos e anotações, ou inicie uma sessão de foco agora.</p><div class=row style="justify-content:center"><button class="b e-big" onclick="ES.go('foc')">${I('play')}Começar a estudar</button><button class="b g e-big" onclick="ES.sNew()">${I('plus')}Criar matéria</button></div></div>`;
return`<div class=e-grid>
<div class=c>${CT('Resumo diário')}<div class=e-num>${ft(sec)}</div><div class=s style="margin:4px 0 10px">${goal?'de '+ft(goal)+' · '+Math.min(100,Math.round(sec/goal*100))+'% da meta':'estudado hoje · sem meta definida'}</div>${goal?bar(sec/goal*100):''}
<div class=r style="margin-top:12px"><span class=f>Próxima atividade</span><span class=s style="text-align:right">${nx?esc(dm(nx.date)+(nx.time?' '+nx.time:'')+' · '+(nx.t||sk(key(nx)))):'—'}</span></div>
<div class=r><span class=f>Tarefas pendentes</span><b>${pend}</b></div><div class=r><span class=f>Revisões pendentes</span>${rv?`<button class="b g sm" onclick="ES.startRev()">${rv} · Revisar</button>`:'<b>0</b>'}</div></div>
<div class=c>${CT('Plano de hoje',`<button type=button class=ib onclick="ES.plNew('${t}')" aria-label="Planejar sessão">${I('plus')}</button>`)}${pl.map(plRow).join('')}${done.map(plRow).join('')}${tk.map(tkRow).join('')}${!pl.length&&!tk.length&&!done.length?EM('calendar','Nada planejado para hoje.'):''}</div>
<div class=c>${CT('Continuar estudando')}${rec.map(x=>{const s=subj(x.sid),tp=s.topics.find(y=>y.id==x.tid);return`<div class=r>${dot(col(s))}<div class=f><div>${esc(s.name)}</div><div class=s>${tp?esc(tp.name)+' · ':''}${prog(s)}% concluído</div></div><button class="b g sm" onclick="ES.resume('${s.id}','${x.tid||''}')">Retomar</button></div>`}).join('')||EM('book','As matérias estudadas recentemente aparecem aqui.')}</div>
<div class=c>${CT('Últimos 7 dias',`<button class="b g sm" onclick="ES.go('st')">Detalhes</button>`)}${wv.some(x=>x>0)?wkBars(wv,w.map(k=>wl[new Date(k+'T12:00').getDay()]),6):EM('chart','Sem sessões nos últimos 7 dias.')}</div></div>`}

/* ---------- Matérias ---------- */
ES.sf=s=>[{k:'n',l:'Nome',v:s.name,r:1},{k:'desc',l:'Descrição',v:s.desc},{k:'col',l:'Cor',t:'select',v:s.col||col(s),o:COLS.map(c=>[c[0],c[1]])},{k:'goal',l:'Meta semanal (minutos, 0 = sem meta)',t:'number',v:s.goal||0}];
const sOk=o=>!o.n.trim()?'Informe o nome da matéria.':+o.goal<0?'A meta não pode ser negativa.':'';
ES.sNew=()=>FM('Nova matéria',ES.sf({name:'',col:COLS[S.subjects.length%COLS.length][0]}),o=>{S.subjects.push({id:uid(),name:o.n.trim(),desc:o.desc,col:o.col,goal:+o.goal||0,topics:[]});commit('Matéria criada.')},0,sOk);
ES.sEdit=id=>{const s=subj(id);FM('Editar matéria',ES.sf(s),o=>{s.name=o.n.trim();s.desc=o.desc;s.col=o.col;s.goal=+o.goal||0;commit('Matéria atualizada.')},()=>ES.sDel(id),sOk)};
ES.sDel=id=>{const s=subj(id);if(!s||!confirm('Excluir "'+s.name+'" e seus tópicos? Sessões e questões já registradas permanecem, mas ficam como "Sem matéria". Para guardar sem excluir, use Arquivar.'))return;S.subjects=S.subjects.filter(x=>x!=s);ES.sid=null;commit('Matéria excluída.')};
ES.sArch=id=>{const s=subj(id);s.arch=!s.arch;ES.sid=null;commit(s.arch?'Matéria arquivada.':'Matéria restaurada.')};
ES.sOpen=id=>{ES.tab='mat';ES.sid=id;ES.q='';render();window.scrollTo(0,0)};
ES.tf=t=>[{k:'n',l:'Nome do tópico',v:t.name,r:1},{k:'st',l:'Situação',t:'select',v:t.st==null?'0':String(t.st),o:SN.map((x,i)=>[String(i),x])},{k:'obs',l:'Observações',t:'textarea',v:t.obs}];
const setSt=(t,st)=>{t.st=st;t.p=st==0?0:st==2?100:(t.p>0&&t.p<100?t.p:50)};
const tOk=o=>!o.n.trim()?'Informe o nome do tópico.':'';
ES.tNew=(sid,parent)=>{const s=subj(sid);FM(parent?'Novo subtópico':'Novo tópico',ES.tf({st:0}),o=>{const t={id:uid(),name:o.n.trim(),p:0,obs:o.obs};if(parent)t.parent=parent;setSt(t,+o.st);s.topics.push(t);commit('Tópico criado.')},0,tOk)};
ES.tEdit=(sid,tid)=>{const s=subj(sid),t=s.topics.find(x=>x.id==tid),hasC=s.topics.some(x=>x.parent==tid),f=ES.tf({...t,st:stOf(s,t)});FM('Editar tópico',hasC?f.filter(x=>x.k!='st'):f,o=>{t.name=o.n.trim();t.obs=o.obs;if(!hasC)setSt(t,+o.st);commit('Tópico atualizado.')},()=>ES.tDel(sid,tid),tOk)};
ES.tCycle=(sid,tid)=>{const s=subj(sid),t=s.topics.find(x=>x.id==tid);setSt(t,(stOf(s,t)+1)%3);commit()};
ES.tDel=(sid,tid)=>{const s=subj(sid),t=s.topics.find(x=>x.id==tid);if(!confirm('Excluir o tópico "'+t.name+'"'+(s.topics.some(x=>x.parent==tid)?' e seus subtópicos':'')+'?'))return;s.topics=s.topics.filter(x=>x.id!=tid&&x.parent!=tid);commit('Tópico excluído.')};
ES.tMove=(sid,tid,dir)=>{const s=subj(sid),t=s.topics.find(x=>x.id==tid),sb=s.topics.filter(x=>(x.parent||'')==(t.parent||'')),o=sb[sb.indexOf(t)+dir];if(!o)return;const a=s.topics.indexOf(t),b=s.topics.indexOf(o);s.topics[a]=o;s.topics[b]=t;commit()};
ES.setArch=v=>{ES.arch=+v;render()};
function mat(){if(ES.sid&&subj(ES.sid))return detail(subj(ES.sid));ES.sid=null;
const L=S.subjects.filter(s=>!!s.arch==!!ES.arch),wk=D(add(new Date(),-6));
return`<div class=tb>${chips(ES.arch,[[0,'Ativas'],[1,'Arquivadas']],'ES.setArch')}<button class="b sm" onclick="ES.sNew()">${I('plus')}Matéria</button></div>
<div class=g2>${L.map(s=>{const p=prog(s),n=leaf(s).length,dn=leaf(s).filter(t=>stOf(s,t)==2).length,w=secF(x=>x.sid==s.id&&x.date>=wk);
return`<div class="c e-lk" tabindex=0 role=button onclick="ES.sOpen('${s.id}')" onkeydown="if(event.key=='Enter')ES.sOpen('${s.id}')"><div class=sh>${dot(col(s))}<b class=f>${esc(s.name)}</b><b>${p}%</b></div>${s.desc?`<p class=s>${esc(s.desc)}</p>`:''}<div class=mt>${bar(p)}</div><p class="s mt">${dn} de ${n} tópico${n==1?'':'s'} · ${ft(secF(x=>x.sid==s.id))} estudados${s.goal?' · semana: '+ft(w)+' / '+ft(s.goal*60):''}</p></div>`}).join('')||EM('book',ES.arch?'Nenhuma matéria arquivada.':'Nenhuma matéria ainda. Crie a primeira para organizar tópicos, notas e flashcards.')}</div>`}
function detail(s){const p=prog(s),all=secF(x=>x.sid==s.id),wk=secF(x=>x.sid==s.id&&x.date>=D(add(new Date(),-6))),q=S.qs.filter(x=>x.sid==s.id),qn=sum(q,'n'),qa=sum(q,'a'),
nt=dat().notes.filter(n=>n.sid==s.id&&!n.arch).sort((a,b)=>b.u.localeCompare(a.u)),dk=dat().decks.filter(k=>k.sid==s.id),ss=S.sessions.filter(x=>x.sid==s.id).slice(-8).reverse();
return`<div class=e-sc><button type=button class=ib onclick="ES.go('mat')" aria-label="Voltar">${I('left')}</button>${dot(col(s))}<h1 class=f>${esc(s.name)}</h1>${IB(`ES.sEdit('${s.id}')`,'edit','Editar matéria')}</div>
${s.desc?`<p class="s" style="margin-bottom:12px">${esc(s.desc)}</p>`:''}
<div class=g2><div class=c>${CT('Progresso')}<div class=e-num>${p}%</div>${bar(p)}<div class=stats style="margin-top:14px"><div><b>${ft(all)}</b><span>tempo acumulado</span></div><div><b>${s.goal?ft(wk)+' / '+ft(s.goal*60):ft(wk)}</b><span>últimos 7 dias${s.goal?' (meta)':''}</span></div><div><b>${pc(qa,qn)}</b><span>acertos (${qn} questões)</span></div><div><b>${dk.length}</b><span>baralho${dk.length==1?'':'s'}</span></div></div>
<div class="row mt"><button class="b sm" onclick="ES.resume('${s.id}','')">${I('play')}Estudar</button><button class="b g sm" onclick="ES.sArch('${s.id}')">${s.arch?'Restaurar':'Arquivar'}</button></div></div>
<div class=c>${CT('Anotações',`<button class="b g sm" onclick="ES.ntNew('${s.id}','')">${I('plus')}Nota</button>`)}${nt.slice(0,5).map(n=>`<div class="r e-lk" onclick="ES.ntOpen('${n.id}')"><div class=f><div>${esc(n.t||'Sem título')}</div><div class=s>${new Date(n.u).toLocaleDateString('pt-BR')}</div></div></div>`).join('')||EM('note','Nenhuma nota vinculada.')}</div>
<div class="c span">${CT('Tópicos',`<button class="b g sm" onclick="ES.tNew('${s.id}')">${I('plus')}Tópico</button>`)}${tree(s).map(([t,lv])=>{const sx=stOf(s,t),hasC=s.topics.some(x=>x.parent==t.id),c=['var(--t2)','var(--wa)','var(--ok)'][sx],ic=I(sx==2?'check':sx==1?'clock':'circle'),tt=secF(x=>x.tid==t.id&&x.sid==s.id);
return`<div class=r style="padding-left:${lv*24}px">${hasC?`<span class=ib style="color:${c}">${ic}</span>`:`<button type=button class=ib style="color:${c}" onclick="ES.tCycle('${s.id}','${t.id}')" aria-label="Mudar situação" title="${SN[sx]}">${ic}</button>`}<div class=f><div class="${sx==2?'dn':''}">${esc(t.name)}</div><div class=s>${SN[sx]}${tt?' · '+ft(tt):''}${t.obs?' · '+esc(t.obs.slice(0,70)):''}</div></div>${lv==0?IB(`ES.tNew('${s.id}','${t.id}')`,'plus','Novo subtópico'):''}${IB(`ES.tMove('${s.id}','${t.id}',-1)`,'up','Mover para cima')}${IB(`ES.tMove('${s.id}','${t.id}',1)`,'down','Mover para baixo')}${IB(`ES.tEdit('${s.id}','${t.id}')`,'edit','Editar tópico')}</div>`}).join('')||EM('book','Adicione os tópicos desta matéria na ordem em que pretende estudar.')}</div>
<div class=c>${CT('Histórico de estudo')}${ss.map(x=>`<div class=r><div class=f>${esc(sn(key(x)))}<div class=s>${df(x.date)}${x.obs?' · '+esc(x.obs):''}</div></div><b>${ft(x.sec)}</b></div>`).join('')||EM('clock','Nenhuma sessão registrada.')}</div>
<div class=c>${CT('Questões e flashcards')}${q.slice(-5).reverse().map(x=>`<div class=r><div class=f>${esc(sn(key(x)))}<div class=s>${df(x.date)} · ${x.a}/${x.n}</div></div><b>${pc(x.a,x.n)}</b></div>`).join('')||EM('target','Nenhuma questão registrada.')}${dk.map(k=>{const c=dat().cards.filter(x=>x.deck==k.id);return`<div class="r e-lk" onclick="ES.tab='rev';ES.sid=null;ES.deck='${k.id}';render()"><div class=f>${esc(k.name)}<div class=s>${c.filter(x=>(x.due||'')<=today()).length} pendentes de ${c.length}</div></div></div>`}).join('')}</div></div>`}

/* ---------- Foco (aba) ---------- */
ES.manual=()=>FM('Registrar sessão manual',[{k:'k',l:'Matéria / assunto',t:'select',v:dat().prefs.key||'|',o:opts(1)},{k:'date',l:'Data',t:'date',v:today(),r:1},{k:'m',l:'Duração (minutos)',t:'number',r:1},{k:'obs',l:'O que você estudou (opcional)'}],o=>{const sp=spl(o.k),sec=Math.round(+o.m*60);S.sessions.push({id:uid(),date:o.date,sid:sp.sid,tid:sp.tid,sec,obs:o.obs,mode:'manual',cy:0,st:null,en:null});commit('Sessão registrada.')},0,o=>!(+o.m>0)?'Informe uma duração maior que zero.':+o.m>1440?'A duração máxima é de 24 horas.':o.date>today()?'A data não pode estar no futuro.':'');
function foc(){const d=dat(),p=d.prefs,r=ES.run,v=view(),t=today(),ss=S.sessions.filter(x=>x.date==t).reverse(),tot=sum(ss,'sec'),mode=v.mode;
const seg=[['pomo','Pomodoro'],['free','Livre'],['count','Regressiva']].map(([m,l])=>`<button type=button aria-pressed="${mode==m}" ${r&&r.mode!=m?'disabled':''} onclick="ES.mode('${m}')">${l}</button>`).join('');
const cnt=!r&&mode=='count'?`<div class=e-cnt><input type=number min=0 max=23 value="${p.count.h}" onchange="ES.cnt('h',this.value)" aria-label="Horas"><span class=s>h</span><input type=number min=0 max=59 value="${p.count.m}" onchange="ES.cnt('m',this.value)" aria-label="Minutos"><span class=s>min</span><input type=number min=0 max=59 value="${p.count.s}" onchange="ES.cnt('s',this.value)" aria-label="Segundos"><span class=s>s</span></div>`:'';
const sub=!r&&mode=='pomo'?`<p class=s>${p.pomo.f} min de foco · pausa ${p.pomo.s} min · longa ${p.pomo.l} min a cada ${p.pomo.n} ciclos</p>`:'';
const l=ES.last&&ES.last.date==t?`<div class=r><div class=f>Última sessão salva<div class=s>${hm(ES.last.st)}–${hm(ES.last.en)} · ${esc(sk(ES.last.key))}${ES.last.cy?' · '+ES.last.cy+' ciclo'+(ES.last.cy==1?'':'s'):''}${ES.last.obs?' · '+esc(ES.last.obs):''}</div></div><b>${ft(ES.last.sec)}</b></div>`:'';
return`<div class=c><div class=ctr><div class=e-seg role=group aria-label="Modo">${seg}</div></div>${r&&r.mode?`<p class="s ctr" style="margin-top:8px">Sessão iniciada às ${hm(r.t0)}. Para trocar de modo, finalize ou descarte a sessão.</p>`:''}
<div class=e-stage data-ph="${v.ph}">${ring('r',v)}${dots(v)}${sub}${cnt}${selK()}${ctl()}<div class=e-ofr><button type=button class="b g sm" onclick="ES.focusOn()">${I('max')}Modo de foco</button><button type=button class="b g sm" onclick="ES.cfgOpen()">${I('sliders')}Configurações</button>${r?`<button type=button class="b g sm" onclick="ES.rDiscard()">${I('trash')}Descartar</button>`:''}</div></div></div>
<div class="c mt">${CT('Hoje',`<button class="b g sm" onclick="ES.manual()">${I('plus')}Sessão manual</button>`)}${l}${ss.length?`<p class=s style="margin:6px 0">Total hoje: <b>${ft(tot)}</b> em ${new Set(ss.map(gid)).size} sessão${new Set(ss.map(gid)).size==1?'':'ões'}</p>`+ss.map(x=>`<div class=r><div class=f>${esc(sn(key(x)))}${x.obs?`<div class=s>${esc(x.obs)}</div>`:''}</div><b>${ft(x.sec)}</b>${IB(`A.sd('${x.id}')`,'x','Apagar sessão')}</div>`).join(''):(l?'':EM('clock','Nenhuma sessão hoje.'))}</div>`}

/* ---------- Planejamento ---------- */
const priDot=p=>p.pr&&PRI[p.pr]?`<span class=e-dot style="background:${PRI[p.pr]}" title="Prioridade ${p.pr}"></span>`:'';
const plRow=p=>{const od=!p.done&&p.date<today();return`<div class=r><span class=tm style="min-width:56px">${p.time||'—'}</span>${priDot(p)}<div class=f><div class="${p.done?'dn':''}">${esc(p.t||sk(key(p)))}</div><div class=s>${p.t?esc(sk(key(p)))+' · ':''}${p.dur?p.dur+' min · ':''}${p.done?'Realizada':'Planejada'}${od?' · '+dm(p.date):''}</div></div>${od?lateB+`<button class="b g sm" onclick="ES.mv('p','${p.id}')">Hoje</button>`:''}${p.done?'':`<button class="b g sm" onclick="ES.plStart('${p.id}')">Iniciar</button>`}${IB(`ES.plEdit('${p.id}')`,'edit','Editar sessão planejada')}</div>`};
const tkRow=x=>{const od=!x.done&&x.date&&x.date<today();return`<div class=r><input type=checkbox ${x.done?'checked':''} onchange="ES.tkTog('${x.id}')" aria-label="Concluir tarefa">${priDot(x)}<div class=f><div class="${x.done?'dn':''}">${esc(x.t)}</div><div class=s>Tarefa${x.date?' · prazo '+dm(x.date):''}${x.sid?' · '+esc(sk(key(x))):''}</div></div>${od?lateB+`<button class="b g sm" onclick="ES.mv('t','${x.id}')">Hoje</button>`:''}${IB(`ES.tkEdit('${x.id}')`,'edit','Editar tarefa')}</div>`};
ES.mv=(k,id)=>{W(d=>{(k=='p'?d.plans:d.tasks).find(y=>y.id==id).date=today()});commit('Reagendado para hoje.')};
const PRO=[['','Sem prioridade'],['alta','Alta'],['media','Média'],['baixa','Baixa']];
ES.plf=p=>[{k:'k',l:'Matéria / tópico',t:'select',v:key(p),o:opts(1)},{k:'t',l:'Descrição (opcional)',v:p.t},{k:'date',l:'Data',t:'date',v:p.date,r:1},{k:'time',l:'Horário (opcional)',t:'time',v:p.time},{k:'dur',l:'Duração prevista (min)',t:'number',v:p.dur||''},{k:'pr',l:'Prioridade',t:'select',v:p.pr||'',o:PRO}];
const plOk=o=>+o.dur<0?'A duração não pode ser negativa.':'';
ES.plNew=date=>FM('Planejar sessão',ES.plf({date}),o=>{const sp=spl(o.k);W(d=>d.plans.push({id:uid(),...sp,t:o.t,date:o.date,time:o.time,dur:+o.dur||0,pr:o.pr,done:false}));commit('Sessão planejada.')},0,plOk);
ES.plEdit=id=>{const p=dat().plans.find(x=>x.id==id);FM('Editar sessão planejada',ES.plf(p),o=>{const sp=spl(o.k);W(d=>{Object.assign(d.plans.find(x=>x.id==id),sp,{t:o.t,date:o.date,time:o.time,dur:+o.dur||0,pr:o.pr})});commit('Sessão atualizada.')},()=>{if(confirm('Excluir esta sessão planejada?')){W(d=>{d.plans=d.plans.filter(x=>x.id!=id)});commit('Sessão excluída.')}},plOk)};
ES.plStart=id=>{if(ES.run)return say('Finalize ou descarte a sessão atual antes de iniciar outra.');const p=dat().plans.find(x=>x.id==id);W(d=>{d.prefs.key=key(p)});ES.tab='foc';ES.rStart(id);window.scrollTo(0,0)};
ES.tkf=x=>[{k:'t',l:'Tarefa',v:x.t,r:1},{k:'date',l:'Prazo (opcional)',t:'date',v:x.date},{k:'k',l:'Matéria (opcional)',t:'select',v:key(x),o:opts(1).filter(o=>o[0].endsWith('|'))},{k:'pr',l:'Prioridade',t:'select',v:x.pr||'',o:PRO}];
const tkOk=o=>!o.t.trim()?'Informe a tarefa.':'';
ES.tkNew=date=>FM('Nova tarefa de estudo',ES.tkf({date}),o=>{W(d=>d.tasks.push({id:uid(),t:o.t.trim(),date:o.date,sid:spl(o.k).sid,pr:o.pr,done:false}));commit('Tarefa criada.')},0,tkOk);
ES.tkEdit=id=>{const x=dat().tasks.find(y=>y.id==id);FM('Editar tarefa',ES.tkf(x),o=>{W(d=>{const q=d.tasks.find(y=>y.id==id);q.t=o.t.trim();q.date=o.date;q.sid=spl(o.k).sid;q.pr=o.pr});commit('Tarefa atualizada.')},()=>{if(confirm('Excluir esta tarefa?')){W(d=>{d.tasks=d.tasks.filter(y=>y.id!=id)});commit('Tarefa excluída.')}},tkOk)};
ES.tkTog=id=>{W(d=>{const x=d.tasks.find(y=>y.id==id);x.done=!x.done;x.dn=x.done?today():''});commit()};
ES.pNav=n=>{const d=new Date(ES.pd);if(ES.pm=='month'){d.setDate(1);d.setMonth(d.getMonth()+n)}else d.setDate(d.getDate()+n*7);ES.pd=d;render()};
ES.pView=v=>{ES.pm=v;render()};ES.pDay=k=>{ES.pday=k;render()};
const dayList=k=>{const d=dat(),p=d.plans.filter(x=>x.date==k).sort((a,b)=>(a.time||'')>(b.time||'')?1:-1),t=d.tasks.filter(x=>x.date==k),ss=S.sessions.filter(x=>x.date==k),n=new Set(ss.map(gid)).size;
return p.map(plRow).join('')+t.map(tkRow).join('')+(ss.length?`<div class=r><span class=tm style="min-width:56px;color:var(--ok)">${I('check')}</span><div class=f>Estudado: <b>${ft(sum(ss,'sec'))}</b><div class=s>${n} sessão${n==1?'':'ões'} realizada${n==1?'':'s'}</div></div></div>`:'')||'<p class=s>Livre.</p>'};
function pl(){const d=dat(),t=today(),pd=ES.pd,add1=k=>`<div class=row style="margin-top:8px"><button class="b g sm" onclick="ES.plNew('${k}')">${I('plus')}Sessão</button><button class="b g sm" onclick="ES.tkNew('${k}')">${I('plus')}Tarefa</button></div>`;
const late=d.plans.filter(p=>!p.done&&p.date<t).length+d.tasks.filter(x=>!x.done&&x.date&&x.date<t).length;
let h=`<div class=tb><div class=row><button type=button class=ib onclick="ES.pNav(-1)" aria-label="Anterior">${I('left')}</button><button type=button class=ib onclick="ES.pNav(1)" aria-label="Próximo">${I('right')}</button><button class="b g sm" onclick="ES.pd=new Date();ES.pday=null;render()">Hoje</button></div>${chips(ES.pm,[['week','Semana'],['month','Mês']],'ES.pView')}</div>${late?`<p class=s style="margin-bottom:10px">${lateB} ${late} item(ns) com data vencida.</p>`:''}`;
if(ES.pm=='month'){const y=pd.getFullYear(),m=pd.getMonth(),f=new Date(y,m,1),n=new Date(y,m+1,0).getDate(),sel=ES.pday||t;let c=['D','S','T','Q','Q','S','S'].map(x=>`<div class=h>${x}</div>`).join('')+'<div class=h></div>'.repeat(f.getDay());
for(let i=1;i<=n;i++){const k=D(new Date(y,m,i)),np=d.plans.filter(x=>x.date==k).length+d.tasks.filter(x=>x.date==k).length,sc=secF(x=>x.date==k);c+=`<div class="${k==t?'t':''}" ${k==sel?'style="box-shadow:inset 0 0 0 2px var(--ac)"':''} onclick="ES.pDay('${k}')"><span class=dd>${i}</span>${np?`<div class=ev>${np} item${np==1?'':'s'}</div>`:''}${sc?`<div class=ev style="background:rgba(52,179,107,.16);color:var(--ok)">${ft(sc)}</div>`:''}</div>`}
h+=`<h3>${U.cp(pd.toLocaleDateString('pt-BR',{month:'long',year:'numeric'}))}</h3><div class=cal>${c}</div><div class="c mt">${CT(U.cp(new Date(sel+'T12:00').toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long'})))}${dayList(sel)}${add1(sel)}</div><p class="s mt">Azul: planejado · Verde: tempo realmente estudado.</p>`}
else{const days=[0,1,2,3,4,5,6].map(i=>add(pd,i-pd.getDay()));h+=`<div class=stk>${days.map(x=>{const k=D(x);return`<div class=c ${k==t?'style="border-color:var(--ac)"':''}>${CT(U.cp(x.toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'2-digit'})),`<button type=button class=ib onclick="ES.plNew('${k}')" aria-label="Planejar sessão">${I('plus')}</button>`)}${dayList(k)}</div>`}).join('')}</div>`}
const hist=[...d.plans.filter(p=>p.done).map(p=>({k:'p',x:p,dn:p.dn||p.date})),...d.tasks.filter(x=>x.done).map(x=>({k:'t',x,dn:x.dn||x.date||''}))].sort((a,b)=>b.dn>a.dn?1:-1).slice(0,10);
return h+`<div class="c mt">${CT('Histórico de atividades')}${hist.map(e=>`<div class=r><span class=e-dot style="background:var(--ok)"></span><div class=f><div class=dn>${esc(e.k=='p'?(e.x.t||sk(key(e.x))):e.x.t)}</div><div class=s>${e.k=='p'?'Sessão planejada':'Tarefa'} · concluída ${df(e.dn)}</div></div></div>`).join('')||EM('check','Atividades concluídas aparecem aqui.')}</div>`}

/* ---------- Flashcards ---------- */
const nxt=(c,g)=>{let e=c.ease||2.5,r=c.reps||0,iv=c.ivl||0,l=c.lapses||0;
if(g==0){e=Math.max(1.3,e-.2);r=0;iv=0;l++}
else if(g==1){e=Math.max(1.3,e-.15);iv=Math.max(1,Math.round(Math.max(iv,1)*1.2));r++}
else if(g==2){iv=r==0?1:r==1?3:Math.max(iv+1,Math.round(iv*e));r++}
else{e+=.15;iv=r==0?4:Math.max(iv+2,Math.round(Math.max(iv,1)*e*1.3));r++}
return{ease:e,reps:r,ivl:iv,lapses:l}};
const ivT=n=>n==0?'hoje':n==1?'1 dia':n+' dias';
ES.dkf=k=>[{k:'n',l:'Nome do baralho',v:k.name,r:1},{k:'k',l:'Matéria / tópico (opcional)',t:'select',v:key(k),o:opts(1)}];
const dkOk=o=>!o.n.trim()?'Informe o nome do baralho.':'';
ES.dkNew=()=>FM('Novo baralho',ES.dkf({}),o=>{const sp=spl(o.k);W(d=>d.decks.push({id:uid(),name:o.n.trim(),...sp}));commit('Baralho criado.')},0,dkOk);
ES.dkEdit=id=>{const k=dat().decks.find(x=>x.id==id);FM('Editar baralho',ES.dkf(k),o=>{W(d=>{Object.assign(d.decks.find(x=>x.id==id),{name:o.n.trim()},spl(o.k))});commit('Baralho atualizado.')},()=>{if(confirm('Excluir o baralho e todos os seus cartões?')){W(d=>{d.decks=d.decks.filter(x=>x.id!=id);d.cards=d.cards.filter(c=>c.deck!=id)});ES.deck=null;commit('Baralho excluído.')}},dkOk)};
ES.cdf=c=>[{k:'q',l:'Pergunta',t:'textarea',v:c.q,r:1},{k:'a',l:'Resposta',t:'textarea',v:c.a,r:1}];
const cdOk=o=>!o.q.trim()||!o.a.trim()?'Preencha pergunta e resposta.':'';
ES.cdNew=deck=>FM('Novo cartão',ES.cdf({}),o=>{W(d=>d.cards.push({id:uid(),deck,q:o.q.trim(),a:o.a.trim(),due:today(),ivl:0,ease:2.5,reps:0,lapses:0}));if(commit('Cartão criado.'))setTimeout(()=>ES.cdNew(deck),50)},0,cdOk);
ES.cdEdit=id=>{const c=dat().cards.find(x=>x.id==id);FM('Editar cartão',ES.cdf(c),o=>{W(d=>{const q=d.cards.find(x=>x.id==id);q.q=o.q.trim();q.a=o.a.trim()});commit('Cartão atualizado.')},()=>{if(confirm('Excluir este cartão?')){W(d=>{d.cards=d.cards.filter(x=>x.id!=id)});commit('Cartão excluído.')}},cdOk)};
ES.dkOpen=id=>{ES.deck=ES.deck==id?null:id;render()};
ES.startRev=deck=>{const ids=dueCards().filter(c=>!deck||c.deck==deck).sort((a,b)=>(a.due||'')>(b.due||'')?1:-1).map(c=>c.id);if(!ids.length)return say('Nenhum cartão pendente.');ES.rq=ids;ES.rt=ids.length;ES.rn=0;ES.sh=0;ES.tab='rev';ES.sid=null;ES.q='';render();window.scrollTo(0,0)};
ES.show=()=>{ES.sh=1;render()};
ES.grade=g=>{if(!ES.rq||!ES.rq.length)return;const id=ES.rq[0];W(d=>{const c=d.cards.find(x=>x.id==id);if(c){Object.assign(c,nxt(c,g));c.due=D(add(new Date(),c.ivl));c.last=today();d.revlog.push({d:today(),g,c:id});if(d.revlog.length>5000)d.revlog.splice(0,d.revlog.length-5000)}});
ES.rq.shift();ES.rn++;if(g==0)ES.rq.push(id);ES.sh=0;if(!save())return;render()};
ES.endRev=()=>{ES.rq=null;render()};
function rev(){const d=dat();
if(ES.rq){const c=ES.rq.length&&d.cards.find(x=>x.id==ES.rq[0]);
if(!c)return`<div class=c>${EM('check',ES.rn?'Sessão concluída: '+ES.rn+' revisão(ões) feita(s).':'Nenhum cartão pendente.')}<div class=ctr><button class=b onclick="ES.endRev()">Voltar aos baralhos</button></div></div>`;
return`<div class=tb><span class=s>${ES.rn} revisados · ${ES.rq.length} restantes</span><button class="b g sm" onclick="ES.endRev()">Sair</button></div><div class=c>${bar(ES.rn/(ES.rn+ES.rq.length)*100)}<div class=e-card>${esc(c.q)}</div>${ES.sh?`<hr style="border:0;border-top:1px solid var(--bd)"><div class=e-card style="min-height:100px">${esc(c.a)}</div><div class=e-g>${[['Errei',0],['Difícil',1],['Bom',2],['Fácil',3]].map(([n,g])=>`<button class="b ${g==0?'er':g==2?'':'g'}" onclick="ES.grade(${g})">${n}<small>${ivT(nxt(c,g).ivl)}</small></button>`).join('')}</div><p class="s ctr mt">Atalhos: 1 Errei · 2 Difícil · 3 Bom · 4 Fácil</p>`:`<div class=ctr><button class=b onclick="ES.show()">Mostrar resposta</button><p class="s mt">Atalho: Espaço</p></div>`}</div>`}
const t=today(),due=dueCards().length,rv=d.revlog.filter(x=>x.d==t).length,fut=d.cards.map(c=>c.due).filter(x=>x&&x>t).sort()[0];
return`<div class=tb><div class=s>${due} pendente${due==1?'':'s'} · ${rv} revisado${rv==1?'':'s'} hoje · ${d.cards.length} cartões${!due&&fut?' · próxima revisão em '+df(fut):''}</div><div class=row>${due?`<button class="b sm" onclick="ES.startRev()">${I('play')}Revisar tudo</button>`:''}<button class="b g sm" onclick="ES.dkNew()">${I('plus')}Baralho</button></div></div>
<div class=stk>${d.decks.map(k=>{const cs=d.cards.filter(c=>c.deck==k.id),dn=cs.filter(c=>(c.due||'')<=t).length,op=ES.deck==k.id;
return`<div class=c><div class=sh><b class="f e-lk" onclick="ES.dkOpen('${k.id}')">${esc(k.name)}</b>${dn?`<button class="b sm" onclick="ES.startRev('${k.id}')">Estudar ${dn}</button>`:''}${IB(`ES.dkEdit('${k.id}')`,'edit','Editar baralho')}</div><p class=s>${k.sid?esc(sk(key(k)))+' · ':''}${cs.length} cartão(ões) · ${dn} pendente(s)</p>
<div class="row mt"><button class="b g sm" onclick="ES.cdNew('${k.id}')">${I('plus')}Cartão</button><button class="b g sm" onclick="ES.dkOpen('${k.id}')">${op?'Ocultar':'Ver'} cartões</button></div>
${op?cs.map(c=>`<div class=r><div class=f><div>${esc(c.q.slice(0,120))}</div><div class=s>${(c.due||'')<=t?'Pendente':'Próxima: '+df(c.due)}${c.reps?' · '+c.reps+' acerto(s) seguidos':''}</div></div>${IB(`ES.cdEdit('${c.id}')`,'edit','Editar cartão')}</div>`).join('')||`<div class=em><p>Sem cartões.</p></div>`:''}</div>`}).join('')||`<div class=c>${EM('book','Crie um baralho e adicione seus próprios cartões de pergunta e resposta. As revisões são agendadas conforme você responde.')}</div>`}</div>`}

/* ---------- Questões ---------- */
ES.qNew=()=>FM('Registrar questões',[{k:'k',l:'Matéria / tópico',t:'select',v:ES.qsid?ES.qsid+'|':'|',o:opts(1)},{k:'n',l:'Questões respondidas',t:'number',r:1},{k:'a',l:'Acertos',t:'number',r:1},{k:'date',l:'Data',t:'date',v:today(),r:1},{k:'src',l:'Fonte (opcional)'}],o=>{const sp=spl(o.k);S.qs.push({id:uid(),date:o.date,sid:sp.sid,tid:sp.tid,n:+o.n,a:+o.a,src:o.src});commit('Questões registradas.')},0,o=>{const n=+o.n,a=+o.a;return!Number.isInteger(n)||n<1?'Informe um total inteiro de questões (mínimo 1).':!Number.isInteger(a)||a<0?'Os acertos devem ser um número inteiro, sem negativos.':a>n?'Os acertos não podem ser maiores que o total respondido.':o.date>today()?'A data não pode estar no futuro.':''});
ES.qFil=v=>{ES.qsid=v;render()};ES.qPer=v=>{ES.qp=v;render()};
function qs(){const f=from(ES.qp),L=S.qs.filter(x=>(!ES.qsid||x.sid==ES.qsid)&&(!f||x.date>=f)),n=sum(L,'n'),a=sum(L,'a');
const by=S.subjects.map(s=>{const q=L.filter(x=>x.sid==s.id);return{s,n:sum(q,'n'),a:sum(q,'a')}}).filter(x=>x.n);
const tp={};L.forEach(x=>{if(!x.tid)return;const k=x.sid+'|'+x.tid;tp[k]=tp[k]||{k,n:0,a:0};tp[k].n+=x.n;tp[k].a+=x.a});
const weak=Object.values(tp).filter(x=>x.n>=5).sort((x,y)=>x.a/x.n-y.a/y.n).slice(0,5);
return`<div class=tb>${chips(ES.qp,[['7','7 dias'],['30','30 dias'],['m','Mês'],['all','Tudo']],'ES.qPer')}<button class="b sm" onclick="ES.qNew()">${I('plus')}Registrar</button></div>
<label>Matéria<select onchange="ES.qFil(this.value)"><option value="">Todas</option>${S.subjects.map(s=>`<option value="${s.id}"${ES.qsid==s.id?' selected':''}>${esc(s.name)}</option>`).join('')}</select></label>
<div class=g2><div class=c>${CT('Desempenho')}${n?`<div class=stats><div><b>${n}</b><span>respondidas</span></div><div><b>${a}</b><span>acertos</span></div><div><b>${n-a}</b><span>erros</span></div><div><b>${pc(a,n)}</b><span>aproveitamento</span></div></div>`:EM('target','Sem questões neste filtro. Registre as que você resolver em outras fontes.')}</div>
<div class=c>${CT('Por matéria')}${by.map(x=>`<div class=r>${dot(col(x.s))}<span class=f>${esc(x.s.name)}<div class=s>${x.a}/${x.n}</div></span><b>${pc(x.a,x.n)}</b></div>`).join('')||EM('chart','Sem dados.')}</div>
<div class="c span">${CT('Tópicos com menor aproveitamento')}${weak.map(x=>`<div class=r><span class=f>${esc(sk(x.k))}<div class=s>${x.a}/${x.n} questões</div></span><b>${pc(x.a,x.n)}</b></div>`).join('')||EM('target','Aparecem tópicos com pelo menos 5 questões registradas.')}${weak.length?'<p class="s mt">É só um indicador dos seus registros; não mede domínio do assunto.</p>':''}</div>
<div class="c span">${CT('Histórico')}${L.slice().reverse().slice(0,30).map(x=>`<div class=r><div class=f>${esc(sk(key(x)))}<div class=s>${df(x.date)} · ${x.n} questões, ${x.a} acertos, ${x.n-x.a} erros${x.src?' · '+esc(x.src):''}</div></div><b>${pc(x.a,x.n)}</b>${IB(`A.qd('${x.id}')`,'x','Apagar registro')}</div>`).join('')||EM('clock','Nenhum registro.')}</div></div>`}

/* ---------- Anotações ---------- */
let NT=null;
ES.ntNew=(sid,tid)=>{const id=uid();W(d=>d.notes.push({id,t:'',c:'',sid:sid||'',tid:tid||'',u:new Date().toISOString(),arch:0}));ES.tab='nt';ES.nid=id;ES.q='';save();render();window.scrollTo(0,0)};
ES.ntOpen=id=>{ES.tab='nt';ES.sid=null;ES.nid=id;ES.q='';render();window.scrollTo(0,0)};
ES.nch=()=>{const s=$('#nst');if(s){s.textContent='Salvando…';s.style.color=''}clearTimeout(NT);NT=setTimeout(ES.nsv,700)};
ES.nsv=()=>{clearTimeout(NT);NT=null;const id=ES.nid,ti=$('#nti');if(!id||!ti)return;const ok=(()=>{try{W(d=>{const n=d.notes.find(x=>x.id==id);if(!n)return;n.t=ti.value;n.c=$('#nco').value;const sp=spl($('#nsl').value);n.sid=sp.sid;n.tid=sp.tid;n.u=new Date().toISOString()});return save()}catch(e){return false}})();const s=$('#nst');if(s){s.textContent=ok?'Salvo':'Erro ao salvar';s.style.color=ok?'':'var(--er)'}};
ES.nflush=()=>{if(NT)ES.nsv()};
ES.ntBack=()=>{ES.nflush();const id=ES.nid;W(d=>{const n=d.notes.find(x=>x.id==id);if(n&&!n.t.trim()&&!n.c.trim())d.notes=d.notes.filter(x=>x!=n)});ES.nid=null;save();render()};
ES.ntArch=id=>{ES.nflush();W(d=>{const n=d.notes.find(x=>x.id==id);n.arch=n.arch?0:1});ES.nid=null;commit('Nota atualizada.')};
ES.ntDel=id=>{if(!confirm('Excluir esta nota?'))return;clearTimeout(NT);NT=null;W(d=>{d.notes=d.notes.filter(x=>x.id!=id)});ES.nid=null;commit('Nota excluída.')};
ES.nFil=v=>{ES.nsid=v;render()};ES.nArch=v=>{ES.narch=+v;render()};
ES.nsq=v=>{ES.nq=v;render();const i=$('#nsi');if(i){i.focus();i.setSelectionRange(v.length,v.length)}};
function nt(){const d=dat();
if(ES.nid){const n=d.notes.find(x=>x.id==ES.nid);if(!n){ES.nid=null;return nt()}
return`<div class=e-sc><button type=button class=ib onclick="ES.ntBack()" aria-label="Voltar">${I('left')}</button><span class=f></span><span class=e-n id=nst role=status>Salvo</span>${IB(`ES.ntArch('${n.id}')`,'folder',n.arch?'Restaurar nota':'Arquivar nota')}${IB(`ES.ntDel('${n.id}')`,'trash','Excluir nota')}</div>
<input id=nti class="e-ti" placeholder="Título" value="${esc(n.t)}" oninput="ES.nch()" aria-label="Título"><label>Vincular a<select id=nsl onchange="ES.nch()">${opts(1).map(o=>`<option value="${esc(o[0])}"${o[0]==key(n)?' selected':''}>${esc(o[1])}</option>`).join('')}</select></label><textarea id=nco class=e-ed placeholder="Escreva aqui…" oninput="ES.nch()" aria-label="Conteúdo">${esc(n.c)}</textarea>`}
const qq=ES.nq.toLowerCase(),L=d.notes.filter(n=>!!n.arch==!!ES.narch&&(!ES.nsid||n.sid==ES.nsid)&&((n.t||'')+' '+(n.c||'')).toLowerCase().includes(qq)).sort((a,b)=>b.u.localeCompare(a.u));
return`<div class=tb>${chips(ES.narch,[[0,'Recentes'],[1,'Arquivadas']],'ES.nArch')}<button class="b sm" onclick="ES.ntNew('${ES.nsid}','')">${I('plus')}Nota</button></div>
<div class=sb>${I('search')}<input id=nsi type=search placeholder="Pesquisar nas anotações" value="${esc(ES.nq)}" oninput="ES.nsq(this.value)" aria-label="Pesquisar anotações"></div>
<label>Matéria<select onchange="ES.nFil(this.value)"><option value="">Todas</option>${S.subjects.map(s=>`<option value="${s.id}"${ES.nsid==s.id?' selected':''}>${esc(s.name)}</option>`).join('')}</select></label>
<div class=g2>${L.map(n=>`<div class="c e-lk" tabindex=0 role=button onclick="ES.ntOpen('${n.id}')" onkeydown="if(event.key=='Enter')ES.ntOpen('${n.id}')"><b>${esc(n.t||'Sem título')}</b><p class=s>${n.sid?esc(sk(key(n)))+' · ':''}${new Date(n.u).toLocaleDateString('pt-BR')}</p><p class=nb>${esc((n.c||'').slice(0,300))}</p></div>`).join('')||EM('note',ES.nq?'Nenhuma anotação encontrada.':'Nenhuma anotação. Crie a primeira e vincule a uma matéria ou tópico.')}</div>`}

/* ---------- Estatísticas ---------- */
ES.sPer=v=>{ES.sp=v;render()};
function sta(){const f=from(ES.sp),ses=S.sessions.filter(x=>!f||x.date>=f),d=dat(),tot=sum(ses,'sec'),days=new Set(ses.map(x=>x.date)),ng=new Set(ses.map(gid)).size,goal=d.goal*60,
dayS={};ses.forEach(x=>dayS[x.date]=(dayS[x.date]||0)+x.sec);const met=goal?Object.values(dayS).filter(v=>v>=goal).length:0,cy=sum(ses,'cy'),
q=S.qs.filter(x=>!f||x.date>=f),qn=sum(q,'n'),qa=sum(q,'a'),rv=d.revlog.filter(x=>!f||x.d>=f).length,
by=S.subjects.map(s=>({s,sec:sum(ses.filter(x=>x.sid==s.id),'sec')})).filter(x=>x.sec).sort((a,b)=>b.sec-a.sec),none=sum(ses.filter(x=>!subj(x.sid)),'sec');
if(!S.sessions.length&&!S.qs.length&&!d.cards.length)return`<div class=c>${EM('chart','Ainda não há dados. Faça uma sessão de foco, registre questões ou crie flashcards e as estatísticas aparecem aqui.')}</div>`;
let dv,dl,hi=-1;const nd=ES.sp=='7'?7:ES.sp=='30'?30:ES.sp=='m'?new Date().getDate():0;
if(nd){const ks=Array.from({length:nd},(_,i)=>D(add(new Date(),-(nd-1-i))));dv=ks.map(k=>dayS[k]||0);dl=ks.map((k,i)=>nd>10&&i%5&&i!=nd-1?'':String(+k.slice(8)));hi=nd-1}
else{dv=[7,6,5,4,3,2,1,0].map(i=>{const e=D(add(new Date(),-i*7)),s=D(add(new Date(),-i*7-6));return secF(x=>x.date>=s&&x.date<=e)});dl=dv.map((_,i)=>i==7?'Agora':'-'+(7-i)+'s');hi=7}
const k=(a,b)=>`<div class=r><span class=f>${a}</span><b>${b}</b></div>`;
return`${chips(ES.sp,[['7','7 dias'],['30','30 dias'],['m','Este mês'],['all','Tudo']],'ES.sPer')}<div class=g2>
<div class=c>${CT('Tempo de estudo')}${k('Hoje',ft(secF(x=>x.date==today())))}${k('Últimos 7 dias',ft(secF(x=>x.date>=D(add(new Date(),-6)))))}${k('Este mês',ft(secF(x=>x.date.startsWith(today().slice(0,7)))))}${k('No período',ft(tot))}</div>
<div class=c>${CT('Sessões no período')}${k('Sessões',ng)}${k('Duração média',ng?ft(tot/ng):'—')}${k('Dias de estudo',days.size)}${goal?k('Metas diárias atingidas',met):''}${k('Ciclos Pomodoro concluídos',cy)}</div>
<div class="c span">${CT(nd?'Tempo por dia':'Tempo por semana')}${Object.keys(dayS).length>=2||(!nd&&S.sessions.length>1&&new Set(S.sessions.map(x=>x.date)).size>=2)?wkBars(dv,dl,hi):EM('chart','O gráfico aparece quando houver estudo em pelo menos 2 dias.')}</div>
<div class=c>${CT('Tempo por matéria')}${by.map(x=>`<div class=sj><div class=r style="border:0;padding:0 0 4px">${dot(col(x.s))}<span class=f>${esc(x.s.name)}</span><b>${ft(x.sec)}</b></div>${bar(tot?x.sec/tot*100:0)}</div>`).join('')+(none?`<div class=r><span class=f>Sem matéria</span><b>${ft(none)}</b></div>`:'')||EM('clock','Sem sessões no período.')}</div>
<div class=c>${CT('Questões e revisões')}${k('Questões respondidas',qn)}${k('Aproveitamento',pc(qa,qn))}${k('Cartões revisados',rv)}${k('Revisões pendentes agora',dueCards().length)}</div>
<div class="c span">${CT('Histórico de sessões')}${ses.slice().reverse().slice(0,15).map(x=>`<div class=r><div class=f>${esc(sn(key(x)))}<div class=s>${df(x.date)}${x.st?' · '+hm(x.st)+'–'+hm(x.en):''}${x.mode&&x.mode!='manual'?' · '+modeName(x.mode):''}${x.obs?' · '+esc(x.obs):''}</div></div><b>${ft(x.sec)}</b>${IB(`A.sd('${x.id}')`,'x','Apagar sessão')}</div>`).join('')||EM('clock','Nenhuma sessão no período.')}</div></div>`}

/* ---------- Pesquisa ---------- */
function busca(){const q=ES.q.trim().toLowerCase(),has=s=>String(s||'').toLowerCase().includes(q),d=dat(),r=[];
S.subjects.forEach(s=>{if(has(s.name)||has(s.desc))r.push(`<div class="r e-lk" onclick="ES.sOpen('${s.id}')">${dot(col(s))}<div class=f>${esc(s.name)}<div class=s>Matéria</div></div></div>`);s.topics.forEach(t=>{if(has(t.name)||has(t.obs))r.push(`<div class="r e-lk" onclick="ES.sOpen('${s.id}')"><div class=f>${esc(t.name)}<div class=s>Tópico · ${esc(s.name)}</div></div></div>`)})});
d.notes.forEach(n=>{if(has(n.t)||has(n.c))r.push(`<div class="r e-lk" onclick="ES.ntOpen('${n.id}')"><div class=f>${esc(n.t||'Sem título')}<div class=s>Anotação${n.arch?' (arquivada)':''}</div></div></div>`)});
return`<div class=c>${CT('Resultados')}${r.join('')||EM('search','Nada encontrado.')}</div>`}

/* ---------- Página ---------- */
P.est=function(){const d=dat(),t=today(),r=ES.run,v=r?view():null;
let lead='';if(ES.tab=='ov'){const n=d.plans.filter(p=>!p.done&&p.date<=t).length+d.tasks.filter(x=>!x.done&&(!x.date||x.date<=t)).length;lead=r?'Há uma sessão '+(v.run?'em andamento':'pausada')+'.':n?n+' atividade'+(n==1?'':'s')+' para hoje.':S.subjects.length?'Nada planejado para hoje.':'Crie uma matéria para organizar seus estudos.'}
const hd=`<div class=e-hero><div><h1>Estudos</h1><div class=e-date>${U.cp(new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'}))}</div>${lead?`<div class=e-lead>${lead}</div>`:''}</div><button class="b e-big" onclick="ES.go('foc')">${I('play')}${r?'Abrir sessão':'Começar a estudar'}</button></div>${ES.tab=='ov'?`<div class=e-acts><button class="b g sm" onclick="ES.sNew()">${I('plus')}Matéria</button><button class="b g sm" onclick="ES.ntNew('','')">${I('plus')}Anotação</button><button class="b g sm" onclick="ES.tkNew('${t}')">${I('plus')}Tarefa</button></div>`:''}`;
const tabs=`<div class=e-tabs role=tablist>${TABS.map(x=>`<button type=button role=tab class=e-tab aria-selected="${ES.tab==x[0]}" onclick="ES.go('${x[0]}')">${x[1]}</button>`).join('')}</div>`;
const ban=r&&ES.tab!='foc'?`<div class=e-banner role=button tabindex=0 onclick="ES.go('foc')" onkeydown="if(event.key=='Enter')ES.go('foc')">${dot(v.run?'var(--ok)':'var(--wa)')}<span>Sessão ${v.run?'em andamento':'pausada'} · ${esc(sk(r.key))}</span><span class=f></span><b id=eb>${v.time}</b></div>`:'';
const sb=`<div class=sb>${I('search')}<input id=esq type=search placeholder="Pesquisar matérias, tópicos e anotações" value="${esc(ES.q)}" oninput="ES.sq(this.value)" aria-label="Pesquisar"></div>`;
let body;try{body=ES.q.trim()?busca():{ov,mat,pl,foc,rev,qs,nt,st:sta}[ES.tab]()}catch(e){console.error('[Estudos]',e);body=`<div class=c>${EM('x','Não foi possível exibir esta tela. Seus dados não foram alterados.')}</div>`}
return`<div class=e-root>${hd}${tabs}${ban}${sb}<div class=e-body>${body}</div></div>`};

/* ---------- Atalhos ---------- */
document.addEventListener('keydown',e=>{if(page!='est')return;const tg=e.target,ty=/INPUT|TEXTAREA|SELECT/.test(tg.tagName),md=$('#md').className=='on';
if((e.key=='f'||e.key=='F')&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!ty){e.stopImmediatePropagation();if(!md&&(ES.tab=='foc'||ES.fo)){ES.fo?ES.fsToggle():ES.focusOn()}return}
if(e.key=='Escape'&&ES.fo&&!md&&!inFs()){ES.focusOff();return}
if(e.code=='Space'&&!ty&&!md&&!/BUTTON|^A$/.test(tg.tagName)&&(ES.fo||ES.tab=='foc')&&ES.run){e.preventDefault();ES.rPrimary();return}
if(ES.tab!='rev'||!ES.rq||ty||md)return;
if(!ES.sh&&(e.code=='Space'||e.key=='Enter')){e.preventDefault();ES.show()}else if(ES.sh&&e.key.length==1&&'1234'.includes(e.key)){e.preventDefault();ES.grade(+e.key-1)}else if(e.key=='Escape')ES.endRev()},true);
window.addEventListener('beforeunload',()=>ES.nflush());
document.addEventListener('visibilitychange',()=>{if(document.hidden)ES.nflush()});
})();