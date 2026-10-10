/* home.js — tela inicial em grade de aplicativos + lembrete de backup.
   Carregar DEPOIS de index.js/musica.js/extras.js/corrida.js e ANTES do <script> final do index.html.
   Não cria apps: lê a lista de páginas que o próprio Hub registra em PG e navega com go(). */
(() => {
  if (typeof PG === 'undefined' || typeof P === 'undefined' || typeof go !== 'function') return;

  /* ---------- ícones (traço, estilo da referência) ---------- */
  const I = {
    est: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
    tar: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="m8.5 12.5 2.5 2.5 4.5-5"/>',
    age: '<rect x="3.5" y="4.5" width="17" height="16.5" rx="3"/><path d="M8 2.5v4M16 2.5v4M3.5 10h17M8 14h.01M12 14h.01M16 14h.01M8 17.5h.01M12 17.5h.01M16 17.5h.01"/>',
    not: '<path d="M13 3H7a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-6"/><path d="M8 8h4M8 12h3"/><path d="M18.4 2.6a2.1 2.1 0 0 1 3 3L13 14l-4 1 1-4z"/>',
    sta: '<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 5-6"/><path d="M15 8h4v4"/>',
    gym: '<path d="M6.5 6.5v11M17.5 6.5v11M3 9.5v5M21 9.5v5M6.5 12h11"/>',
    hab: '<circle cx="12" cy="12" r="9.5"/><circle cx="12" cy="12" r="5.5"/><circle cx="12" cy="12" r="1.5"/>',
    pro: '<rect x="3" y="3" width="7" height="18" rx="2"/><rect x="14" y="3" width="7" height="10" rx="2"/>',
    cfg: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
    fin: '<path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5"/><path d="M16 13h2"/>',
    cli: '<path d="M12 2v2M4.9 4.9l1.4 1.4M2 12h2M19.1 4.9l-1.4 1.4"/><path d="M8.5 10a4 4 0 0 1 7.3-1.5"/><path d="M17 20H8a4.5 4.5 0 1 1 1.2-8.8A5.5 5.5 0 0 1 19.8 14 3 3 0 0 1 17 20z"/>',
    mus: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    run: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
    sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>'
  };
  const C = { est: '#3B7DE8', tar: '#26A07A', age: '#7B5CE0', not: '#D9763F', sta: '#262B36', gym: '#C0503C', hab: '#2B9C8C', fin: '#C58B1E', cli: '#2E86A8', pro: '#5B5FD6', cfg: '#5B6472', mus: '#D9446F', run: '#3F9B4F' };
  const FB = ['#3B7DE8', '#26A07A', '#7B5CE0', '#D9763F', '#D9446F', '#2E8FA6'];
  const PREF = ['est', 'tar', 'age', 'not', 'gym', 'hab', 'pro', 'sta'];

  const svg = k => `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${I[k]}</svg>`;
  // só escolhe o ÍCONE; quais apps aparecem vem sempre de PG
  const kind = p => I[p[0]] && p[0] !== 'grid' && p[0] !== 'search' && p[0] !== 'sliders' ? p[0]
    : /m[uú]sic/i.test(p[2]) ? 'mus' : /corrid|run/i.test(p[2]) ? 'run' : null;
  const color = (p, k) => C[k] || FB[[...p[0]].reduce((a, c) => a + c.charCodeAt(0), 0) % FB.length];
  const rank = id => id === 'cfg' ? 1e3 : PREF.indexOf(id) < 0 ? 100 : PREF.indexOf(id);
  const apps = () => PG.map((p, i) => [p, i]).filter(x => x[0][0] !== 'home')
    .sort((a, b) => rank(a[0][0]) - rank(b[0][0]) || a[1] - b[1]).map(x => x[0]);

  /* ---------- CSS ---------- */
  if (!document.getElementById('hp-css')) {
    const st = document.createElement('style');
    st.id = 'hp-css';
    st.textContent = `
:root{--hpbg:#000;--hpbd:#262b33}
:root[data-t=light]{--hpbg:#fff;--hpbd:#e2e8f0}
.hp{background:var(--hpbg);border:0;border-radius:0;padding:32px 28px calc(22px + env(safe-area-inset-bottom,0px));width:100%;margin:0;display:flex;flex-direction:column;min-height:calc(100vh - env(safe-area-inset-top,0px))}
@supports(height:100dvh){.hp{min-height:calc(100dvh - env(safe-area-inset-top,0px))}}
body.hp-home{background:var(--hpbg)}
body.hp-home #mn{max-width:none;padding:0;animation:none}
.hp-grid{flex:1;align-content:center;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:clamp(28px,5vh,56px) 8px;max-width:1500px;width:100%;margin:0 auto}
@media(min-width:1200px){.hp-grid{grid-template-columns:repeat(6,minmax(0,1fr))}}
:where(.hp button,.hp-fix button){background:none;border:0;padding:0;margin:0;font:inherit;color:inherit;cursor:pointer}
.hp button:focus-visible,.hp-fix button:focus-visible{outline:2px solid var(--ac2);outline-offset:3px;border-radius:14px}
.hp-app{display:flex;flex-direction:column;align-items:center;gap:12px;padding:2px;color:var(--tx);font-size:clamp(14px,1.1vw,17px);line-height:1.25;text-align:center;min-width:0}
.hp-ic{width:clamp(56px,5.2vw,84px);height:clamp(56px,5.2vw,84px);border-radius:clamp(14px,1.3vw,20px);display:grid;place-items:center;color:#fff;font-size:26px;line-height:1;transition:transform .15s,filter .15s}
.hp-ic svg{width:46%;height:46%;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.hp-app:hover .hp-ic{filter:brightness(1.12)}
.hp-app:active .hp-ic{transform:scale(.94)}
.hp-nm{max-width:100%;overflow-wrap:break-word}
.hp-div{height:1px;background:var(--hpbd);margin:30px 6px 22px;flex:none}
.hp-dock{display:flex;justify-content:center;gap:34px}
.hp-dk{width:38px;height:38px;display:grid;place-items:center;color:var(--t2);border-radius:10px;transition:color .15s}
.hp-dk:hover,.hp-dk.on{color:var(--tx)}
.hp-dk svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.hp-bk{margin-top:14px;text-align:center;font-size:12.5px;line-height:1.5;color:var(--t2)}
.hp-bk button{color:var(--ac2);margin-left:10px}
.hp-bk button.m{color:var(--t2)}
/* navegação do site inteiro passa a ser a grade (Início) + dock; menu lateral/barra antiga some */
#nv>b,#nv>a[onclick^="go("]{display:none}
#nv{pointer-events:none;position:fixed;top:0;left:auto;right:0;bottom:auto;width:auto;background:none;border:0;padding:6px 10px;flex-direction:row;z-index:4}
#nv>*{pointer-events:auto}
#mn{margin-left:0;margin-right:auto;padding-bottom:calc(96px + env(safe-area-inset-bottom,0px))}
@media(min-width:761px){#mn{margin-left:auto}}
.hp-fix{position:fixed;left:0;right:0;bottom:0;z-index:5;padding:8px 12px calc(8px + env(safe-area-inset-bottom,0px));background:var(--bg2);border-top:1px solid var(--bd)}
.hp-fix[hidden]{display:none}
.hp-fix .hp-dk{width:44px;height:44px}
/* tela inicial: nada fica azul ao segurar/arrastar (só aqui; Notas, campos e demais páginas seguem selecionáveis) */
body.hp-home,body.hp-home *{-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent}
body.hp-home ::selection{background:transparent}
body.hp-home input,body.hp-home textarea,body.hp-home select,body.hp-home #md,body.hp-home #md *{-webkit-user-select:text;-moz-user-select:text;-ms-user-select:text;user-select:text}
body.hp-home img,body.hp-home svg{-webkit-user-drag:none}
.hp-grid,.hp-grid *,.hp-dock,.hp-dock *,.hp-fix,.hp-fix *{-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent;-webkit-user-drag:none}
.hp svg,.hp-fix svg{pointer-events:none}
@media(max-width:480px){.hp{padding:24px 10px calc(16px + env(safe-area-inset-bottom,0px))}.hp-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:24px 4px}.hp-app{font-size:12px;padding:0}.hp-ic{width:56px;height:56px;border-radius:14px}.hp-div{margin:26px 4px 18px}.hp-dock{gap:26px}}
@media(max-width:300px){.hp-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}`;
    document.head.appendChild(st);
  }

  /* ---------- lembrete de backup ---------- */
  const K = 'hub_bk', DAY = 864e5, EVERY = 14, SNOOZE = 3;
  const bkRead = () => { try { return JSON.parse(localStorage.getItem(K)) || {}; } catch (e) { return {}; } };
  const bkWrite = o => { try { localStorage.setItem(K, JSON.stringify(o)); return true; } catch (e) { return false; } };
  const hasData = () => Object.entries(S).some(([k, v]) => k !== 'cats' && Array.isArray(v) && v.length);
  const bkState = (now = Date.now()) => {
    if (!hasData()) return null;               // Hub vazio: nada a perder, não incomoda
    const b = bkRead();
    if (b.snooze && now < b.snooze) return null; // "Depois" adia por 3 dias
    if (!b.last) return { never: true };
    const d = Math.floor((now - b.last) / DAY);
    return d >= EVERY ? { days: d } : null;
  };
  // só marca como feito DEPOIS que a exportação existente terminou sem erro
  const bkDone = () => {
    if (!bkWrite({ last: Date.now(), snooze: 0 })) return;
    if (typeof toast === 'function') toast('Backup gerado. Confira se o arquivo foi salvo no seu aparelho.');
    if (typeof page !== 'undefined' && page === 'home') render();
  };
  if (typeof A !== 'undefined' && typeof A.ex === 'function' && !A.ex.__bk) {
    const orig = A.ex;
    A.ex = function () {
      const r = orig.apply(this, arguments); // se lançar erro, a data NÃO é atualizada
      if (r && typeof r.then === 'function') r.then(bkDone, () => {}); else bkDone();
      return r;
    };
    A.ex.__bk = 1;
  }

  /* ---------- ações do dock ---------- */
  const HP = window.HP = {
    later() { const b = bkRead(); b.snooze = Date.now() + SNOOZE * DAY; bkWrite(b); render(); },
    search() { go('not'); setTimeout(() => { const i = document.querySelector('#mn input'); if (i) i.focus(); }, 0); },
    state: bkState
  };

  /* ---------- tela inicial ---------- */
  const app = p => {
    const k = kind(p), ic = k ? svg(k) : esc(p[1]);
    return `<button class="hp-app" onclick="go('${esc(p[0])}')"><span class="hp-ic" style="background:${color(p, k)}">${ic}</span><span class="hp-nm">${esc(p[2])}</span></button>`;
  };
  const dk = (k, label, act, on) => `<button class="hp-dk${on ? ' on' : ''}" title="${label}" aria-label="${label}" onclick="${act}">${svg(k)}</button>`;
  const dockItems = cur => {
    const mus = PG.find(p => /m[uú]sic/i.test(p[2]));
    const cfg = PG.find(p => p[0] === 'cfg');
    return dk('grid', 'Início', "go('home')", cur === 'home')
      + dk('search', 'Pesquisar nas notas', 'HP.search()')
      + (mus ? dk('mus', esc(mus[2]), `go('${esc(mus[0])}')`, cur === mus[0]) : '')
      + (cfg ? dk('sliders', esc(cfg[2]), "go('cfg')", cur === 'cfg') : '');
  };
  // barra fixa em todas as páginas, exceto no Início (lá a dock fica dentro do painel)
  HP.dock = () => {
    let bar = document.getElementById('hp-bar');
    if (!bar) { bar = document.createElement('div'); bar.id = 'hp-bar'; bar.className = 'hp-fix hp-dock'; document.body.appendChild(bar); }
    const home = page === 'home';
    document.body.classList.toggle('hp-home', home);
    bar.hidden = home;
    if (!home) bar.innerHTML = dockItems(page);
  };

  P.home = () => {
    const bk = bkState();
    const msg = !bk ? '' : `<div class="hp-bk">${bk.never ? 'Você ainda não fez backup dos seus dados.' : `Seu último backup foi há ${bk.days} dias.`}<button onclick="A.ex()">Exportar agora</button><button class="m" onclick="HP.later()">Depois</button></div>`;
    return `<section class="hp"><div class="hp-grid">${apps().map(app).join('')}</div><div class="hp-div"></div><div class="hp-dock">${dockItems('home')}</div>${msg}</section>`;
  };

  // a cada render (qualquer página) atualiza a dock; render() continua sendo a mesma função para todo o Hub
  if (typeof render === 'function' && !render.__hp) {
    const r0 = render;
    render = function () { const r = r0.apply(this, arguments); HP.dock(); return r; };
    render.__hp = 1;
  }
})();