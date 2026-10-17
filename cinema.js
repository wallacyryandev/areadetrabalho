/* cinema.js — ARCO Cinema: catálogo de filmes + reprodutor integrado.
   Segue o mesmo padrão do clima.js: registra a página em PG/P e usa S, sv(), RD(), esc(), UI e $ do ARCO.
   Dados: S.cine = { movies:[], prog:{id:{t,d,u,done}}, recent:[ids] }  → entram no Exportar/Importar.
          localStorage 'hub_cine_pref' = volume/velocidade/legenda (preferências só deste aparelho).
   Nenhum arquivo de vídeo é guardado: só o link. MP4/WebM tocam direto no <video>;
   HLS (.m3u8) usa o hls.min.js (carregado só quando necessário) ou o HLS nativo do Safari/iOS.
   Use apenas conteúdo próprio, de domínio público ou que você tenha autorização para reproduzir. */
(() => {
  if (typeof PG === 'undefined' || typeof P === 'undefined' || typeof S === 'undefined' || typeof UI === 'undefined' || typeof esc !== 'function') return;
  if (!PG.some(p => p[0] === 'cin')) {
    const i = PG.findIndex(p => p[0] === 'cfg');
    PG.splice(i < 0 ? PG.length : i, 0, ['cin', 'play', 'ARCO Cinema']);
  }

  /* ================= CSS (tudo com prefixo cn-, #cnp ou #cn-css) ================= */
  if (!document.getElementById('cn-css')) {
    const css = document.createElement('style');
    css.id = 'cn-css';
    css.textContent = `
.cn-bar{margin-bottom:12px}
.cn-search{display:flex;align-items:center;gap:8px;height:42px;padding:0 12px;margin:0;background:var(--rs);border:1px solid var(--bd);border-radius:10px;color:var(--t2);transition:border-color .15s}
.cn-search:focus-within{border-color:var(--ac2)}
.cn-search input{flex:1;min-width:0;height:40px;padding:0;border:0;border-radius:0;background:transparent;color:var(--tx);outline:0;box-shadow:none}
.cn-chips .ch.cn-b{border:0;font:inherit;font-size:13px;font-weight:500;flex:none}
.cn-sec{margin-top:24px}
.cn-row{display:flex;gap:12px;overflow-x:auto;padding:2px 2px 10px;margin:0 -2px;scroll-snap-type:x proximity;scrollbar-width:none;-webkit-overflow-scrolling:touch}
.cn-row::-webkit-scrollbar{display:none}
.cn-row>*{flex:none;scroll-snap-align:start}
.cn-row>.cn-card{width:138px}
.cn-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(132px,1fr));gap:18px 12px}
.cn-card{display:flex;flex-direction:column;gap:6px;min-width:0;padding:0;border:0;background:none;color:var(--tx);text-align:left;cursor:pointer;font:inherit}
.cn-card:focus-visible{outline:2px solid var(--ac2);outline-offset:4px;border-radius:12px}
.cn-cv{position:relative;display:block;aspect-ratio:2/3;border-radius:10px;overflow:hidden;background:linear-gradient(160deg,hsl(var(--h,220) 45% 24%),hsl(var(--h,220) 45% 11%));border:1px solid var(--bd);transition:transform .18s,border-color .18s,box-shadow .18s}
.cn-card:hover .cn-cv{transform:translateY(-3px);border-color:var(--ac2);box-shadow:0 10px 24px rgba(0,0,0,.35)}
.cn-cv img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.cn-ph{position:absolute;inset:0;display:grid;place-items:center;font-size:30px;font-weight:700;letter-spacing:.02em;color:rgba(255,255,255,.55)}
.cn-pg{position:absolute;left:0;right:0;bottom:0;height:4px;background:rgba(0,0,0,.6)}
.cn-pg b{display:block;height:100%;background:var(--ac2)}
.cn-sb{position:absolute;top:6px;right:6px;width:22px;height:22px;display:grid;place-items:center;border-radius:50%;background:rgba(8,12,20,.7);color:#F5C451;font-size:12px;line-height:1}
.cn-ct{font-size:14px;font-weight:600;line-height:1.25;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere}
.cn-mt{font-size:12.5px;color:var(--t2);min-height:1em}
.cn-src{margin-top:14px}
.cn-empty{max-width:560px;margin:8px auto 0;padding:22px 18px}
.cn-empty .em{padding-top:4px}
.cn-count{margin:0 0 12px}
.cn-sy{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:26px 2px 0;line-height:1.45}
.cn-sy.ctr{justify-content:center;text-align:center}
#md .box.cn-form{max-width:560px}
.cn-two{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.cn-form textarea{height:auto;padding:10px 12px;line-height:1.4;resize:vertical}
.cn-form small{font-weight:400;opacity:.85}
.cn-ck{display:flex;align-items:flex-start;gap:10px;color:var(--tx);font-weight:400;line-height:1.35}
.cn-ck input{margin-top:1px}
.cn-gsug{margin:-4px 0 12px;gap:6px}
.cn-gsug .ch.cn-b{border:0;font:inherit;font-size:12.5px;height:28px;padding:0 11px}
.cn-prev{display:flex;align-items:center;gap:10px;margin:-4px 0 12px;font-size:12.5px;color:var(--t2);min-height:0}
.cn-prev img{width:34px;height:50px;object-fit:cover;border-radius:5px;border:1px solid var(--bd)}
.cn-fm{margin:0 0 10px;font-size:13px;line-height:1.4}
.cn-fm.er{color:var(--er)}.cn-fm.ok{color:var(--ok)}.cn-fm.wa{color:var(--wa)}
.cn-tr{display:block;margin-top:8px;font-size:13px;line-height:1.45;color:var(--t2)}
.cn-tr div{margin-top:3px}
.cn-tr .ok{color:var(--ok)}.cn-tr .er{color:var(--er)}.cn-tr .wa{color:var(--wa)}
.cn-sec>.ct{margin-bottom:0}
.cn-sec .ct h2{font-size:18px;font-weight:700;letter-spacing:-.01em}
.cn-rw{position:relative}
.cn-ar{position:absolute;top:16px;bottom:18px;z-index:3;width:44px;border:0;padding:0;display:none;place-items:center;color:#fff;cursor:pointer;background:linear-gradient(90deg,rgba(0,0,0,.7),transparent);opacity:0;transition:opacity .15s}
.cn-ar.r{right:0;background:linear-gradient(270deg,rgba(0,0,0,.7),transparent)}
.cn-ar.l{left:0}
.cn-ar .i{width:26px;height:26px;stroke-width:2.4}
@media(hover:hover) and (min-width:761px){.cn-ar{display:grid}.cn-rw:hover .cn-ar{opacity:1}}
.cn-row{padding:16px 2px 18px!important}
.cn-card{position:relative}
.cn-card:hover,.cn-card:focus-visible{z-index:2}
.cn-card:hover .cn-cv{transform:scale(1.09)!important;box-shadow:0 14px 30px rgba(0,0,0,.55)!important}
.cn-hero{position:relative;isolation:isolate;overflow:hidden;display:flex;align-items:flex-end;min-height:clamp(360px,58vh,580px);margin:0 0 6px;border-radius:16px;background:#06090f;color:#fff}
.cn-hb{position:absolute;inset:0;z-index:-2;background:linear-gradient(135deg,hsl(var(--h,220) 45% 20%),hsl(var(--h,220) 45% 8%));overflow:hidden}
.cn-hb::before{content:"";position:absolute;inset:-30px;background:var(--cv,none) center/cover;filter:blur(30px) saturate(1.3);opacity:.65}
.cn-hb::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(6,9,15,.94) 10%,rgba(6,9,15,.4) 62%,rgba(6,9,15,.08)),linear-gradient(0deg,var(--bg) 0,rgba(0,0,0,0) 34%)}
.cn-hp{position:absolute;z-index:-1;right:6%;top:7%;height:80%;aspect-ratio:2/3;object-fit:cover;border-radius:10px;box-shadow:0 22px 56px rgba(0,0,0,.65)}
.cn-hx{display:flex;flex-direction:column;gap:12px;max-width:min(580px,100%);padding:clamp(18px,4vw,46px)}
.cn-hk{font-size:12px;font-weight:700;letter-spacing:.16em;color:#B8C4D6}
.cn-ht{margin:0;font-size:clamp(28px,5vw,52px);font-weight:800;letter-spacing:-.025em;line-height:1.04;overflow-wrap:anywhere;text-shadow:0 2px 18px rgba(0,0,0,.5)}
.cn-hm{margin:0;font-size:14px;font-weight:600;color:#D3DBE8}
.cn-hs{margin:0;font-size:15px;line-height:1.45;color:#E3E8F0;white-space:pre-line;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere}
.cn-hero.full .cn-hs{-webkit-line-clamp:unset;display:block;max-width:62ch}
.cn-hero.full{min-height:clamp(420px,64vh,640px)}
.cn-hbt{display:flex;flex-wrap:wrap;gap:10px;margin-top:6px}
.cn-bw,.cn-bg{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:42px;padding:0 20px;border:0;border-radius:6px;font:inherit;font-size:15px;font-weight:700;cursor:pointer;white-space:nowrap;transition:background .15s}
.cn-bw{background:#fff;color:#000}
.cn-bw:hover{background:rgba(255,255,255,.78)}
.cn-bg{background:rgba(109,109,110,.7);color:#fff}
.cn-bg:hover{background:rgba(109,109,110,.45)}
.cn-bg.er{color:#FF8A83}
.cn-bw .i,.cn-bg .i{width:20px;height:20px}
.cn-gs{display:flex;gap:6px;flex-wrap:wrap}
.cn-gs .ch.cn-b{border:0;font:inherit;font-size:12.5px;height:28px;background:rgba(255,255,255,.14);color:#fff}
.cn-gs .ch.cn-b:hover{background:rgba(255,255,255,.26)}
.cn-pbar{height:4px;border-radius:2px;background:rgba(255,255,255,.25);overflow:hidden;max-width:360px}
.cn-pbar b{display:block;height:100%;background:var(--ac2)}
.cn-src{margin:12px 2px 0}
@media(max-width:640px){.cn-hero{min-height:420px;border-radius:12px}.cn-hp{right:4%;top:5%;height:50%;opacity:.55}.cn-hs{-webkit-line-clamp:3;font-size:14px}.cn-bw,.cn-bg{height:40px;padding:0 16px;font-size:14px}}
/* ---- Reprodutor (camada própria, fora de #mn: nenhum render() do ARCO interrompe o filme) ---- */
#cnp{position:fixed;top:0;right:0;bottom:0;left:var(--sw);z-index:20;background:#000;display:none;color:#fff;overscroll-behavior:contain}
#cnp.on{display:block}
@media(max-width:760px){#cnp{left:0}}
html.cn-lock{overflow:hidden}
#cnp .cn-st{position:absolute;inset:0;background:#000;overflow:hidden;touch-action:manipulation;outline:0}
#cnp video{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#000}
#cnp video::cue{background:rgba(0,0,0,.72);color:#fff;font-size:1.1em;line-height:1.3}
#cnp .cn-tap{position:absolute;inset:0;z-index:1}
#cnp .cn-top,#cnp .cn-bot{position:absolute;left:0;right:0;z-index:7;display:flex;transition:opacity .25s}
#cnp .cn-top{top:0;align-items:center;gap:10px;padding:max(10px,env(safe-area-inset-top)) max(14px,env(safe-area-inset-right)) 34px max(14px,env(safe-area-inset-left));background:linear-gradient(rgba(0,0,0,.78),transparent);pointer-events:none}
#cnp .cn-bot{bottom:0;flex-direction:column;padding:46px max(14px,env(safe-area-inset-right)) max(10px,env(safe-area-inset-bottom)) max(14px,env(safe-area-inset-left));background:linear-gradient(transparent,rgba(0,0,0,.85));pointer-events:none}
#cnp .cn-top>*,#cnp .cn-bot>*{pointer-events:auto}
#cnp:not(.cn-show) .cn-top,#cnp:not(.cn-show) .cn-bot{opacity:0}
#cnp:not(.cn-show) .cn-top>*,#cnp:not(.cn-show) .cn-bot>*{pointer-events:none}
#cnp:not(.cn-show) .cn-st{cursor:none}
#cnp .cn-tt{min-width:0;display:flex;flex-direction:column;line-height:1.25}
#cnp .cn-tt b{font-size:16px;font-weight:650;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#cnp .cn-tt span{font-size:12.5px;color:#B8C4D6}
#cnp .cn-ib{display:inline-flex;align-items:center;justify-content:center;flex:none;width:40px;height:40px;padding:0;border:0;border-radius:50%;background:transparent;color:#fff;cursor:pointer;transition:background .15s}
#cnp .cn-ib:hover{background:rgba(255,255,255,.16)}
#cnp .cn-ib:focus-visible,#cnp .cn-mi:focus-visible,#cnp .cn-bt:focus-visible{outline:2px solid var(--ac2);outline-offset:1px}
#cnp .cn-ib svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
#cnp .cn-ib.tx{width:auto;min-width:40px;padding:0 8px;border-radius:20px;font:inherit;font-size:13px;font-weight:600}
#cnp .cn-mid{position:absolute;inset:0;z-index:2;display:grid;place-items:center;pointer-events:none}
#cnp .cn-big{display:none;place-items:center;width:78px;height:78px;border:0;border-radius:50%;background:rgba(15,18,22,.62);color:#fff;cursor:pointer;pointer-events:auto;-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}
#cnp .cn-big svg{width:34px;height:34px;fill:none;stroke:currentColor;stroke-width:2}
#cnp.cn-paused .cn-big{display:grid}
#cnp .cn-spin{display:none;width:46px;height:46px;border-radius:50%;border:3px solid rgba(255,255,255,.25);border-top-color:#fff;animation:cnsp .8s linear infinite}
#cnp.cn-load .cn-spin{display:block}
#cnp.cn-load .cn-big,#cnp.cn-bad .cn-big,#cnp.cn-bad .cn-spin{display:none}
@keyframes cnsp{to{transform:rotate(360deg)}}
#cnp .cn-slow{position:absolute;left:0;right:0;bottom:104px;z-index:3;text-align:center;font-size:13px;color:#C5CEDA;display:none}
#cnp.cn-load.cn-slw .cn-slow{display:block}
#cnp .cn-rip{position:absolute;top:50%;z-index:3;transform:translateY(-50%);padding:10px 16px;border-radius:24px;background:rgba(15,18,22,.7);font-weight:600;font-size:14px;opacity:0;pointer-events:none;transition:opacity .2s}
#cnp .cn-rip.on{opacity:1}
#cnp .cn-seek{position:relative;display:flex;align-items:center;height:24px}
#cnp .cn-trk{position:absolute;left:0;right:0;height:4px;border-radius:2px;background:rgba(255,255,255,.24);overflow:hidden;transition:height .12s}
#cnp .cn-seek:hover .cn-trk,#cnp .cn-seek.dr .cn-trk{height:6px}
#cnp .cn-buf,#cnp .cn-prg{position:absolute;left:0;top:0;bottom:0;width:0}
#cnp .cn-buf{background:rgba(255,255,255,.34)}
#cnp .cn-prg{background:var(--ac2,#6FA3FF)}
#cnp .cn-seek input,#cnp .cn-vol input{-webkit-appearance:none;appearance:none;margin:0;padding:0;border:0;border-radius:0;background:transparent;outline:0;box-shadow:none;cursor:pointer}
#cnp .cn-seek input{position:relative;z-index:1;width:100%;height:24px}
#cnp .cn-seek input::-webkit-slider-runnable-track{height:24px;background:transparent}
#cnp .cn-seek input::-moz-range-track{height:24px;background:transparent}
#cnp .cn-seek input::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;margin-top:5px;border-radius:50%;background:#fff;box-shadow:0 0 0 3px rgba(111,163,255,.4);transform:scale(0);transition:transform .12s}
#cnp .cn-seek input::-moz-range-thumb{width:14px;height:14px;border:0;border-radius:50%;background:#fff;transform:scale(0);transition:transform .12s}
#cnp .cn-seek:hover input::-webkit-slider-thumb,#cnp .cn-seek.dr input::-webkit-slider-thumb{transform:scale(1)}
#cnp .cn-seek:hover input::-moz-range-thumb,#cnp .cn-seek.dr input::-moz-range-thumb{transform:scale(1)}
@media(pointer:coarse){#cnp .cn-seek input::-webkit-slider-thumb{transform:scale(1)}#cnp .cn-seek input::-moz-range-thumb{transform:scale(1)}}
#cnp .cn-seek input:disabled{cursor:default}
#cnp .cn-seek input:disabled::-webkit-slider-thumb{transform:scale(0)}
#cnp .cn-tip{position:absolute;bottom:28px;transform:translateX(-50%);padding:2px 8px;border-radius:6px;background:rgba(0,0,0,.88);font-size:12px;font-variant-numeric:tabular-nums;pointer-events:none;opacity:0;transition:opacity .1s}
#cnp .cn-ctl{display:flex;align-items:center;gap:2px;min-width:0}
#cnp .cn-tm{margin:0 8px;font-size:13px;font-variant-numeric:tabular-nums;white-space:nowrap;color:#E8EAED}
#cnp .cn-f{flex:1}
#cnp .cn-vol{display:flex;align-items:center}
#cnp .cn-vol input{width:0;height:20px;opacity:0;transition:width .18s,opacity .18s,margin .18s;background:linear-gradient(to right,#fff var(--v,100%),rgba(255,255,255,.3) var(--v,100%)) center/100% 4px no-repeat}
#cnp .cn-vol:hover input,#cnp .cn-vol:focus-within input{width:84px;opacity:1;margin:0 8px 0 2px}
#cnp .cn-vol input::-webkit-slider-thumb{-webkit-appearance:none;width:12px;height:12px;border-radius:50%;background:#fff}
#cnp .cn-vol input::-moz-range-thumb{width:12px;height:12px;border:0;border-radius:50%;background:#fff}
@media(hover:none){#cnp .cn-vol input{display:none}}
@media(max-width:520px){#cnp .cn-ib{width:36px;height:36px}#cnp .cn-tm{margin:0 4px;font-size:12px}#cnp .cn-bot{padding-top:36px}}
#cnp .cn-mn{position:absolute;right:max(14px,env(safe-area-inset-right));bottom:calc(76px + env(safe-area-inset-bottom));z-index:9;min-width:190px;max-width:calc(100% - 28px);max-height:min(62%,380px);overflow:auto;padding:6px;background:rgba(14,19,28,.97);border:1px solid #262B33;border-radius:12px;box-shadow:0 12px 32px rgba(0,0,0,.5)}
#cnp .cn-mn[hidden]{display:none}
#cnp .cn-mn h4{margin:0;padding:8px 10px 4px;font-size:12px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:#9AA3AE}
#cnp .cn-mn p{margin:0;padding:6px 10px;max-width:270px;font-size:12.5px;line-height:1.4;color:#9AA3AE}
#cnp .cn-mn p.er{color:#F08A84}
#cnp .cn-mi{display:flex;align-items:center;gap:8px;width:100%;padding:9px 10px;border:0;border-radius:8px;background:transparent;color:#E8EAED;font:inherit;font-size:14px;text-align:left;cursor:pointer}
#cnp .cn-mi:hover{background:rgba(255,255,255,.09)}
#cnp .cn-mi i{width:16px;flex:none;font-style:normal;color:#6FA3FF}
#cnp .cn-err{position:absolute;inset:0;z-index:6;display:none;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:70px 24px 24px;text-align:center;background:rgba(5,8,13,.94)}
#cnp.cn-bad .cn-err{display:flex}
#cnp.cn-bad .cn-bot,#cnp.cn-bad .cn-mid,#cnp.cn-bad .cn-tap{display:none}
#cnp .cn-err h3{margin:0;font-size:19px}
#cnp .cn-err p{margin:0;max-width:500px;font-size:14px;line-height:1.5;color:#C5CEDA}
#cnp .cn-bt{display:inline-flex;align-items:center;justify-content:center;gap:7px;height:38px;padding:0 16px;border-radius:8px;border:1px solid #333B46;background:transparent;color:#fff;font:inherit;font-size:14px;font-weight:600;cursor:pointer}
#cnp .cn-bt.p{background:var(--ac,#2F6FED);border-color:transparent}
#cnp .cn-bt svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
#cnp .cn-bts{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:4px}
`;
    document.head.appendChild(css);
  }

  /* ================= estado, dados e utilidades ================= */
  const st = { q: '', g: '', v: 'home', id: null, sy: 0 };
  const idOk = id => typeof id === 'string' && /^[\w-]{1,24}$/.test(id);
  const cn = () => {
    if (!S.cine || typeof S.cine !== 'object' || Array.isArray(S.cine)) S.cine = {};
    const c = S.cine;
    if (!Array.isArray(c.movies)) c.movies = [];
    if (!c.prog || typeof c.prog !== 'object' || Array.isArray(c.prog)) c.prog = {};
    if (!c.seen || typeof c.seen !== 'object' || Array.isArray(c.seen)) c.seen = {};
    return c;
  };
  const list = () => cn().movies.filter(m => m && typeof m === 'object' && idOk(m.id) && !m.del);
  const mv = id => list().find(m => m.id === id) || null;
  const prog = id => { const p = cn().prog[id]; return p && typeof p === 'object' ? p : null; };
  const canResume = m => { const p = prog(m.id); return !!(p && !p.done && p.t > 10 && p.d > 0 && p.t < p.d - 15); };
  const persist = () => { try { sv(); } catch (e) {} };
  /* Limpeza única ao carregar: descarta lixo e marcadores de exclusão com mais de 180 dias; garante 'u' (data da última alteração) */
  const initData = () => {
    const c = cn(), lim = Date.now() - 180 * 864e5;
    c.movies = c.movies.filter(m => m && typeof m === 'object' && idOk(m.id) && !(m.del && (m.u || 0) < lim));
    c.movies.forEach(m => { m.u = m.u || m.upd || m.added || 0; });
  };
  const gen = m => (Array.isArray(m.genres) ? m.genres : []).map(x => String(x)).filter(Boolean);

  const fmtDur = min => {
    min = Math.round(+min || 0);
    if (min <= 0) return '';
    const h = Math.floor(min / 60), m = min % 60;
    return h ? (m ? h + 'h ' + String(m).padStart(2, '0') + 'min' : h + 'h') : m + 'min';
  };
  const parseDur = s => {
    s = String(s || '').trim().toLowerCase();
    if (!s) return 0;
    let m;
    if ((m = s.match(/^(\d+)\s*h(?:\s*(\d{1,2})\s*(?:m|min|mins)?)?$/))) return +m[1] * 60 + (+m[2] || 0);
    if ((m = s.match(/^(\d+):(\d{2}):(\d{2})$/))) return Math.round(+m[1] * 60 + +m[2] + +m[3] / 60);
    if ((m = s.match(/^(\d+):(\d{2})$/))) return +m[1] * 60 + +m[2];
    if ((m = s.match(/^(\d+)\s*(?:m|min|mins|minutos?)?$/))) return +m[1];
    return NaN;
  };
  const clock = sec => {
    sec = Math.max(0, Math.floor(sec || 0));
    const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60;
    return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(s).padStart(2, '0');
  };
  const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const safeUrl = u => { try { const x = new URL(String(u || '').trim(), location.href); return /^https?:$/.test(x.protocol) ? x.href : ''; } catch (e) { return ''; } };
  const cssUrl = u => 'url("' + String(u).replace(/["\\\n\r]/g, c => encodeURIComponent(c)) + '")';
  const hue = t => { let h = 0; for (const c of String(t || '')) h = (h * 31 + c.charCodeAt(0)) % 360; return 205 + h % 50; };
  const ini = t => { const w = String(t || '?').trim().split(/\s+/).filter(Boolean); return ((w[0] || '?')[0] + (w.length > 1 ? w[1][0] : '')).toUpperCase(); };
  const host = u => { try { return new URL(u, location.href).hostname.replace(/^www\./, ''); } catch (e) { return ''; } };
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const getPref = () => { try { return JSON.parse(localStorage.getItem('hub_cine_pref')) || {}; } catch (e) { return {}; } };
  const setPref = o => { try { localStorage.setItem('hub_cine_pref', JSON.stringify(Object.assign(getPref(), o))); } catch (e) {} };

  /* ================= compatibilidade das fontes de vídeo ================= */
  const PAGE_HOSTS = [
    [/(^|\.)(youtube\.com|youtu\.be|youtube-nocookie\.com)$/i, 'YouTube'],
    [/(^|\.)vimeo\.com$/i, 'Vimeo'], [/(^|\.)dailymotion\.com$/i, 'Dailymotion'], [/(^|\.)twitch\.tv$/i, 'Twitch'],
    [/(^|\.)netflix\.com$/i, 'Netflix'], [/(^|\.)primevideo\.com$/i, 'Prime Video'], [/(^|\.)disneyplus\.com$/i, 'Disney+'],
    [/(^|\.)(max|hbomax)\.com$/i, 'Max'], [/(^|\.)globoplay\.globo\.com$/i, 'Globoplay'],
    [/(^|\.)(facebook|fb|instagram|tiktok|x|twitter)\.com$/i, 'rede social'],
    [/^(drive|docs)\.google\.com$/i, 'Google Drive'], [/(^|\.)dropbox\.com$/i, 'Dropbox'],
    [/(^|\.)mega\.(nz|io)$/i, 'MEGA'], [/(^|\.)mediafire\.com$/i, 'MediaFire'],
    [/^onedrive\.live\.com$|(^|\.)1drv\.ms$|(^|\.)sharepoint\.com$/i, 'OneDrive']
  ];
  const MIME = { mp4: 'video/mp4', m4v: 'video/mp4', webm: 'video/webm', ogv: 'video/ogg', ogg: 'video/ogg', mov: 'video/quicktime', mkv: 'video/x-matroska' };

  /* k: 'file' | 'hls' | 'page' | 'unsupported' | 'invalid' */
  const classify = raw => {
    raw = String(raw || '').trim();
    if (!raw) return { k: 'invalid', why: 'Informe o link do vídeo.' };
    let u;
    try { u = new URL(raw, location.href); } catch (e) { return { k: 'invalid', why: 'O link do vídeo não é uma URL válida.' }; }
    if (!/^https?:$/.test(u.protocol)) return { k: 'invalid', why: 'Só links http:// ou https:// são aceitos (não use arquivos locais, data: ou blob:).' };
    if (!/^[a-z][a-z0-9+.-]*:/i.test(raw) && !/[\/.]/.test(raw)) return { k: 'invalid', why: 'O link do vídeo não parece um endereço. Use https://… ou um caminho como filmes/arquivo.mp4.' };
    const path = u.pathname.toLowerCase();
    const out = { k: 'file', u: u.href, host: u.hostname.replace(/^www\./, ''), ext: (path.match(/\.([a-z0-9]{2,5})$/) || [])[1] || '', mixed: location.protocol === 'https:' && u.protocol === 'http:' };
    for (const [re, name] of PAGE_HOSTS) {
      if (re.test(u.hostname) && !(name === 'Dropbox' && /[?&](raw|dl)=1\b/.test(u.search))) { out.k = 'page'; out.site = name; return out; }
    }
    if (/(^|\.)archive\.org$/i.test(u.hostname) && /^\/(details|embed)\//.test(path)) { out.k = 'page'; out.site = 'Internet Archive'; out.tip = 'No Internet Archive, abra a página do filme, entre em “Download options” e copie o link direto do arquivo .mp4 ou .webm.'; return out; }
    if (out.ext === 'm3u8') out.k = 'hls';
    else if (out.ext === 'mpd') { out.k = 'unsupported'; out.why = 'Links DASH (.mpd) não são suportados. Use MP4, WebM ou HLS (.m3u8).'; }
    else if (/^(html?|php|aspx?|jsp)$/.test(out.ext)) out.k = 'page';
    return out;
  };
  const pageMsg = c => 'Este link aponta para uma página' + (c.site ? ' do ' + c.site : ' da web') + ', não para um arquivo de vídeo. O reprodutor só toca arquivos diretos (MP4/WebM) ou streams HLS (.m3u8). ' + (c.tip || 'Você ainda pode abrir a fonte original em outra aba.');
  const MIXED = 'O ARCO está em HTTPS e este vídeo usa http://. O navegador bloqueia esse tipo de conteúdo misto. Use um link https:// para o mesmo arquivo.';
  const fmtWarn = c => {
    if (c.k !== 'file' || !c.ext) return '';
    if (/^(avi|wmv|flv|ts|mts|m2ts|3gp|rmvb|divx|vob|mpg|mpeg)$/.test(c.ext)) return 'O formato .' + c.ext + ' normalmente não toca em navegadores. Converta para MP4 (H.264/AAC) ou WebM.';
    const mt = MIME[c.ext];
    if (mt) { const v = document.createElement('video'); if (v.canPlayType && !v.canPlayType(mt)) return 'Este navegador não declara suporte a .' + c.ext + '; o vídeo pode não tocar. Prefira MP4 (H.264/AAC) ou WebM.'; }
    return '';
  };

  /* Sondagem de acesso (só informativa — nunca bloqueia a reprodução): pede 1 byte com Range.
     206 = o servidor aceita avanço pela barra; 200 = ignora Range; falha com CORS mas "alcançável" via no-cors = sem CORS. */
  const PR = new Map();
  const probe = u => {
    if (PR.has(u)) return PR.get(u);
    const run = async (mode, hdrs) => {
      const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 9000);
      try { const r = await fetch(u, { method: 'GET', mode, headers: hdrs, signal: ctl.signal, cache: 'no-store', credentials: 'omit' }); ctl.abort(); return r; }
      finally { clearTimeout(to); }
    };
    const p = (async () => {
      const o = { reach: null, cors: null, status: 0, ct: '', range: null };
      try {
        const r = await run('cors', { Range: 'bytes=0-1' });
        o.reach = true; o.cors = true; o.status = r.status;
        o.ct = (r.headers.get('content-type') || '').toLowerCase();
        o.range = r.status === 206 ? true : r.status === 200 ? false : null;
      } catch (e) {
        if (e && e.name === 'AbortError') return o;
        try { await run('no-cors', undefined); o.reach = true; o.cors = false; }
        catch (e2) { o.reach = e2 && e2.name === 'AbortError' ? null : false; }
      }
      return o;
    })();
    PR.set(u, p);
    return p;
  };

  /* hls.min.js (hls.js 1.5.17, Apache-2.0) fica no repositório e só é carregado quando um .m3u8 é aberto */
  let hlsP = null;
  const loadHls = () => window.Hls ? Promise.resolve() : hlsP || (hlsP = new Promise((ok, no) => {
    const s = document.createElement('script');
    s.src = 'hls.min.js';
    s.onload = ok;
    s.onerror = () => { hlsP = null; no(new Error('hls')); };
    document.head.appendChild(s);
  }));
  const isApple = () => /iP(hone|ad|od)|Macintosh/.test(navigator.userAgent) && /Safari/.test(navigator.userAgent) && !/Chrome|Chromium|Edg|Android|Firefox/.test(navigator.userAgent);

  /* Liga uma fonte (já classificada) a um <video>. cb: { levels(list), level(i), fatal(kind, detail) } */
  const attach = (video, c, o) => {
    const h = { hls: null, native: false, dead: false, destroy() { this.dead = true; if (this.hls) { try { this.hls.destroy(); } catch (e) {} this.hls = null; } } };
    if (c.k !== 'hls') { video.src = c.u; return h; }
    const nat = !!video.canPlayType('application/vnd.apple.mpegurl');
    if (nat && isApple()) { h.native = true; video.src = c.u; return h; }
    loadHls().then(() => {
      if (h.dead) return;
      if (!window.Hls || !Hls.isSupported()) {
        if (nat) { h.native = true; video.src = c.u; return; }
        return o.fatal('nosupport');
      }
      let net = 0, med = 0;
      const hls = h.hls = new Hls({ enableWorker: true, startPosition: o.start > 0 ? o.start : -1, capLevelToPlayerSize: false });
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        const L = hls.levels.map((l, i) => ({ i, h: l.height || 0, br: l.bitrate || 0 }));
        o.levels && o.levels(L);
      });
      hls.on(Hls.Events.LEVEL_SWITCHED, (e, d) => o.level && o.level(d.level));
      hls.on(Hls.Events.ERROR, (e, d) => {
        if (!d || !d.fatal || h.dead) return;
        if (d.type === Hls.ErrorTypes.NETWORK_ERROR && net++ < 2) { hls.startLoad(); return; }
        if (d.type === Hls.ErrorTypes.MEDIA_ERROR && med++ < 2) { hls.recoverMediaError(); return; }
        o.fatal(d.type === Hls.ErrorTypes.NETWORK_ERROR ? 'net' : d.type === Hls.ErrorTypes.MEDIA_ERROR ? 'media' : 'other', d);
      });
      hls.loadSource(c.u);
      hls.attachMedia(video);
    }).catch(() => { if (!h.dead) o.fatal('script'); });
    return h;
  };

  /* Mensagens claras para cada tipo de falha */
  const msgMedia = (code, c, info) => {
    if (c.mixed) return { title: 'Conteúdo bloqueado pelo navegador', msg: MIXED, retry: false };
    if (info && info.reach === false) return { title: 'Servidor inacessível', msg: 'Não foi possível alcançar o servidor do vídeo. Confira o link, sua conexão ou se o endereço ainda existe.' };
    if (info && info.status >= 400) return { title: 'Acesso recusado pelo servidor', msg: 'O servidor respondeu HTTP ' + info.status + '. O link pode ter expirado, exigir login ou bloquear o uso em outros sites.', retry: info.status >= 500 };
    if (info && /text\/html/.test(info.ct)) return { title: 'O link não é um vídeo', msg: 'O endereço abre uma página da web, não um arquivo de vídeo. Use o link direto do arquivo (.mp4, .webm ou .m3u8).', retry: false };
    if (code === 1) return { title: 'Carregamento interrompido', msg: 'O carregamento do vídeo foi cancelado. Tente novamente.' };
    if (code === 2) return { title: 'Falha de rede', msg: 'A conexão caiu ao baixar o vídeo. Verifique sua internet e tente novamente.' };
    if (code === 3) return { title: 'Não foi possível decodificar o vídeo', msg: 'O arquivo pode estar corrompido ou usar um codec que este aparelho não suporta. MP4 (H.264/AAC) e WebM tocam na maioria dos navegadores.', retry: false };
    const ok = info && info.reach && info.status < 400 && /video|octet-stream|mpegurl/.test(info.ct);
    return ok
      ? { title: 'Formato não suportado', msg: 'O arquivo foi encontrado, mas este navegador não consegue reproduzir esse formato ou codec. Converta para MP4 (H.264/AAC) ou WebM.', retry: false }
      : { title: 'Não foi possível reproduzir', msg: 'O formato não é suportado ou o link não aponta diretamente para um arquivo de vídeo.' + (info && info.cors === false ? ' O servidor também não libera acesso (CORS), o que pode indicar proteção contra uso em outros sites.' : ''), retry: false };
  };
  const msgHls = (kind, c, info) => {
    if (kind === 'nosupport') return { title: 'HLS não suportado', msg: 'Este navegador não consegue reproduzir streams HLS (.m3u8).', retry: false };
    if (kind === 'script') return { title: 'Componente HLS indisponível', msg: 'Não foi possível carregar o módulo HLS (hls.min.js). Verifique se o arquivo está publicado junto com o site e tente novamente.' };
    if (kind === 'net') {
      if (c.mixed) return { title: 'Conteúdo bloqueado pelo navegador', msg: MIXED, retry: false };
      if (info && info.cors === false) return { title: 'Servidor sem CORS', msg: 'O servidor do stream não libera acesso (CORS) para este site, e o HLS depende disso. Hospede o stream com o cabeçalho Access-Control-Allow-Origin.', retry: false };
      if (info && info.status >= 400) return { title: 'Acesso recusado pelo servidor', msg: 'O servidor respondeu HTTP ' + info.status + ' ao buscar a playlist HLS.', retry: info.status >= 500 };
      return { title: 'Falha ao carregar o stream', msg: 'Não foi possível baixar a playlist ou os trechos do vídeo. Verifique o link e sua conexão.' };
    }
    if (kind === 'media') return { title: 'Não foi possível decodificar o stream', msg: 'O navegador não conseguiu decodificar os trechos deste stream (codec não suportado ou dados inválidos).', retry: false };
    return { title: 'Erro no stream HLS', msg: 'Ocorreu um erro inesperado ao reproduzir este stream.' };
  };

  /* Legendas: baixa o texto (precisa de CORS), converte SRT → WebVTT e devolve uma URL local */
  const fetchText = async u => {
    const r = await fetch(u, { credentials: 'omit' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const b = await r.arrayBuffer();
    try { return new TextDecoder('utf-8', { fatal: true }).decode(b); } catch (e) { return new TextDecoder('windows-1252').decode(b); }
  };
  const toVtt = txt => {
    txt = String(txt).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
    if (/^WEBVTT/.test(txt.trim())) return txt;
    if (!/-->/.test(txt)) throw new Error('formato');
    return 'WEBVTT\n\n' + txt.replace(/(\d{1,2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2').replace(/(^|\n)(\d{2}:\d{2}),(\d{3})/g, '$1$2.$3');
  };

  /* ================= catálogo ================= */
  const GENRES = ['Ação', 'Aventura', 'Animação', 'Comédia', 'Crime', 'Documentário', 'Drama', 'Fantasia', 'Ficção científica', 'Guerra', 'Musical', 'Romance', 'Suspense', 'Terror', 'Família'];
  const metaLine = m => [m.year || '', fmtDur(m.dur)].filter(Boolean).join(' · ');
  const byTitle = (a, b) => norm(a.title).localeCompare(norm(b.title), 'pt-BR');

  const cover = (m, extra) => {
    const u = safeUrl(m.cover);
    return `<span class="cn-cv" style="--h:${hue(m.title)}">${u ? `<img src="${esc(u)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="CN.ie(this)">` : ''}<span class="cn-ph">${esc(ini(m.title))}</span>${extra || ''}</span>`;
  };
  const card = m => {
    const p = prog(m.id), pct = p && p.d ? Math.min(100, Math.round(p.t / p.d * 100)) : 0;
    const pg = canResume(m) && pct > 1 ? `<i class="cn-pg"><b style="width:${pct}%"></b></i>` : '';
    const sb = m.feat ? '<span class="cn-sb" aria-hidden="true">★</span>' : '';
    const meta = metaLine(m);
    return `<button type=button class="cn-card" onclick="CN.open('${m.id}')" aria-label="${esc(m.title)}${meta ? ', ' + esc(meta) : ''}">${cover(m, pg + sb)}<span class="cn-ct">${esc(m.title)}</span><span class="cn-mt">${esc(meta)}</span></button>`;
  };
  /* Banner estilo Netflix (usado no catálogo e na página de detalhes) */
  const hero = (m, full) => {
    const u = safeUrl(m.cover), p = prog(m.id), res = canResume(m);
    const kick = full ? 'ARCO CINEMA' : (m.feat ? 'ARCO CINEMA · EM DESTAQUE' : 'ARCO CINEMA · NOVIDADE');
    const meta = [m.year || '', fmtDur(m.dur), full ? '' : gen(m).slice(0, 3).join(' · ')].filter(Boolean).join(' · ');
    const btns = `<button type=button class="cn-bw" onclick="CN.play('${m.id}')">${UI.i('play')}${res ? 'Continuar de ' + clock(p.t) : 'Assistir'}</button>`
      + (full
        ? (res ? `<button type=button class="cn-bg" onclick="CN.play('${m.id}',1)">Do início</button>` : '')
          + `<button type=button class="cn-bg" onclick="CN.feat('${m.id}')" aria-pressed="${m.feat ? 'true' : 'false'}">${m.feat ? '★ Em destaque' : '☆ Destacar'}</button><button type=button class="cn-bg" onclick="CN.edit('${m.id}')">${UI.i('edit')}Editar</button><button type=button class="cn-bg er" onclick="CN.del('${m.id}')">${UI.i('trash')}Excluir</button>`
        : `<button type=button class="cn-bg" onclick="CN.open('${m.id}')">ⓘ Mais informações</button>`);
    const pct = p && p.d && !p.done ? Math.min(100, Math.round(p.t / p.d * 100)) : 0;
    return `<section class="cn-hero${full ? ' full' : ''}" style="--h:${hue(m.title)};${u ? '--cv:' + cssUrl(u) + ';' : ''}"><div class="cn-hb"></div>${u ? `<img class="cn-hp" src="${esc(u)}" alt="" referrerpolicy="no-referrer" onerror="CN.ie(this)">` : ''}<div class="cn-hx"><span class="cn-hk">${kick}</span><h2 class="cn-ht">${esc(m.title)}</h2>${meta ? `<p class="cn-hm">${esc(meta)}</p>` : ''}${full && gen(m).length ? `<div class="cn-gs">${gen(m).map(g => `<button type=button class="ch cn-b" data-cngo="${esc(g)}">${esc(g)}</button>`).join('')}</div>` : ''}<p class="cn-hs">${m.synopsis ? esc(m.synopsis) : (full ? 'Sem sinopse.' : '')}</p>${full && res ? `<div class="cn-pbar" role="img" aria-label="Progresso ${pct}%"><b style="width:${pct}%"></b></div><p class="cn-hm" style="font-weight:500">Parou em ${clock(p.t)} de ${clock(p.d)}</p>` : ''}${full && p && p.done ? '<p class="cn-hm">✓ Assistido</p>' : ''}<div class="cn-hbt">${btns}</div></div></section>`;
  };
  const sec = (title, items, cls) => !items.length ? '' : `<section class="cn-sec"><div class=ct><h2>${title}</h2></div>${cls === 'cn-grid' ? `<div class="cn-grid">${items.join('')}</div>` : `<div class="cn-rw"><button type=button class="cn-ar l" onclick="CN.sc(this,-1)" aria-label="Voltar fileira">${UI.i('left')}</button><div class="cn-row">${items.join('')}</div><button type=button class="cn-ar r" onclick="CN.sc(this,1)" aria-label="Avançar fileira">${UI.i('right')}</button></div>`}</section>`;

  const allGenres = () => {
    const seen = new Map();
    list().forEach(m => gen(m).forEach(g => { const k = norm(g); if (!seen.has(k)) seen.set(k, g); }));
    return [...seen.values()].sort((a, b) => norm(a).localeCompare(norm(b), 'pt-BR'));
  };
  const chipsHtml = () => ['', ...allGenres()].map(g => `<button type=button class="ch cn-b${(st.g || '') === g ? ' on' : ''}" data-cng="${esc(g)}">${g ? esc(g) : 'Todos'}</button>`).join('');

  const results = () => {
    const all = list(), q = norm(st.q.trim()), g = norm(st.g);
    if (q || g) {
      const r = all.filter(m => (!q || norm(m.title).includes(q)) && (!g || gen(m).some(x => norm(x) === g))).sort(byTitle);
      const lbl = `${r.length} ${r.length === 1 ? 'filme' : 'filmes'}${st.g ? ' em ' + esc(st.g) : ''}${q ? ' para “' + esc(st.q.trim()) + '”' : ''}`;
      return `<p class="s cn-count" role="status">${lbl}</p>` + (r.length ? `<div class="cn-grid">${r.map(card).join('')}</div>` : UI.em('search', 'Nenhum filme encontrado. Tente outro título ou gênero.'));
    }
    const flagged = all.filter(m => m.feat).sort((x, y) => (y.added || 0) - (x.added || 0));
    const recent = [...all].sort((x, y) => (y.added || 0) - (x.added || 0));
    const cont = all.filter(canResume).sort((x, y) => prog(y.id).u - prog(x.id).u);
    const sn = cn().seen, seen = all.filter(x => sn[x.id]).sort((x, y) => sn[y.id] - sn[x.id]);
    return hero(flagged[0] || recent[0])
      + sec('Continuar assistindo', cont.map(card))
      + sec('Em destaque', flagged.map(card))
      + sec('Adicionados recentemente', recent.slice(0, 12).map(card))
      + sec('Assistidos recentemente', seen.slice(0, 12).map(card))
      + sec('Todos os filmes', [...all].sort(byTitle).map(card), 'cn-grid');
  };

  const empty = () => `<div class="c cn-empty">${UI.em('play', 'Seu catálogo está vazio.')}<p class="s ctr">Cadastre o link de um filme (MP4, WebM ou HLS) e assista aqui mesmo, com progresso salvo automaticamente. Os vídeos não ficam guardados no ARCO — só os links.</p><div class="row" style="justify-content:center;margin-top:14px"><button type=button class=b onclick="CN.add()">${UI.i('plus')}Adicionar o primeiro filme</button></div><p class="s ctr" style="margin-top:14px">Use apenas filmes próprios, de domínio público ou que você tenha autorização para reproduzir. O Internet Archive e o Wikimedia Commons têm filmes de domínio público com link direto para o arquivo.</p></div>`;

  const catalog = () => {
    const head = UI.h('ARCO Cinema', `<button type=button class=b onclick="CN.add()">${UI.i('plus')}Adicionar filme</button>`);
    if (!list().length) return head + empty() + `<p class="s cn-sy ctr" id="cn-sy">${syLine()}</p>`;
    if (st.sy) { const y = st.sy; st.sy = 0; setTimeout(() => window.scrollTo(0, y), 0); }
    return head + `<div class="cn-bar"><label class="cn-search">${UI.i('search')}<input id="cn-q" type="search" placeholder="Buscar filme pelo título" value="${esc(st.q)}" oninput="CN.q(this.value)" autocomplete="off" enterkeyhint="search" aria-label="Buscar filme pelo título"></label></div><div class="row chips cn-chips" id="cn-ch">${chipsHtml()}</div><div id="cn-res">${results()}</div><p class="s cn-sy" id="cn-sy">${syLine()}</p>`;
  };

  const detail = m => {
    const src = [host(m.url), (m.alts && m.alts.length) ? (m.alts.length + 1) + ' qualidades' : '', (m.subs && m.subs.length) ? m.subs.length + (m.subs.length === 1 ? ' legenda' : ' legendas') : ''].filter(Boolean).join(' · ');
    const back = UI.h(`<span style="display:inline-flex;align-items:center;gap:8px">${UI.ib('CN.back()', 'left', 'Voltar')}Detalhes</span>`);
    return back + hero(m, true) + (src ? `<p class="s cn-src">Fonte: ${esc(src)}</p>` : '');
  };

  P.cin = () => {
    const m = st.v === 'det' ? mv(st.id) : null;
    if (m) return detail(m);
    st.v = 'home';
    return catalog();
  };

  /* ================= cadastro / edição ================= */
  const parseLines = (txt, def) => {
    const out = [];
    const lines = String(txt || '').split(/\n+/);
    for (let i = 0; i < lines.length; i++) {
      const ln = lines[i].trim();
      if (!ln) continue;
      const k = ln.indexOf('|');
      const l = k >= 0 ? ln.slice(0, k).trim() : '', u = (k >= 0 ? ln.slice(k + 1) : ln).trim();
      if (!safeUrl(u) || (!/^[a-z][a-z0-9+.-]*:/i.test(u) && !/[\/.]/.test(u))) return { err: 'Linha ' + (i + 1) + ' (“' + ln.slice(0, 40) + '”): use  Nome | https://link  com um endereço http(s) válido.' };
      out.push({ l: l || def(out.length + 1), u });
    }
    return { list: out };
  };
  const askDel = m => confirm('Excluir “' + m.title + '”?\n\nO filme sai do catálogo e o progresso salvo é apagado. Esta ação não pode ser desfeita.');
  const doDel = id => {
    const c = cn(), i = c.movies.findIndex(x => x && x.id === id), tomb = { id, del: 1, u: Date.now() };
    if (i >= 0) c.movies[i] = tomb; else c.movies.push(tomb);
    delete c.prog[id]; delete c.seen[id];
    persist();
    bcast({ t: 'ci-b', m: [tomb] });
    st.v = 'home';
    if (history.state && history.state.cv && !history.state.w) { try { history.back(); return; } catch (e) {} }
    render();
  };

  /* Testa um link: classifica, sonda o servidor e tenta carregar os metadados num <video> invisível */
  const testSource = async url => {
    const c = classify(url), lines = [];
    if (c.k === 'invalid') return { lines: [['er', c.why]] };
    if (c.k === 'page') return { lines: [['er', pageMsg(c)]] };
    if (c.k === 'unsupported') return { lines: [['er', c.why]] };
    if (c.mixed) return { lines: [['er', MIXED]] };
    const fw = fmtWarn(c);
    const info = await probe(c.u);
    const v = document.createElement('video');
    v.preload = 'metadata'; v.muted = true; v.playsInline = true;
    let h = null;
    const r = await new Promise(done => {
      const to = setTimeout(() => done({ err: 'timeout' }), 15000);
      v.onloadedmetadata = () => { clearTimeout(to); done({ dur: v.duration, w: v.videoWidth, h: v.videoHeight }); };
      v.onerror = () => { clearTimeout(to); done({ err: 'media', code: v.error && v.error.code }); };
      h = attach(v, c, { start: 0, fatal: k => { clearTimeout(to); done({ err: 'hls', kind: k }); } });
    });
    try { h.destroy(); v.removeAttribute('src'); v.load(); } catch (e) {}
    if (r.err === 'media') { const m = msgMedia(r.code, c, info); return { lines: [['er', m.title + ': ' + m.msg]] }; }
    if (r.err === 'hls') { const m = msgHls(r.kind, c, info); return { lines: [['er', m.title + ': ' + m.msg]] }; }
    if (r.err === 'timeout') return { lines: [['er', 'O servidor demorou demais para responder (15 s). O link pode estar fora do ar ou ser muito lento.']] };
    const mins = isFinite(r.dur) && r.dur > 0 ? Math.round(r.dur / 60) : 0;
    lines.push(['ok', '✓ O vídeo carregou' + (mins ? ' — ' + fmtDur(mins) : '') + (r.w ? ' · ' + r.w + '×' + r.h : '') + (c.k === 'hls' ? ' (HLS)' : '')]);
    if (fw) lines.push(['wa', fw]);
    if (c.k === 'file' && info.range === false) lines.push(['wa', 'O servidor não aceita requisições parciais (Range): avançar ou voltar pela barra pode não funcionar bem.']);
    if (info.cors === false) lines.push(['wa', c.k === 'hls' ? 'Sem CORS neste servidor: o HLS pode falhar.' : 'Sem CORS neste servidor: o vídeo toca, mas legendas externas desse mesmo servidor podem ser bloqueadas.']);
    return { lines, mins };
  };

  const openForm = m => {
    const v = m || {}, md = $('#md');
    const subsTxt = (v.subs || []).map(x => x.l + ' | ' + x.u).join('\n'), altsTxt = (v.alts || []).map(x => x.l + ' | ' + x.u).join('\n');
    md.onclick = null;
    md.innerHTML = `<form class="box cn-form" novalidate autocomplete="off"><h3>${m ? 'Editar filme' : 'Adicionar filme'}</h3>
<div class="cn-fm" id="cn-fm" role="alert" hidden></div>
<label>Título *<input name="title" maxlength="140" value="${esc(v.title)}" required></label>
<label>URL da capa<input name="cover" type="url" inputmode="url" placeholder="https://…/capa.jpg" value="${esc(v.cover)}"></label>
<div class="cn-prev" id="cn-prev"></div>
<label>Sinopse<textarea name="synopsis" rows="4" maxlength="3000">${esc(v.synopsis)}</textarea></label>
<div class="cn-two"><label>Ano de lançamento<input name="year" type="number" inputmode="numeric" min="1888" max="2100" step="1" value="${v.year ? esc(v.year) : ''}"></label><label>Duração <small>(105 ou 1h45)</small><input name="dur" placeholder="1h45" value="${v.dur ? esc(fmtDur(v.dur).replace(/ /g, '')) : ''}"></label></div>
<label>Gênero(s) <small>separe por vírgula</small><input name="genres" value="${esc(gen(v).join(', '))}"></label>
<div class="row cn-gsug" id="cn-gsug">${GENRES.map(g => `<button type=button class="ch cn-b" data-gs="${esc(g)}">${esc(g)}</button>`).join('')}</div>
<label>URL do vídeo * <small>MP4, WebM ou HLS (.m3u8) — link direto do arquivo</small><input name="url" type="url" inputmode="url" placeholder="https://…/filme.mp4" value="${esc(v.url)}" required></label>
<div class="row" style="margin:-4px 0 12px"><button type=button class="b g sm" id="cn-test">Testar vídeo</button></div>
<div class="cn-tr" id="cn-tr" aria-live="polite"></div>
<label>Nome da qualidade do link acima <small>(opcional, ex.: 1080p)</small><input name="ql" maxlength="20" placeholder="Padrão" value="${esc(v.ql)}"></label>
<label>Outras qualidades <small>(opcional — uma por linha: 720p | https://…)</small><textarea name="alts" rows="2" placeholder="720p | https://…/filme-720.mp4">${esc(altsTxt)}</textarea></label>
<label>Legendas <small>(opcional, .vtt ou .srt — uma por linha: Português | https://…)</small><textarea name="subs" rows="2" placeholder="Português | https://…/pt.vtt">${esc(subsTxt)}</textarea></label>
<label class="cn-ck"><input type="checkbox" name="feat"${v.feat ? ' checked' : ''}><span>Mostrar em Destaques ★</span></label>
<label class="cn-ck"><input type="checkbox" name="rights"${v.rights ? ' checked' : ''}><span>Confirmo que este conteúdo é meu, é de domínio público ou tenho autorização para reproduzi-lo.</span></label>
<div class="row" style="margin-top:6px"><button class=b>Salvar</button><button type=button class="b g" id=cn>Cancelar</button>${m ? `<button type=button class="b er" id="cn-dl">${UI.i('trash')}Excluir</button>` : ''}</div></form>`;
    md.className = 'on';
    const fr = md.firstChild, el = n => fr.elements[n], val = n => (el(n).value || '').trim();
    const close = () => { md.className = ''; };
    const msg = (t, k) => { const b = $('#cn-fm'); b.hidden = !t; b.className = 'cn-fm ' + (k || 'er'); b.textContent = t || ''; if (t) b.scrollIntoView({ block: 'nearest' }); };

    const prev = () => {
      const u = safeUrl(val('cover')), box = $('#cn-prev');
      if (!u) { box.innerHTML = val('cover') ? '<span class="er">A URL da capa precisa começar com http:// ou https://</span>' : ''; return; }
      box.innerHTML = '<img alt="" referrerpolicy="no-referrer"><span>Carregando capa…</span>';
      const img = box.firstChild, tx = box.lastChild;
      img.onload = () => { tx.textContent = 'Capa carregada.'; };
      img.onerror = () => { img.remove(); tx.textContent = 'Não foi possível carregar essa imagem (link quebrado ou bloqueado pelo site de origem).'; };
      img.src = u;
    };
    let pt; el('cover').addEventListener('input', () => { clearTimeout(pt); pt = setTimeout(prev, 450); });
    if (v.cover) prev();

    const syncChips = () => {
      const have = new Set(val('genres').split(/[,;]+/).map(x => norm(x.trim())).filter(Boolean));
      fr.querySelectorAll('[data-gs]').forEach(b => b.classList.toggle('on', have.has(norm(b.dataset.gs))));
    };
    el('genres').addEventListener('input', syncChips); syncChips();
    $('#cn-gsug').addEventListener('click', e => {
      const b = e.target.closest('[data-gs]'); if (!b) return;
      const cur = val('genres').split(/[,;]+/).map(x => x.trim()).filter(Boolean), k = norm(b.dataset.gs), i = cur.findIndex(x => norm(x) === k);
      if (i >= 0) cur.splice(i, 1); else cur.push(b.dataset.gs);
      el('genres').value = cur.join(', '); syncChips();
    });

    $('#cn-test').onclick = async () => {
      const box = $('#cn-tr'), btn = $('#cn-test'), url = val('url');
      btn.disabled = true; box.innerHTML = '<div>Testando o link…</div>';
      let r; try { r = await testSource(url); } catch (e) { r = { lines: [['er', 'Não foi possível testar este link.']] }; }
      box.innerHTML = r.lines.map(l => `<div class="${l[0]}">${esc(l[1])}</div>`).join('');
      if (r.mins && !val('dur')) { el('dur').value = fmtDur(r.mins).replace(/ /g, ''); box.insertAdjacentHTML('beforeend', '<div>Duração preenchida automaticamente.</div>'); }
      btn.disabled = false;
    };

    $('#cn').onclick = close;
    if (m) $('#cn-dl').onclick = () => { if (askDel(m)) { close(); doDel(m.id); } };

    fr.onsubmit = e => {
      e.preventDefault();
      const fail = (t, n) => { msg(t); if (n) el(n).focus(); };
      const title = val('title');
      if (!title) return fail('Informe o título do filme.', 'title');
      const cov = val('cover');
      if (cov && !safeUrl(cov)) return fail('A URL da capa precisa começar com http:// ou https://', 'cover');
      let year = 0;
      if (val('year')) { year = +val('year'); if (!(year >= 1888 && year <= new Date().getFullYear() + 2)) return fail('Ano de lançamento inválido.', 'year'); }
      const dur = parseDur(val('dur'));
      if (isNaN(dur) || dur > 1500) return fail('Duração inválida. Use minutos (105) ou 1h45.', 'dur');
      const c = classify(val('url'));
      if (c.k === 'invalid') return fail(c.why, 'url');
      const al = parseLines(val('alts'), n => 'Fonte ' + n); if (al.err) return fail('Outras qualidades — ' + al.err, 'alts');
      const sb = parseLines(val('subs'), n => 'Legenda ' + n); if (sb.err) return fail('Legendas — ' + sb.err, 'subs');
      if (!el('rights').checked) return fail('Confirme que você pode reproduzir este conteúdo para salvar.', 'rights');
      if (c.k === 'page' || c.k === 'unsupported' || c.mixed) {
        const why = c.k === 'page' ? pageMsg(c) : c.k === 'unsupported' ? c.why : MIXED;
        if (!confirm(why + '\n\nSalvar mesmo assim? O botão Assistir mostrará o aviso e a opção de abrir a fonte original.')) return;
      }
      const genres = []; val('genres').split(/[,;]+/).map(x => x.trim()).filter(Boolean).forEach(g => { if (!genres.some(x => norm(x) === norm(g))) genres.push(g); });
      const rec = { title, cover: cov, synopsis: val('synopsis'), year, genres: genres.slice(0, 8), dur, url: val('url'), ql: val('ql'), alts: al.list, subs: sb.list, feat: el('feat').checked, rights: true };
      const c0 = cn();
      if (m) { Object.assign(m, rec, { u: Date.now() }); bcast({ t: 'ci-b', m: [m] }); }
      else { const nm = Object.assign({ id: uid(), added: Date.now(), u: Date.now() }, rec); c0.movies.push(nm); bcast({ t: 'ci-b', m: [nm] }); st.q = ''; st.g = ''; st.v = 'home'; }
      close();
      RD();
    };
    const f = el('title'); f && !m && f.focus();
  };

  /* ================= API pública usada pelos botões da página ================= */
  const CN = window.CN = {
    ie(img) { img.remove(); },
    sc(btn, d) { const r = btn.parentNode.querySelector('.cn-row'); if (r) r.scrollBy({ left: d * r.clientWidth * 0.85, behavior: 'smooth' }); },
    q(v) { st.q = v; const r = $('#cn-res'); if (r) r.innerHTML = results(); },
    g(x) { st.g = st.g === x ? '' : x; const c = $('#cn-ch'); if (c) c.innerHTML = chipsHtml(); const r = $('#cn-res'); if (r) r.innerHTML = results(); },
    open(id) {
      if (!mv(id)) return;
      st.sy = window.scrollY || 0; st.v = 'det'; st.id = id;
      try { history.pushState({ p: 'cin', cv: 'd:' + id }, ''); } catch (e) {}
      render(); window.scrollTo(0, 0);
    },
    back() {
      if (history.state && history.state.cv && !history.state.w) { history.back(); return; }
      st.v = 'home'; render();
    },
    add() { openForm(null); },
    edit(id) { const m = mv(id); if (m) openForm(m); },
    del(id) { const m = mv(id); if (m && askDel(m)) doDel(id); },
    feat(id) { const m = mv(id); if (m) { m.feat = !m.feat; m.u = Date.now(); bcast({ t: 'ci-b', m: [m] }); RD(); } },
    play(id, fromStart) { const m = mv(id); if (!m) return; openPlayer(m, fromStart ? 0 : canResume(m) ? prog(id).t : 0); }
  };

  /* ================= reprodutor ================= */
  const SV = d => `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${d}</svg>`;
  const IC = {
    play: SV('<path d="M7 4.5v15l12-7.5z" fill="currentColor" stroke="none"/>'),
    pause: SV('<rect x="6" y="4.5" width="4" height="15" rx="1" fill="currentColor" stroke="none"/><rect x="14" y="4.5" width="4" height="15" rx="1" fill="currentColor" stroke="none"/>'),
    back: SV('<path d="M15 5l-7 7 7 7"/>'),
    b10: SV('<path d="M4 12a8 8 0 1 0 2.6-5.9"/><path d="M4 4v4.5h4.5"/><text x="12" y="15.4" font-size="7.5" font-weight="700" text-anchor="middle" fill="currentColor" stroke="none" font-family="system-ui,sans-serif">10</text>'),
    f10: SV('<path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 4v4.5h-4.5"/><text x="12" y="15.4" font-size="7.5" font-weight="700" text-anchor="middle" fill="currentColor" stroke="none" font-family="system-ui,sans-serif">10</text>'),
    vol: SV('<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" fill="currentColor"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11"/>'),
    mute: SV('<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" fill="currentColor"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>'),
    cc: SV('<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M10 10.2a2.2 2.2 0 1 0 0 3.6M16.5 10.2a2.2 2.2 0 1 0 0 3.6"/>'),
    set: SV('<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>'),
    fs: SV('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'),
    fsx: SV('<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>'),
    ext: SV('<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>'),
    retry: SV('<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>')
  };
  const W = { open: false, m: null, srcs: [], qi: 0, c: null, info: null, pi: null, h: null, levels: null, lvSel: -1, lvCur: -1, start: 0, err: null, pushed: false, menu: '', drag: 0, hover: 0, loading: false, cleaning: 0, subMsg: [], blobs: [], lastSave: 0, lastT: 0, ht: 0, lt: 0, wt: 0, tapT: 0, tapAt: 0, tapSide: 0, ripT: 0 };
  let root = null, v = null, E = {};
  const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement;
  const dur = () => v && isFinite(v.duration) ? v.duration : 0;
  const subTracks = () => Array.from(v.textTracks || []).filter(t => t.kind === 'subtitles' || t.kind === 'captions');

  const ensureUI = () => {
    if (root) return;
    root = document.createElement('div');
    root.id = 'cnp';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', 'Reprodutor de filmes');
    root.innerHTML = `<div class="cn-st" tabindex="-1"><video playsinline webkit-playsinline preload="auto"></video><div class="cn-tap"></div>
<div class="cn-mid"><button type="button" class="cn-big" data-a="pp" aria-label="Reproduzir">${IC.play}</button><div class="cn-spin" role="status" aria-label="Carregando"></div></div>
<div class="cn-slow">A conexão parece lenta… continuando a carregar.</div><div class="cn-rip"></div>
<div class="cn-top"><button type="button" class="cn-ib" data-a="close" aria-label="Voltar">${IC.back}</button><div class="cn-tt"><b></b><span></span></div></div>
<div class="cn-err" role="alert"><h3></h3><p></p><div class="cn-bts"></div></div><div class="cn-mn" hidden></div>
<div class="cn-bot"><div class="cn-seek"><div class="cn-trk"><div class="cn-buf"></div><div class="cn-prg"></div></div><input type="range" min="0" max="1000" step="1" value="0" aria-label="Barra de progresso do filme"><div class="cn-tip"></div></div>
<div class="cn-ctl"><button type="button" class="cn-ib" data-a="pp" aria-label="Reproduzir">${IC.play}</button><button type="button" class="cn-ib" data-a="b10" aria-label="Voltar 10 segundos">${IC.b10}</button><button type="button" class="cn-ib" data-a="f10" aria-label="Avançar 10 segundos">${IC.f10}</button>
<div class="cn-vol"><button type="button" class="cn-ib" data-a="mute" aria-label="Silenciar">${IC.vol}</button><input type="range" min="0" max="1" step="0.02" value="1" aria-label="Volume"></div>
<span class="cn-tm">0:00 / 0:00</span><span class="cn-f"></span>
<button type="button" class="cn-ib tx" data-a="m:sp" aria-label="Velocidade de reprodução">1×</button><button type="button" class="cn-ib" data-a="m:cc" aria-label="Legendas">${IC.cc}</button><button type="button" class="cn-ib" data-a="m:ql" aria-label="Qualidade" style="display:none">${IC.set}</button><button type="button" class="cn-ib" data-a="fs" aria-label="Tela cheia">${IC.fs}</button></div></div></div><input type="file" accept=".vtt,.srt,text/vtt,application/x-subrip,text/plain" hidden>`;
    document.body.appendChild(root);
    const q = s => root.querySelector(s);
    v = q('video');
    E = { st: q('.cn-st'), tap: q('.cn-tap'), ttl: q('.cn-tt b'), sub: q('.cn-tt span'), pp: q('.cn-ctl [data-a="pp"]'), mute: q('[data-a="mute"]'), sp: q('[data-a="m:sp"]'), ql: q('[data-a="m:ql"]'), fs: q('[data-a="fs"]'), rg: q('.cn-seek input'), seek: q('.cn-seek'), prg: q('.cn-prg'), buf: q('.cn-buf'), tip: q('.cn-tip'), tm: q('.cn-tm'), vl: q('.cn-vol input'), mn: q('.cn-mn'), rip: q('.cn-rip'), eh: q('.cn-err h3'), ep: q('.cn-err p'), eb: q('.cn-bts'), top: q('.cn-top'), bot: q('.cn-bot'), file: q('input[type=file]') };

    /* cliques nos botões (delegação) */
    root.addEventListener('click', e => {
      const b = e.target.closest('[data-a]');
      if (!b) { if (W.menu && !e.target.closest('.cn-mn')) closeMenu(); return; }
      if (e.detail > 0) setTimeout(() => b.blur(), 0);
      const a = b.dataset.a;
      if (a === 'pp') toggle();
      else if (a === 'close') closePlayer();
      else if (a === 'b10') skip(-10);
      else if (a === 'f10') skip(10);
      else if (a === 'mute') toggleMute();
      else if (a === 'fs') toggleFs();
      else if (a === 'retry') retry();
      else if (a === 'ext') openExt();
      else if (a.startsWith('m:')) openMenu(a.slice(2));
    });
    E.mn.addEventListener('click', e => {
      const b = e.target.closest('[data-m]'); if (!b) return;
      const i = b.dataset.m.indexOf(':'), k = b.dataset.m.slice(0, i), x = b.dataset.m.slice(i + 1);
      if (k === 'sp') setRate(+x);
      else if (k === 'cc') setSub(x);
      else if (k === 'lv') setLevel(+x);
      else if (k === 'src') switchSrc(+x);
      else if (k === 'file') { E.file.click(); }
      closeMenu();
    });

    /* toque / clique na imagem: mouse = play/pause (duplo clique = tela cheia); toque = mostrar controles (duplo toque = ±10 s) */
    E.tap.addEventListener('pointerup', e => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (W.menu) { closeMenu(); return; }
      const now = Date.now(), r = E.tap.getBoundingClientRect(), side = (e.clientX - r.left) < r.width / 2 ? -1 : 1, mouse = e.pointerType === 'mouse';
      if (now - W.tapAt < 320 && side === W.tapSide) {
        clearTimeout(W.tapT); W.tapAt = 0;
        if (mouse) { toggle(); toggleFs(); } else { skip(side * 10); }
        return;
      }
      W.tapAt = now; W.tapSide = side; clearTimeout(W.tapT);
      if (mouse) { toggle(); showCtl(); }
      else W.tapT = setTimeout(() => { W.tapAt = 0; root.classList.contains('cn-show') ? hideCtl() : showCtl(); }, 260);
    });
    E.st.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') showCtl(); });
    [E.top, E.bot].forEach(x => { x.addEventListener('pointerenter', () => { W.hover = 1; }); x.addEventListener('pointerleave', () => { W.hover = 0; showCtl(); }); });

    /* barra de progresso */
    E.rg.addEventListener('input', () => {
      W.drag = 1; E.seek.classList.add('dr');
      E.prg.style.width = (E.rg.value / 10) + '%';
      E.tm.textContent = clock(E.rg.value / 1000 * dur()) + ' / ' + clock(dur());
    });
    E.rg.addEventListener('change', () => {
      if (dur()) v.currentTime = E.rg.value / 1000 * dur();
      W.drag = 0; E.seek.classList.remove('dr'); showCtl();
    });
    E.seek.addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse' || !dur()) return;
      const r = E.seek.getBoundingClientRect(), x = Math.min(Math.max(e.clientX - r.left, 0), r.width);
      E.tip.style.left = x + 'px'; E.tip.textContent = clock(x / r.width * dur()); E.tip.style.opacity = 1;
    });
    E.seek.addEventListener('pointerleave', () => { E.tip.style.opacity = 0; });

    /* volume */
    E.vl.addEventListener('input', () => { v.volume = +E.vl.value; v.muted = +E.vl.value === 0; });

    /* legenda enviada pelo aparelho */
    E.file.addEventListener('change', async () => {
      const f = E.file.files[0]; E.file.value = '';
      if (!f) return;
      try {
        const b = await f.arrayBuffer();
        let txt; try { txt = new TextDecoder('utf-8', { fatal: true }).decode(b); } catch (e) { txt = new TextDecoder('windows-1252').decode(b); }
        const label = f.name.replace(/\.[^.]+$/, '');
        addTrack(label, toVtt(txt), true); setPref({ sub: label });
      } catch (e) { W.subMsg.push('Arquivo de legenda inválido (use .vtt ou .srt).'); }
      if (W.menu === 'cc') renderMenu();
    });

    /* eventos do <video> */
    const on = (t, f) => v.addEventListener(t, f);
    on('loadstart', () => { if (W.open && !W.cleaning) { W.loading = true; sync(); } });
    on('loadedmetadata', onMeta);
    on('durationchange', updTime);
    on('timeupdate', () => { updTime(); if (v.currentTime > 0) W.lastT = v.currentTime; if (!v.paused && Date.now() - W.lastSave > 10000) saveProg(); });
    on('progress', updBuf);
    on('waiting', () => { if (!W.open) return; W.loading = true; clearTimeout(W.wt); W.wt = setTimeout(() => root.classList.add('cn-slw'), 12000); sync(); });
    ['canplay', 'playing', 'seeked', 'loadeddata'].forEach(t => on(t, () => { W.loading = false; clearTimeout(W.wt); root.classList.remove('cn-slw'); sync(); }));
    on('suspend', () => { if (v.paused) { W.loading = false; sync(); } });
    on('play', () => { sync(); showCtl(); });
    on('pause', () => { if (!W.cleaning) saveProg(); sync(); showCtl(); });
    on('ended', () => { saveProg(); sync(); showCtl(true); });
    on('volumechange', () => {
      E.vl.value = v.muted ? 0 : v.volume;
      E.vl.style.setProperty('--v', (v.muted ? 0 : v.volume) * 100 + '%');
      E.mute.innerHTML = v.muted || v.volume === 0 ? IC.mute : IC.vol;
      E.mute.setAttribute('aria-label', v.muted ? 'Ativar som' : 'Silenciar');
      if (W.open) setPref({ vol: v.volume, muted: v.muted });
    });
    on('ratechange', () => { E.sp.textContent = (v.playbackRate === 1 ? '1' : v.playbackRate) + '×'; });
    on('error', onErr);
    v.addEventListener('webkitendfullscreen', () => { sync(); });
    ['fullscreenchange', 'webkitfullscreenchange'].forEach(t => document.addEventListener(t, () => {
      const f = !!fsEl();
      E.fs.innerHTML = f ? IC.fsx : IC.fs; E.fs.setAttribute('aria-label', f ? 'Sair da tela cheia' : 'Tela cheia');
      if (!f) { try { screen.orientation && screen.orientation.unlock && screen.orientation.unlock(); } catch (e) {} }
    }));
  };

  /* ---- estado visual ---- */
  const sync = () => {
    if (!root) return;
    const bad = !!W.err;
    root.classList.toggle('cn-bad', bad);
    root.classList.toggle('cn-load', !bad && W.loading);
    root.classList.toggle('cn-paused', !bad && v.paused && !W.loading);
    E.pp.innerHTML = v.paused ? IC.play : IC.pause;
    E.pp.setAttribute('aria-label', v.paused ? 'Reproduzir' : 'Pausar');
  };
  const showCtl = stick => {
    if (!root) return;
    root.classList.add('cn-show'); clearTimeout(W.ht);
    if (stick || W.menu || W.err || W.hover || v.paused) return;
    W.ht = setTimeout(() => { if (!v.paused && !W.menu && !W.hover) root.classList.remove('cn-show'); }, 3200);
  };
  const hideCtl = () => { if (!W.err && !W.menu) root.classList.remove('cn-show'); };
  const updBuf = () => {
    const d = dur(); if (!d) { E.buf.style.width = '0'; return; }
    let end = 0;
    for (let i = 0; i < v.buffered.length; i++) if (v.buffered.start(i) <= v.currentTime + 0.5 && v.buffered.end(i) >= end) end = v.buffered.end(i);
    E.buf.style.width = Math.min(100, end / d * 100) + '%';
  };
  const updTime = () => {
    if (!W.open) return;
    const d = dur(), t = v.currentTime || 0, live = v.duration === Infinity;
    E.rg.disabled = !d;
    if (!W.drag) {
      E.rg.value = d ? Math.round(t / d * 1000) : 0;
      E.prg.style.width = d ? Math.min(100, t / d * 100) + '%' : '0';
      E.tm.textContent = d ? clock(t) + ' / ' + clock(d) : live ? 'AO VIVO' : clock(t);
    }
    updBuf();
  };
  const updQL = () => { E.ql.style.display = (W.levels && W.levels.length > 1) || W.srcs.length > 1 ? '' : 'none'; };
  const rip = side => {
    E.rip.textContent = (side < 0 ? '−10 s' : '+10 s');
    E.rip.style.left = side < 0 ? '12%' : 'auto'; E.rip.style.right = side > 0 ? '12%' : 'auto';
    E.rip.classList.add('on'); clearTimeout(W.ripT); W.ripT = setTimeout(() => E.rip.classList.remove('on'), 550);
  };

  /* ---- comandos ---- */
  const tryPlay = () => { const p = v.play(); if (p && p.catch) p.catch(() => sync()); };
  const toggle = () => { if (W.err) return; v.paused || v.ended ? tryPlay() : v.pause(); };
  const skip = s => { if (!dur()) return; v.currentTime = Math.max(0, Math.min(dur(), (v.currentTime || 0) + s)); rip(s); showCtl(); };
  const toggleMute = () => { v.muted = !v.muted; if (!v.muted && v.volume === 0) v.volume = 0.5; };
  const setRate = r => { v.playbackRate = r; setPref({ rate: r }); };
  const toggleFs = () => {
    if (fsEl()) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
    const rq = E.st.requestFullscreen || E.st.webkitRequestFullscreen;
    if (rq) {
      Promise.resolve(rq.call(E.st)).then(() => { try { screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {}); } catch (e) {} }).catch(() => {});
    } else if (v.webkitEnterFullscreen) { try { v.webkitEnterFullscreen(); } catch (e) {} }
  };
  const openExt = () => { const u = safeUrl(W.srcs[W.qi] && W.srcs[W.qi].u); if (u) window.open(u, '_blank', 'noopener,noreferrer'); };

  /* ---- legendas ---- */
  const addTrack = (label, vtt, show) => {
    const url = URL.createObjectURL(new Blob([vtt], { type: 'text/vtt' }));
    W.blobs.push(url);
    const t = document.createElement('track');
    t.kind = 'subtitles'; t.label = label; t.src = url;
    v.appendChild(t);
    if (show) subTracks().forEach(x => { x.mode = x === t.track ? 'showing' : 'disabled'; });
    else t.track.mode = 'disabled';
    if (W.menu === 'cc') renderMenu();
    return t;
  };
  const loadSubs = m => {
    const pref = getPref().sub;
    (Array.isArray(m.subs) ? m.subs : []).forEach(async s => {
      try {
        const txt = await fetchText(s.u);
        if (!W.open || W.m !== m) return;
        addTrack(s.l, toVtt(txt), pref === s.l);
      } catch (e) {
        if (!W.open || W.m !== m) return;
        W.subMsg.push((s.l || 'Legenda') + ': ' + (e && e.message === 'formato' ? 'formato não reconhecido (use .vtt ou .srt).' : e instanceof TypeError ? 'bloqueada pelo servidor (CORS) ou inacessível.' : String(e && e.message || e)));
        if (W.menu === 'cc') renderMenu();
      }
    });
  };
  const setSub = x => {
    const T = subTracks();
    T.forEach((t, i) => { t.mode = String(i) === x ? 'showing' : 'disabled'; });
    setPref({ sub: T[+x] ? T[+x].label : '' });
  };

  /* ---- qualidade ---- */
  const lvLabel = (L, l) => (l.h ? l.h + 'p' : Math.round(l.br / 1000) + ' kbps') + (l.h && L.filter(z => z.h === l.h).length > 1 ? ' · ' + Math.round(l.br / 1000) + ' kbps' : '');
  const setLevel = i => { if (W.h && W.h.hls) { W.h.hls.currentLevel = i; W.lvSel = i; } };
  const switchSrc = i => { if (i === W.qi) return; const t = v.currentTime || 0, was = !v.paused; loadSource(i, t, was); };

  /* ---- menus ---- */
  const renderMenu = () => {
    const k = W.menu; let h = '';
    if (k === 'sp') {
      h = '<h4>Velocidade</h4>' + [0.5, 0.75, 1, 1.25, 1.5, 2].map(r => `<button type="button" class="cn-mi" data-m="sp:${r}"><i>${v.playbackRate === r ? '✓' : ''}</i>${r === 1 ? 'Normal' : r + '×'}</button>`).join('');
    } else if (k === 'cc') {
      const T = subTracks();
      h = '<h4>Legendas</h4>' + `<button type="button" class="cn-mi" data-m="cc:off"><i>${T.every(t => t.mode !== 'showing') ? '✓' : ''}</i>Desativadas</button>`
        + T.map((t, i) => `<button type="button" class="cn-mi" data-m="cc:${i}"><i>${t.mode === 'showing' ? '✓' : ''}</i>${esc(t.label || 'Legenda ' + (i + 1))}</button>`).join('')
        + '<button type="button" class="cn-mi" data-m="file:"><i></i>Carregar arquivo do aparelho…</button>'
        + W.subMsg.map(x => `<p class="er">${esc(x)}</p>`).join('')
        + (!T.length && !W.subMsg.length ? '<p>' + ((W.m && W.m.subs && W.m.subs.length) ? 'Carregando legendas…' : 'Este filme não tem legendas cadastradas.') + '</p>' : '');
    } else if (k === 'ql') {
      if (W.levels && W.levels.length > 1) {
        const L = W.levels.slice().sort((a, b) => b.h - a.h || b.br - a.br), cur = W.levels.find(z => z.i === W.lvCur);
        h = '<h4>Qualidade</h4>' + `<button type="button" class="cn-mi" data-m="lv:-1"><i>${W.lvSel === -1 ? '✓' : ''}</i>Automática${cur && W.lvSel === -1 ? ' (' + esc(lvLabel(L, cur)) + ')' : ''}</button>`
          + L.map(l => `<button type="button" class="cn-mi" data-m="lv:${l.i}"><i>${W.lvSel === l.i ? '✓' : ''}</i>${esc(lvLabel(L, l))}</button>`).join('');
      } else {
        h = '<h4>Qualidade</h4>' + W.srcs.map((s, i) => `<button type="button" class="cn-mi" data-m="src:${i}"><i>${W.qi === i ? '✓' : ''}</i>${esc(s.l)}</button>`).join('');
      }
    }
    E.mn.innerHTML = h;
  };
  const openMenu = k => { if (W.menu === k) { closeMenu(); return; } W.menu = k; renderMenu(); E.mn.hidden = false; showCtl(true); };
  const closeMenu = () => { W.menu = ''; if (E.mn) E.mn.hidden = true; if (root && root.classList.contains('on')) showCtl(); };

  /* ---- progresso ---- */
  const saveProg = () => {
    const m = W.m; if (!W.open || !m || !v || W.cleaning || W.start > 0) return;
    const d = v.duration, t = v.currentTime;
    if (!isFinite(d) || d <= 0 || !(t >= 0) || v.readyState < 1) return;
    if (!mv(m.id)) return;
    const c = cn(), old = c.prog[m.id];
    if (t < 5 && !old && !v.ended) return;
    const done = v.ended || d - t < Math.max(10, Math.min(120, d * 0.03));
    c.prog[m.id] = { t: done ? 0 : Math.floor(t), d: Math.floor(d), u: Date.now(), done };
    W.lastSave = Date.now();
    persist();
    bcast({ t: 'ci-b', p: { [m.id]: c.prog[m.id] } });
  };

  /* ---- carregar / falhar ---- */
  const cleanSrc = () => {
    clearTimeout(W.lt); clearTimeout(W.wt);
    if (W.h) { W.h.destroy(); W.h = null; }
    W.cleaning = 1;
    try { v.pause(); v.removeAttribute('src'); v.load(); } catch (e) {}
    W.cleaning = 0;
  };
  const fail = o => {
    if (!W.open || W.err) return;
    W.err = o; W.loading = false; clearTimeout(W.lt); clearTimeout(W.wt);
    W.cleaning = 1; try { v.pause(); } catch (e) {} W.cleaning = 0;
    const ext = safeUrl(W.srcs[W.qi] && W.srcs[W.qi].u);
    const retry = o.retry !== false;
    E.eh.textContent = o.title; E.ep.textContent = o.msg;
    E.eb.innerHTML = (retry ? `<button type="button" class="cn-bt p" data-a="retry">${IC.retry}Tentar novamente</button>` : '')
      + (ext ? `<button type="button" class="cn-bt${retry ? '' : ' p'}" data-a="ext">${IC.ext}Abrir fonte original</button>` : '')
      + '<button type="button" class="cn-bt" data-a="close">Fechar</button>';
    closeMenu(); root.classList.add('cn-show'); sync();
  };
  const loadSource = (i, start, auto) => {
    cleanSrc();
    W.qi = i; W.err = null; W.loading = true; W.start = start || 0; W.levels = null; W.lvSel = -1; W.lvCur = -1; W.info = null;
    root.classList.remove('cn-bad', 'cn-slw');
    updQL(); sync();
    const s = W.srcs[i];
    if (!s) return fail({ title: 'Sem link de vídeo', msg: 'Este filme não tem um link de vídeo cadastrado. Edite o filme e informe a URL.', retry: false });
    const c = W.c = classify(s.u);
    if (c.k === 'page') return fail({ title: 'Este link não é um vídeo', msg: pageMsg(c), retry: false });
    if (c.k === 'invalid' || c.k === 'unsupported') return fail({ title: 'Link de vídeo inválido', msg: c.why, retry: false });
    if (c.mixed) return fail({ title: 'Conteúdo bloqueado pelo navegador', msg: MIXED, retry: false });
    W.pi = probe(c.u).then(x => (W.info = x));
    W.h = attach(v, c, {
      start: W.start,
      levels: L => { W.levels = L; updQL(); if (W.menu === 'ql') renderMenu(); },
      level: x => { W.lvCur = x; if (W.menu === 'ql') renderMenu(); },
      fatal: (k) => { Promise.race([W.pi, wait(1200)]).then(info => fail(msgHls(k, c, info || W.info))); }
    });
    W.lt = setTimeout(() => {
      if (!W.open || W.err || v.readyState >= 1) return;
      Promise.race([W.pi, wait(500)]).then(info => {
        info = info || W.info;
        if (info && info.reach === false) return fail(msgMedia(2, c, info));
        fail({ title: 'O servidor demorou para responder', msg: 'O vídeo não começou a carregar em 25 segundos. O servidor pode estar lento ou fora do ar' + (info && info.range === false ? ', ou o arquivo MP4 precisa ser baixado inteiro antes de tocar (servidor sem suporte a Range)' : '') + '. Tente novamente ou confira o link.' });
      });
    }, 25000);
    if (auto !== false) tryPlay();
  };
  const onMeta = () => {
    clearTimeout(W.lt);
    const d = v.duration;
    if (W.start > 0 && isFinite(d) && !(W.h && W.h.hls)) { try { v.currentTime = Math.min(W.start, Math.max(0, d - 2)); } catch (e) {} }
    W.start = 0;
    if (v.paused) { W.loading = false; }
    const m = W.m;
    if (m && !m.dur && isFinite(d) && d > 0) { m.dur = Math.round(d / 60); m.u = Date.now(); persist(); bcast({ t: 'ci-b', m: [m] }); E.sub.textContent = metaLine(m); }
    updTime(); sync();
  };
  const onErr = () => {
    if (!W.open || W.cleaning || W.err || (W.h && W.h.hls) || !v.currentSrc) return;
    const code = v.error && v.error.code, c = W.c;
    Promise.race([W.pi, wait(1200)]).then(info => fail(msgMedia(code, c, info || W.info)));
  };
  const retry = () => { const t = W.lastT || 0; loadSource(W.qi, t, true); showCtl(); };

  /* ---- abrir / fechar ---- */
  const applyPrefs = () => {
    const p = getPref();
    v.volume = typeof p.vol === 'number' ? Math.min(1, Math.max(0, p.vol)) : 1;
    v.muted = !!p.muted;
    v.playbackRate = p.rate > 0 ? p.rate : 1;
    v.dispatchEvent(new Event('volumechange')); v.dispatchEvent(new Event('ratechange'));
  };
  const openPlayer = (m, start) => {
    ensureUI();
    if (W.open) closeNow(false);
    const srcs = [{ l: m.ql || 'Padrão', u: m.url }].concat(Array.isArray(m.alts) ? m.alts.filter(a => a && a.u) : []);
    Object.assign(W, { open: true, m, srcs, qi: 0, err: null, menu: '', start: 0, subMsg: [], blobs: [], lastSave: Date.now(), lastT: start || 0, hover: 0, drag: 0 });
    const c = cn();
    c.seen[m.id] = Date.now();
    persist();
    bcast({ t: 'ci-b', s: { [m.id]: c.seen[m.id] } });
    try { history.pushState({ p: 'cin', cv: st.v === 'det' ? 'd:' + st.id : '', w: 1 }, ''); W.pushed = true; } catch (e) { W.pushed = false; }
    E.ttl.textContent = m.title; E.sub.textContent = metaLine(m);
    E.mn.hidden = true;
    applyPrefs();
    root.classList.add('on', 'cn-show'); document.documentElement.classList.add('cn-lock');
    try { E.st.focus({ preventScroll: true }); } catch (e) {}
    loadSource(0, start, true);
    loadSubs(m);
    updTime(); sync(); showCtl();
  };
  const closeNow = rerender => {
    if (!W.open) return;
    saveProg();
    cleanSrc();
    v.querySelectorAll('track').forEach(t => t.remove());
    W.blobs.forEach(u => { try { URL.revokeObjectURL(u); } catch (e) {} }); W.blobs = [];
    closeMenu();
    if (fsEl()) { try { (document.exitFullscreen || document.webkitExitFullscreen).call(document); } catch (e) {} }
    clearTimeout(W.ht); clearTimeout(W.tapT);
    root.classList.remove('on', 'cn-show', 'cn-bad', 'cn-load', 'cn-paused', 'cn-slw');
    document.documentElement.classList.remove('cn-lock');
    W.open = false; W.pushed = false; W.m = null; W.err = null;
    if (rerender && page === 'cin') render();
  };
  const closePlayer = () => {
    if (!W.open) return;
    if (W.pushed) { try { history.back(); return; } catch (e) {} }
    closeNow(true);
  };

  /* ================= sincronização entre aparelhos pareados (mesmo canal do Hub, como a Música) =================
     O catálogo continua no localStorage de cada aparelho. Ao conectar, os dois trocam tudo (hello) e depois cada
     alteração é enviada na hora. Mescla por data: vale a alteração mais recente de cada filme ('u'); exclusões
     viram marcadores {del:1}; progresso vale o mais recente; "assistidos" vale o mais recente. Só trafegam links e textos. */
  const syOk = () => typeof SY !== 'undefined' && SY._conns && SY._c;
  const openConns = () => syOk() ? Object.values(SY._conns()).filter(c => c.open && c.hid) : [];
  const sendJ = (c, o) => { try { c.send(JSON.stringify(o)); } catch (e) {} };
  const bcast = o => { try { openConns().forEach(c => sendJ(c, o)); } catch (e) {} };
  const SZ = 11000;
  const str = (x, n) => typeof x === 'string' ? x.trim().slice(0, n) : '';
  const num = x => Number.isFinite(+x) ? +x : 0;
  const okUrl = x => { x = str(x, 2000); return x && safeUrl(x) ? x : ''; };
  const cleanLines = a => Array.isArray(a) ? a.slice(0, 12).map(x => x && typeof x === 'object' ? { l: str(x.l, 40), u: okUrl(x.u) } : null).filter(x => x && x.u) : [];
  /* nunca confia no que chega: normaliza tipos, tamanhos e links */
  const cleanMovie = r => {
    if (!r || typeof r !== 'object' || !idOk(r.id)) return null;
    const o = { id: r.id, u: num(r.u), added: num(r.added) };
    if (r.del) { o.del = 1; return o; }
    o.title = str(r.title, 140);
    if (!o.title) return null;
    o.cover = okUrl(r.cover); o.synopsis = str(r.synopsis, 3000);
    o.year = Math.max(0, Math.min(2100, Math.round(num(r.year)))); o.dur = Math.max(0, Math.min(1500, Math.round(num(r.dur))));
    o.genres = Array.isArray(r.genres) ? r.genres.slice(0, 8).map(g => str(g, 40)).filter(Boolean) : [];
    o.url = okUrl(r.url); o.ql = str(r.ql, 20); o.alts = cleanLines(r.alts); o.subs = cleanLines(r.subs);
    o.feat = !!r.feat; o.rights = !!r.rights;
    return o;
  };
  const mergeMovie = r => {
    const n = cleanMovie(r); if (!n) return false;
    const c = cn(), i = c.movies.findIndex(x => x && x.id === n.id);
    if (i < 0) { c.movies.push(n); return true; }
    if (n.u > (c.movies[i].u || 0)) { c.movies[i] = n; return true; }
    return false;
  };
  const mergeProg = (id, p) => {
    if (!p || typeof p !== 'object') return false;
    const n = { t: Math.max(0, num(p.t)), d: Math.max(0, num(p.d)), u: num(p.u), done: !!p.done }, c = cn();
    if (!c.prog[id] || n.u > (c.prog[id].u || 0)) { c.prog[id] = n; return true; }
    return false;
  };
  const mergeSeen = (id, ts) => { ts = num(ts); const c = cn(); if (ts > (c.seen[id] || 0)) { c.seen[id] = ts; return true; } return false; };
  const applyBatch = m => {
    let ch = false;
    (Array.isArray(m.m) ? m.m : []).slice(0, 300).forEach(x => { if (mergeMovie(x)) ch = true; });
    if (m.p && typeof m.p === 'object') Object.keys(m.p).slice(0, 300).forEach(id => { if (idOk(id) && mergeProg(id, m.p[id])) ch = true; });
    if (m.s && typeof m.s === 'object') Object.keys(m.s).slice(0, 300).forEach(id => { if (idOk(id) && mergeSeen(id, m.s[id])) ch = true; });
    return ch;
  };
  const packAll = () => {
    const c = cn(), out = []; let cur = [], len = 0;
    c.movies.forEach(m => {
      if (!m || !idOk(m.id)) return;
      const j = JSON.stringify(m);
      if (len + j.length > SZ && cur.length) { out.push({ t: 'ci-b', m: cur }); cur = []; len = 0; }
      cur.push(m); len += j.length + 1;
    });
    if (cur.length) out.push({ t: 'ci-b', m: cur });
    const chunk = (obj, key) => { const ks = Object.keys(obj); for (let i = 0; i < ks.length; i += 80) { const o = {}; ks.slice(i, i + 80).forEach(k => { o[k] = obj[k]; }); out.push({ t: 'ci-b', [key]: o }); } };
    chunk(c.prog, 'p'); chunk(c.seen, 's');
    return out;
  };
  const hello = c => packAll().forEach(b => sendJ(c, b));
  /* atualiza a tela sem perder o foco da busca nem interromper o filme */
  const refreshUI = () => {
    if (page !== 'cin' || W.open) return;
    if (st.v === 'det') { render(); return; }
    const r = $('#cn-res');
    if (r && list().length) { $('#cn-ch').innerHTML = chipsHtml(); r.innerHTML = results(); } else render();
  };
  const onData = (c, d) => {
    if (typeof d !== 'string' || d[0] !== '{') return;
    let m; try { m = JSON.parse(d); } catch (e) { return; }
    if (!m || typeof m.t !== 'string' || m.t.slice(0, 3) !== 'ci-') return;
    if (!c._ih) { c._ih = 1; hello(c); }
    if (m.t === 'ci-b' && applyBatch(m)) { persist(); refreshUI(); }
  };
  const devName = id => { const l = (syOk() ? SY._c().links || [] : []).find(x => x.id == id); return l ? ((l.icon || '') + ' ' + l.name).trim() : 'Outro aparelho'; };
  const syLine = () => {
    const oc = openConns(), links = syOk() ? SY._c().links || [] : [];
    if (oc.length) return `⇄ Sincronizando com ${oc.map(c => esc(devName(c.hid))).join(', ')} <button type=button class="b g sm" onclick="CN.sync()">Sincronizar agora</button>`;
    return links.length ? '⇄ Nenhum aparelho pareado está conectado agora. Seus filmes ficam salvos neste aparelho e sincronizam quando o outro abrir o ARCO.' : '⇄ Para levar seus filmes a outro aparelho, pareie em Configurações → Conectar dispositivo. O catálogo e o progresso passam automaticamente.';
  };
  const updSy = () => { const e = $('#cn-sy'); if (e) e.innerHTML = syLine(); };
  let syIds = '';
  const link = () => {
    if (!syOk()) return;
    try {
      const oc = openConns();
      oc.forEach(c => { if (!c._ci) { c._ci = 1; c.on('data', d => onData(c, d)); hello(c); } });
      const ids = oc.map(c => c.hid).sort().join(',');
      if (ids !== syIds) { syIds = ids; updSy(); }
    } catch (e) {}
  };
  CN.sync = () => {
    openConns().forEach(hello);
    const e = $('#cn-sy'); if (!e) return;
    e.textContent = '⇄ Enviado. Os aparelhos conectados trocaram os dados.';
    setTimeout(updSy, 2500);
  };
  setInterval(link, 1000);
  initData();

  /* ================= ligações globais ================= */
  document.addEventListener('keydown', e => {
    if (!W.open || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key, onBtn = !!(e.target.closest && e.target.closest('button'));
    const act = f => { e.preventDefault(); showCtl(); f(); };
    if (k === 'Escape') { e.preventDefault(); if (W.menu) closeMenu(); else if (!fsEl()) closePlayer(); return; }
    if (k === ' ' || k === 'Spacebar') { if (onBtn) return; act(toggle); }
    else if (k === 'k' || k === 'K') act(toggle);
    else if (k === 'ArrowLeft' || k === 'ArrowRight') { if (e.target === E.vl) return; act(() => skip(k === 'ArrowLeft' ? -5 : 5)); }
    else if (k === 'j' || k === 'J') act(() => skip(-10));
    else if (k === 'l' || k === 'L') act(() => skip(10));
    else if (k === 'ArrowUp' || k === 'ArrowDown') { if (e.target === E.vl) return; act(() => { v.muted = false; v.volume = Math.min(1, Math.max(0, v.volume + (k === 'ArrowUp' ? 0.1 : -0.1))); }); }
    else if (k === 'm' || k === 'M') act(toggleMute);
    else if (k === 'f' || k === 'F') act(toggleFs);
    else if (k === 'c' || k === 'C') act(() => { const T = subTracks(); if (!T.length) return; const on = T.some(t => t.mode === 'showing'); setSub(on ? 'off' : '0'); });
    else if (/^[0-9]$/.test(k) && dur()) act(() => { v.currentTime = dur() * (+k) / 10; });
    else if (k === 'Home') act(() => { v.currentTime = 0; });
  });

  /* ligações com a navegação do ARCO (clique no menu, botão voltar do celular) */
  document.addEventListener('click', e => {
    const t = e.target;
    if (!t || !t.closest) return;
    if (W.open && t.closest('#nv')) { W.pushed = false; closeNow(false); }
    if (t.closest('[onclick*="go(\'cin\')"]')) { st.v = 'home'; st.id = null; }
    const gb = t.closest('[data-cng]');
    if (gb) { CN.g(gb.dataset.cng); return; }
    const go = t.closest('[data-cngo]');
    if (go) { st.g = go.dataset.cngo; st.q = ''; st.v = 'home'; st.id = null; render(); window.scrollTo(0, 0); }
  }, true);
  window.addEventListener('popstate', e => {
    const md = document.getElementById('md');
    if (md && md.className === 'on') return;
    const s = e.state || {};
    if (W.open && !s.w) { W.pushed = false; closeNow(false); }
    if (s.p === 'cin' && !s.w) {
      const mm = /^d:([\w-]+)$/.exec(s.cv || '');
      if (mm && mv(mm[1])) { st.v = 'det'; st.id = mm[1]; } else { st.v = 'home'; st.id = null; }
    }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden && W.open) saveProg(); });
  window.addEventListener('pagehide', () => { if (W.open) saveProg(); });
})();