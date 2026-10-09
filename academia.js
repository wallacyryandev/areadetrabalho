/* Hub Pessoal - academia.js (v4)
   Academia como app independente dentro do Hub: Início / Treinos / Exercícios / Progresso.
   Configurações abrem pela engrenagem (mesmo padrão da Música): Navegação do Hub + preferências da Academia.
   Carregar DEPOIS de corrida.js (index.html: <script src="academia.js"></script>).
   Reaproveita S, A, UI, P, PG, render, sv, chart, TD, esc, uid, toast, RD, go, $ (index.html).
   Persistência: tudo novo (favoritos, exercícios personalizados, preferências, mapa de grupos) fica em S.use.gym
   (mesmo caminho já sincronizado). Fichas continuam em S.plans; treinos em S.workouts (nada disso muda de formato,
   só ganham campos opcionais e.l (carga alvo kg) e e.rt (descanso s) nos exercícios das fichas).
   Sessão = treino finalizado com ≥1 série, deduplicado por id. Datas AAAA-MM-DD em horário local. */
(()=>{
/* ====== TEMA (única fonte das cores; mude aqui para alterar o visual) ====== */
const BASE={'--bg':'#0D0D0F','--bg2':'#141416','--gc':'#1B1B1F','--bd':'#2B2B30','--tx':'#F5F5F5','--t2':'#A1A1AA','--ok':'#4CAF7D','--wn':'#E8B04A','--er':'#FF5A62','--hv':'rgba(255,255,255,.06)'};
/* [nome, rgb, principal, texto sobre o destaque, claro, escuro] */
const PAL={vermelho:['Vermelho','229,57,69','#E53945','#FFFFFF','#FF5A62','#B91C2C'],claro:['Vermelho claro','255,90,98','#FF5A62','#1B0507','#FF7A80','#E53945'],escuro:['Vermelho escuro','185,28,44','#B91C2C','#FFFFFF','#E53945','#8F1522']};
const DEF={pal:'vermelho',un:'kg',rec:'seq',ar:1,sn:1,vb:1};

const LB={peito:'Peito',ombros:'Ombros',biceps:'Bíceps',triceps:'Tríceps',antebraco:'Antebraço',abdomen:'Abdômen',quadriceps:'Quadríceps',panturrilha:'Panturrilha',trapezio:'Trapézio',dorsais:'Costas',lombar:'Lombar',gluteos:'Glúteos',posteriores:'Posteriores'};
const EGR=['peito','dorsais','ombros','biceps','triceps','antebraco','abdomen','quadriceps','posteriores','gluteos','panturrilha','trapezio','lombar'];
const EQ={h:'Halteres',b:'Barras',m:'Máquinas',c:'Cabos',p:'Peso corporal',e:'Elásticos'},MV={e:'Empurrar',p:'Puxar',a:'Pernas',i:'Isolamento',c:'Core'};
const RU=[[/triceps|testa|frances|paralela|mergulho|pushdown/,'triceps'],[/antebraco|punho/,'antebraco'],[/rosca|biceps|martelo/,'biceps'],[/abdominal|prancha|infra|crunch|abdomen|elevacao de pernas/,'abdomen'],[/lombar|hiperextensao|good morning|bom dia/,'lombar'],[/gluteo|hip thrust|pelvica|coice|abdutora/,'gluteos'],[/stiff|flexora|romeno|posterior|levantamento terra|^terra/,'posteriores'],[/agachamento|leg press|extensora|afundo|passada|hack|avanco|bulgaro|quadriceps/,'quadriceps'],[/panturrilha|gemeos|soleo/,'panturrilha'],[/encolhimento|trapezio/,'trapezio'],[/desenvolvimento|elevacao lateral|elevacao frontal|ombro|arnold|militar|face pull/,'ombros'],[/puxada|remada|barra fixa|pulldown|serrote|dorsal/,'dorsais'],[/supino|crucifixo|peck|voador|fly|flexao|crossover|peitoral/,'peito']];
const nm=s=>String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
/* Biblioteca base: nome|grupo|secundários|equip(h b m c p e)|movimento(e p a i c)|instruções. Sem imagens: nenhuma demonstração é inventada. */
const RAW=`Supino reto|peito|triceps,ombros|b|e|Deitado no banco, desça a barra até a linha do peito com controle e empurre até estender os braços, mantendo os pés firmes no chão.
Supino inclinado|peito|ombros,triceps|b|e|No banco inclinado, desça a barra até a parte alta do peito e empurre sem tirar o quadril do banco.
Supino declinado|peito|triceps|b|e|No banco declinado, desça a barra até a parte baixa do peito e empurre com os cotovelos a cerca de 45° do tronco.
Supino com halteres|peito|triceps,ombros|h|e|Desça os halteres ao lado do peito até sentir o alongamento e empurre juntando levemente os braços no topo.
Crucifixo|peito|ombros|h|i|Com os cotovelos levemente flexionados, abra os braços até alongar o peito e retorne em arco.
Crossover|peito|ombros|c|i|Em pé entre as polias altas, traga as mãos à frente do corpo em arco, contraindo o peito.
Peck deck|peito|ombros|m|i|Sentado, com as costas apoiadas, una os braços à frente do peito e volte devagar.
Flexão de braço|peito|triceps,ombros,abdomen|p|e|Mãos na largura dos ombros e corpo alinhado, desça o peito até perto do chão e empurre.
Puxada frontal|dorsais|biceps,antebraco|c|p|Puxe a barra até a altura da clavícula levando os cotovelos para baixo, sem balançar o tronco.
Barra fixa|dorsais|biceps,antebraco|p|p|Pendure-se na barra e puxe o corpo até o queixo passar dela, descendo com controle.
Remada curvada|dorsais|biceps,trapezio,lombar|b|p|Com o tronco inclinado e a coluna neutra, puxe a barra em direção ao abdômen e desça com controle.
Remada baixa|dorsais|biceps,trapezio|c|p|Sentado, puxe o triângulo até o abdômen juntando as escápulas, sem jogar o tronco para trás.
Remada unilateral|dorsais|biceps|h|p|Apoie uma mão no banco e puxe o halter em direção ao quadril, mantendo o tronco estável.
Pulldown com elástico|dorsais|biceps|e|p|Com o elástico preso no alto, puxe-o em direção ao peito levando os cotovelos para baixo.
Desenvolvimento com halteres|ombros|triceps|h|e|Empurre os halteres acima da cabeça até estender os braços e desça até a altura das orelhas.
Desenvolvimento militar|ombros|triceps,trapezio|b|e|Em pé, empurre a barra da altura dos ombros até acima da cabeça, mantendo o abdômen firme.
Elevação lateral|ombros|trapezio|h|i|Com os cotovelos levemente flexionados, eleve os halteres até a altura dos ombros e desça devagar.
Elevação frontal|ombros|peito|h|i|Eleve os halteres à frente do corpo até a altura dos ombros, sem balançar o tronco.
Face pull|ombros|trapezio,dorsais|c|p|Puxe a corda em direção ao rosto, abrindo os cotovelos para os lados.
Crucifixo inverso|ombros|trapezio,dorsais|h|i|Inclinado à frente, abra os braços para os lados até a altura dos ombros e volte com controle.
Encolhimento|trapezio|antebraco|h|i|Com os braços estendidos ao lado do corpo, eleve os ombros em direção às orelhas e desça devagar.
Rosca direta|biceps|antebraco|b|i|Em pé, flexione os cotovelos levando a barra até os ombros, sem balançar o tronco.
Rosca martelo|biceps|antebraco|h|i|Com as palmas voltadas uma para a outra, flexione os cotovelos e suba os halteres.
Rosca alternada|biceps|antebraco|h|i|Flexione um braço de cada vez, girando a palma para cima durante a subida.
Rosca concentrada|biceps||h|i|Sentado, com o cotovelo apoiado na coxa, flexione o braço levando o halter ao ombro.
Rosca no cabo|biceps|antebraco|c|i|De frente para a polia baixa, flexione os cotovelos mantendo-os junto ao corpo.
Tríceps corda|triceps||c|i|Na polia alta, empurre a corda para baixo estendendo os cotovelos e abra as pontas no final.
Tríceps testa|triceps||b|i|Deitado, flexione os cotovelos descendo a barra em direção à testa e estenda os braços.
Tríceps francês|triceps||h|i|Com um halter acima da cabeça, flexione os cotovelos atrás da nuca e estenda de novo.
Tríceps coice|triceps||h|i|Inclinado à frente, com o cotovelo junto ao tronco, estenda o antebraço para trás.
Mergulho nas paralelas|triceps|peito,ombros|p|e|Apoiado nas barras, desça flexionando os cotovelos e empurre o corpo para cima.
Mergulho no banco|triceps|ombros|p|e|Com as mãos no banco atrás do corpo, desça flexionando os cotovelos e empurre para cima.
Tríceps com elástico|triceps||e|i|Com o elástico preso no alto, estenda os cotovelos puxando-o para baixo.
Rosca de punho|antebraco||h|i|Antebraços apoiados, palmas para cima, flexione e estenda os punhos com o halter.
Rosca de punho inversa|antebraco||h|i|Antebraços apoiados, palmas para baixo, estenda os punhos para cima e desça devagar.
Rosca inversa|antebraco|biceps|b|i|Com as palmas para baixo, flexione os cotovelos levando a barra aos ombros.
Suspensão na barra|antebraco|dorsais|p|i|Segure-se na barra fixa pelo maior tempo possível com os ombros estáveis.
Abdominal|abdomen||p|c|Deitado com joelhos flexionados, eleve os ombros do chão contraindo o abdômen e desça devagar.
Prancha|abdomen|ombros,lombar|p|c|Apoiado nos antebraços e pontas dos pés, mantenha o corpo alinhado e o abdômen contraído (repetições = segundos).
Elevação de pernas|abdomen||p|c|Deitado ou pendurado, eleve as pernas até o quadril e desça sem arquear a lombar.
Abdominal infra|abdomen||p|c|Deitado, leve os joelhos em direção ao peito elevando o quadril levemente e volte com controle.
Abdominal bicicleta|abdomen||p|c|Alterne cotovelo e joelho opostos em movimento de pedalada, mantendo o abdômen contraído.
Abdominal na polia|abdomen||c|c|Ajoelhado diante da polia alta, flexione o tronco levando os cotovelos aos joelhos.
Hiperextensão lombar|lombar|gluteos,posteriores|p|c|No banco de hiperextensão, desça o tronco e volte até alinhar o corpo, sem hiperestender.
Agachamento livre|quadriceps|gluteos,posteriores,lombar|b|a|Com a barra apoiada nas costas, desça flexionando quadril e joelhos e suba empurrando o chão.
Agachamento goblet|quadriceps|gluteos,abdomen|h|a|Segure um halter junto ao peito e agache mantendo o tronco ereto.
Agachamento hack|quadriceps|gluteos|m|a|Costas apoiadas na máquina, desça flexionando os joelhos e empurre de volta.
Leg press|quadriceps|gluteos,posteriores|m|a|Empurre a plataforma até quase estender os joelhos e retorne sem descolar o quadril do banco.
Cadeira extensora|quadriceps||m|i|Sentado, estenda os joelhos elevando o rolo e desça devagar.
Afundo|quadriceps|gluteos,posteriores|h|a|Dê um passo à frente e desça até o joelho de trás quase tocar o chão; volte à posição inicial.
Passada|quadriceps|gluteos,posteriores|h|a|Caminhe em passos longos, descendo o joelho de trás em cada passada.
Agachamento búlgaro|quadriceps|gluteos|h|a|Com o pé de trás apoiado em um banco, agache na perna da frente e suba.
Mesa flexora|posteriores||m|i|Deitado, flexione os joelhos levando o rolo em direção aos glúteos e desça devagar.
Cadeira flexora|posteriores||m|i|Sentado, flexione os joelhos puxando o rolo para baixo e volte com controle.
Stiff|posteriores|gluteos,lombar|b|a|Com joelhos levemente flexionados, leve o quadril para trás descendo a barra rente às pernas e suba.
Levantamento terra|posteriores|gluteos,lombar,dorsais,trapezio|b|a|Com a barra rente às pernas e a coluna neutra, estenda quadril e joelhos para levantar a barra.
Hip thrust|gluteos|posteriores|b|a|Com as costas apoiadas no banco, eleve o quadril com a barra até alinhar tronco e coxas, contraindo os glúteos.
Elevação pélvica|gluteos|posteriores|p|a|Deitado, com os pés no chão, eleve o quadril contraindo os glúteos e desça devagar.
Ponte de glúteo|gluteos|posteriores|p|a|Deitado, joelhos flexionados, eleve o quadril até alinhar com o tronco e desça com controle.
Cadeira abdutora|gluteos||m|i|Sentado, abra as pernas contra a resistência e volte devagar.
Coice na polia|gluteos|posteriores|c|i|Com a tornozeleira na polia baixa, estenda a perna para trás contraindo o glúteo.
Abdução com elástico|gluteos||e|i|Com o elástico acima dos joelhos, abra as pernas contra a resistência.
Panturrilha em pé|panturrilha||m|i|Suba na ponta dos pés até o máximo e desça alongando bem a panturrilha.
Panturrilha sentado|panturrilha||m|i|Sentado, eleve os calcanhares contra o peso e desça devagar.
Elevação de panturrilha|panturrilha||p|i|Em pé, no chão ou em um degrau, suba na ponta dos pés e desça devagar.
Panturrilha no leg press|panturrilha||m|i|Com a ponta dos pés na plataforma, empurre estendendo os tornozelos e volte.`.split('\n').map(l=>{const a=l.split('|');return{n:a[0],g:a[1],sec:a[2]?a[2].split(','):[],eq:a[3],mv:a[4],ins:a[5]||''}});
const LIBM=new Map(RAW.map(r=>[nm(r.n),r])),LIB=RAW.map(r=>r.n);
const TABS=[['ini','home','Início','Início'],['trn','dumbbell','Treinos','Treinos'],['exe','search','Exercícios','Exercícios'],['pro','chart','Progresso','Progresso']];
const PT=[['cal','Calendário'],['mus','Músculos'],['gra','Gráficos'],['his','Histórico']];
const MES=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'],MS=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'],DS=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'],DF=['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'];
const W0=0;
/* gt = aba atual ('ini','trn','exe','pro') ou 'set' (configurações); gp = aba para onde a seta das configurações volta */
let tq='',gt='ini',gp='ini',pt='cal',gm=null,gv='f',xq='',xf='',xe='',xm='',xv='',xd='',xc=0,xe2='',tp='',px='',cv='w',ca='',cs='',fx=0,hl=40,C=null;

/* ---- Datas locais ---- */
const pd=s=>new Date(+s.slice(0,4),+s.slice(5,7)-1,+s.slice(8,10),12);
const ymd=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const addD=(s,n)=>{const d=pd(s);d.setDate(d.getDate()+n);return ymd(d)};
const dd=(d,b)=>Math.round((pd(b||TD())-pd(d))/864e5);
const wkS=d=>addD(d,-((pd(d).getDay()-W0+7)%7));
const fdt=d=>d.split('-').reverse().slice(0,2).join('/');
const fl=d=>{const x=pd(d),w=DF[x.getDay()];return w[0].toUpperCase()+w.slice(1)+', '+x.getDate()+' de '+MES[x.getMonth()].toLowerCase()+' de '+x.getFullYear()};
const fdu=s=>{const m=Math.round((+s||0)/60);if(m<1)return'—';const h=Math.floor(m/60),r=m%60;return h?h+'h'+(r?String(r).padStart(2,'0'):''):m+' min'};
const enc=n=>encodeURIComponent(n).replace(/'/g,'%27');

/* ---- Preferências (S.use.gym.cfg) ---- */
const gy=()=>(S.use&&S.use.gym)||{};
/* quem tinha uma paleta antiga salva (ex.: "lima") volta para o vermelho padrão */
const cf=()=>{const c=Object.assign({},DEF,gy().cfg);if(!PAL[c.pal])c.pal=DEF.pal;return c};
const setG=o=>{S.use=Object.assign({},S.use,{gym:Object.assign({},gy(),o)})};
const setC=o=>setG({cfg:Object.assign({},gy().cfg,o)});
const cu=k=>cf().un=='lb'?Math.round(k*2.20462*10)/10:k;
const fw=k=>cu(k)+' '+cf().un;
window.GymCfg=cf; /* o cronômetro/treino ativo pode ler: GymCfg().ar (iniciar descanso), .sn (som), .vb (vibração) */

/* ---- Sessões concluídas ---- */
const build=()=>{const m=new Map();(S.workouts||[]).forEach((w,i)=>{if(!w||!/^\d{4}-\d\d-\d\d$/.test(w.date||'')||!(w.ex||[]).some(e=>e.sets&&e.sets.length))return;m.set(w.id||'_'+i,w)});const L=[...m.values()].sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:0),by={};L.forEach(w=>(by[w.date]=by[w.date]||[]).push(w));return{L,by}};
const ses=()=>C||(C=build());
const dayInfo=d=>{const a=ses().by[d]||[];return{a,n:a.length,sec:a.reduce((t,w)=>t+(+w.sec||0),0)}};
const range=(a,b)=>{const L=ses().L.filter(w=>w.date>=a&&w.date<=b);return{n:L.length,d:new Set(L.map(w=>w.date)).size,sec:L.reduce((t,w)=>t+(+w.sec||0),0)}};
const gmap=()=>gy().map||{};
const meta=n=>{const k=nm(n);return(gy().custom||[]).find(c=>nm(c.n)==k)||LIBM.get(k)};
const grp=n=>{const m=gmap();if(m[n])return m[n];const x=meta(n);if(x)return x.g;const k=nm(n);for(const r of RU)if(r[0].test(k))return r[1];return null};
const hist=n=>ses().L.map(w=>{const e=w.ex.find(x=>x.n==n);return e&&e.sets.length?{date:w.date,sets:e.sets}:null}).filter(Boolean);
const last=n=>hist(n).at(-1);
const top=h=>Math.max(...h.sets.map(x=>+x.l));
const lastDates=()=>{const o={};ses().L.forEach(w=>w.ex.forEach(e=>{const g=e.sets.length&&grp(e.n);if(g&&(!o[g]||w.date>o[g]))o[g]=w.date}));return o};
const stt=(g,o)=>{if(!o[g])return'unk';const n=dd(o[g]);return n<=1?'h0':n<=4?'h1':'h2'};
const names=()=>[...new Set([...S.plans.flatMap(p=>p.ex.map(e=>e.n)),...ses().L.flatMap(w=>w.ex.map(e=>e.n))])];
const lx=()=>{const m=new Map();RAW.forEach(r=>m.set(nm(r.n),r));(gy().custom||[]).forEach(r=>m.set(nm(r.n),Object.assign({},r,{cus:1})));names().forEach(n=>{if(!m.has(nm(n)))m.set(nm(n),{n,g:null,sec:[],eq:'',mv:'',ins:''})});return[...m.values()].map(x=>Object.assign({},x,{g:grp(x.n)})).sort((a,b)=>a.n.localeCompare(b.n,'pt'))};
const sets=s=>s.map(x=>fw(x.l)+' × '+x.r).join(', ');
const upd=(id,h)=>{const e=document.getElementById(id);if(e)e.innerHTML=h();else render()};
const fav=()=>gy().fav||[],isF=n=>fav().includes(n);
const rcn=()=>{const o=[];ses().L.slice().reverse().forEach(w=>w.ex.forEach(e=>{if(e.sets.length&&!o.includes(e.n))o.push(e.n)}));return o.slice(0,12)};
const gtags=p=>[...new Set(p.ex.map(e=>grp(e.n)).filter(Boolean))].map(g=>`<span class=gtg>${LB[g]}</span>`).join('');

/* ---- Boneco vetorial ---- */
const f=n=>Math.round(n*10)/10;
const sm=p=>{const n=p.length;let d='M'+p[0][0]+' '+p[0][1];for(let i=0;i<n;i++){const a=p[(i-1+n)%n],b=p[i],c=p[(i+1)%n],e=p[(i+2)%n];d+='C'+f(b[0]+(c[0]-a[0])/6)+' '+f(b[1]+(c[1]-a[1])/6)+' '+f(c[0]-(e[0]-b[0])/6)+' '+f(c[1]-(e[1]-b[1])/6)+' '+c[0]+' '+c[1]}return d+'Z'};
const SL=[[93,46],[93,58],[76,65],[60,71],[49,81],[44,100],[42,128],[40,152],[36,180],[31,206],[28,226],[30,238],[38,236],[43,222],[47,200],[52,172],[56,140],[58,118],[63,111],[66,134],[70,164],[72,192],[66,218],[62,244],[62,268],[66,296],[67,316],[65,336],[68,356],[72,378],[70,394],[90,394],[91,380],[92,352],[94,326],[94,300],[96,270],[98,246]];
const SIL=sm([...SL,[100,240],...SL.slice().reverse().map(([x,y])=>[200-x,y])]);
const FR={
trapezio:[[[94,50],[85,59],[71,68],[79,75],[91,71],[97,62]]],
ombros:[[[66,73],[56,77],[48,88],[45,104],[50,113],[57,102],[62,88],[67,78]]],
peito:[[[98,78],[86,73],[72,77],[64,88],[64,102],[74,112],[90,114],[98,108]]],
biceps:[[[46,108],[55,113],[56,131],[52,148],[44,148],[43,128]]],
antebraco:[[[42,153],[52,152],[50,176],[45,200],[37,208],[34,190],[38,170]]],
abdomen:[[[98,117],[88,117],[84,132],[83,160],[85,184],[92,199],[98,204]],[[81,118],[70,125],[66,142],[68,170],[72,192],[83,201],[85,170],[85,138]]],
quadriceps:[[[98,224],[84,222],[68,230],[62,250],[62,280],[68,306],[82,308],[92,298],[96,264]]],
panturrilha:[[[72,320],[84,320],[88,340],[86,366],[80,380],[74,366],[70,342]]]};
const BK={
trapezio:[[[99,52],[88,60],[72,70],[78,84],[90,104],[99,126]]],
ombros:FR.ombros,
dorsais:[[[97,112],[84,103],[74,92],[64,100],[64,124],[69,152],[78,172],[96,176],[99,150]]],
triceps:[[[46,104],[56,110],[57,130],[52,148],[44,148],[43,128]]],
antebraco:FR.antebraco,
lombar:[[[98,168],[86,168],[80,182],[86,200],[98,206]]],
gluteos:[[[98,206],[82,200],[68,208],[62,226],[68,242],[86,246],[98,240]]],
posteriores:[[[97,248],[84,248],[68,254],[63,274],[67,304],[84,306],[93,292],[96,268]]],
panturrilha:[[[70,314],[84,314],[90,334],[86,362],[80,376],[73,360],[67,334]]]};
const conv=o=>Object.fromEntries(Object.entries(o).map(([g,a])=>[g,a.map(sm)]));
const DT={f:'M89 134H98M88 152H98M89 170H98M99.5 117V204M84 236C80 256 82 278 85 298M80 76C76 82 74 90 76 98',b:'M99.6 52V206M80 100C76 110 76 122 80 134M84 250C80 266 82 284 86 300'};
const FRG=conv(FR),BKG=conv(BK);
const MIR='translate(200 0) scale(-1 1)';
const body=(v,o)=>`<svg class="bv${v==gv?' on':''}" viewBox="22 2 156 396" role=group aria-label="${v=='f'?'Vista frontal':'Vista posterior'}"><path class=bb d="${SIL}"/><ellipse class=bb cx=100 cy=28 rx=15 ry=19 />${Object.entries(v=='f'?FRG:BKG).map(([g,ps])=>`<g class="mz ${stt(g,o)}${gm==g?' sel':''}" tabindex=0 role=button aria-pressed=${gm==g} aria-label="${LB[g]}" onclick="G.m('${g}')" onkeydown="if(event.key=='Enter'||event.key==' '){event.preventDefault();G.m('${g}')}"><title>${LB[g]}</title>${ps.map(d=>`<path d="${d}"/><path transform="${MIR}" d="${d}"/>`).join('')}</g>`).join('')}<path class=dt d="${DT[v]}"/><path class=dt transform="${MIR}" d="${DT[v]}"/></svg>`;
const figure=o=>`<div class="row chips bt"><span class="ch ${gv=='f'?'on':''}" onclick="G.v('f')">Frente</span><span class="ch ${gv=='b'?'on':''}" onclick="G.v('b')">Costas</span></div><div class=bw>${body('f',o)}${body('b',o)}</div><div class=lg><span><i class=u></i>Sem registro</span><span><i class=h0></i>Hoje ou ontem</span><span><i class=h1></i>2 a 4 dias</span><span><i class=h2></i>5 dias ou mais</span></div><p class=s style="margin:8px 0 0">Cores = há quantos dias o grupo foi treinado nos seus registros. O app não estima recuperação.${ses().L.length<3?' Ainda há poucos treinos registrados, então o mapa mostra pouco histórico.':''}</p>`;
const panel=o=>{const rc=Object.keys(o).filter(g=>dd(o[g])<=4).sort((a,b)=>o[b].localeCompare(o[a])),chips=`<div class=gsec>Treinados recentemente</div><div class=row>${rc.map(g=>`<span class="ch ${gm==g?'on':''}" onclick="G.m('${g}')">${LB[g]} · ${dd(o[g])<1?'hoje':dd(o[g])+'d'}</span>`).join('')||'<span class=s>Nenhum grupo nos últimos 5 dias.</span>'}</div>`;
if(!gm)return`<div class=em>${UI.i('target')}<p>Toque em um músculo do mapa para ver os exercícios e o histórico dele.</p></div>${chips}`;
const n=o[gm]?dd(o[gm]):-1,tx=!o[gm]?'Sem registro: nenhum treino concluído trabalhou este grupo ainda.':n<1?'Treinado hoje.':n==1?'Treinado ontem.':'Último treino há '+n+' dias ('+fdt(o[gm])+').';
const ns=names().filter(x=>grp(x)==gm),sg=LIB.filter(x=>grp(x)==gm&&!ns.includes(x)).slice(0,8),hs=ses().L.filter(w=>w.ex.some(e=>e.sets.length&&grp(e.n)==gm)).slice(-5).reverse();
return`<div class=sh><h3 style="margin:0">${LB[gm]}</h3><span class=ch onclick="G.m('${gm}')">Limpar</span></div><p class=s style="margin:4px 0 0">${tx}</p>
<div class=gsec>Seus exercícios</div>${ns.map(x=>{const l=last(x);return`<div class=r><span class=f>${esc(x)}</span><span class=s>${l?fdt(l.date)+' · '+fw(top(l)):'sem registro'}</span></div>`}).join('')||`<p class=s>Nenhum exercício seu usa este grupo ainda. Associe exercícios em Configurações.</p>`}
${sg.length?`<div class=gsec>Sugestões da biblioteca</div><div class=row>${sg.map(x=>`<span class=gtg>${esc(x)}</span>`).join('')}</div>`:''}
<div class=gsec>Histórico do grupo</div>${hs.map(w=>`<div class=gse><div class=sh><b>${esc(w.name)}</b><span class=s>${fdt(w.date)}</span></div>${w.ex.filter(e=>e.sets.length&&grp(e.n)==gm).map(e=>`<div class=s>${esc(e.n)}: ${sets(e.sets)}</div>`).join('')}</div>`).join('')||'<p class=s>Sem sessões registradas para este grupo.</p>'}${chips}`};
const mm=()=>{const o=lastDates();return`<div class=c>${figure(o)}</div><div class=c>${panel(o)}</div>`};

/* ---- Treino recomendado ---- */
const planNext=()=>{if(!S.plans.length)return null;const r=cf().rec;if(r&&r!='seq'){const p=S.plans.find(x=>x.id==r);if(p)return p}const L=ses().L;for(let i=L.length-1;i>=0;i--){const k=S.plans.findIndex(p=>p.name==L[i].name);if(k>=0)return S.plans[(k+1)%S.plans.length]}return S.plans[0]};
const est=p=>{const h=ses().L.filter(w=>w.name==p.name&&+w.sec>0).slice(-5);if(h.length)return Math.max(5,Math.round(h.reduce((t,w)=>t+w.sec,0)/h.length/60));const sec=p.ex.reduce((t,e)=>t+e.s*(40+(+e.rt||+S.rest||90)),0);return Math.max(5,Math.round(sec/300)*5)};
const rec=()=>{const p=planNext();if(!p)return`<div class="c hero"><div class=gsec style="margin-top:0">Treino de hoje</div><p style="margin:6px 0 12px">Você ainda não tem uma ficha configurada.</p><div class=row><button class=b onclick="A.pn()">${UI.i('plus')}Criar ficha</button><button class="b g" onclick="G.t('trn')">Escolher um modelo</button></div></div>`;
return`<div class="c hero"><div class=gsec style="margin-top:0">Treino recomendado para hoje</div><h2 style="font-size:22px;margin:2px 0 4px">${esc(p.name)}</h2><div class=s>${p.ex.length} exercício${p.ex.length==1?'':'s'} · ~${est(p)} min</div>${gtags(p)?`<div class=row style="margin:10px 0 0">${gtags(p)}</div>`:''}<button class="b big2 mt" style="width:100%" onclick="A.ws('${p.id}')">${UI.i('play')}Iniciar treino</button></div>`};

/* ---- Calendário ---- */
const lvl=i=>{if(!i.n)return 0;const m=i.sec/60;return m<=0?(i.n>1?2:1):m<30?1:m<60?2:m<90?3:4};
const hd=()=>{const h=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];return h.slice(W0).concat(h.slice(0,W0))};
const calW=(a,t)=>{const s=wkS(a),e=addD(s,6),r=range(s,e),x=pd(s),y=pd(e),lab=x.getDate()+(x.getMonth()!=y.getMonth()?' '+MS[x.getMonth()]:'')+' – '+y.getDate()+' '+MS[y.getMonth()]+' '+y.getFullYear();
return{lab,st:[[r.d,'dias treinados'],[r.n,'sessões'],[fdu(r.sec),'tempo total']],h:`<div class=gcw>${Array.from({length:7},(_,i)=>addD(s,i)).map(d=>{const i=dayInfo(d),fut=d>t,z=pd(d),nz=[...new Set(i.a.map(w=>w.name))];return`<button class="gcd${i.n?' has':''}${fut?' fut':''}${d==t?' tod':''}${cs==d?' sel':''}" onclick="G.sd('${d}')" aria-label="${fl(d)}"><span class=gdw>${DS[z.getDay()]}</span><b>${z.getDate()}</b>${i.n?`<span class=gcn>${i.n>1?i.n+' sessões':'1 sessão'}</span><span class=gcl>${nz.map(esc).join(' · ')}</span>${i.sec?`<span class=s>${fdu(i.sec)}</span>`:''}`:`<span class=s>${fut?'':'Sem treino'}</span>`}</button>`}).join('')}</div>`}};
const calM=(a,t)=>{const y=+a.slice(0,4),m=+a.slice(5,7)-1,s=ymd(new Date(y,m,1)),e=ymd(new Date(y,m+1,0)),nd=new Date(y,m+1,0).getDate(),r=range(s,e),el=t<s?0:t>e?nd:+t.slice(8,10),av=el>=14?(r.n/(el/7)).toLocaleString('pt-BR',{maximumFractionDigits:1}):'—',off=(new Date(y,m,1).getDay()-W0+7)%7;
return{lab:MES[m]+' '+y,st:[[r.d,'dias treinados'],[r.n,'sessões'],[fdu(r.sec),'tempo total'],[av,av=='—'?'média por semana (poucos dias)':'sessões por semana']],h:`<div class=gmg>${hd().map(d=>`<span class=h>${d}</span>`).join('')}${'<span></span>'.repeat(off)}${Array.from({length:nd},(_,i)=>ymd(new Date(y,m,i+1))).map(d=>{const i=dayInfo(d);return`<button class="gmd${i.n?' has':''}${d>t?' fut':''}${d==t?' tod':''}${cs==d?' sel':''}" onclick="G.sd('${d}')" aria-label="${fl(d)}${i.n?', '+i.n+' sessão(ões)':''}">${+d.slice(8)}${i.n?`<i class=dot></i>${i.n>1?`<small>${i.n}×</small>`:''}`:''}</button>`}).join('')}</div>`}};
const calY=(a,t)=>{const y=+a.slice(0,4),r=range(y+'-01-01',y+'-12-31'),ms=Array.from({length:12},(_,m)=>{const s=ymd(new Date(y,m,1)),e=ymd(new Date(y,m+1,0)),nd=new Date(y,m+1,0).getDate(),el=t<s?0:t>e?nd:+t.slice(8,10),rr=range(s,e);return{m,s,nd,rr,el,pc:el?rr.d/el:0}}),best=ms.filter(x=>x.rr.d>0).sort((p,q)=>q.pc-p.pc||q.rr.d-p.rr.d)[0];
return{lab:''+y,st:[[r.d,'dias treinados'],[r.n,'sessões'],[fdu(r.sec),'tempo total'],[best?MES[best.m]:'—','mês mais consistente']],h:`<div class=gyr>${ms.map(x=>{const off=(new Date(y,x.m,1).getDay()-W0+7)%7;return`<div class="gym${best&&best.m==x.m?' best':''}"><div class=sh><b>${MES[x.m]}</b><span class=s>${x.rr.d} dia${x.rr.d==1?'':'s'}${x.el?' · '+Math.round(x.pc*100)+'%':''}</span></div><div class=gyg>${'<span></span>'.repeat(off)}${Array.from({length:x.nd},(_,i)=>ymd(new Date(y,x.m,i+1))).map(d=>{const i=dayInfo(d),z=pd(d);return`<button class="gyd l${lvl(i)}${d>t?' fut':''}${d==t?' tod':''}${cs==d?' sel':''}" title="${z.getDate()} ${MS[z.getMonth()]}${i.n?' · '+i.n+(i.n>1?' sessões':' sessão')+(i.sec?' · '+fdu(i.sec):''):d>t?'':' · sem treino'}" aria-label="${fl(d)}" onclick="G.sd('${d}')"></button>`}).join('')}</div></div>`}).join('')}</div>`,lg:`<div class=lg style="align-items:center"><span>Menos</span><i class="gyd l0"></i><i class="gyd l1"></i><i class="gyd l2"></i><i class="gyd l3"></i><i class="gyd l4"></i><span>Mais</span><span style="margin-left:8px">Intensidade = tempo treinado no dia (menos de 30 min, 30–59, 60–89, 90+). O mês mais consistente é o de maior % de dias treinados entre os dias já transcorridos.</span></div>`}};
const detail=()=>{if(!cs)return`<p class=s style="margin:0">Toque em um dia para ver as sessões registradas.</p>`;const i=dayInfo(cs),h=`<div class=sh><b>${fl(cs)}</b><span class=s>${i.n?i.n+(i.n>1?' sessões':' sessão')+(i.sec?' · '+fdu(i.sec):''):''}</span></div>`;
if(!i.n)return h+`<p class=s style="margin:4px 0 0">${cs>TD()?'Dia futuro: ainda sem registros.':'Nenhum treino concluído registrado neste dia.'}</p>`;
return h+i.a.map(w=>`<div class=gse><div class=sh><b>${esc(w.name)}</b><span class=s>${+w.sec?fdu(w.sec):'sem duração'}</span></div>${w.ex.filter(e=>e.sets.length).map(e=>`<div class=s>${esc(e.n)}: ${sets(e.sets)}</div>`).join('')}</div>`).join('')};
const cal=()=>{const t=TD(),a=ca||t,V=cv=='w'?calW(a,t):cv=='m'?calM(a,t):calY(a,t);
return`<div class=gch><h2 style="margin:0">Calendário de treinos</h2><div class=gsg role=tablist>${[['w','Semanal'],['m','Mensal'],['y','Anual']].map(k=>`<button class="${cv==k[0]?'on':''}" role=tab aria-selected=${cv==k[0]} onclick="G.cv('${k[0]}')">${k[1]}</button>`).join('')}</div></div>
<div class=gcnv><button class="b g sm" aria-label="Anterior" onclick="G.cn(-1)">‹</button><b>${V.lab}</b><button class="b g sm" aria-label="Próximo" onclick="G.cn(1)">›</button><button class="b g sm" onclick="G.ch()">Hoje</button></div>
${ses().L.length?'':`<p class=s style="margin:0 0 10px">Nenhum treino concluído ainda. Ao finalizar um treino ele aparece aqui.</p>`}
<div class=gst>${V.st.map(x=>`<div><b>${x[0]}</b><span>${x[1]}</span></div>`).join('')}</div><div class=gcv>${V.h}</div>${V.lg||''}<div class=gdt>${detail()}</div>`};

/* ====== INÍCIO (simples) ====== */
const wkStrip=()=>{const t=TD(),s=wkS(t);return`<div class=gwk>${Array.from({length:7},(_,i)=>{const d=addD(s,i),n=dayInfo(d).n;return`<div class="gwd${n?' on':''}${d==t?' tod':''}"><span>${DS[pd(d).getDay()][0]}</span><i></i></div>`}).join('')}</div>`};
const ini=()=>{const t=TD(),h=new Date().getHours(),lw=ses().L.at(-1),ws=wkS(t),rw=range(ws,addD(ws,6));
return`<div class=ph><div><h1>${h<12?'Bom dia':h<18?'Boa tarde':'Boa noite'}${S.name?', '+esc(S.name):''}</h1><div class=sub>${fl(t)}</div></div></div>${rec()}
<div class="c mt"><div class=sh><b>Esta semana</b><span class=s>${rw.n} treino${rw.n==1?'':'s'} · ${fdu(rw.sec)}</span></div>${wkStrip()}</div>
${lw?`<p class="s mt" style="text-align:center">Último treino: ${esc(lw.name)} · ${fdt(lw.date)}${+lw.sec?' · '+fdu(lw.sec):''}</p>`:''}`};

/* ====== TREINOS ====== */
const D=(n,s)=>[n,s.split(';').map(x=>{const m=x.trim().match(/^(.*) (\d+)x(\d+)$/);return{n:m[1],s:+m[2],r:+m[3]}})];
const TPL=[
{t:'Full Body',f:'3 dias/sem',tg:['Iniciante','Academia'],d:'Corpo inteiro em cada treino. Ótimo para começar ou treinar pouco.',days:[D('A','Agachamento livre 3x10;Supino reto 3x10;Remada baixa 3x10;Desenvolvimento com halteres 3x10;Abdominal 3x15'),D('B','Leg press 3x12;Supino inclinado 3x10;Puxada frontal 3x10;Elevação lateral 3x12;Rosca direta 3x12'),D('C','Levantamento terra 3x8;Flexão de braço 3x10;Remada curvada 3x10;Afundo 3x10;Tríceps corda 3x12')]},
{t:'Superior/Inferior',f:'4 dias/sem',tg:['Intermediário','Academia'],d:'Alterna parte de cima e de baixo do corpo.',days:[D('Superior A','Supino reto 4x8;Remada curvada 4x8;Desenvolvimento com halteres 3x10;Rosca direta 3x10;Tríceps testa 3x10'),D('Inferior A','Agachamento livre 4x8;Stiff 3x10;Leg press 3x12;Mesa flexora 3x12;Panturrilha em pé 4x15'),D('Superior B','Supino inclinado 4x10;Puxada frontal 4x10;Elevação lateral 3x15;Rosca martelo 3x12;Tríceps corda 3x12'),D('Inferior B','Levantamento terra 4x6;Afundo 3x10;Cadeira extensora 3x12;Hip thrust 3x10;Panturrilha sentado 4x15')]},
{t:'ABC Clássico',f:'3 dias/sem',tg:['Intermediário','Academia'],d:'Três treinos divididos por grupos musculares.',days:[D('A · Peito e Tríceps','Supino reto 4x8;Supino inclinado 3x10;Crucifixo 3x12;Tríceps testa 3x10;Tríceps corda 3x12'),D('B · Costas e Bíceps','Puxada frontal 4x10;Remada curvada 4x8;Remada baixa 3x10;Rosca direta 3x10;Rosca martelo 3x12'),D('C · Pernas e Ombros','Agachamento livre 4x8;Leg press 3x12;Mesa flexora 3x12;Desenvolvimento com halteres 3x10;Elevação lateral 3x15')]},
{t:'ABCD',f:'4 dias/sem',tg:['Intermediário','Academia'],d:'Quatro dias com mais volume por grupo muscular.',days:[D('A · Peito','Supino reto 4x8;Supino inclinado 4x10;Crucifixo 3x12;Flexão de braço 3x15'),D('B · Costas','Barra fixa 4x8;Remada curvada 4x8;Puxada frontal 3x10;Remada baixa 3x12'),D('C · Pernas','Agachamento livre 4x8;Leg press 4x12;Cadeira extensora 3x12;Mesa flexora 3x12;Panturrilha em pé 4x15'),D('D · Ombros e Braços','Desenvolvimento com halteres 4x10;Elevação lateral 4x15;Rosca direta 3x10;Tríceps corda 3x12;Rosca martelo 3x12')]},
{t:'ABCDE',f:'5 dias/sem',tg:['Avançado','Academia'],d:'Um foco por dia, alto volume.',days:[D('A · Peito','Supino reto 5x8;Supino inclinado 4x10;Crucifixo 3x12;Crossover 3x15'),D('B · Costas','Barra fixa 4x8;Remada curvada 4x8;Puxada frontal 4x10;Remada baixa 3x12;Encolhimento 3x12'),D('C · Pernas','Agachamento livre 5x8;Leg press 4x12;Cadeira extensora 4x12;Afundo 3x10;Panturrilha em pé 4x15'),D('D · Ombros','Desenvolvimento com halteres 4x10;Elevação lateral 4x15;Elevação frontal 3x12;Face pull 3x15'),D('E · Braços e Abdômen','Rosca direta 4x10;Tríceps testa 4x10;Rosca martelo 3x12;Tríceps corda 3x12;Abdominal 4x20')]},
{t:'Push/Pull/Legs',f:'3 ou 6 dias/sem',tg:['Intermediário','Academia'],d:'Empurrar, puxar e pernas. Repita o ciclo para 6 dias.',days:[D('Push','Supino reto 4x8;Desenvolvimento com halteres 3x10;Supino inclinado 3x10;Elevação lateral 3x15;Tríceps corda 3x12'),D('Pull','Barra fixa 4x8;Remada curvada 4x8;Puxada frontal 3x10;Face pull 3x15;Rosca direta 3x10'),D('Legs','Agachamento livre 4x8;Stiff 3x10;Leg press 3x12;Mesa flexora 3x12;Panturrilha em pé 4x15')]},
{t:'Glúteos e Pernas',f:'3 dias/sem',tg:['Intermediário','Academia'],d:'Ênfase em glúteos, posteriores e quadríceps.',days:[D('A · Glúteos','Hip thrust 4x10;Elevação pélvica 3x12;Cadeira abdutora 3x15;Coice na polia 3x12;Afundo 3x10'),D('B · Posterior e Quadríceps','Stiff 4x10;Mesa flexora 3x12;Agachamento búlgaro 3x10;Leg press 3x12;Panturrilha em pé 4x15'),D('C · Glúteos e Core','Agachamento livre 4x10;Hip thrust 4x10;Passada 3x12;Abdominal infra 3x15')]},
{t:'Em Casa sem Equipamento',f:'3 dias/sem',tg:['Iniciante','Casa'],d:'Só o peso do corpo.',days:[D('A · Corpo inteiro','Agachamento livre 3x15;Flexão de braço 3x10;Afundo 3x12;Ponte de glúteo 3x15;Abdominal 3x20'),D('B · Superior e Core','Flexão de braço 4x10;Mergulho no banco 3x12;Abdominal bicicleta 3x20;Elevação de pernas 3x12'),D('C · Pernas e Glúteos','Agachamento búlgaro 3x10;Passada 3x12;Ponte de glúteo 4x15;Elevação de panturrilha 4x20')]},
{t:'Em Casa com Halteres',f:'2 a 3 dias/sem',tg:['Intermediário','Casa'],d:'Halteres e, se tiver, elástico.',days:[D('A · Superior','Supino com halteres 4x10;Remada unilateral 4x10;Desenvolvimento com halteres 3x10;Rosca direta 3x12;Tríceps francês 3x12'),D('B · Inferior','Agachamento livre 4x12;Stiff 3x12;Afundo 3x10;Hip thrust 3x12;Elevação de panturrilha 4x20')]},
{t:'Core e Abdômen (20 min)',f:'2 a 4 dias/sem',tg:['Iniciante','Casa','Academia'],d:'Treino curto de abdômen e lombar. Na prancha, as repetições são segundos.',days:[D('Core','Abdominal 3x20;Elevação de pernas 3x15;Prancha 3x30;Abdominal bicicleta 3x20;Hiperextensão lombar 3x12')]},
{t:'Braços e Ombros',f:'2 dias/sem',tg:['Intermediário','Academia'],d:'Complemento de volume para braços e ombros.',days:[D('A · Bíceps e Ombros','Rosca direta 4x10;Rosca martelo 3x12;Desenvolvimento com halteres 4x10;Elevação lateral 4x15;Encolhimento 3x12'),D('B · Tríceps e Ombros','Tríceps testa 4x10;Tríceps corda 3x12;Mergulho nas paralelas 3x10;Face pull 4x15;Elevação lateral 3x15')]},
{t:'Costas e Postura',f:'2 dias/sem',tg:['Iniciante','Academia'],d:'Fortalece costas, lombar e abdômen.',days:[D('Costas e Core','Puxada frontal 3x12;Remada baixa 3x12;Face pull 3x15;Hiperextensão lombar 3x12;Abdominal 3x15')]},
{t:'Corpo Inteiro 30 min',f:'2 a 3 dias/sem',tg:['Iniciante','Academia'],d:'Circuito rápido para dias corridos.',days:[D('Circuito','Agachamento livre 3x12;Flexão de braço 3x10;Remada curvada 3x10;Afundo 2x10;Abdominal 3x15')]},
{t:'Força 5x5',f:'3 dias/sem',tg:['Avançado','Academia'],d:'Poucos exercícios pesados, alternando A e B.',days:[D('A','Agachamento livre 5x5;Supino reto 5x5;Remada curvada 5x5'),D('B','Agachamento livre 5x5;Desenvolvimento militar 5x5;Levantamento terra 1x5')]}];
const nmP=(x,d)=>x.t+' · '+d[0],hasP=n=>S.plans.some(p=>p.name==n);
const FIL=['Todos','Iniciante','Intermediário','Avançado','Academia','Casa'];
const lib=()=>`<h2 class=mt style="margin-bottom:10px">Modelos de treino</h2><div class="row chips">${FIL.map(f=>`<span class="ch ${(tq||'Todos')==f?'on':''}" onclick="G.tg('${f=='Todos'?'':f}')">${f}</span>`).join('')}</div><div class=g2>${TPL.filter(x=>!tq||x.tg.includes(tq)).map(x=>{const i=TPL.indexOf(x);return`<div class=c><div class=sh><b class=f>${x.t}</b><span class=bd>${x.f}</span></div><p class=s>${x.d}</p><div class=row style="margin:8px 0">${x.tg.map(t=>`<span class=gtg>${t}</span>`).join('')}</div>${x.days.map((d,j)=>`<div class=r><div class=f><b>${d[0]}</b><div class=s>${d[1].map(e=>e.n+' '+e.s+'×'+e.r).join(' · ')}</div></div>${hasP(nmP(x,d))?'<span class=s>Adicionada</span>':`<button class="b g sm" aria-label="Adicionar ${esc(d[0])}" onclick="G.ad(${i},${j})">${UI.i('plus')}</button>`}</div>`).join('')}<button class="b mt" onclick="G.ad(${i},-1)">Adicionar semana inteira</button></div>`}).join('')}</div>`;
const pdet=()=>{const p=S.plans.find(x=>x.id==tp);if(!p){tp='';return trn()}
return`<button class="b g sm" onclick="G.pt('')">‹ Treinos</button><div class="c mt"><label>Nome da ficha<input value="${esc(p.name)}" onchange="G.pr('${p.id}',this.value)"></label>${gtags(p)?`<div class=row style="margin:8px 0">${gtags(p)}</div>`:''}<div class=s>${p.ex.length} exercício${p.ex.length==1?'':'s'} · ~${est(p)} min</div>
${p.ex.map((e,i)=>`<div class=pe><div class=sh><b class=f>${i+1}. ${esc(e.n)}</b><span class=row><button class="b g sm" aria-label="Subir" ${i?'':'disabled'} onclick="G.pm('${p.id}',${i},-1)">↑</button><button class="b g sm" aria-label="Descer" ${i<p.ex.length-1?'':'disabled'} onclick="G.pm('${p.id}',${i},1)">↓</button><button class="b g sm" aria-label="Remover" onclick="G.px('${p.id}',${i})">${UI.i('x')}</button></span></div><div class="row pf"><label>Séries<input type=number min=1 value=${e.s} onchange="G.pf('${p.id}',${i},'s',this.value)"></label><label>Reps<input type=number min=1 value=${e.r} onchange="G.pf('${p.id}',${i},'r',this.value)"></label><label>Carga (kg)<input type=number min=0 step=.5 value="${e.l||''}" placeholder="—" onchange="G.pf('${p.id}',${i},'l',this.value)"></label><label>Descanso (s)<input type=number min=0 value="${e.rt||''}" placeholder="${S.rest}" onchange="G.pf('${p.id}',${i},'rt',this.value)"></label></div></div>`).join('')||'<p class=s>Ficha sem exercícios.</p>'}
<div class="row mt"><input id=pa list=pal placeholder="Adicionar exercício da biblioteca" style="flex:1;min-width:180px"><datalist id=pal>${lx().map(x=>`<option value="${esc(x.n)}">`).join('')}</datalist><button class="b sm" onclick="G.pa('${p.id}')">${UI.i('plus')}Adicionar</button></div></div>
<div class="row mt"><button class=b onclick="A.ws('${p.id}')">${UI.i('play')}Iniciar treino</button><button class="b g" onclick="A.pe('${p.id}')">${UI.i('edit')}Editor da ficha</button><button class="b g" onclick="G.pd('${p.id}')">Duplicar</button><button class="b g" onclick="G.pdl('${p.id}')">Excluir</button></div>`};
const trn=()=>{if(tp)return pdet();return`${UI.h('Treinos',UI.pb('A.pn()','Ficha'))}<div class=g2>${S.plans.map(p=>`<div class=c><div class=sh><b class=f>${esc(p.name)}</b><span class=s>${p.ex.length} ex.</span></div>${gtags(p)?`<div class=row>${gtags(p)}</div>`:''}<div class="row mt"><button class="b sm" onclick="A.ws('${p.id}')">${UI.i('play')}Começar</button><button class="b g sm" onclick="G.pt('${p.id}')">Detalhes</button></div></div>`).join('')||UI.em('dumbbell','Crie sua primeira ficha ou escolha um modelo abaixo.')}</div>${lib()}`};

/* ====== EXERCÍCIOS ====== */
const xrow=x=>{const l=last(x.n);return`<div class="r xr" role=button tabindex=0 onclick="G.xo('${enc(x.n)}')" onkeydown="if(event.key=='Enter')G.xo('${enc(x.n)}')"><div class=f><b>${esc(x.n)}</b>${isF(x.n)?' <span class=star>★</span>':''}<div class=s>${x.g?LB[x.g]:'Sem grupo'}${x.eq?' · '+EQ[x.eq]:''}${x.mv?' · '+MV[x.mv]:''}</div></div><span class=s>${l?fdt(l.date)+' · '+fw(top(l)):''}</span></div>`};
const xlist=()=>{const rc=rcn();let L=lx().filter(x=>nm(x.n).includes(nm(xq))&&(!xf||x.g==xf)&&(!xe||x.eq==xe)&&(!xm||x.mv==xm)&&(xv!='fav'||isF(x.n))&&(xv!='rec'||rc.includes(x.n)));if(xv=='rec')L.sort((a,b)=>rc.indexOf(a.n)-rc.indexOf(b.n));return`<p class=s style="margin:0 0 6px">${L.length} exercício${L.length==1?'':'s'}</p>`+(L.map(xrow).join('')||UI.em('search',xv=='fav'?'Você ainda não favoritou exercícios.':xv=='rec'?'Nenhum exercício usado em treinos concluídos.':'Nenhum exercício encontrado.'))};
const chips=(lst,cur,fn,all)=>`<div class="row chips"><span class="ch ${cur?'':'on'}" onclick="${fn}('')">${all}</span>${lst.map(k=>`<span class="ch ${cur==k[0]?'on':''}" onclick="${fn}('${k[0]}')">${k[1]}</span>`).join('')}</div>`;
const xform=()=>{const ed=xc==2,o=ed?(gy().custom||[]).find(c=>c.n==xe2)||{}:{},sec=o.sec||[];
return`<button class="b g sm" onclick="G.xb()">‹ ${ed?'Cancelar':'Exercícios'}</button><div class="c mt"><h2 style="margin:0 0 8px">${ed?'Editar exercício':'Novo exercício'}</h2>
<label>Nome<input id=fn value="${esc(o.n||'')}" ${ed?'disabled':''} placeholder="Ex.: Rosca Scott"></label>
<label>Grupo muscular principal<select id=fg><option value="">Escolher…</option>${EGR.map(g=>`<option value=${g} ${o.g==g?'selected':''}>${LB[g]}</option>`).join('')}</select></label>
<label>Equipamento<select id=fe>${Object.keys(EQ).map(k=>`<option value=${k} ${o.eq==k?'selected':''}>${EQ[k]}</option>`).join('')}</select></label>
<label>Tipo de movimento<select id=fm>${Object.keys(MV).map(k=>`<option value=${k} ${o.mv==k?'selected':''}>${MV[k]}</option>`).join('')}</select></label>
<div class=gsec>Músculos secundários</div><div class=row>${EGR.map(g=>`<label class=gck><input type=checkbox class=fsc value=${g} ${sec.includes(g)?'checked':''}>${LB[g]}</label>`).join('')}</div>
<label>Instruções de execução<textarea id=fi rows=4 style="width:100%">${esc(o.ins||'')}</textarea></label>
<div class="row mt"><button class=b onclick="G.xs()">${UI.i('check')}Salvar</button><button class="b g" onclick="G.xb()">Cancelar</button></div></div>`};
const xdet=()=>{const x=lx().find(z=>z.n==xd);if(!x){xd='';return exe()}
const l=last(x.n),h=hist(x.n).slice(-3).reverse(),pls=S.plans.filter(p=>p.ex.some(e=>e.n==x.n)),pe=pls.length?pls[0].ex.find(e=>e.n==x.n):null;
return`<button class="b g sm" onclick="G.xb()">‹ Exercícios</button><div class="c mt"><div class=sh><h2 style="margin:0">${esc(x.n)}</h2><button class="b g sm" onclick="G.fa('${enc(x.n)}')">${isF(x.n)?'★ Favorito':'☆ Favoritar'}</button></div>
<div class=row style="margin:8px 0">${x.g?`<span class=gtg>${LB[x.g]}</span>`:'<span class=gtg>Sem grupo</span>'}${x.eq?`<span class=gtg>${EQ[x.eq]}</span>`:''}${x.mv?`<span class=gtg>${MV[x.mv]}</span>`:''}${x.cus?'<span class=gtg>Personalizado</span>':''}</div>
<div class=gsec>Músculos secundários</div><p style="margin:0">${x.sec.length?x.sec.map(g=>LB[g]).filter(Boolean).join(', '):'<span class=s>Não informado.</span>'}</p>
<div class=gsec>Como executar</div><p style="margin:0">${x.ins?esc(x.ins):'<span class=s>Sem instruções cadastradas.</span>'}</p><p class=s style="margin:6px 0 0">Demonstração em imagem ou vídeo: não disponível neste app.</p>
<div class=gsec>Sua referência</div><div class=r><span class=f>Séries × repetições configuradas</span><span class=s>${pe?pe.s+'×'+pe.r+' ('+esc(pls[0].name)+')':'—'}</span></div><div class=r><span class=f>Última carga</span><span class=s>${l?fw(top(l))+' · '+fdt(l.date):'sem histórico'}</span></div>
${h.length?`<div class=gsec>Últimas sessões</div>${h.map(z=>`<div class=s>${fdt(z.date)}: ${sets(z.sets)}</div>`).join('')}`:''}
<div class=gsec>Ações</div>${S.plans.length?`<div class=row><select id=xpl>${S.plans.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select><button class="b sm" onclick="G.xa()">${UI.i('plus')}Adicionar à ficha</button></div>`:`<button class="b sm" onclick="A.pn()">${UI.i('plus')}Criar ficha</button>`}
<div class="row mt">${pls.length?`<button class=b onclick="A.ws('${pls[0].id}')">${UI.i('play')}Iniciar ficha ${esc(pls[0].name)}</button>`:'<span class=s>Adicione o exercício a uma ficha para iniciá-lo.</span>'}${x.cus?`<button class="b g" onclick="G.xe('${enc(x.n)}')">${UI.i('edit')}Editar</button><button class="b g" onclick="G.xdl('${enc(x.n)}')">Excluir</button>`:''}</div></div>`};
const exe=()=>{if(xc)return xform();if(xd)return xdet();
return`${UI.h('Exercícios',`<button class="b sm" onclick="G.xn()">${UI.i('plus')}Novo</button>`)}<div class=sb>${UI.i('search')}<input placeholder="Buscar exercício" value="${esc(xq)}" oninput="G.q(this.value)"></div>
<div class=gsec>Mostrar</div>${chips([['fav','Favoritos'],['rec','Recentes']],xv,'G.fw','Todos')}
<div class=gsec>Grupo muscular</div>${chips(EGR.map(g=>[g,LB[g]]),xf,'G.f','Todos')}
<div class=gsec>Equipamento</div>${chips(Object.keys(EQ).map(k=>[k,EQ[k]]),xe,'G.fe','Todos')}
<div class=gsec>Movimento</div>${chips(Object.keys(MV).map(k=>[k,MV[k]]),xm,'G.fm','Todos')}
<div class="c mt" id=xl>${xlist()}</div>`};

/* ====== PROGRESSO ====== */
function prs(){return names().map(n=>{const h=hist(n);if(!h.length)return null;let b=null;h.forEach(x=>x.sets.forEach(s=>{if(!b||+s.l>b.l)b={l:+s.l,r:s.r,date:x.date}}));return b&&b.l>0?{n,...b}:null}).filter(Boolean).sort((a,b)=>b.date.localeCompare(a.date))}
const vol=(g,a,b)=>ses().L.filter(w=>dd(w.date)>=a&&dd(w.date)<b).reduce((t,w)=>t+w.ex.filter(e=>grp(e.n)==g).reduce((u,e)=>u+e.sets.reduce((v,s)=>v+s.l*s.r,0),0),0);
const pers=()=>{const t=TD(),d=pd(t),ws=wkS(t),ms=t.slice(0,7)+'-01',ys=t.slice(0,4)+'-01-01',pws=addD(ws,-7),pm=ymd(new Date(d.getFullYear(),d.getMonth()-1,1)),pme=ymd(new Date(d.getFullYear(),d.getMonth(),0)),pys=(d.getFullYear()-1)+'-01-01',pe=addD(pm,dd(ms));
return[['Esta semana',ws,t,pws,addD(pws,dd(ws)),'da semana anterior'],['Este mês',ms,t,pm,pe<pme?pe:pme,'do mês anterior'],['Este ano',ys,t,pys,addD(pys,dd(ys)),'do ano anterior']]};
const gra=()=>{const ns=[...new Set(ses().L.flatMap(w=>w.ex.filter(e=>e.sets.length).map(e=>e.n)))],sel=ns.includes(px)?px:ns[0],ev=sel?hist(sel).map(h=>[h.date,cu(top(h))]):[],gs=Object.keys(LB).map(g=>[g,vol(g,0,7),vol(g,7,14)]).filter(x=>x[1]||x[2]),mx=Math.max(1,...gs.map(x=>Math.max(x[1],x[2]))),t=TD(),w0=wkS(t),wk=Array.from({length:8},(_,i)=>{const s=addD(w0,-7*(7-i));return{s,r:range(s,addD(s,6))}});
return`<div class=gst3>${pers().map(p=>{const c=range(p[1],p[2]),q=range(p[3],p[4]),dl=c.d-q.d;return`<div class=c><div class=s>${p[0]}</div><div><b style="font-size:26px">${c.d}</b> <span class=s>dia${c.d==1?'':'s'} treinado${c.d==1?'':'s'}</span></div><div class=s>${c.n} sessão(ões) · ${fdu(c.sec)}</div><div class="gdl ${dl>0?'up':dl<0?'dn':''}">${q.d||c.d?(dl>0?'+':'')+dl+' dia(s) vs. '+q.d+' no mesmo ponto '+p[5]:'Sem registros neste período nem no anterior'}</div></div>`}).join('')}</div>
<div class=g2 style="margin-top:12px"><div class=c>${UI.ct('Frequência semanal (8 semanas)')}${wk.map((x,i)=>`<div class=sj><div class=sh><b class=f>${fdt(x.s)}${i==7?' (atual)':''}</b><span class=s>${x.r.d} dia${x.r.d==1?'':'s'} · ${x.r.n} sessão(ões) · ${fdu(x.r.sec)}</span></div><div class=bar><i style="width:${x.r.d/7*100}%"></i></div></div>`).join('')}</div>
<div class=c>${UI.ct('Evolução de carga ('+cf().un+')')}${ns.length?`<select onchange="G.p(this.value)">${ns.map(n=>`<option${n==sel?' selected':''}>${esc(n)}</option>`).join('')}</select>${chart(ev.map(x=>x[1]),ev.map(x=>fdt(x[0])),1)}`:UI.em('chart','Aparece após o primeiro treino.')}</div>
<div class=c style="grid-column:1/-1">${UI.ct('Volume por grupo (últimos 7 dias vs. 7 anteriores)')}${gs.map(x=>`<div class=sj><div class=sh><b class=f>${LB[x[0]]}</b><span class=s>${fw(x[1])} vs ${fw(x[2])}${x[2]?' ('+(x[1]>=x[2]?'+':'')+Math.round((x[1]-x[2])/x[2]*100)+'%)':''}</span></div><div class=bar><i style="width:${x[1]/mx*100}%"></i></div></div>`).join('')||UI.em('chart','Sem treinos com grupo muscular reconhecido.')}</div></div>`};
const his=()=>{const L=ses().L.slice().reverse();return`<div class=g2><div class=c>${UI.ct('Recordes pessoais')}${prs().map(p=>`<div class=r><span class=f>${esc(p.n)}</span><b>${fw(p.l)} × ${p.r}</b><span class=s>${fdt(p.date)}</span></div>`).join('')||UI.em('target','Sem recordes ainda.')}</div>
<div class=c>${UI.ct('Histórico de sessões')}${L.slice(0,hl).map(w=>`<div class="r top"><div class=f><b>${esc(w.name)}</b> <span class=s>${fdt(w.date)} · ${fdu(w.sec)}</span>${w.ex.map(e=>`<div class=s>${esc(e.n)}: ${sets(e.sets)||'—'}</div>`).join('')}</div>${UI.ib(`A.wd('${w.id}')`,'x','Apagar treino')}</div>`).join('')||UI.em('clock','Nenhum treino registrado.')}${L.length>hl?`<button class="b g mt" onclick="G.hm()">Mostrar mais (${L.length-hl})</button>`:''}</div></div>`};
const pro=()=>{const b=pt=='cal'?`<div class=c id=cal>${cal()}</div>`:pt=='mus'?`<div class=gmm id=mm>${mm()}</div>`:pt=='gra'?gra():his();
return`${UI.h('Progresso')}<div class=gsg role=tablist style="margin-bottom:12px">${PT.map(k=>`<button class="${pt==k[0]?'on':''}" role=tab aria-selected=${pt==k[0]} onclick="G.ps('${k[0]}')">${k[1]}</button>`).join('')}</div>${b}`};

/* ====== CONFIGURAÇÕES (abre pela engrenagem) ======
   1) Navegação do Hub: rotas reais, lidas de PG (index.html + musica.js) em tempo de execução.
      Só aparece o que realmente existir como página. Corrida: aceita os ids 'cor', 'corrida' ou 'run'.
   2) Academia: aparência, unidade, descanso, cronômetro, preferências de treino, exercícios, sincronização. */
const ck=(k,t)=>`<label class=gck><input type=checkbox ${cf()[k]?'checked':''} onchange="G.ck('${k}',this.checked)">${t}</label>`;
const NAV=[['home','Início','Resumo geral do seu dia'],['est','Estudos','Sessões, matérias e questões'],['gym','Academia','Treinos, exercícios e progresso'],['tar','Tarefas','Lista de tarefas e prioridades'],['age','Agenda','Compromissos e calendário'],['hab','Hábitos','Rotinas e sequências diárias'],['pro','Projetos','Andamento e tarefas dos projetos'],['not','Notas','Anotações e ideias rápidas'],['sta','Estatísticas','Números e gráficos do Hub'],['mus','Música','Player, playlists e aparelhos'],['cor','Corrida','Corridas, ritmo e histórico',['corrida','run']],['cfg','Configurações gerais','Conta, dados e dispositivos']];
const hubNav=()=>{const pg=typeof PG!='undefined'?PG:[];return NAV.map(n=>{const id=[n[0],...(n[3]||[])].find(i=>pg.some(x=>x[0]==i)||P[i]);if(!id)return null;const p=pg.find(x=>x[0]==id);return{id,ic:p?p[1]:'🏃',n:n[1],d:n[2],me:id=='gym'}}).filter(Boolean)};
const nConn=()=>{try{return typeof SY!='undefined'&&SY._conns?Object.values(SY._conns()).filter(c=>c.open&&c.hid).length:0}catch(e){return 0}};
const cfgv=()=>{const c=cf(),un=names().filter(n=>!grp(n)),cus=gy().custom||[],nv=hubNav(),nc=nConn();
return`<div class=gsh style="margin-top:6px">Navegação do Hub</div>
<div class=c>${nv.map(x=>`<button class="gnv${x.me?' me':''}" onclick="G.nav('${esc(x.id)}')"><span class=ic>${esc(x.ic)}</span><span class=tx><b>${x.n}</b><small>${x.d}</small></span><span class=s>${x.me?'Você está aqui':'›'}</span></button>`).join('')||'<p class=s>Nenhuma área encontrada.</p>'}</div>
<div class=gsh>Academia</div>
<div class=g2 style="margin-top:0">
<div class=c>${UI.ct('Aparência e cores')}<div class=row>${Object.keys(PAL).map(k=>`<span class="ch ${c.pal==k?'on':''}" onclick="G.pal('${k}')"><i class=sw style="background:${PAL[k][2]}"></i>${PAL[k][0]}</span>`).join('')}</div><button class="b g sm mt" onclick="G.rv()">Restaurar visual padrão</button></div>
<div class=c>${UI.ct('Unidade de peso')}<div class=row>${['kg','lb'].map(u=>`<span class="ch ${c.un==u?'on':''}" onclick="G.un('${u}')">${u}</span>`).join('')}</div><p class=s style="margin:8px 0 0">Muda só a exibição das cargas. Os registros continuam salvos em kg.</p></div>
<div class=c>${UI.ct('Tempo padrão de descanso')}<label>Segundos<input type=number min=10 value=${S.rest} onchange="G.rs(this.value)"></label><div class=row>${[45,60,90,120,180].map(s=>`<span class="ch ${S.rest==s?'on':''}" onclick="G.rs(${s})">${s}s</span>`).join('')}</div></div>
<div class=c>${UI.ct('Cronômetro')}${ck('ar','Iniciar o descanso ao concluir a série')}${ck('sn','Som ao fim do descanso')}${ck('vb','Vibrar ao fim do descanso')}<button class="b g sm mt" onclick="A.nt()">${UI.i('bell')}Avisos de descanso</button></div>
<div class=c>${UI.ct('Preferências de treino')}<label>Treino recomendado no Início<select onchange="G.rc(this.value)"><option value=seq ${c.rec=='seq'?'selected':''}>Próxima ficha na sequência</option>${S.plans.map(p=>`<option value="${p.id}" ${c.rec==p.id?'selected':''}>Sempre: ${esc(p.name)}</option>`).join('')}</select></label></div>
<div class=c>${UI.ct('Sincronização entre dispositivos')}<div class=r><span class=f>Conexão</span><b style="color:${navigator.onLine?'var(--ok)':'var(--wn)'}">${navigator.onLine?'Online':'Offline'}</b></div><div class=r><span class=f>Aparelhos conectados agora</span><b>${nc}</b></div><p class=s style="margin:8px 0 0">${navigator.onLine?'Fichas, treinos, favoritos, exercícios e preferências da Academia seguem a mesma sincronização do Hub.':'Sem conexão: as alterações ficam neste aparelho e sincronizam quando ele reconectar.'}</p></div>
</div>
<div class=gsh>Exercícios</div>
<div class=g2 style="margin-top:0">
<div class=c>${UI.ct('Exercícios personalizados')}${cus.map(x=>`<div class=r><span class=f>${esc(x.n)}<div class=s>${LB[x.g]||''}${x.eq?' · '+EQ[x.eq]:''}</div></span><button class="b g sm" aria-label="Editar" onclick="G.xe('${enc(x.n)}')">${UI.i('edit')}</button><button class="b g sm" aria-label="Excluir" onclick="G.xdl('${enc(x.n)}')">${UI.i('x')}</button></div>`).join('')||'<p class=s>Nenhum exercício personalizado.</p>'}<button class="b sm mt" onclick="G.xn()">${UI.i('plus')}Novo exercício</button></div>
<div class=c>${UI.ct('Exercícios sem grupo muscular')}${un.map((n,i)=>`<label>${esc(n)}<select onchange="G.as(${i},this.value)"><option value="">Escolher grupo…</option>${EGR.map(g=>`<option value=${g}>${LB[g]}</option>`).join('')}</select></label>`).join('')||'<p class=s>Todos os seus exercícios têm grupo associado.</p>'}</div>
</div>`};

/* ====== TREINO ATIVO (fluxo existente, sem a navegação da Academia) ====== */
const act=()=>{const a=S.active;return`<div class="gy act">${UI.h(esc(a.name),`<button class="b g sm" onclick="A.nt()">${UI.i('bell')}Avisos</button>`)}<div class=rest>${UI.i('clock')}<span id=rs>Descanso: pronto</span></div><div class=g2>${a.ex.map((e,i)=>{const L=last(e.n);return`<div class=c>${UI.ct(esc(e.n)+` <span class=s>${e.s}×${e.r}</span>`)}<p class="s lh">${L?'Última sessão ('+fdt(L.date)+'): '+sets(L.sets):'Sem sessão anterior.'}</p>${e.sets.map((x,j)=>{const p=L&&L.sets[j],df=p?x.l-p.l:null;return`<div class=r><span class=f>Série ${j+1}</span><span>${fw(x.l)} × ${x.r} reps</span>${df==null?'':`<span class=s style="color:${df>0?'var(--ok)':df<0?'var(--er)':''}">${df>0?'+':''}${cu(df)} ${cf().un}</span>`}</div>`}).join('')}<div class="row mt"><input id=l${i} type=number placeholder="${L&&L.sets[e.sets.length]?L.sets[e.sets.length].l+' kg':'kg'}" class=in-s><input id=r${i} type=number placeholder="reps" value=${e.r} class=in-s><button class="b sm" onclick="A.gs(${i})">${UI.i('check')}Concluir série</button></div></div>`}).join('')}</div><div class="row mt"><button class=b onclick="A.wf()">Finalizar treino</button><button class="b g" onclick="A.wc()">Cancelar</button></div></div>`};

const V={ini,trn,exe,pro,set:cfgv};
const GEAR='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>';
const BACK='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>';
/* Sem botão "Voltar ao Hub". Topo: título + engrenagem. Dentro das configurações: seta (volta para a Academia) + título. */
P.gym=()=>{C=null;if(S.active)return act();const c=fx?' fx':'',st=gt=='set';fx=0;
return`<div class="gy${c}"><div class=gtop>${st?`<button class=gear onclick="G.cb()" aria-label="Voltar para a Academia" title="Academia">${BACK}</button><b>Configurações</b>`:`<b>Academia</b><span style="flex:1"></span><button class=gear onclick="G.set()" aria-label="Configurações" title="Configurações">${GEAR}</button>`}</div>${st?'':`<div class=gn role=tablist>${TABS.map(t=>`<button class="${gt==t[0]?'on':''}" role=tab aria-selected=${gt==t[0]} onclick="G.t('${t[0]}')" aria-label="${t[3]}">${UI.i(t[1])}<span>${t[2]}</span></button>`).join('')}</div>`}${V[gt]()}<div class=gsp></div></div>`};

const plan=id=>S.plans.find(p=>p.id==id);
window.G={
t(x){gt=x;xd='';xc=0;tp='';fx=1;render();scrollTo(0,0)},
set(){if(gt!='set')gp=gt;gt='set';xd='';xc=0;tp='';fx=1;render();scrollTo(0,0)},
cb(){gt=gp&&gp!='set'?gp:'ini';fx=1;render();scrollTo(0,0)},
nav(id){if(id=='gym')return G.cb();gt=gp&&gp!='set'?gp:'ini';go(id)},
v(x){gv=x;C=null;upd('mm',mm)},m(g){gm=gm==g?null:g;C=null;upd('mm',mm)},ps(k){pt=k;fx=1;render()},
q(v){xq=v;C=null;$('#xl').innerHTML=xlist()},f(g){xf=g;render()},fe(v){xe=v;render()},fm(v){xm=v;render()},fw(v){xv=v;render()},p(v){px=v;render()},
xo(e){xd=decodeURIComponent(e);xc=0;fx=1;render();scrollTo(0,0)},xb(){xd='';xc=0;fx=1;render()},xn(){gt='exe';xd='';xc=1;xe2='';fx=1;render();scrollTo(0,0)},
xe(e){gt='exe';xe2=decodeURIComponent(e);xc=2;fx=1;render();scrollTo(0,0)},
xs(){const n=($('#fn').value||'').trim(),g=$('#fg').value;if(!n)return toast('Informe o nome do exercício');if(!g)return toast('Escolha o grupo principal');const k=nm(n),ed=xc==2,cl=(gy().custom||[]).slice();if(!ed&&(LIBM.has(k)||cl.some(c=>nm(c.n)==k)))return toast('Já existe um exercício com esse nome');
const o={n:ed?xe2:n,g,sec:[...document.querySelectorAll('.fsc:checked')].map(c=>c.value).filter(v=>v!=g),eq:$('#fe').value,mv:$('#fm').value,ins:($('#fi').value||'').trim()},i=cl.findIndex(c=>c.n==o.n);i>=0?cl[i]=o:cl.push(o);setG({custom:cl});xc=0;xd=o.n;C=null;RD();toast('Exercício salvo')},
xdl(e){const n=decodeURIComponent(e);if(!confirm('Excluir o exercício personalizado "'+n+'"? Fichas e histórico que o usam são mantidos.'))return;setG({custom:(gy().custom||[]).filter(c=>c.n!=n),fav:fav().filter(x=>x!=n)});xd='';xc=0;RD()},
fa(e){const n=decodeURIComponent(e);setG({fav:isF(n)?fav().filter(x=>x!=n):[...fav(),n]});RD()},
xa(){const p=plan($('#xpl').value),n=xd;if(!p||!n)return;if(p.ex.some(e=>e.n==n))return toast('Já está nesta ficha');p.ex.push({n,s:3,r:10});RD();toast('Adicionado a '+p.name)},
tg(x){tq=x;render()},ad(a,b){const x=TPL[a],ds=b<0?x.days:[x.days[b]];let n=0;ds.forEach(d=>{const nme=nmP(x,d);if(hasP(nme))return;S.plans.push({id:uid(),name:nme,ex:d[1].map(e=>({...e}))});n++});toast(n?n+' ficha(s) adicionada(s) em Treinos':'Já estavam nas suas fichas');RD()},
pt(id){tp=id;fx=1;render();scrollTo(0,0)},pr(id,v){const p=plan(id);if(p&&v.trim()){p.name=v.trim();RD()}},
pm(id,i,d){const p=plan(id),j=i+d;if(!p||j<0||j>=p.ex.length)return;[p.ex[i],p.ex[j]]=[p.ex[j],p.ex[i]];RD()},px(id,i){const p=plan(id);if(!p)return;p.ex.splice(i,1);RD()},
pf(id,i,k,v){const p=plan(id),e=p&&p.ex[i];if(!e)return;v=+v;if(k=='s'||k=='r')e[k]=Math.max(1,Math.round(v)||e[k]);else if(v>0)e[k]=v;else delete e[k];RD()},
pa(id){const p=plan(id),n=($('#pa').value||'').trim(),x=lx().find(z=>nm(z.n)==nm(n));if(!p)return;if(!x)return toast('Escolha um exercício da biblioteca ou cadastre em Exercícios');p.ex.push({n:x.n,s:3,r:10});RD()},
pd(id){const p=plan(id);if(!p)return;const c=JSON.parse(JSON.stringify(p));c.id=uid();c.name=p.name+' (cópia)';S.plans.push(c);tp=c.id;RD();toast('Ficha duplicada')},
pdl(id){const p=plan(id);if(!p||!confirm('Excluir a ficha "'+p.name+'"? O histórico de treinos é mantido.'))return;S.plans=S.plans.filter(x=>x.id!=id);tp='';RD()},
as(i,v){const n=names().filter(n=>!grp(n))[i];if(!n||!v)return;setG({map:Object.assign({},gmap(),{[n]:v})});RD()},
go(){C=null;const p=planNext();p?A.ws(p.id):G.t('trn')},hm(){hl+=40;render()},
cv(k){cv=k;cs='';C=null;upd('cal',cal)},ch(){ca='';cs=TD();C=null;upd('cal',cal)},sd(d){cs=cs==d?'':d;C=null;upd('cal',cal)},
cn(n){const a=ca||TD(),y=+a.slice(0,4),m=+a.slice(5,7)-1;ca=cv=='w'?addD(a,7*n):cv=='m'?ymd(new Date(y,m+n,1)):(y+n)+'-01-01';cs='';C=null;upd('cal',cal)},
pal(k){setC({pal:k});RD()},un(u){setC({un:u});RD()},ck(k,v){setC({[k]:v?1:0});RD()},rc(v){setC({rec:v});RD()},rs(v){S.rest=Math.max(10,+v||90);sv();render()},
rv(){setC({pal:DEF.pal});RD();toast('Visual padrão restaurado')}};

/* ---- Modo aplicativo (mesmo conceito da Música: body.mu-full) ----
   Enquanto a Academia estiver na tela: menu geral do Hub escondido, tema da Academia aplicado.
   Seletores reais do index.html: <nav id=nv> (menu lateral/inferior) e <main id=mn>. */
const _rd=render;
window.render=function(){document.body.classList.toggle('gym-hub',typeof page!='undefined'&&page=='gym');_rd()};
let sk='',raf=0;
const syncApp=()=>{const on=!!document.querySelector('.gy'),c=cf(),b=document.body,k=on+'|'+c.pal;if(k==sk)return;sk=k;b.classList.toggle('gym-on',on);b.classList.toggle('gym-hub',on);const p=PAL[c.pal]||PAL.vermelho,v=Object.assign({},BASE,{'--ac':p[2],'--acr':p[1],'--gon':p[3],'--acl':p[4],'--acd':p[5]});Object.keys(v).forEach(x=>on?b.style.setProperty(x,v[x]):b.style.removeProperty(x));const m=document.querySelector('meta[name=theme-color]');if(m)m.content=on?BASE['--bg']:'#0B0F14'};
new MutationObserver(()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(syncApp)}).observe(document.body,{childList:true,subtree:true});syncApp();

const st=document.createElement('style');st.textContent=`
body.gym-on{background:var(--bg)!important;color:var(--tx)}
body.gym-hub nav{display:none!important}
body.gym-hub main{margin-left:0!important}
.gy{--gu:#26262B;--g1:var(--ac);--gs:#18181B;--gl:#3A3A41;--gb:var(--bd);color:var(--tx)}
.gy .c{background:var(--gc);border-color:var(--bd)}
.gy .b:not(.g){background:var(--ac);color:var(--gon);border-color:var(--ac)}.gy .b:not(.g):active{background:var(--acd)}.gy .b.g{background:transparent;color:var(--tx);border:1px solid var(--bd)}.gy .b:disabled{opacity:.4}
.gy .b.big2{background:linear-gradient(135deg,var(--acl),var(--ac) 55%,var(--acd));border-color:var(--ac);box-shadow:0 6px 20px rgba(var(--acr),.35)}
.gy .ch{border:1px solid var(--bd)}.gy .ch.on{background:var(--ac);color:var(--gon);border-color:var(--ac)}
.gy input,.gy select,.gy textarea{background:var(--bg);color:var(--tx);border:1px solid var(--bd);border-radius:8px;padding:8px}
.gy input:focus,.gy select:focus,.gy textarea:focus{outline:0;border-color:var(--ac);box-shadow:0 0 0 2px rgba(var(--acr),.25)}
.gy input[type=checkbox],.gy input[type=range]{accent-color:var(--ac)}
.gy .bar{background:var(--bd)}.gy .bar i{background:var(--ac)}
.gy.fx>:not(.gn):not(.gtop){animation:gfade .22s ease both}@keyframes gfade{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
.gy .ph{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:12px}
.gtop{display:flex;align-items:center;gap:10px;margin-bottom:6px}.gtop b{font-size:14px;color:var(--t2);letter-spacing:.04em;text-transform:uppercase}
.gear{display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;border:0;border-radius:50%;background:transparent;color:var(--t2);cursor:pointer;transition:background .15s,color .15s}.gear svg{width:22px;height:22px;fill:currentColor}.gear:hover{background:var(--hv);color:var(--tx)}.gear:focus-visible{outline:2px solid var(--ac);outline-offset:2px}
.gsh{font-size:18px;font-weight:700;margin:24px 0 10px;padding-left:10px;border-left:3px solid var(--ac)}
.gnv{display:flex;align-items:center;gap:12px;width:100%;padding:10px 8px;border:0;border-bottom:1px solid var(--bd);border-radius:8px;background:transparent;color:var(--tx);font:inherit;text-align:left;cursor:pointer;transition:background .15s}.gnv:last-child{border-bottom:0}.gnv:hover{background:var(--hv)}.gnv:focus-visible{outline:2px solid var(--ac);outline-offset:-2px}
.gnv .ic{width:40px;height:40px;display:flex;align-items:center;justify-content:center;font-size:20px;background:var(--bg2);border:1px solid var(--bd);border-radius:10px;flex:none}
.gnv .tx{flex:1;min-width:0;display:flex;flex-direction:column}.gnv .tx small{color:var(--t2);font-size:12.5px;line-height:1.35}.gnv.me .ic{border-color:var(--ac)}.gnv.me .s{color:var(--ac)}
.gst,.gst3{display:grid;gap:8px;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));margin:0 0 12px}.gst3{grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}
.gst>div{border:1px solid var(--gb);border-radius:10px;padding:10px 12px}.gst b{display:block;font-size:20px;line-height:1.25}.gst span{font-size:12px;color:var(--t2)}
.gmm{display:grid;gap:12px;max-width:980px}
@media(min-width:1000px){.gmm{grid-template-columns:minmax(0,5fr) minmax(0,6fr)}}
.gsec{font-size:12px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--t2);margin:14px 0 6px}
.gtg{display:inline-block;padding:2px 9px;border:1px solid var(--gb);border-radius:999px;font-size:12px;color:var(--t2)}
.gse{padding:6px 0;border-top:1px solid var(--gb)}.gse:first-of-type{border-top:0}
.big2{height:46px;font-size:16px}.hero{border-color:var(--ac)}.lh{margin:-4px 0 8px}.star{color:var(--ac)}
.gwk{display:flex;justify-content:space-between;gap:6px;margin-top:10px}.gwd{flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;font-size:12px;color:var(--t2)}.gwd i{width:100%;max-width:34px;aspect-ratio:1;border-radius:50%;border:1px solid var(--bd)}.gwd.on i{background:var(--ac);border-color:var(--ac)}.gwd.tod span{color:var(--tx);font-weight:700}.gwd.tod i{box-shadow:0 0 0 2px var(--bg),0 0 0 3px var(--t2)}
.xr{cursor:pointer}.xr:hover{background:var(--hv)}
.pe{padding:10px 0;border-top:1px solid var(--bd)}.pf label{flex:1;min-width:80px;font-size:12px;color:var(--t2)}.pf input{width:100%;box-sizing:border-box}
.gck{display:inline-flex;align-items:center;gap:6px;margin:4px 12px 4px 0;font-size:14px}.sw{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:6px}
.bw{display:flex;justify-content:center;gap:6px}.bv{width:100%;max-width:150px;height:auto}
.bb{fill:var(--gs);stroke:var(--gl);stroke-width:1}
.mz{cursor:pointer;outline:0}.mz path{fill:var(--gu);stroke:var(--bg);stroke-width:.8;transition:fill .15s,filter .15s}
.mz.h0 path{fill:var(--ac)}.mz.h1 path{fill:rgba(var(--acr),.6)}.mz.h2 path{fill:rgba(var(--acr),.3)}
.mz:hover path{filter:brightness(1.2)}.mz:focus-visible path,.mz.sel path{stroke:#fff;stroke-width:1.6}
.dt{fill:none;stroke:#fff;stroke-opacity:.28;stroke-width:.6;pointer-events:none}.bt{justify-content:center;margin-bottom:6px}
.lg{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:12px;color:var(--t2);margin-top:10px}.lg i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:6px;background:var(--gu);border:1px solid var(--gl)}
.lg .h0{background:var(--ac)}.lg .h1{background:rgba(var(--acr),.6)}.lg .h2{background:rgba(var(--acr),.3)}
.gch{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:10px}
.gsg{display:inline-flex;border:1px solid var(--gb);border-radius:8px;overflow:hidden;max-width:100%}.gsg button{border:0;background:transparent;color:var(--t2);padding:7px 14px;font:inherit;font-weight:500;cursor:pointer;transition:background .15s,color .15s}.gsg button.on{background:var(--ac);color:var(--gon)}
.gcnv{display:flex;align-items:center;gap:8px;margin-bottom:10px}.gcnv b{flex:1;text-align:center;font-size:15px}
.gcv{margin:0 0 4px}.gdt{margin-top:12px;padding-top:10px;border-top:1px solid var(--gb)}
.gcw{display:grid;gap:6px;grid-template-columns:1fr}@media(min-width:600px){.gcw{grid-template-columns:repeat(auto-fit,minmax(125px,1fr))}}
.gcd{display:flex;flex-direction:column;align-items:flex-start;gap:2px;text-align:left;padding:10px;border:1px solid var(--gb);border-radius:10px;background:transparent;color:var(--tx);font:inherit;cursor:pointer;min-height:84px}
.gcd b{font-size:18px}.gdw{font-size:11px;color:var(--t2);text-transform:uppercase}.gcn{font-size:12px;font-weight:600;color:var(--ac)}.gcl{font-size:12px;word-break:break-word}
.gcd.has{border-color:var(--ac)}.gcd.fut{opacity:.55}.gcd.tod{box-shadow:inset 0 0 0 1px var(--ac)}.gcd.sel,.gmd.sel{background:var(--hv);outline:2px solid var(--ac)}
.gmg{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px}.gmg .h{font-size:11px;color:var(--t2);text-align:center;padding:4px 0}
.gmd{height:52px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;border:1px solid var(--gb);border-radius:8px;background:transparent;color:var(--tx);font:inherit;font-size:13px;cursor:pointer;padding:0;position:relative}
.gmd small{position:absolute;top:2px;right:4px;font-size:10px;color:var(--t2)}.gmd .dot{width:6px;height:6px;border-radius:50%;background:var(--ac)}.gmd.has{border-color:var(--ac)}.gmd.fut{opacity:.5}.gmd.tod{box-shadow:inset 0 0 0 1px var(--ac)}
.gyr{display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(150px,1fr))}
.gym{border:1px solid var(--gb);border-radius:10px;padding:10px}.gym.best{border-color:var(--ac)}.gym .sh{font-size:13px;margin-bottom:8px}
.gyg{display:grid;grid-template-rows:repeat(7,auto);grid-auto-flow:column;grid-template-columns:repeat(6,minmax(0,1fr));gap:3px}
.gyd{display:block;aspect-ratio:1;border-radius:3px;border:1px solid transparent;padding:0;cursor:pointer;background:var(--gb)}i.gyd{width:12px;height:12px;aspect-ratio:auto;display:inline-block;cursor:default}
.gyd.l0{background:var(--gb)}.gyd.l1{background:rgba(var(--acr),.25)}.gyd.l2{background:rgba(var(--acr),.5)}.gyd.l3{background:rgba(var(--acr),.75)}.gyd.l4{background:var(--ac)}
.gyd.fut{background:transparent;border:1px dashed var(--gb);cursor:default}.gyd.tod{outline:1px solid #fff}.gyd.sel{outline:2px solid #fff;outline-offset:1px}
.gdl{font-size:12px;color:var(--t2);margin-top:4px}.gdl.up{color:var(--ok)}.gdl.dn{color:var(--er)}
.gn{display:flex;gap:4px;margin-bottom:16px;border-bottom:1px solid var(--gb);padding-bottom:0;overflow-x:auto}
.gn button{position:relative;display:flex;align-items:center;gap:8px;padding:10px 14px;border:0;border-radius:8px 8px 0 0;background:transparent;color:var(--t2);font:inherit;font-weight:500;cursor:pointer;transition:color .15s,background .15s;white-space:nowrap}
.gn button::after{content:"";position:absolute;left:10px;right:10px;bottom:-1px;height:2px;border-radius:2px;background:var(--ac);transform:scaleX(0);transition:transform .2s ease}
.gn button:hover{background:var(--hv);color:var(--tx)}.gn button.on{color:var(--tx);font-weight:600}.gn button.on::after{transform:scaleX(1)}.gn button.on .i{color:var(--ac)}
.gsp{display:none}
@media(min-width:900px){.bt{display:none}}
@media(max-width:899px){.bv:not(.on){display:none}.bv{max-width:190px}}
@media(max-width:760px){.gn{position:fixed;left:0;right:0;bottom:0;z-index:50;margin:0;padding:0 0 env(safe-area-inset-bottom,0px);justify-content:space-around;overflow:visible;background:var(--bg2);border:0;border-top:1px solid var(--bd)}
.gn button{flex:1;flex-direction:column;gap:2px;padding:8px 0 6px;font-size:11px;min-width:0;min-height:52px;border-radius:0;justify-content:center}.gn button::after{left:25%;right:25%;top:-1px;bottom:auto}.gn button:hover{background:none}.gsp{display:block;height:84px}
.gcd{min-height:0}.gmd{height:46px}}
@media(prefers-reduced-motion:reduce){.gy *{animation:none!important;transition:none!important}}`;
document.head.appendChild(st);
})();