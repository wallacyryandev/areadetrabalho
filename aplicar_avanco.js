#!/usr/bin/env node
/* Corrige "próxima música" e avanço automático no musica.js.
   Uso: node aplicar_avanco.js caminho/para/musica.js
   Cria musica.js.bak e sobrescreve musica.js. Se algum ponto de ancoragem não for encontrado, aborta sem alterar nada. */
const fs=require('fs');
function fail(m){console.error('ERRO: '+m+' (nada foi alterado)');process.exit(1)}
const p=process.argv[2];
if(!p){console.log('Uso: node aplicar_avanco.js caminho/para/musica.js');process.exit(1)}
if(!fs.existsSync(p))fail('arquivo não encontrado: '+p);
let s=fs.readFileSync(p,'utf8');const orig=s;
function lit(old,nw,what,req=true){
  const n=s.split(old).length-1;
  if(n!==1){if(req)fail('ponto de ancoragem ausente/duplicado: '+what);return}
  s=s.replace(old,()=>nw);
}
function re(r,nw,what,req=true){
  if(!r.test(s)){if(req)fail('não encontrei: '+what);return}
  s=s.replace(r,(...m)=>typeof nw=='function'?nw(...m):nw);
}
/* 1) repetição começa DESLIGADA (antes: rep=1 => fila de 1 música repetia para sempre) + estado do tratamento de erro */
lit('shuf=0,rep=1,','shuf=0,rep=0,','estado inicial rep');
lit('hist=[],DUP=0;','hist=[],DUP=0;let ERRN=0,WP=0;','declaração de estado');
/* 2) fila "automática" sem candidatos (sem gênero/playlist) usa a ordem da biblioteca, em vez de uma fila de 1 faixa */
lit("const qOf=c=>{if(c==='auto')return cur>=0&&T[cur]?[cur].concat(APQ):[];",
    "const qOf=c=>{if(c==='auto'){if(!(cur>=0&&T[cur]))return[];return APQ.length?[cur].concat(APQ):T.map((_,i)=>i)}",'qOf');
/* 3) aleatório também vale quando a fila automática caiu para a biblioteca */
lit("if(shuf&&q.length>1&&ctx!=='auto'){","if(shuf&&q.length>1&&(ctx!=='auto'||!APQ.length)){",'nextI aleatório');
/* 4) fim da música: se o handoff sem pausa não puder ocorrer, segue a lógica normal (antes: return e a reprodução parava) */
lit('if(pre){handoff();return}','if(pre&&handoff())return;','handler ended');
/* 5) handoff: não troca para uma faixa pré-carregada com erro */
re(/if\(!pre\)return false;\s*const\{i,a\}=pre;pre=null;/,
   'if(!pre)return false;if(pre.a.error||pre.i>=T.length||!T[pre.i]){dropPre();return false}const{i,a}=pre;pre=null;','handoff()');
/* 6) intenção de tocar (WP) para decidir se pula faixa com erro */
re(/cur=i;(LYA=-2;)?dropPre\(\);els\.forEach/,(m,l)=>'cur=i;WP=auto?1:0;'+(l||'')+'dropPre();els.forEach','play()');
re(/cur=i;el=a;(LYA=-2;)?noteStart\(i\);/,(m,l)=>'cur=i;el=a;WP=1;'+(l||'')+'noteStart(i);','handoff() (cur=i;el=a)');
/* 7) arquivo que falha ao carregar: avisa e continua na próxima faixa (no máximo uma volta na fila; sem temporizadores) */
re(/on\('error',\(\)=>\{if\(cur<0\|\|!T\[cur\]\|\|!el\.getAttribute\('src'\)\)return;say\([^\n]*?\);draw\(\);bcast\(\)\}\);\s*/,'','handler de erro antigo',false);
lit("on('volumechange',()=>sched());",
`on('volumechange',()=>sched());
on('playing',()=>{ERRN=0});
on('error',()=>{
  if(cur<0||!T[cur]||!el.getAttribute('src'))return;
  if(el.error&&el.error.code==1)return;
  say('Não foi possível reproduzir "'+nm(T[cur].name)+'".');
  if(WP&&++ERRN<qOf(ctx).length){next();return}
  draw();bcast();
});`,'volumechange');
/* 8) texto da aba "A seguir" coerente com o novo comportamento */
lit("Defina o gênero abaixo.')+'</p>'","Defina o gênero abaixo.')+' Enquanto isso, a reprodução segue a ordem da biblioteca.</p>'",'texto A seguir',false);
if(s===orig)fail('nada mudou');
fs.copyFileSync(p,p+'.bak');fs.writeFileSync(p,s);
console.log('OK: musica.js atualizado (backup em '+p+'.bak)');