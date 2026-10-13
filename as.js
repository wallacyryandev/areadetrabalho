/* Hub Pessoal - carspot.js (v2, reconstruído)
   CarSpot: foto/identificação -> garagem -> raridade, XP, coleções, desafios -> salas entre amigos.
   Carregar DEPOIS de carspot-data.js e clima.js, ANTES de home.js.
   Só usa o que o Hub já tem (PG, P, UI, esc, uid, D, TD). Sem bibliotecas, sem servidor, sem banco remoto.

   DADOS
   - localStorage 'hub_carspot' (v2): carros, perfil, salas, resultados importados, conquistas. Texto pequeno.
   - IndexedDB 'hub_carspot' (loja 'p'): fotos (id = foto grande, id:t = miniatura) e avatar.
   - Fora do objeto S do Hub de propósito (S é sincronizado e vai no Exportar do Hub).
   - MIGRAÇÃO: um backup do formato antigo fica em 'hub_carspot_v1_backup'. As fotos antigas ('hub_cs_p_<id>')
     são COPIADAS para o IndexedDB e continuam lá até você pedir para liberar espaço em Configurações.

   SALAS: não existe servidor. Convite (CSR1...) e resultados (CSP1...) são textos que cada jogador copia/cola.
   A classificação é recalculada no aparelho de quem importa, com as regras da sala. Não é tempo real.

   IA: opcional, só roda depois de você aceitar baixar o modelo (CLIP via Transformers.js, no próprio aparelho). */
(() => {
'use strict';
if (typeof PG === 'undefined' || typeof P === 'undefined' || typeof esc !== 'function' || typeof UI === 'undefined') return;

const TDY = () => (typeof TD === 'function' ? TD() : new Date().toISOString().slice(0, 10));
const rid = () => { const u = typeof uid === 'function' ? uid : () => Math.random().toString(36).slice(2, 9); return u() + u().slice(0, 3); };
const arr = a => Array.isArray(a) ? a : [];
const okId = s => typeof s === 'string' && /^[A-Za-z0-9]{4,16}$/.test(s);
const t1 = (s, n) => String(s == null ? '' : s).replace(/[\u0000-\u001f<>`\\]/g, '').replace(/\s+/g, ' ').trim().slice(0, n);
const ymd = d => typeof D === 'function' ? D(d) : d.toISOString().slice(0, 10);
const addDays = (s, n) => { const x = new Date(s + 'T12:00:00'); x.setDate(x.getDate() + n); return ymd(x); };
const dm = s => String(s || '').split('-').reverse().join('/');
const ago = t => { const s = Math.max(0, (Date.now() - t) / 1000); if (s < 90) return 'agora'; if (s < 3600) return 'há ' + Math.round(s / 60) + ' min'; if (s < 86400) return 'há ' + Math.round(s / 3600) + ' h'; const d = Math.round(s / 86400); return 'há ' + d + (d == 1 ? ' dia' : ' dias'); };

/* ===================== 1. CATÁLOGO, CATEGORIAS, RARIDADE ===================== */
const RAW = (window.CSDATA && arr(window.CSDATA.RAW)) || [];
const nz = s => String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const ALI = { vw: 'volkswagen', gm: 'chevrolet', chevy: 'chevrolet', mercedes: 'mercedesbenz', benz: 'mercedesbenz', alfa: 'alfaromeo' };
const bk = b => { const k = nz(b); return ALI[k] || k; };
const ck = (b, m) => bk(b) + '|' + nz(m);
const CAT = new Map(), CATL = [], BRANDS = [], MBYB = {};
RAW.forEach(([r, b, ms]) => {
  if (BRANDS.indexOf(b) < 0) BRANDS.push(b);
  const b0 = bk(b); MBYB[b0] = MBYB[b0] || [];
  String(ms).split(',').forEach(m => { m = m.trim(); const k = ck(b, m); if (!m || CAT.has(k)) return; const e = { k, b, m, r }; CAT.set(k, e); CATL.push(e); MBYB[b0].push(e); });
});
BRANDS.sort((a, b) => a.localeCompare(b, 'pt'));

/* Regras LOCAIS de raridade (não são estatística mundial): base do catálogo (0-4) + Mítico por marca/modelo abaixo. */
const RAR = [
  { n: 'Comum', p: 1, c: '#9AA3AE' }, { n: 'Incomum', p: 3, c: '#3DBB74' }, { n: 'Raro', p: 10, c: '#4C9BFF' },
  { n: 'Épico', p: 25, c: '#A66BFF' }, { n: 'Lendário', p: 60, c: '#FFB020' }, { n: 'Mítico', p: 150, c: '#FF4D6D' }
];
const DPTS = RAR.map(r => r.p);
const MITB = new Set(['bugatti', 'pagani', 'koenigsegg', 'rimac']);
const MITK = new Set([['McLaren', 'F1'], ['Ferrari', 'F40'], ['Ferrari', 'F50'], ['Ferrari', 'Enzo'], ['Ferrari', 'LaFerrari'], ['Porsche', '918 Spyder'], ['Porsche', 'Carrera GT'], ['Mercedes-Benz', 'Project One'], ['Aston Martin', 'Valkyrie'], ['Toyota', '2000GT']].map(x => ck(x[0], x[1])));
const CATS = [['popular', 'Popular', 0], ['sedan', 'Sedã', 0], ['suv', 'SUV', 1], ['picape', 'Picape', 1], ['eletrico', 'Elétrico', 1], ['luxo', 'Luxo', 2], ['classico', 'Clássico', 2], ['esportivo', 'Esportivo', 2], ['supercarro', 'Supercarro', 3]];
const CATN = {}, CATRD = {}; CATS.forEach(c => { CATN[c[0]] = c[1]; CATRD[c[0]] = c[2]; });

const cleanCode = s => String(s == null ? '' : s).toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 16);
const okCode = s => /^[A-Z0-9][A-Z0-9-]{2,15}$/.test(s);
const cleanCar = x => {
  if (!x || typeof x !== 'object') return null;
  const id = String(x.id || ''), brand = t1(x.brand, 30), model = t1(x.model, 40);
  if (!/^[A-Za-z0-9]{3,16}$/.test(id) || !brand || !model) return null;
  const y = parseInt(x.year, 10), cy = new Date().getFullYear(), v = parseFloat(x.value);
  const ro = x.rOv !== null && x.rOv !== undefined && x.rOv !== '' && x.rOv >= 0 && x.rOv <= 5 ? x.rOv | 0 : null;
  return { id, brand, model, gen: t1(x.gen, 30), year: y >= 1886 && y <= cy + 1 ? y : null, ver: t1(x.ver, 40), color: t1(x.color, 20), notes: t1(x.notes, 200),
    cat: CATN[x.cat] ? x.cat : '', rOv: ro, date: /^\d{4}-\d{2}-\d{2}$/.test(x.date) ? x.date : TDY(), place: t1(x.place, 60),
    src: x.src === 'ia' ? 'ia' : 'manual', fav: !!x.fav, room: cleanCode(x.room), value: isFinite(v) && v >= 0 && v < 1e10 ? v : null, ph: !!x.ph, t: isFinite(x.t) ? +x.t : Date.now() };
};
const DRULES = () => ({ pts: DPTS.slice(), rep: 1, rar: [true, true, true, true, true, true], days: 7, start: TDY(), max: 10, tie: 'raro' });
const cleanRules = r => {
  r = r && typeof r === 'object' ? r : {}; const d = DRULES();
  const pts = arr(r.pts).length === 6 ? r.pts.map((v, i) => { v = Math.floor(+v); return isFinite(v) && v >= 0 && v <= 999 ? v : d.pts[i]; }) : d.pts;
  const rar = arr(r.rar).length === 6 ? r.rar.map(Boolean) : d.rar; if (!rar.some(Boolean)) rar[0] = true;
  const n = (v, lo, hi, df) => { v = Math.floor(+v); return isFinite(v) && v >= lo && v <= hi ? v : df; };
  return { pts, rep: n(r.rep, 0, 99, 1), rar, days: n(r.days, 0, 365, 7), start: /^\d{4}-\d{2}-\d{2}$/.test(r.start) ? r.start : d.start, max: n(r.max, 2, 50, 10), tie: ['raro', 'modelos', 'cedo'].includes(r.tie) ? r.tie : 'raro' };
};
const cleanRoom = r => {
  if (!r || typeof r !== 'object') return null; const code = cleanCode(r.code); if (!okCode(code)) return null;
  return { code, name: t1(r.name, 30) || code, host: t1(r.host, 16), rules: cleanRules(r.rules), t: isFinite(r.t) ? +r.t : Date.now() };
};
/* aceita o formato compacto do código de resultado (b,m,c,o,d,t,y) e o formato já guardado (brand,model,cat,rOv,date,t,year) */
const cleanSum = c => {
  if (!c || typeof c !== 'object') return null; const g = (a, b) => c[a] !== undefined ? c[a] : c[b];
  const b = t1(g('b', 'brand'), 30), m = t1(g('m', 'model'), 40), d = g('d', 'date'), ct = g('c', 'cat'), o = g('o', 'rOv');
  if (!b || !m || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  return { brand: b, model: m, cat: CATN[ct] ? ct : '', rOv: o !== null && o !== undefined && o !== '' && o >= 0 && o <= 5 ? o | 0 : null, date: d, t: isFinite(c.t) ? +c.t : 0, year: parseInt(g('y', 'year'), 10) || null };
};
const cleanRes = x => {
  if (!x || typeof x !== 'object') return null; const room = cleanCode(x.room), id = String(x.id || ''), nick = t1(x.nick, 16), t = +x.t;
  if (!okCode(room) || !/^[A-Za-z0-9]{4,16}$/.test(id) || !nick || !isFinite(t)) return null;
  if (x.legacy) { const p = Math.floor(+x.pts), u = Math.floor(+x.uniq), n = Math.floor(+x.n); return isFinite(p) && isFinite(u) && isFinite(n) ? { room, id, nick, t, legacy: true, pts: p, uniq: u, n } : null; }
  return { room, id, nick, t, cars: arr(x.cars).slice(0, 250).map(cleanSum).filter(Boolean) };
};

/* ===================== 2. ARMAZENAMENTO + MIGRAÇÃO ===================== */
const KEY = 'hub_carspot', BKP = 'hub_carspot_v1_backup', PK = 'hub_cs_p_';
let ST = (() => {
  let raw = null, o = null; try { raw = localStorage.getItem(KEY); o = JSON.parse(raw); } catch (e) {}
  o = o && typeof o === 'object' ? o : {};
  if (raw && (!o.v || o.v < 2)) { try { if (!localStorage.getItem(BKP)) localStorage.setItem(BKP, raw); } catch (e) {} }
  const me = o.me && typeof o.me === 'object' ? o.me : {};
  const st = { v: 2, cars: arr(o.cars).map(cleanCar).filter(Boolean), me: { id: okId(me.id) ? me.id : rid(), nick: t1(me.nick, 16), room: cleanCode(me.room) },
    rooms: arr(o.rooms).map(cleanRoom).filter(Boolean).slice(0, 30), results: arr(o.results).map(cleanRes).filter(Boolean).slice(0, 300),
    ach: o.ach && typeof o.ach === 'object' ? o.ach : {}, xb: arr(o.xb).map(b => t1(b, 30)).filter(Boolean).slice(0, 40),
    opt: { dens: o.opt && o.opt.dens === 's' ? 's' : 'm', ai: !!(o.opt && o.opt.ai) }, mig: !!o.mig, migF: !!o.migF };
  if (!st.me.nick && typeof S !== 'undefined' && S && S.name) st.me.nick = t1(S.name, 16);
  if (!st.migF) {                       /* v1: salas por código + placares colados dos amigos */
    arr(o.friends).forEach(f => { if (!f || typeof f !== 'object') return; const r = cleanRes({ room: f.r, id: f.i, nick: f.n, t: f.t, legacy: true, pts: f.p, uniq: f.c, n: f.a }); if (r) st.results.push(r); });
    const rc = cleanCode(me.room); if (okCode(rc) && !st.rooms.some(r => r.code === rc)) st.rooms.push(cleanRoom({ code: rc, name: rc, host: '', rules: { start: '2000-01-01', days: 0 } }));
    st.migF = true;
  }
  return st;
})();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(ST)); return true; } catch (e) { return false; } };
save();

/* IndexedDB: fotos */
let dbp = null;
const idb = () => dbp || (dbp = new Promise((ok, no) => { if (!window.indexedDB) return no(new Error('IndexedDB indisponível')); const q = indexedDB.open('hub_carspot', 1); q.onupgradeneeded = () => q.result.createObjectStore('p'); q.onsuccess = () => ok(q.result); q.onerror = () => no(q.error); }));
const tx = (m, f) => idb().then(db => new Promise((ok, no) => { const t = db.transaction('p', m), r = f(t.objectStore('p')); t.oncomplete = () => ok(r && r.result); t.onerror = () => no(t.error); t.onabort = () => no(t.error); }));
const pput = (k, b) => tx('readwrite', s => s.put(b, k)), pget = k => tx('readonly', s => s.get(k)), pdel = k => tx('readwrite', s => s.delete(k)), pkeys = () => tx('readonly', s => s.getAllKeys());
const URLS = new Map();
const lsPhoto = id => { try { return localStorage.getItem(PK + id) || ''; } catch (e) { return ''; } };
async function purl(key) {
  if (URLS.has(key)) return URLS.get(key);
  try {
    let b = await pget(key); if (!b && key.endsWith(':t')) b = await pget(key.slice(0, -2));
    if (!b) { const d = lsPhoto(key.replace(/:t$/, '')); if (!d) return ''; return d; }   /* cópia antiga ainda não migrada */
    const u = URL.createObjectURL(b); URLS.set(key, u); return u;
  } catch (e) { const d = lsPhoto(key.replace(/:t$/, '')); return d || ''; }
}
const dropUrl = id => [id, id + ':t'].forEach(k => { const u = URLS.get(k); if (u) { URL.revokeObjectURL(u); URLS.delete(k); } });
function hyd(root) { (root || document).querySelectorAll('img[data-ph]').forEach(im => { purl(im.getAttribute('data-ph')).then(u => { if (u && im.isConnected) { im.src = u; im.classList.add('on'); } }); }); }
async function savePhoto(id, p) { await pput(id, p.full); await pput(id + ':t', p.thumb); dropUrl(id); }
async function delPhoto(id) { try { await pdel(id); await pdel(id + ':t'); } catch (e) {} dropUrl(id); try { localStorage.removeItem(PK + id); } catch (e) {} }
async function migratePhotos() {
  if (ST.mig) return; let n = 0;
  try {
    for (const c of ST.cars) {
      if (!c.ph) continue; const d = lsPhoto(c.id); if (!d || !/^data:image\//.test(d)) continue;
      if (await pget(c.id)) continue; const b = await (await fetch(d)).blob(); await pput(c.id, b); await pput(c.id + ':t', b); n++;
    }
    ST.mig = true; save(); if (n && page === 'car') render();
  } catch (e) { /* tenta de novo no próximo carregamento; nada é apagado */ }
}
function readImg(file) {
  return new Promise((ok, no) => {
    if (!file || !/^image\//.test(file.type || '')) return no(new Error('Escolha um arquivo de imagem.'));
    const u = URL.createObjectURL(file), im = new Image();
    im.onload = () => { URL.revokeObjectURL(u); ok(im); }; im.onerror = () => { URL.revokeObjectURL(u); no(new Error('Não foi possível ler essa imagem.')); }; im.src = u;
  });
}
const toBlob = (im, max, q) => new Promise((ok, no) => {
  const w = im.naturalWidth || im.width, h = im.naturalHeight || im.height; if (!w || !h) return no(new Error('Imagem inválida.'));
  const s = Math.min(1, max / Math.max(w, h)), c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w * s)); c.height = Math.max(1, Math.round(h * s));
  const g = c.getContext('2d'); g.fillStyle = '#111'; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0, c.width, c.height);
  c.toBlob(b => b ? ok(b) : no(new Error('Falha ao comprimir a imagem.')), 'image/jpeg', q);
});
const procPhoto = async f => { const im = await readImg(f); return { full: await toBlob(im, 1280, .82), thumb: await toBlob(im, 480, .74) }; };
const blobToData = b => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => no(r.error); r.readAsDataURL(b); });

/* ===================== 3. PONTOS, XP, COLEÇÕES, DESAFIOS, CONQUISTAS ===================== */
const byDate = (a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : (a.t || 0) - (b.t || 0);
const rOf = c => {
  if (c.rOv !== null && c.rOv !== undefined) return c.rOv;
  if (MITB.has(bk(c.brand)) || MITK.has(ck(c.brand, c.model))) return 5;
  const e = CAT.get(ck(c.brand, c.model)); if (e) return e.r;
  return c.cat ? CATRD[c.cat] : 0;
};
/* Regra única de pontos: o 1º registro de cada MODELO vale os pontos da raridade; repetições valem `rep`.
   É calculado sempre a partir dos dados, então atualizar a página ou editar um carro nunca soma de novo. */
function score(list, pts, rep, allow) {
  const L = list.slice().sort(byDate), seen = new Set(), per = {}, br = new Set(), byR = [0, 0, 0, 0, 0, 0];
  let p = 0, top = -1, u = 0, n = 0, lastT = 0;
  L.forEach(c => {
    const r = rOf(c); if (allow && !allow[r]) { per[c.id] = 0; return; }
    const k = ck(c.brand, c.model); let v = rep;
    if (!seen.has(k)) { seen.add(k); v = pts[r]; u++; byR[r]++; }
    per[c.id] = v; p += v; n++; br.add(bk(c.brand)); if (r > top) top = r; if ((c.t || 0) > lastT) lastT = c.t || 0;
  });
  return { pts: p, per, uniq: u, n, brands: br.size, top, byR, lastT, L };
}
const need = l => 30 * (l - 1) * (l - 1);
const lvOf = xp => { let l = 1; while (xp >= need(l + 1)) l++; return { l, a: need(l), b: need(l + 1), pc: Math.min(100, Math.round((xp - need(l)) / (need(l + 1) - need(l)) * 100)) }; };

function streaks() {
  const ds = [...new Set(ST.cars.map(c => c.date))].sort(); let best = 0, run = 0, prev = null;
  ds.forEach(d => { run = prev && addDays(prev, 1) === d ? run + 1 : 1; if (run > best) best = run; prev = d; });
  const t = TDY(), cur = ds.length && (ds[ds.length - 1] === t || ds[ds.length - 1] === addDays(t, -1)) ? run : 0;
  return { best, cur };
}
function collections() {
  const have = new Map(); ST.cars.forEach(c => { const k = ck(c.brand, c.model); const o = have.get(k) || { n: 0, fav: false, id: c.id }; o.n++; o.fav = o.fav || c.fav; have.set(k, o); });
  const names = new Map(); BRANDS.forEach(b => names.set(bk(b), b)); ST.xb.forEach(b => { if (!names.has(bk(b))) names.set(bk(b), b); }); ST.cars.forEach(c => { if (!names.has(bk(c.brand))) names.set(bk(c.brand), c.brand); });
  const out = [];
  names.forEach((name, b) => {
    const ms = (MBYB[b] || []).map(e => { const h = have.get(e.k); return { m: e.m, r: e.r === 4 && (MITB.has(b) || MITK.has(e.k)) ? 5 : e.r, have: !!h, n: h ? h.n : 0, fav: h ? h.fav : false, id: h ? h.id : '' }; });
    const cars = ST.cars.filter(c => bk(c.brand) === b), extra = []; const seenX = new Set();
    cars.forEach(c => { const k = ck(c.brand, c.model); if (!CAT.has(k) && !seenX.has(k)) { seenX.add(k); extra.push({ m: c.model, r: rOf(c), have: true, n: have.get(k).n, fav: have.get(k).fav, id: c.id }); } });
    const got = ms.filter(x => x.have).length;
    out.push({ b, name, ms, extra, total: ms.length, got, cars: cars.length, complete: ms.length > 0 && got === ms.length, favs: cars.filter(c => c.fav).length, byR: [0, 1, 2, 3, 4, 5].map(r => ms.concat(extra).filter(x => x.have && x.r === r).length) });
  });
  return out.sort((a, b) => (b.cars > 0) - (a.cars > 0) || (b.total ? b.got / b.total : 0) - (a.total ? a.got / a.total : 0) || a.name.localeCompare(b.name, 'pt'));
}
const roomEnd = rm => rm.rules.days ? addDays(rm.rules.start, rm.rules.days - 1) : null;
const roomState = rm => { const t = TDY(), e = roomEnd(rm); return t < rm.rules.start ? 'futura' : e && t > e ? 'encerrada' : 'ativa'; };
const inWin = (rm, c) => c.date >= rm.rules.start && (!roomEnd(rm) || c.date <= roomEnd(rm));
const myRoomScore = rm => { const ru = rm.rules; return score(ST.cars.filter(c => c.room === rm.code && inWin(rm, c)), ru.pts, ru.rep, ru.rar); };

const CHAL = [
  { id: 'b5', t: 'Cinco marcas', d: 'Registre carros de 5 marcas diferentes.', m: 5, xp: 20, v: s => s.brands },
  { id: 'm10', t: 'Dez modelos', d: 'Registre 10 modelos diferentes.', m: 10, xp: 25, v: s => s.uniq },
  { id: 'esp', t: 'Primeiro esportivo', d: 'Registre um carro da categoria Esportivo ou Supercarro (categoria informada no registro).', m: 1, xp: 15, v: s => (s.cats.esportivo || 0) + (s.cats.supercarro || 0) },
  { id: 'suv', t: 'Trio de SUVs', d: 'Registre 3 carros da categoria SUV.', m: 3, xp: 15, v: s => s.cats.suv || 0 },
  { id: 'cla', t: 'Peça de museu', d: 'Registre um carro da categoria Clássico.', m: 1, xp: 15, v: s => s.cats.classico || 0 },
  { id: 'ele', t: 'Faísca elétrica', d: 'Registre um carro da categoria Elétrico.', m: 1, xp: 15, v: s => s.cats.eletrico || 0 },
  { id: 'col', t: 'Coleção completa', d: 'Complete todos os modelos de uma marca do catálogo do app.', m: 1, xp: 50, v: s => s.collDone },
  { id: 'p100', t: 'Cem pontos', d: 'Some 100 pontos em descobertas.', m: 100, xp: 30, v: s => s.base }
];
const RCHAL = [
  { id: 'rb', t: 'Cinco marcas na sala', m: 5, v: s => s.brands }, { id: 'rr', t: 'Um Raro ou melhor', m: 1, v: s => s.byR.slice(2).reduce((a, b) => a + b, 0) }, { id: 'rn', t: 'Dez carros na sala', m: 10, v: s => s.n }
];
const ACH = [
  ['first', 'Primeiro carro', 'Registre seu primeiro carro.', s => s.n >= 1], ['ten', 'Dez na garagem', '10 carros registrados.', s => s.n >= 10], ['fifty', 'Garagem cheia', '50 carros registrados.', s => s.n >= 50],
  ['b5', 'Cinco fabricantes', '5 fabricantes diferentes.', s => s.brands >= 5], ['rare', 'Olho clínico', 'Primeiro veículo Raro ou melhor.', s => s.top >= 2],
  ['myth', 'Lenda urbana', 'Primeiro veículo Mítico.', s => s.top >= 5], ['coll', 'Colecionador', 'Primeira coleção de marca concluída.', s => s.collDone >= 1],
  ['room', 'Competidor', 'Primeira competição finalizada com carros registrados.', s => s.roomsDone >= 1], ['str3', 'Em sequência', '3 dias seguidos registrando.', s => s.best >= 3]
];
function stats() {
  const sc = score(ST.cars, DPTS, 1), cats = {}, colls = collections(), sk = streaks();
  ST.cars.forEach(c => { if (c.cat) cats[c.cat] = (cats[c.cat] || 0) + 1; });
  const s = { n: ST.cars.length, uniq: sc.uniq, brands: sc.brands, top: sc.top, byR: sc.byR, per: sc.per, base: sc.pts, cats, colls, collDone: colls.filter(c => c.complete).length, best: sk.best, cur: sk.cur,
    roomsDone: ST.rooms.filter(r => roomState(r) === 'encerrada' && myRoomScore(r).n > 0).length, favs: ST.cars.filter(c => c.fav).length };
  s.ch = CHAL.map(c => { const v = Math.min(c.v(s), c.m); return { ...c, val: v, done: v >= c.m }; });
  s.bonus = s.ch.filter(c => c.done).reduce((a, c) => a + c.xp, 0); s.xp = s.base + s.bonus; s.lv = lvOf(s.xp);
  s.ac = ACH.map(a => ({ id: a[0], t: a[1], d: a[2], on: !!a[3](s), at: ST.ach[a[0]] || 0 }));
  return s;
}
let toastQ = null;
const say = m => { const e = document.getElementById('tt'); if (!e) return; e.textContent = m; e.classList.add('on'); clearTimeout(say.t); say.t = setTimeout(() => e.classList.remove('on'), 3200); };
function checkAch() {
  const s = stats(), fresh = []; s.ac.forEach(a => { if (a.on && !ST.ach[a.id]) { ST.ach[a.id] = Date.now(); fresh.push(a.t); } });
  if (fresh.length) { save(); setTimeout(() => say('Conquista desbloqueada: ' + fresh.join(', ')), 2200); }
}

/* ranking de sala: SEMPRE recalculado com as regras da sala a partir dos carros (não confia em pontos informados) */
const toCar = (c, i) => ({ id: 'x' + i, brand: c.brand, model: c.model, cat: c.cat, rOv: c.rOv, date: c.date, t: c.t || i });
const cmpR = (a, b) => { for (let i = 5; i >= 0; i--) if (a.byR[i] !== b.byR[i]) return b.byR[i] - a.byR[i]; return 0; };
const TIES = { raro: ['Maior raridade', (a, b) => b.top - a.top || cmpR(a, b)], modelos: ['Mais modelos diferentes', (a, b) => b.uniq - a.uniq], cedo: ['Quem chegou mais cedo à pontuação', (a, b) => (a.lastT || 1e15) - (b.lastT || 1e15)] };
function rank(rm) {
  const ru = rm.rules, row = (id, nick, list, t, src) => { const sc = score(list.filter(c => inWin(rm, c)), ru.pts, ru.rep, ru.rar); const ch = RCHAL.filter(c => c.v(sc) >= c.m).length; return { id, nick, pts: sc.pts, n: sc.n, uniq: sc.uniq, top: sc.top, brands: sc.brands, byR: sc.byR, lastT: sc.lastT, ch, t, src }; };
  const rows = [row(ST.me.id, ST.me.nick || 'Você', ST.cars.filter(c => c.room === rm.code), Date.now(), 'local')];
  ST.results.filter(x => x.room === rm.code && x.id !== ST.me.id).forEach(x => rows.push(x.legacy ? { id: x.id, nick: x.nick, pts: x.pts, n: x.n, uniq: x.uniq, top: -1, brands: 0, byR: [0, 0, 0, 0, 0, 0], lastT: x.t, ch: null, t: x.t, src: 'antigo' } : row(x.id, x.nick, x.cars.map(toCar), x.t, 'importado')));
  rows.sort((a, b) => b.pts - a.pts || TIES[ru.tie][1](a, b) || a.nick.localeCompare(b.nick, 'pt')); return rows;
}

/* códigos de compartilhamento (texto) */
const chk = s => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h.toString(36); };
const enc = (p, o) => { const b = btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); return p + '.' + b + '.' + chk(b); };
const dec = (p, t) => { const m = String(t || '').match(new RegExp(p + '\\.([A-Za-z0-9_-]+)\\.([a-z0-9]+)')); if (!m || chk(m[1]) !== m[2]) return null; try { let b = m[1].replace(/-/g, '+').replace(/_/g, '/'); while (b.length % 4) b += '='; return JSON.parse(decodeURIComponent(escape(atob(b)))); } catch (e) { return null; } };

/* ===================== 4. INTEGRAÇÃO COM O HUB, ÍCONES, CSS ===================== */
if (!PG.some(p => p[0] === 'car')) { const i = PG.findIndex(p => p[0] === 'cfg'); PG.splice(i < 0 ? PG.length : i, 0, ['car', 'car', 'CarSpot']); }
const ICO = {
  car: '<path d="M2 15.5v-1.7c0-.7.5-1.3 1.2-1.5l4.3-1c1.5-1.5 3.1-2.5 5.3-2.7h1.7c1.8.1 3.4 1 5 2.5l1.6.4c1.2.3 1.9 1 1.9 2.2v1.8"/><path d="M2 15.5h2.2M9.8 15.5h4.4M19.8 15.5H22"/><circle cx="7" cy="15.5" r="2.8"/><circle cx="17" cy="15.5" r="2.8"/>',
  cam: '<path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.5"/>',
  image: '<rect x="3" y="4.5" width="18" height="15" rx="2"/><circle cx="8.5" cy="10" r="1.6"/><path d="m4 18 5-5 3.5 3.5L16 13l4 4"/>',
  home: '<path d="M3 11 12 3l9 8"/><path d="M5 10v10h5v-6h4v6h5V10"/>',
  grid: '<rect x="3" y="3" width="7.5" height="7.5" rx="1.8"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.8"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.8"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.8"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
  flag: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.3"/>',
  users: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.2c2.8.2 5 2.5 5 5.8"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H4v1a4 4 0 0 0 4 4M16 6h4v1a4 4 0 0 1-4 4"/><path d="M12 13v4M8 20h8M10 17h4"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  gear: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>', check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  edit: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/>', trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>', copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/>',
  share: '<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="m8.2 10.8 7.6-3.6M8.2 13.2l7.6 3.6"/>',
  down: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>', up: '<path d="M12 20V9M7 13l5-5 5 5M5 4h14"/>', back: '<path d="M15 5l-7 7 7 7"/>', bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>', lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'
};
const ic = (n, c) => `<svg class="cs-i${c ? ' ' + c : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICO[n] || ''}</svg>`;
const logo = () => `<span class=cs-lg><svg viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="9" fill="var(--k)"/><path d="M7 12V9a2 2 0 0 1 2-2h3M20 7h3a2 2 0 0 1 2 2v3M25 20v3a2 2 0 0 1-2 2h-3M12 25H9a2 2 0 0 1-2-2v-3" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/><path d="M10 19.5v-1.4c0-.5.4-1 .9-1.1l2.4-.6c.9-.9 1.8-1.4 3-1.5h1c1 .1 1.9.6 2.8 1.4l.9.2c.7.2 1.1.6 1.1 1.2v1.8" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/><circle cx="13" cy="20" r="1.5" fill="#fff"/><circle cx="19.5" cy="20" r="1.5" fill="#fff"/></svg><span><b>CAR</b><i>SPOT</i></span></span>`;

(() => {
  const defs = document.querySelector('body > svg defs') || document.querySelector('svg defs');
  if (defs && !document.getElementById('i-car')) defs.insertAdjacentHTML('beforeend', '<symbol id="i-car" viewBox="0 0 24 24">' + ICO.car + '</symbol><symbol id="i-camera" viewBox="0 0 24 24">' + ICO.cam + '</symbol><symbol id="i-image" viewBox="0 0 24 24">' + ICO.image + '</symbol>');
})();

if (!document.getElementById('cs-css')) {
  const ico = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='1' stroke-linecap='round' stroke-linejoin='round'>" + ICO.car + '</svg>';
  const st = document.createElement('style'); st.id = 'cs-css';
  st.textContent = `
.hp-app[onclick="go('car')"] .hp-ic{font-size:0;color:transparent;background:url("carspot-icon.png") center/cover no-repeat,url("data:image/svg+xml,${encodeURIComponent(ico)}") center/76% no-repeat #0c0d10!important}
.cs{--k:#FF5B2E;--k2:#FF8A5C;--s1:#171B21;--s2:#1F242C;--s3:#2A303A;--ln:rgba(255,255,255,.08);--cw:200px;--ok:#3DBB74;color:var(--tx);animation:csf .25s}
:root[data-t=light] .cs{--s1:#fff;--s2:#F1F3F6;--s3:#E4E7EC;--ln:rgba(0,0,0,.09)}
@keyframes csf{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
.cs *{-webkit-user-select:none;user-select:none}.cs input,.cs textarea{-webkit-user-select:text;user-select:text}
.cs.dn{--cw:150px}
.cs-i{width:20px;height:20px;flex:none}.cs-i.ph{position:absolute;inset:0;margin:auto;width:42px;height:42px;opacity:.28}.cs-i.big{width:44px;height:44px;color:var(--k)}
.cs-shell{display:grid;grid-template-columns:188px minmax(0,1fr);gap:22px;align-items:start}
.cs-rail{position:sticky;top:16px}
.cs-lg{display:inline-flex;align-items:center;gap:9px}.cs-lg svg{width:30px;height:30px}.cs-lg b,.cs-lg i{font-style:normal;font-size:16px;font-weight:800;letter-spacing:.14em}.cs-lg i{color:var(--k)}
.cs-logo{padding:4px 8px 16px}
.cs-nv{display:flex;flex-direction:column;gap:2px}
.cs-nv a{display:flex;align-items:center;gap:11px;padding:9px 12px;border-radius:10px;color:var(--t2);font-size:14px;font-weight:500;cursor:pointer;transition:background .12s,color .12s;white-space:nowrap}
.cs-nv a:hover{background:var(--hv);color:var(--tx)}.cs-nv a.on{background:var(--s2);color:var(--tx);box-shadow:inset 3px 0 0 var(--k)}
.cs-nv a.hl{color:var(--k2)}
.cs-nv a .cs-i{transition:color .15s}.cs-nv a.on .cs-i{color:var(--k)}.cs-nv a.hl.on .cs-i{color:var(--k2)}
.cs-nv a:active{background:var(--s3)}
.cs-main{min-width:0;padding-bottom:90px}
.cs-hd{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:2px 0 16px;flex-wrap:wrap}
.cs-hd h1{font-size:24px;font-weight:700;letter-spacing:-.02em;margin:0}.cs-hd p{color:var(--t2);font-size:13px;margin-top:2px}
.cs-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:40px;padding:0 18px;border:0;border-radius:11px;background:var(--k);color:#fff;font:inherit;font-size:14px;font-weight:600;cursor:pointer;transition:filter .12s,transform .08s;white-space:nowrap}
.cs-btn:hover{filter:brightness(1.08)}.cs-btn:active{transform:scale(.97)}.cs-btn .cs-i{width:18px;height:18px}
.cs-btn.ghost{background:var(--s2);color:var(--tx);border:1px solid var(--ln)}.cs-btn.sm{height:34px;padding:0 13px;font-size:13px;border-radius:9px}.cs-btn.big{height:50px;padding:0 24px;font-size:15px;border-radius:13px}.cs-btn.er{background:#E5534B}
.cs-lnk{background:none;border:0;color:var(--t2);font:inherit;font-size:13px;text-decoration:underline;cursor:pointer;padding:8px}
.cs-pnl{background:var(--s1);border:1px solid var(--ln);border-radius:16px;padding:18px;margin-bottom:14px}
.cs-pnl>h2,.cs-sec{font-size:13px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--t2);margin:0 0 12px;display:flex;align-items:center;justify-content:space-between}
.cs-sec{margin:22px 0 10px}
.cs-hero{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;padding:24px;border-radius:20px;margin-bottom:14px;border:1px solid var(--ln);background:radial-gradient(120% 140% at 100% 0,rgba(255,91,46,.22),transparent 55%),var(--s1)}
.cs-hero h1{font-size:28px;font-weight:800;letter-spacing:-.03em;margin:0}.cs-eye{font-size:12px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--k2);margin-bottom:4px}.cs-sub{color:var(--t2);font-size:14px;margin-top:4px}
.cs-lv{display:flex;align-items:center;gap:16px}.cs-lvn{width:56px;height:56px;border-radius:16px;display:grid;place-items:center;background:var(--k);color:#fff;font-size:24px;font-weight:800;flex:none}
.cs-bar{height:8px;border-radius:6px;background:var(--s3);overflow:hidden}.cs-bar>i{display:block;height:100%;border-radius:6px;background:linear-gradient(90deg,var(--k),var(--k2));transition:width .5s}
.cs-kp{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:14px}
.cs-kp div{background:var(--s1);border:1px solid var(--ln);border-radius:14px;padding:13px 15px}.cs-kp b{display:block;font-size:24px;font-weight:700;letter-spacing:-.02em;font-variant-numeric:tabular-nums}.cs-kp span{font-size:12px;color:var(--t2)}
.cs-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(var(--cw),1fr));gap:14px}
.cs-cd{position:relative;display:flex;flex-direction:column;text-align:left;padding:0;margin:0;font:inherit;color:inherit;background:var(--s1);border:1px solid var(--ln);border-radius:16px;overflow:hidden;cursor:pointer;transition:transform .12s,border-color .12s,box-shadow .12s}
.cs-cd:hover{transform:translateY(-2px);border-color:var(--rc)}.cs-cd:active{transform:scale(.98)}
.cs-cd.r4,.cs-cd.r5{box-shadow:0 0 0 1px var(--rc),0 8px 26px -14px var(--rc)}
.cs-cd.r5::after{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(115deg,transparent 40%,rgba(255,255,255,.12) 50%,transparent 60%);background-size:250% 100%;animation:csh 3.2s linear infinite}
@keyframes csh{from{background-position:150% 0}to{background-position:-100% 0}}
.cs-im{position:relative;display:block;aspect-ratio:4/3;background:linear-gradient(145deg,var(--s2),var(--s3));overflow:hidden}
.cs-im img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .25s}.cs-im img.on{opacity:1}
.cs-im::after{content:"";position:absolute;inset:auto 0 0;height:38%;background:linear-gradient(transparent,rgba(0,0,0,.45));pointer-events:none}
.cs-rr{position:absolute;top:10px;left:10px;z-index:1;padding:3px 9px;border-radius:8px;font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;background:rgba(12,14,18,.82);color:var(--rc);border:1px solid var(--rc);backdrop-filter:blur(4px)}
.cs-rr.st{position:static;display:inline-block}
.cs-fv{position:absolute;top:10px;right:10px;z-index:1;color:#FFB020}.cs-fv .cs-i{width:18px;height:18px;fill:#FFB020}
.cs-tx{display:flex;flex-direction:column;gap:1px;padding:11px 13px 13px;min-width:0}.cs-tx small{font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--t2)}
.cs-tx b{font-size:15px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.cs-tx em{font-style:normal;font-size:12px;color:var(--t2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cs-pt{position:absolute;right:11px;bottom:11px;font-size:12px;font-weight:700;color:var(--k2);font-variant-numeric:tabular-nums}
.cs-bar2{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}.cs-bar2 input,.cs-bar2 select{height:40px;border-radius:11px;background:var(--s2);border:1px solid var(--ln);color:var(--tx);padding:0 12px;font:inherit;font-size:14px}.cs-bar2 input{flex:1 1 180px;min-width:0}
.cs-ch{display:inline-flex;align-items:center;gap:6px;height:36px;padding:0 13px;border-radius:18px;background:var(--s2);border:1px solid var(--ln);color:var(--t2);font-size:13px;font-weight:500;cursor:pointer}.cs-ch.on{background:var(--k);border-color:var(--k);color:#fff}
.cs-row{display:flex;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid var(--ln)}.cs-row:last-child{border:0}.cs-row .f{flex:1;min-width:0}.cs-row b{font-weight:600}.cs-row .s{color:var(--t2);font-size:12px}
.cs-th{width:50px;height:38px;border-radius:9px;background:var(--s3);position:relative;overflow:hidden;flex:none}.cs-th img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0}.cs-th img.on{opacity:1}.cs-th .cs-i.ph{width:20px;height:20px}
.cs-dot{width:9px;height:9px;border-radius:50%;background:var(--rc);flex:none}
.cs-cc{display:flex;flex-direction:column;gap:10px;text-align:left;font:inherit;color:inherit;background:var(--s1);border:1px solid var(--ln);border-radius:16px;padding:16px;cursor:pointer}.cs-cc:hover{border-color:var(--k)}
.cs-cc b{font-size:16px}.cs-cc .s{font-size:12px;color:var(--t2)}.cs-ok{color:var(--ok);font-weight:700;font-size:12px}
.cs-drop{text-align:center;padding:38px 20px;border-style:dashed;border-width:2px;display:flex;flex-direction:column;align-items:center;gap:10px}.cs-drop.on{border-color:var(--k);background:rgba(255,91,46,.07)}.cs-drop h2{font-size:20px;text-transform:none;letter-spacing:-.01em;color:var(--tx);margin:6px 0 0}.cs-drop p{color:var(--t2);font-size:14px;max-width:420px}
.cs-prev{border-radius:16px;overflow:hidden;background:#000;aspect-ratio:4/3;max-height:420px;width:100%;position:relative}.cs-prev img{width:100%;height:100%;object-fit:contain;display:block}
.cs-ai{border-left:3px solid var(--k);background:var(--s2);border-radius:12px;padding:13px 15px;font-size:13px;color:var(--t2);line-height:1.5}.cs-ai b{color:var(--tx)}
.cs-tb{display:flex;flex-direction:column}.cs-tr{display:grid;grid-template-columns:42px minmax(0,1fr) 76px 64px 110px 70px;gap:10px;align-items:center;padding:12px 14px;border-bottom:1px solid var(--ln);font-size:14px}
.cs-tr.h{font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--t2)}.cs-tr.me{background:rgba(255,91,46,.09)}.cs-tr b{font-weight:700}.cs-pos{font-weight:800;font-size:16px;color:var(--t2)}.cs-tr:nth-child(2) .cs-pos{color:#FFB020}
.cs-ac{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px}.cs-ac>div{display:flex;gap:12px;align-items:center;background:var(--s1);border:1px solid var(--ln);border-radius:14px;padding:12px 14px}.cs-ac .off{opacity:.45}
.cs-medal{width:38px;height:38px;border-radius:11px;display:grid;place-items:center;background:var(--k);color:#fff;flex:none}.off .cs-medal{background:var(--s3);color:var(--t2)}
.cs-av{width:84px;height:84px;border-radius:24px;background:var(--s3);position:relative;overflow:hidden;display:grid;place-items:center;font-size:34px;font-weight:800;color:var(--k);flex:none}.cs-av img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0}.cs-av img.on{opacity:1}
.cs-two{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
.cs-em{display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center;padding:36px 16px;color:var(--t2);font-size:14px}.cs-em .cs-i{width:38px;height:38px;opacity:.5}
.cs-steps{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.cs-steps div{background:var(--s2);border-radius:14px;padding:14px;font-size:13px;color:var(--t2)}.cs-steps b{display:block;color:var(--tx);font-size:14px;margin:4px 0}.cs-steps i{font-style:normal;font-weight:800;color:var(--k)}
.cs-fab{position:fixed;right:18px;bottom:calc(86px + env(safe-area-inset-bottom,0px));z-index:6;width:58px;height:58px;border-radius:20px;border:0;background:var(--k);color:#fff;display:grid;place-items:center;box-shadow:0 10px 26px -8px rgba(255,91,46,.7);cursor:pointer}.cs-fab:active{transform:scale(.94)}.cs-fab .cs-i{width:26px;height:26px}
#md .cs-sheet{background:var(--card);color:var(--tx);border:1px solid var(--bd);border-radius:20px;width:100%;max-width:540px;max-height:92vh;overflow:auto;box-shadow:0 20px 50px rgba(0,0,0,.45);animation:csf .2s;padding:0}
.cs-fh{display:flex;align-items:center;justify-content:space-between;padding:16px 18px 6px}.cs-fh h2{font-size:18px;font-weight:700;margin:0}
.cs-x{width:34px;height:34px;border-radius:10px;border:0;background:var(--hv);color:var(--tx);display:grid;place-items:center;cursor:pointer}
.cs-fb{padding:10px 18px 18px;display:flex;flex-direction:column;gap:12px}
.cs-f{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.cs-f .w{grid-column:1/-1}
.cs-f label,.cs-fb>label{display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:600;color:var(--t2)}
.cs-f input,.cs-f select,.cs-f textarea,.cs-fb>label input,.cs-fb>label select,.cs-fb>label textarea{height:42px;border-radius:10px;background:var(--rs);border:1px solid var(--bd);color:var(--tx);padding:0 12px;font:inherit;font-size:14px;font-weight:400;width:100%;min-width:0}
.cs-f textarea,.cs-fb>label textarea{height:auto;min-height:70px;padding:10px 12px;resize:vertical}
.cs-f input:focus,.cs-f select:focus,.cs-f textarea:focus,.cs-fb input:focus,.cs-fb textarea:focus{outline:2px solid var(--k);outline-offset:-1px}
.cs-fp{display:flex;gap:14px;align-items:center}.cs-fi{width:104px;height:78px;border-radius:12px;background:var(--s3);position:relative;overflow:hidden;flex:none}.cs-fi img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0}.cs-fi img.on{opacity:1}
.cs-pv{font-size:13px;color:var(--t2);padding:10px 12px;border-radius:10px;background:var(--rs)}
.cs-dph{position:relative;aspect-ratio:16/10;background:var(--s3)}.cs-dph img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0}.cs-dph img.on{opacity:1}.cs-dph .cs-x{position:absolute;top:12px;right:12px;background:rgba(12,14,18,.7);color:#fff;z-index:2}
.cs-dbd{padding:16px 18px 18px;display:flex;flex-direction:column;gap:10px}.cs-dbd h2{font-size:22px;font-weight:800;letter-spacing:-.02em;margin:0}
.cs-kv{display:grid;grid-template-columns:110px 1fr;gap:6px 12px;font-size:14px}.cs-kv span:nth-child(odd){color:var(--t2)}
.cs-rev{text-align:center;padding:30px 20px;display:flex;flex-direction:column;align-items:center;gap:8px}.cs-rev .big{font-size:46px;font-weight:800;color:var(--rc);letter-spacing:-.03em;animation:csp .5s cubic-bezier(.2,1.6,.4,1)}
@keyframes csp{from{transform:scale(.4);opacity:0}to{transform:none;opacity:1}}
.cs-code{font-family:ui-monospace,Menlo,monospace;font-size:12px;word-break:break-all;background:var(--rs)!important;height:auto!important;padding:10px!important;min-height:110px}
.cs-note{font-size:12px;color:var(--t2);line-height:1.5}
@media(max-width:900px){
 .cs-shell{grid-template-columns:minmax(0,1fr);gap:8px}
 .cs-rail{position:sticky;top:0;z-index:5;margin:-16px -14px 6px;padding:calc(10px + env(safe-area-inset-top,0px)) 14px 8px;background:color-mix(in srgb,var(--bg) 92%,transparent);backdrop-filter:blur(10px)}
 .cs-logo{padding:0 0 8px}
 .cs-nv{flex-direction:row;overflow-x:auto;gap:6px;scrollbar-width:none;margin:0 -14px;padding:0 14px;scroll-snap-type:x proximity;scroll-padding:0 14px;overscroll-behavior-x:contain;-webkit-mask-image:linear-gradient(90deg,#000 calc(100% - 26px),transparent);mask-image:linear-gradient(90deg,#000 calc(100% - 26px),transparent)}.cs-nv::-webkit-scrollbar{display:none}
 .cs-nv a{scroll-snap-align:center}.cs-nv a:last-child{margin-right:14px}
 .cs-nv a{padding:0 14px;height:40px;border-radius:20px;background:var(--s2);font-size:13px;flex:none;box-shadow:none!important}.cs-nv a.on{background:var(--k);color:#fff}.cs-nv a.on .cs-i,.cs-nv a.hl.on .cs-i{color:inherit}.cs-nv a.hl{color:inherit}.cs-nv a .cs-i{width:17px;height:17px}
 .cs-kp{grid-template-columns:repeat(2,minmax(0,1fr))}.cs-grid{--cw:150px;gap:10px}.cs-steps{grid-template-columns:1fr}.cs-two{grid-template-columns:1fr}
 .cs-hero{padding:18px}.cs-hero h1{font-size:23px}.cs-hero .cs-btn{width:100%}
 .cs-tr{grid-template-columns:34px minmax(0,1fr) 64px 54px;gap:8px;padding:12px 10px}.cs-tr>:nth-child(5),.cs-tr>:nth-child(6){display:none}
 #md .cs-sheet{max-width:none;border-width:1px 0 0;border-radius:20px 20px 0 0;padding-bottom:env(safe-area-inset-bottom,0)}
}
@media(pointer:fine){.cs-camonly{display:none!important}}
@media(prefers-reduced-motion:reduce){.cs-cd.r5::after{animation:none}}
`;
  document.head.appendChild(st);
}

/* ===================== 5. TELAS ===================== */
const V = { tab: 'ini', q: '', fb: '', fr: '', so: 'rec', fv: false, cb: '', cf: 'all', room: '', hq: '' };
let pend = null, fp = null, busy = false, IMP = null;
const NAV = [['ini', 'home', 'Início'], ['scan', 'cam', 'Identificar'], ['gar', 'grid', 'Garagem'], ['col', 'layers', 'Coleções'], ['des', 'flag', 'Desafios'], ['sal', 'users', 'Salas'], ['cla', 'trophy', 'Classificação'], ['per', 'user', 'Perfil'], ['his', 'clock', 'Histórico'], ['cfg', 'gear', 'Configurações']];
const hd = (t, sub, act) => `<div class=cs-hd><div><h1>${t}</h1>${sub ? `<p>${sub}</p>` : ''}</div>${act ? `<div class=row>${act}</div>` : ''}</div>`;
const em = (i, t, a) => `<div class=cs-em>${ic(i)}<p>${t}</p>${a || ''}</div>`;
const nf = 'Não informado';
const bar = pc => `<div class=cs-bar><i style="width:${pc}%"></i></div>`;
const rpill = r => `<span class="cs-rr st" style="--rc:${RAR[r].c}">${RAR[r].n}</span>`;
const sub = c => [c.gen, c.year, c.ver].filter(Boolean).map(esc).join(' · ') || nf;

function card(c, s) {
  const r = rOf(c), R = RAR[r];
  return `<button type=button class="cs-cd r${r}" style="--rc:${R.c}" onclick="CS.open('${c.id}')"><span class=cs-im>${ic('car', 'ph')}${c.ph ? `<img data-ph="${c.id}:t" alt="" decoding=async>` : ''}</span><span class=cs-rr>${R.n}</span>${c.fav ? `<span class=cs-fv>${ic('star')}</span>` : ''}<span class=cs-tx><small>${esc(c.brand)}</small><b>${esc(c.model)}</b><em>${sub(c)}</em></span><span class=cs-pt>+${s.per[c.id] || 0}</span></button>`;
}
const thumb = c => `<span class=cs-th>${ic('car', 'ph')}${c.ph ? `<img data-ph="${c.id}:t" alt="">` : ''}</span>`;
const greet = () => { const h = new Date().getHours(); return h < 5 ? 'Boa madrugada' : h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'; };
const lastRoom = () => ST.rooms.slice().sort((a, b) => (roomState(a) === 'ativa' ? 0 : 1) - (roomState(b) === 'ativa' ? 0 : 1) || b.t - a.t)[0];

function vIni(s) {
  const nick = ST.me.nick || 'colecionador';
  const hero = `<section class=cs-hero><div><p class=cs-eye>${greet()}</p><h1>Olá, ${esc(nick)}</h1><p class=cs-sub>${s.n ? `Nível ${s.lv.l} · ${s.xp} XP · ${s.n} ${s.n == 1 ? 'carro' : 'carros'} na garagem` : 'Sua garagem está vazia. Vai ver um carro hoje?'}</p></div><button class="cs-btn big" onclick="CS.go('scan')">${ic('cam')}Identificar um carro</button></section>`;
  if (!s.n) return hero + `<section class=cs-pnl><h2>Como começar</h2><div class=cs-steps><div><i>1</i><b>Fotografe</b>Tire uma foto na rua ou escolha uma imagem da galeria.</div><div><i>2</i><b>Confirme</b>Marca, modelo, ano e o que mais souber. Você corrige tudo.</div><div><i>3</i><b>Pontue</b>Cada modelo novo vale pontos conforme a raridade. Suba de nível e complete coleções.</div></div><div class=row style="margin-top:16px"><button class="cs-btn ghost" onclick="CS.new()">${ic('plus')}Cadastrar sem foto</button><button class="cs-btn ghost" onclick="CS.go('col')">${ic('layers')}Ver coleções</button></div><p class=cs-note style="margin-top:12px">Carros populares contam. Um Uno ou um Gol também entram na garagem e nas coleções.</p></section>`;
  const recent = ST.cars.slice().sort((a, b) => b.date < a.date ? -1 : b.date > a.date ? 1 : (b.t || 0) - (a.t || 0)).slice(0, 4), favs = ST.cars.filter(c => c.fav).slice(0, 4);
  const prog = s.ch.filter(c => !c.done).sort((a, b) => b.val / b.m - a.val / a.m).slice(0, 3), rm = lastRoom();
  let roomBox = '';
  if (rm) { const rk = rank(rm), pos = rk.findIndex(r => r.id === ST.me.id) + 1; roomBox = `<h3 class=cs-sec>Última sala</h3><button class=cs-cc style="width:100%" onclick="CS.openRoom('${rm.code}')"><b>${esc(rm.name)} <span class=s>· ${esc(rm.code)}</span></b><span class=s>${roomState(rm) == 'ativa' ? 'Em andamento' : roomState(rm) == 'futura' ? 'Ainda não começou' : 'Encerrada'} · você está em ${pos}º de ${rk.length} · ${rk[pos - 1].pts} pts (resultados importados, não é ao vivo)</span></button>`; }
  return hero + `<section class=cs-pnl><div class=cs-lv><div class=cs-lvn>${s.lv.l}</div><div style="flex:1;min-width:0"><div class=row style="justify-content:space-between"><b>Nível ${s.lv.l}</b><span class=s>${s.xp} / ${s.lv.b} XP</span></div><div style="margin-top:8px">${bar(s.lv.pc)}</div></div></div></section>
<div class=cs-kp><div><b>${s.n}</b><span>carros</span></div><div><b>${s.xp}</b><span>pontos (XP)</span></div><div><b>${s.uniq}</b><span>modelos</span></div><div><b>${s.cur}</b><span>dias seguidos</span></div></div>
<h3 class=cs-sec>Últimas descobertas <button class="cs-lnk" onclick="CS.go('gar')">Ver garagem</button></h3><div class=cs-grid>${recent.map(c => card(c, s)).join('')}</div>
${favs.length ? `<h3 class=cs-sec>Favoritos</h3><div class=cs-grid>${favs.map(c => card(c, s)).join('')}</div>` : ''}
<h3 class=cs-sec>Desafios em andamento <button class="cs-lnk" onclick="CS.go('des')">Ver todos</button></h3>${prog.length ? `<section class=cs-pnl>${prog.map(c => `<div class=cs-row><div class=f><b>${c.t}</b><div class=s>${c.val} de ${c.m} · +${c.xp} XP</div><div style="margin-top:6px">${bar(Math.round(c.val / c.m * 100))}</div></div></div>`).join('')}</section>` : `<section class=cs-pnl>${em('check', 'Todos os desafios individuais concluídos.')}</section>`}${roomBox}`;
}

function vScan() {
  const inp = `<input id=cs-cam type=file accept="image/*" capture="environment" hidden onchange="CS.pick(this)"><input id=cs-gal type=file accept="image/*" hidden onchange="CS.pick(this)">`;
  const click = i => `document.getElementById('${i}').click()`;
  if (!pend) return hd('Identificar carro', 'Fotografe ou envie uma imagem. Você confirma tudo antes de salvar.') + `<section class="cs-pnl cs-drop" ondragover="event.preventDefault();this.classList.add('on')" ondragleave="this.classList.remove('on')" ondrop="CS.drop(event)">${ic('cam', 'big')}<h2>Encontrou um carro?</h2><p>Tire uma foto ou escolha uma imagem. A foto fica só neste aparelho.</p><div class=row style="justify-content:center"><button class="cs-btn big cs-camonly" onclick="${click('cs-cam')}">${ic('cam')}Tirar foto</button><button class="cs-btn big" onclick="${click('cs-gal')}">${ic('image')}Escolher imagem</button></div><button class=cs-lnk onclick="CS.new()">Cadastrar sem foto</button></section>${inp}`;
  const a = pend.ai; let aiBox = '';
  if (!a) aiBox = `<div class=cs-ai><b>Reconhecimento por IA (opcional)</b><br>Roda no seu aparelho, só depois de você aceitar baixar o modelo. É um palpite entre as marcas e modelos do catálogo do app: não descobre geração, versão nem ano. Se não ajudar, siga manualmente.</div><div class=row><button class="cs-btn ghost" onclick="CS.ai()">${ic('bolt')}Tentar identificar com IA</button></div>`;
  else if (a.st === 'load') aiBox = `<div class=cs-ai><b>Analisando a imagem…</b><br>Na primeira vez o navegador baixa o modelo, o que pode demorar. Você pode seguir manualmente a qualquer momento.</div>`;
  else if (a.st === 'err') aiBox = `<div class=cs-ai><b>A IA não funcionou.</b> ${esc(a.msg)}<br>Nada foi inventado. Continue preenchendo manualmente.</div>`;
  else { const m = a.models[0], b = a.brands[0]; aiBox = `<div class=cs-ai><b>Palpite da IA, confira antes de salvar.</b><br>${m ? `Mais provável: <b>${esc(m.b)} ${esc(m.m)}</b> (${Math.round(m.s * 100)}%)` : `Marca mais provável: <b>${esc(b.l)}</b> (${Math.round(b.s * 100)}%)`}. Outras marcas: ${a.brands.slice(1, 3).map(x => `${esc(x.l)} ${Math.round(x.s * 100)}%`).join(', ') || '—'}.<br>Geração, versão e ano: Não identificado.</div><div class=row>${m ? `<button class="cs-btn" onclick="CS.useAi('${esc(m.b)}','${esc(m.m)}')">Usar ${esc(m.b)} ${esc(m.m)}</button>` : `<button class="cs-btn" onclick="CS.useAi('${esc(b.l)}','')">Usar ${esc(b.l)}</button>`}${a.brands.slice(1, 3).map(x => `<button class="cs-btn ghost" onclick="CS.useAi('${esc(x.l)}','')">${esc(x.l)}</button>`).join('')}</div>`; }
  return hd('Identificar carro', 'Confira a foto e siga para os dados do veículo.') + `<section class=cs-pnl><div class=cs-prev><img src="${pend.url}" alt="Foto escolhida"></div><div class=row style="margin-top:14px"><button class="cs-btn" onclick="CS.form()">Continuar</button><button class="cs-btn ghost" onclick="${click('cs-gal')}">${ic('image')}Trocar foto</button><button class="cs-btn ghost cs-camonly" onclick="${click('cs-cam')}">${ic('cam')}Tirar outra</button><button class="cs-btn ghost" onclick="CS.cancel()">${ic('x')}Cancelar</button></div></section><section class=cs-pnl style="display:flex;flex-direction:column;gap:12px">${aiBox}</section>${inp}`;
}

function garList(s) {
  let L = ST.cars.slice(); const q = nz(V.q);
  if (q) L = L.filter(c => nz([c.brand, c.model, c.gen, c.ver, c.color, c.year, c.place, c.notes].join(' ')).includes(q));
  if (V.fb) L = L.filter(c => bk(c.brand) === V.fb); if (V.fr !== '') L = L.filter(c => rOf(c) == V.fr); if (V.fv) L = L.filter(c => c.fav);
  const so = { rec: (a, b) => b.date < a.date ? -1 : b.date > a.date ? 1 : (b.t || 0) - (a.t || 0), pts: (a, b) => (s.per[b.id] || 0) - (s.per[a.id] || 0), rar: (a, b) => rOf(b) - rOf(a), mar: (a, b) => a.brand.localeCompare(b.brand, 'pt') || a.model.localeCompare(b.model, 'pt'), ano: (a, b) => (b.year || 0) - (a.year || 0) };
  L.sort(so[V.so] || so.rec);
  return L.length ? `<div class=cs-grid>${L.map(c => card(c, s)).join('')}</div>` : ST.cars.length ? em('search', 'Nenhum carro com esses filtros.') : em('car', 'Sua garagem está vazia.', `<button class=cs-btn onclick="CS.go('scan')">${ic('cam')}Identificar um carro</button>`);
}
function vGar(s) {
  const bs = []; ST.cars.forEach(c => { if (!bs.some(b => b[0] === bk(c.brand))) bs.push([bk(c.brand), c.brand]); }); bs.sort((a, b) => a[1].localeCompare(b[1], 'pt'));
  return hd('Garagem', `${ST.cars.length} ${ST.cars.length == 1 ? 'carro' : 'carros'}`, `<button class="cs-btn" onclick="CS.new()">${ic('plus')}Novo</button>`) +
    `<div class=cs-bar2><input type=search placeholder="Buscar marca, modelo, cor…" value="${esc(V.q)}" oninput="CS.q(this.value)"><select onchange="CS.set('fb',this.value)"><option value="">Todas as marcas</option>${bs.map(b => `<option value="${esc(b[0])}"${V.fb == b[0] ? ' selected' : ''}>${esc(b[1])}</option>`).join('')}</select><select onchange="CS.set('fr',this.value)"><option value="">Toda raridade</option>${RAR.map((r, i) => `<option value="${i}"${V.fr === String(i) ? ' selected' : ''}>${r.n}</option>`).join('')}</select><select onchange="CS.set('so',this.value)">${[['rec', 'Mais recentes'], ['pts', 'Mais pontos'], ['rar', 'Maior raridade'], ['mar', 'Marca A-Z'], ['ano', 'Ano']].map(o => `<option value="${o[0]}"${V.so == o[0] ? ' selected' : ''}>${o[1]}</option>`).join('')}</select><span class="cs-ch${V.fv ? ' on' : ''}" onclick="CS.set('fv',!CS.v().fv)">${ic('star')}Favoritos</span></div><div id=cs-gl>${garList(s)}</div>`;
}

function vCol(s) {
  if (V.cb) { const c = s.colls.find(x => x.b === V.cb); if (c) return colDetail(c); V.cb = ''; }
  const cs = s.colls.filter(c => c.cars > 0 || c.total > 0 || ST.xb.some(b => bk(b) === c.b));
  return hd('Coleções', 'Uma coleção por fabricante. O progresso usa o catálogo de referência do app.', '') +
    `<div class=cs-bar2><input id=cs-nb placeholder="Adicionar outra marca…" maxlength=30 onkeydown="if(event.key==='Enter')CS.addBrand()"><button class="cs-btn ghost" onclick="CS.addBrand()">${ic('plus')}Adicionar marca</button></div><div class=cs-grid style="--cw:230px">${cs.map(c => `<button class=cs-cc onclick="CS.set('cb','${esc(c.b)}')"><div class=row style="justify-content:space-between"><b>${esc(c.name)}</b>${c.complete ? '<span class=cs-ok>COMPLETA</span>' : ''}</div>${c.total ? bar(Math.round(c.got / c.total * 100)) : ''}<span class=s>${c.total ? `${c.got} de ${c.total} modelos do catálogo` : 'Sem lista de referência: só contagem'} · ${c.cars} ${c.cars == 1 ? 'registro' : 'registros'}${c.favs ? ` · ${c.favs} fav.` : ''}</span></button>`).join('')}</div><p class=cs-note style="margin-top:14px">O catálogo (arquivo carspot-data.js) é uma lista de referência do app, não a lista oficial do fabricante. "Completa" significa completa neste catálogo. Marcas sem lista não têm percentual nem conclusão.</p>`;
}
function colDetail(c) {
  const all = c.ms.concat(c.extra).filter(x => V.cf == 'all' || (V.cf == 'have' ? x.have : !x.have));
  return hd(esc(c.name), c.total ? `${c.got} de ${c.total} modelos do catálogo${c.complete ? ' · completa' : ''}` : 'Sem lista de referência para esta marca', `<button class="cs-btn ghost" onclick="CS.set('cb','')">${ic('back')}Voltar</button>`) + (c.total ? `<section class=cs-pnl>${bar(Math.round(c.got / c.total * 100))}<div class=row style="margin-top:12px">${RAR.map((r, i) => c.byR[i] ? `<span class="cs-rr st" style="--rc:${r.c}">${r.n} ${c.byR[i]}</span>` : '').join('')}</div></section>` : '') +
    `<div class=row style="margin-bottom:12px">${[['all', 'Todos'], ['have', 'Encontrados'], ['miss', 'Faltam']].map(t => `<span class="cs-ch${V.cf == t[0] ? ' on' : ''}" onclick="CS.set('cf','${t[0]}')">${t[1]}</span>`).join('')}</div><section class=cs-pnl>${all.length ? all.map(x => `<div class=cs-row style="--rc:${RAR[x.r].c};cursor:pointer" onclick="${x.have ? `CS.open('${x.id}')` : `CS.newFor('${esc(c.name)}','${esc(x.m)}')`}"><span class=cs-dot></span><div class=f><b>${esc(x.m)}</b><div class=s>${RAR[x.r].n}${x.have ? ` · ${x.n} ${x.n == 1 ? 'registro' : 'registros'}` : ' · ainda não encontrado'}</div></div>${x.fav ? ic('star') : ''}<span class=s>${x.have ? 'Ver' : 'Registrar'}</span></div>`).join('') : em('check', 'Nada nesta lista.')}</section>`;
}

function vDes(s) {
  return hd('Desafios', 'Calculados a partir da sua garagem. Cada recompensa vale uma única vez.', '') + `<div class=cs-grid style="--cw:300px">${s.ch.map(c => `<section class=cs-pnl style="margin:0;${c.done ? 'border-color:var(--ok)' : ''}"><div class=row style="justify-content:space-between"><b>${c.t}</b>${c.done ? `<span class=cs-ok>CONCLUÍDO +${c.xp} XP</span>` : `<span class=s>+${c.xp} XP</span>`}</div><p class=cs-note style="margin:6px 0 12px">${c.d}</p>${bar(Math.round(c.val / c.m * 100))}<div class=s style="margin-top:6px">${c.val} de ${c.m}</div></section>`).join('')}</div><p class=cs-note style="margin-top:14px">Desafios de sala (marcas, raridade e quantidade dentro da janela da sala) aparecem na página de cada sala, em Salas.</p>`;
}

const stTag = rm => { const t = roomState(rm); return `<span class=cs-ok style="color:${t == 'ativa' ? 'var(--ok)' : 'var(--t2)'}">${t.toUpperCase()}</span>`; };
function vSal() {
  if (V.room) { const rm = ST.rooms.find(r => r.code === V.room); if (rm) return roomDetail(rm); V.room = ''; }
  const acts = `<button class="cs-btn ghost" onclick="CS.joinForm()">${ic('users')}Entrar</button><button class="cs-btn" onclick="CS.roomForm()">${ic('plus')}Criar sala</button>`;
  return hd('Salas', 'Competição entre amigos, sem servidor. Os resultados são trocados por texto copiado e colado.', acts) +
    (ST.rooms.length ? `<div class=cs-grid style="--cw:290px">${ST.rooms.slice().sort((a, b) => b.t - a.t).map(rm => { const rk = rank(rm), pos = rk.findIndex(r => r.id === ST.me.id) + 1; return `<button class=cs-cc onclick="CS.openRoom('${rm.code}')"><div class=row style="justify-content:space-between"><b>${esc(rm.name)}</b>${stTag(rm)}</div><span class=s>Código ${esc(rm.code)}${rm.host ? ' · anfitrião ' + esc(rm.host) : ''}</span><span class=s>${rm.rules.days ? `${dm(rm.rules.start)} a ${dm(roomEnd(rm))}` : 'Sem prazo'} · ${rk.length} ${rk.length == 1 ? 'jogador' : 'jogadores'} · você em ${pos}º</span>${ST.me.room === rm.code ? '<span class=cs-ok>SALA ATIVA: novos carros entram aqui</span>' : ''}</button>`; }).join('')}</div>` : `<section class=cs-pnl>${em('users', 'Nenhuma sala ainda. Crie uma com seus amigos ou entre com um convite.', `<div class=row style="justify-content:center"><button class=cs-btn onclick="CS.roomForm()">${ic('plus')}Criar sala</button><button class="cs-btn ghost" onclick="CS.joinForm()">Entrar com convite</button></div>`)}</section><section class=cs-pnl><h2>Como funciona sem servidor</h2><div class=cs-steps><div><i>1</i><b>Crie a sala</b>Escolha nome, código e regras. Envie o convite aos amigos.</div><div><i>2</i><b>Registrem carros</b>Cada um registra no próprio aparelho, marcando a sala.</div><div><i>3</i><b>Troquem resultados</b>Cada um exporta o resultado; o anfitrião importa e vê a classificação.</div></div></section>`);
}
function roomDetail(rm) {
  const ru = rm.rules, rk = rank(rm), me = myRoomScore(rm), end = roomEnd(rm), act = ST.me.room === rm.code;
  return hd(esc(rm.name), `Código ${esc(rm.code)} · ${rm.host ? 'anfitrião ' + esc(rm.host) + ' · ' : ''}${ru.days ? `${dm(ru.start)} a ${dm(end)}` : 'sem prazo'}`, `<button class="cs-btn ghost" onclick="CS.set('room','')">${ic('back')}Voltar</button>`) +
    `<div class=row style="margin-bottom:14px">${stTag(rm)}<button class="cs-btn ${act ? '' : 'ghost'} sm" onclick="CS.active('${rm.code}')">${act ? 'Sala ativa' : 'Usar como sala ativa'}</button><button class="cs-btn ghost sm" onclick="CS.invite('${rm.code}')">${ic('share')}Convite</button><button class="cs-btn ghost sm" onclick="CS.myRes('${rm.code}')">${ic('up')}Exportar meu resultado</button><button class="cs-btn ghost sm" onclick="CS.impForm()">${ic('down')}Importar resultado</button><button class="cs-btn ghost sm" onclick="CS.set('tab','cla');CS.set('room','${rm.code}')">${ic('trophy')}Classificação</button></div>
<div class=cs-two><section class=cs-pnl style="margin:0"><h2>Regras</h2><div class=cs-kv><span>Pontos</span><span>${RAR.map((r, i) => ru.rar[i] ? `${r.n} ${ru.pts[i]}` : '').filter(Boolean).join(' · ')}</span><span>Repetido</span><span>${ru.rep} pt</span><span>Limite</span><span>${ru.max} jogadores</span><span>Desempate</span><span>${TIES[ru.tie][0]}</span></div><p class=cs-note style="margin-top:10px">Raridades fora da lista não pontuam. O primeiro registro de cada modelo vale os pontos da raridade.</p></section>
<section class=cs-pnl style="margin:0"><h2>Seu desempenho</h2><div class=cs-kv><span>Pontos</span><span><b>${me.pts}</b></span><span>Carros</span><span>${me.n}</span><span>Modelos</span><span>${me.uniq}</span></div><div style="margin-top:12px">${RCHAL.map(c => { const v = Math.min(c.v(me), c.m); return `<div class=s style="margin-top:8px">${c.t}: ${v}/${c.m}</div>${bar(Math.round(v / c.m * 100))}`; }).join('')}</div></section></div>
<h3 class=cs-sec>Jogadores (${rk.length})</h3><section class=cs-pnl>${rk.map((r, i) => `<div class=cs-row><b class=cs-pos style="width:28px">${i + 1}</b><div class=f><b>${esc(r.nick)}${r.id === ST.me.id ? ' (você)' : ''}</b><div class=s>${r.src == 'local' ? 'seus dados, agora' : r.src == 'antigo' ? 'placar antigo, colado em ' + ago(r.t) : 'resultado importado ' + ago(r.t)}</div></div><b>${r.pts} pts</b>${r.src === 'importado' || r.src === 'antigo' ? `<button class=cs-x onclick="CS.rmRes('${rm.code}','${r.id}')" aria-label="Remover">${ic('x')}</button>` : ''}</div>`).join('')}</section>
<div class=row style="margin-top:6px"><button class="cs-btn ghost sm er" onclick="CS.rmRoom('${rm.code}')">${ic('trash')}Remover sala deste aparelho</button></div>`;
}

function vCla() {
  const rm = ST.rooms.find(r => r.code === (V.room || ST.me.room)) || lastRoom();
  if (!rm) return hd('Classificação', '', '') + `<section class=cs-pnl>${em('trophy', 'A classificação aparece quando existe uma sala.', `<button class=cs-btn onclick="CS.go('sal')">Ir para Salas</button>`)}</section>`;
  const rk = rank(rm);
  return hd('Classificação', 'Sala ' + esc(rm.name), `<select class="cs-bar2-s" style="height:40px;border-radius:11px;background:var(--s2);border:1px solid var(--ln);color:var(--tx);padding:0 12px;font:inherit" onchange="CS.set('room',this.value)">${ST.rooms.map(r => `<option value="${esc(r.code)}"${r.code === rm.code ? ' selected' : ''}>${esc(r.name)} (${esc(r.code)})</option>`).join('')}</select><button class="cs-btn ghost" onclick="CS.impForm()">${ic('down')}Importar</button>`) +
    `<div class=cs-ai style="margin-bottom:14px"><b>Não é tempo real.</b> Esta tabela junta os seus dados de agora com resultados que foram importados manualmente. Cada pontuação é recalculada neste aparelho com as regras da sala. Desempate: ${TIES[rm.rules.tie][0].toLowerCase()}.</div>
<section class=cs-pnl style="padding:0;overflow:hidden"><div class=cs-tb><div class="cs-tr h"><span>#</span><span>Apelido</span><span>Pontos</span><span>Carros</span><span>Maior raridade</span><span>Desafios</span></div>${rk.map((r, i) => `<div class="cs-tr${r.id === ST.me.id ? ' me' : ''}"><span class=cs-pos>${i + 1}</span><span style="min-width:0"><b style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r.nick)}</b><span class=s style="font-size:11px;color:var(--t2)">${r.src == 'local' ? 'agora' : (r.src == 'antigo' ? 'antigo ' : 'importado ') + ago(r.t)}</span></span><b>${r.pts}</b><span>${r.n}</span><span>${r.top >= 0 ? `<span class="cs-rr st" style="--rc:${RAR[r.top].c}">${RAR[r.top].n}</span>` : '—'}</span><span>${r.ch === null ? '—' : r.ch + '/' + RCHAL.length}</span></div>`).join('')}</div></section>`;
}

function vPer(s) {
  const fb = s.colls.filter(c => c.cars > 0).sort((a, b) => b.cars - a.cars).slice(0, 3), val = ST.cars.reduce((a, c) => a + (c.value || 0), 0), n = s.ac.filter(a => a.on).length;
  return hd('Perfil', 'Salvo só neste aparelho. Não é um perfil público.', `<button class="cs-btn ghost" onclick="CS.profForm()">${ic('edit')}Editar</button>`) +
    `<section class=cs-pnl><div class=cs-lv><div class=cs-av>${esc((ST.me.nick || '?').charAt(0).toUpperCase())}<img data-ph="avatar" alt=""></div><div style="flex:1;min-width:0"><h2 style="font-size:22px;text-transform:none;letter-spacing:-.02em;color:var(--tx);margin:0">${esc(ST.me.nick || 'Sem apelido')}</h2><div class=s style="margin:2px 0 10px">Nível ${s.lv.l} · ${s.xp} XP</div>${bar(s.lv.pc)}</div></div></section>
<div class=cs-kp><div><b>${s.n}</b><span>carros</span></div><div><b>${s.xp}</b><span>pontos (XP)</span></div><div><b>${s.uniq}</b><span>modelos</span></div><div><b>${s.brands}</b><span>marcas</span></div></div>
<div class=cs-two><section class=cs-pnl style="margin:0"><h2>Marcas favoritas</h2>${fb.length ? fb.map(c => `<div class=cs-row><div class=f><b>${esc(c.name)}</b></div><span class=s>${c.cars} ${c.cars == 1 ? 'registro' : 'registros'}</span></div>`).join('') : em('car', 'Aparecem conforme você registra.')}</section>
<section class=cs-pnl style="margin:0"><h2>Raridades encontradas</h2>${RAR.map((r, i) => `<div class=cs-row style="--rc:${r.c}"><span class=cs-dot></span><div class=f>${r.n}</div><b>${s.byR[i]}</b></div>`).join('')}${val > 0 ? `<p class=cs-note style="margin-top:8px">Valor total informado por você: R$ ${val.toLocaleString('pt-BR')}</p>` : ''}</section></div>
<h3 class=cs-sec>Conquistas <span>${n} de ${s.ac.length}</span></h3><div class=cs-ac>${s.ac.map(a => `<div class="${a.on ? '' : 'off'}"><span class=cs-medal>${ic(a.on ? 'trophy' : 'lock')}</span><div><b>${a.t}</b><div class=s>${a.d}${a.on && a.at ? ' · ' + new Date(a.at).toLocaleDateString('pt-BR') : ''}</div></div></div>`).join('')}</div>`;
}

function hisList(s) {
  const q = nz(V.hq); let L = ST.cars.slice().sort((a, b) => b.date < a.date ? -1 : b.date > a.date ? 1 : (b.t || 0) - (a.t || 0));
  if (q) L = L.filter(c => nz([c.brand, c.model, c.date, c.room, c.place].join(' ')).includes(q));
  return L.length ? `<section class=cs-pnl>${L.map(c => { const r = rOf(c); return `<div class=cs-row style="cursor:pointer;--rc:${RAR[r].c}" onclick="CS.open('${c.id}')">${thumb(c)}<div class=f><b>${esc(c.brand)} ${esc(c.model)}</b><div class=s>${dm(c.date)} · ${RAR[r].n} · ${c.src == 'ia' ? 'identificado com IA' : 'cadastro manual'}${c.room ? ' · sala ' + esc(c.room) : ''}</div></div><b style="color:var(--k2)">+${s.per[c.id] || 0}</b></div>`; }).join('')}</section>` : em('clock', ST.cars.length ? 'Nada encontrado.' : 'O histórico aparece quando você registrar carros.');
}
function vHis(s) {
  const ev = s.ac.filter(a => a.on && a.at).sort((a, b) => b.at - a.at);
  return hd('Histórico', 'Pontos de cada descoberta, na ordem em que aconteceram.', '') + `<div class=cs-bar2><input type=search placeholder="Buscar no histórico…" value="${esc(V.hq)}" oninput="CS.hq(this.value)"></div><div id=cs-hl>${hisList(s)}</div>${ev.length ? `<h3 class=cs-sec>Conquistas desbloqueadas</h3><section class=cs-pnl>${ev.map(a => `<div class=cs-row><span class=cs-medal>${ic('trophy')}</span><div class=f><b>${a.t}</b><div class=s>${new Date(a.at).toLocaleDateString('pt-BR')}</div></div></div>`).join('')}</section>` : ''}`;
}

function vCfg(s) {
  const legacy = (() => { let n = 0; try { for (let i = 0; i < localStorage.length; i++) if (localStorage.key(i).indexOf(PK) === 0) n++; } catch (e) {} return n; })();
  return hd('Configurações', '', '') + `<section class=cs-pnl><h2>Perfil</h2><div class=cs-row><div class=f><b>${esc(ST.me.nick || 'Sem apelido')}</b><div class=s>Apelido e foto de perfil</div></div><button class="cs-btn ghost sm" onclick="CS.profForm()">Editar</button></div>
<div class=cs-row><div class=f><b>Tamanho da grade</b><div class=s>Cartões da garagem</div></div><span class="cs-ch${ST.opt.dens == 'm' ? ' on' : ''}" onclick="CS.dens('m')">Confortável</span><span class="cs-ch${ST.opt.dens == 's' ? ' on' : ''}" onclick="CS.dens('s')">Compacta</span></div><p class=cs-note>O tema claro/escuro segue a configuração do Hub.</p></section>
<section class=cs-pnl><h2>Backup</h2><p class=cs-note style="margin-bottom:12px">O backup inclui carros, salas, resultados importados, conquistas e as fotos. Importar mescla com o que já existe, sem apagar nada, e pede confirmação.</p><div class=row><button class="cs-btn" onclick="CS.exportAll()">${ic('down')}Exportar backup</button><label class="cs-btn ghost">${ic('up')}Restaurar backup<input type=file accept=".json,application/json" hidden onchange="CS.restore(this)"></label></div></section>
<section class=cs-pnl><h2>Armazenamento local</h2><div class=cs-kv id=cs-sto><span>Carros</span><span>${s.n}</span><span>Fotos</span><span id=cs-sp>calculando…</span><span>Uso estimado</span><span id=cs-su>calculando…</span></div>${legacy ? `<p class=cs-note style="margin-top:10px">Há ${legacy} foto(s) do formato antigo ainda guardadas no localStorage (copiadas para o IndexedDB ${ST.mig ? 'com sucesso' : 'ainda não concluído'}). Você pode liberar esse espaço quando quiser.</p><div class=row style="margin-top:8px"><button class="cs-btn ghost sm" onclick="CS.cleanLegacy()">Liberar espaço das cópias antigas</button></div>` : ''}</section>
<section class=cs-pnl><h2>Reconhecimento por IA</h2><p class=cs-note>Opcional e desligado até você usar. Ao usar, o navegador baixa uma vez o modelo CLIP (via Transformers.js, hospedados por jsDelivr e Hugging Face) e roda no seu aparelho; a foto não é enviada a nenhum servidor do app. É um palpite de marca/modelo entre os itens do catálogo, sem garantia, e não identifica geração, versão nem ano. Status: ${ST.opt.ai ? 'você já aceitou o download' : 'ainda não ativado'}.</p></section>
<section class=cs-pnl><h2>Serviços externos</h2><p class=cs-note>O CarSpot não tem servidor nem login. Único acesso externo: o download do modelo de IA, se você pedir. Localização e preços de mercado não são usados; o valor do carro é um campo seu, marcado como "informado por você".</p></section>
<section class=cs-pnl style="border-color:#E5534B55"><h2 style="color:#E5534B">Zona de risco</h2><p class=cs-note style="margin-bottom:12px">Apaga todos os dados do CarSpot deste aparelho. Exporte um backup antes. Nunca acontece sozinho.</p><button class="cs-btn er" onclick="CS.wipeForm()">${ic('trash')}Limpar dados do CarSpot</button></section>`;
}

function build() {
  const s = stats(), body = ({ ini: vIni, scan: vScan, gar: vGar, col: vCol, des: vDes, sal: vSal, cla: vCla, per: vPer, his: vHis, cfg: vCfg }[V.tab] || vIni)(s);
  return `<div class="cs${ST.opt.dens == 's' ? ' dn' : ''}"><div class=cs-shell><aside class=cs-rail><div class=cs-logo>${logo()}</div><div class=cs-nv role=navigation aria-label="CarSpot">${NAV.map(n => `<a class="${V.tab == n[0] ? 'on' : ''}${n[0] == 'scan' ? ' hl' : ''}" onclick="CS.go('${n[0]}')">${ic(n[1])}<span>${n[2]}</span></a>`).join('')}</div></aside><div class=cs-main>${body}</div></div>${V.tab == 'scan' ? '' : `<button type=button class=cs-fab onclick="CS.go('scan')" aria-label="Identificar carro">${ic('cam')}</button>`}</div>`;
}
P.car = () => {
  try { const h = build(); setTimeout(() => { hyd(); navAct(); if (V.tab === 'cfg') CS.sto(); }, 0); return h; }
  catch (e) { console.error('[carspot]', e); return '<div class=c><h2>CarSpot</h2><p class=s>Não foi possível abrir o CarSpot. Seus dados continuam salvos. Recarregue a página.</p></div>'; }
};

/* ===================== 6. AÇÕES ===================== */
const navAct = () => { const a = document.querySelector('.cs-nv a.on'), n = a && a.parentElement; if (!n || n.scrollWidth <= n.clientWidth + 1) return; n.scrollLeft += a.getBoundingClientRect().left - n.getBoundingClientRect().left - (n.clientWidth - a.offsetWidth) / 2; };
const rr = () => { if (typeof page !== 'undefined' && page === 'car') render(); };
const M = () => document.getElementById('md');
const modal = h => { const m = M(); if (!m) return; m.innerHTML = h; m.className = 'on'; m.onclick = e => { if (e.target === m) closeM(); }; hyd(m); };
const closeM = () => { const m = M(); if (m) { m.className = ''; m.onclick = null; m.innerHTML = ''; } };
const commit = () => { const ok = save(); checkAch(); rr(); return ok; };
const shead = t => `<div class=cs-fh><h2>${t}</h2><button type=button class=cs-x onclick="CS.close()" aria-label="Fechar">${ic('x')}</button></div>`;
const gv = (f, n) => f.elements[n] ? String(f.elements[n].value || '').trim() : '';
const fresh = (b, c) => { if (!navigator.clipboard) return c(); navigator.clipboard.writeText(b).then(() => say('Copiado.'), c); };
const copyTxt = id => { const t = document.getElementById(id); if (!t) return; fresh(t.value, () => { t.focus(); t.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (e) {} say(ok ? 'Copiado.' : 'Selecione o texto e copie manualmente.'); }); };
const shareTxt = id => { const t = document.getElementById(id); if (!t) return; if (navigator.share) navigator.share({ text: t.value }).catch(() => {}); else copyTxt(id); };
const showCode = (title, text, note) => modal(`<div class=cs-sheet>${shead(title)}<div class=cs-fb><label><textarea id=cs-out class=cs-code readonly rows=7>${esc(text)}</textarea></label>${note ? `<p class=cs-note>${note}</p>` : ''}<div class=row><button class=cs-btn onclick="CS.copy('cs-out')">${ic('copy')}Copiar</button><button class="cs-btn ghost" onclick="CS.share('cs-out')">${ic('share')}Compartilhar</button></div></div></div>`);
const brandOpts = () => { const l = []; BRANDS.concat(ST.xb, ST.cars.map(c => c.brand)).forEach(b => { if (!l.some(x => bk(x) === bk(b))) l.push(b); }); return l.sort((a, b) => a.localeCompare(b, 'pt')); };
const modelOpts = b => { const l = (MBYB[bk(b)] || []).map(e => e.m); ST.cars.forEach(c => { if (bk(c.brand) === bk(b) && !l.some(x => nz(x) === nz(c.model))) l.push(c.model); }); return l.map(m => `<option value="${esc(m)}">`).join(''); };

function formCar(c, pre) {
  const d = c || pre || {}, isN = !c, act = ST.rooms.filter(r => roomState(r) !== 'encerrada');
  const roomSel = isN ? (act.some(r => r.code === ST.me.room) ? ST.me.room : '') : (c.room || '');
  const img = fp ? `<img class=on src="${fp.url}" alt="">` : c && c.ph ? `<img data-ph="${c.id}:t" alt="">` : '';
  modal(`<form id=cs-f class="cs-sheet" data-id="${isN ? '' : c.id}" onsubmit="CS.submit(event)">${shead(isN ? 'Confirmar veículo' : 'Editar veículo')}<div class=cs-fb>
<div class=cs-fp><span class=cs-fi>${ic('car', 'ph')}<span id=cs-fim>${img}</span></span><div><label class="cs-btn ghost sm">${ic('image')}${fp || (c && c.ph) ? 'Trocar foto' : 'Adicionar foto'}<input type=file accept="image/*" hidden onchange="CS.pickForm(this)"></label><p class=cs-note style="margin-top:6px">${pre && pre.brand && fp && fp.aiPick ? 'Sugestão da IA: confira os campos.' : 'A foto fica só neste aparelho.'}</p></div></div>
<div class=cs-f><label>Marca *<input name=brand list=cs-bl required maxlength=30 value="${esc(d.brand || '')}" placeholder="Não identificado" oninput="CS.fbrand()"></label><label>Modelo *<input name=model list=cs-ml required maxlength=40 value="${esc(d.model || '')}" placeholder="Não identificado" oninput="CS.prev()"></label>
<label>Geração<input name=gen maxlength=30 value="${esc(d.gen || '')}" placeholder="${nf}"></label><label>Ano<input name=year type=number min=1886 max=${new Date().getFullYear() + 1} value="${d.year || ''}" placeholder="${nf}"></label>
<label>Versão<input name=ver maxlength=40 value="${esc(d.ver || '')}" placeholder="${nf}"></label><label>Cor<input name=color maxlength=20 value="${esc(d.color || '')}" placeholder="${nf}"></label>
<label>Categoria<select name=cat onchange="CS.prev()"><option value="">${nf}</option>${CATS.map(x => `<option value="${x[0]}"${d.cat == x[0] ? ' selected' : ''}>${x[1]}</option>`).join('')}</select></label><label>Raridade<select name=rov onchange="CS.prev()"><option value="">Automática</option>${RAR.map((r, i) => `<option value="${i}"${d.rOv === i ? ' selected' : ''}>${r.n}</option>`).join('')}</select></label>
<label>Data<input name=date type=date value="${d.date || TDY()}"></label><label>Local (opcional)<input name=place maxlength=60 value="${esc(d.place || '')}" placeholder="${nf}"></label>
<label>Valor estimado (R$)<input name=value type=number min=0 step=any value="${d.value == null ? '' : d.value}" placeholder="${nf}"></label><label>Sala<select name=room><option value="">Nenhuma</option>${act.concat(ST.rooms.filter(r => roomState(r) === 'encerrada' && r.code === roomSel)).map(r => `<option value="${esc(r.code)}"${r.code === roomSel ? ' selected' : ''}>${esc(r.name)}</option>`).join('')}</select></label>
<label class=w>Observações<textarea name=notes maxlength=200 placeholder="${nf}">${esc(d.notes || '')}</textarea></label></div>
<p class=cs-note>O valor é uma estimativa informada por você; o app não consulta preços de mercado.</p><div id=cs-pv class=cs-pv></div>
<div class=row><button class=cs-btn>${isN ? 'Salvar na garagem' : 'Salvar alterações'}</button><button type=button class="cs-btn ghost" onclick="CS.close()">Cancelar</button></div></div>
<datalist id=cs-bl>${brandOpts().map(b => `<option value="${esc(b)}">`).join('')}</datalist><datalist id=cs-ml>${modelOpts(d.brand || '')}</datalist></form>`);
  CS.prev();
}

function reveal(c, pts, lvUp) {
  const r = rOf(c), R = RAR[r];
  modal(`<div class="cs-sheet cs-rev" style="--rc:${R.c}"><span class="cs-rr st">${R.n}</span><div class=big>+${pts}</div><div class=s>pontos</div><h2 style="font-size:22px;margin:6px 0 0">${esc(c.brand)} ${esc(c.model)}</h2><p class=cs-note>${pts > 1 ? 'Primeiro registro deste modelo.' : 'Modelo repetido: vale 1 ponto.'}${lvUp ? ` <b style="color:var(--k2)">Você subiu para o nível ${lvUp}!</b>` : ''}</p><div class=row style="justify-content:center;margin-top:10px"><button class=cs-btn onclick="CS.close();CS.go('gar')">Ver na garagem</button><button class="cs-btn ghost" onclick="CS.close();CS.go('scan')">Registrar outro</button></div></div>`);
}

/* IA opcional (CLIP no navegador). Nada roda sem o usuário pedir. Não identifica geração/versão/ano. */
let AIP = null;
function aiLoad() { if (!AIP) { AIP = (async () => { const m = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.2'); return m.pipeline('zero-shot-image-classification', 'Xenova/clip-vit-base-patch32'); })(); AIP.catch(() => { AIP = null; }); } return AIP; }
async function aiRun(url) {
  const clf = await aiLoad(), br = await clf(url, BRANDS.map(b => b + ' car')), brands = br.slice(0, 3).map(x => ({ l: x.label.replace(/ car$/, ''), s: x.score }));
  let models = []; const top = brands[0], ms = top ? MBYB[bk(top.l)] || [] : [];
  if (top && ms.length >= 2 && top.s >= 0.2) { const mr = await clf(url, ms.map(e => top.l + ' ' + e.m)); models = mr.slice(0, 3).map(x => { const e = ms.find(y => top.l + ' ' + y.m === x.label); return { b: top.l, m: e ? e.m : x.label, s: x.score }; }).filter(x => x.s >= 0.35); }
  return { brands, models };
}

const take = f => { say('Processando a imagem…'); procPhoto(f).then(p => { if (pend) URL.revokeObjectURL(pend.url); pend = { ...p, url: URL.createObjectURL(p.full), ai: null }; V.tab = 'scan'; rr(); }).catch(e => say((e && e.message) || 'Imagem inválida.')); };

/* backup: mesclar ou substituir, sempre com confirmação */
async function applyBackup(o, mode) {
  const d = o.data || {}, cars = arr(d.cars).map(cleanCar).filter(Boolean), added = [];
  if (mode === 'replace') {
    const old = ST.cars.map(c => c.id); ST.cars = cars; added.push(...cars); ST.rooms = arr(d.rooms).map(cleanRoom).filter(Boolean).slice(0, 30); ST.results = arr(d.results).map(cleanRes).filter(Boolean).slice(0, 300);
    ST.xb = arr(d.xb).map(b => t1(b, 30)).filter(Boolean).slice(0, 40); ST.ach = d.ach && typeof d.ach === 'object' ? d.ach : {};
    if (d.me && okId(d.me.id)) ST.me.id = d.me.id; ST.me.nick = t1(d.me && d.me.nick, 16) || ST.me.nick; ST.me.room = cleanCode(d.me && d.me.room);
    for (const id of old) if (!cars.some(c => c.id === id)) await delPhoto(id);
  } else {
    const have = new Set(ST.cars.map(c => c.id)); cars.forEach(c => { if (!have.has(c.id)) { ST.cars.push(c); have.add(c.id); added.push(c); } });
    arr(d.rooms).map(cleanRoom).filter(Boolean).forEach(r => { if (!ST.rooms.some(x => x.code === r.code) && ST.rooms.length < 30) ST.rooms.push(r); });
    arr(d.results).map(cleanRes).filter(Boolean).forEach(r => { const i = ST.results.findIndex(x => x.room === r.room && x.id === r.id); if (i < 0) { if (ST.results.length < 300) ST.results.push(r); } else if (ST.results[i].t < r.t) ST.results[i] = r; });
    arr(d.xb).map(b => t1(b, 30)).filter(Boolean).forEach(b => { if (!ST.xb.some(x => bk(x) === bk(b)) && ST.xb.length < 40) ST.xb.push(b); });
    if (d.ach && typeof d.ach === 'object') Object.keys(d.ach).forEach(k => { if (!ST.ach[k] && isFinite(d.ach[k])) ST.ach[k] = +d.ach[k]; });
  }
  let np = 0; const ph = o.photos && typeof o.photos === 'object' ? o.photos : {};
  for (const c of added) { const u = ph[c.id]; if (typeof u === 'string' && /^data:image\//.test(u)) { try { const b = await (await fetch(u)).blob(); await pput(c.id, b); await pput(c.id + ':t', b); dropUrl(c.id); np++; } catch (e) { c.ph = false; } } else if (!c.ph) c.ph = false; }
  if (mode === 'replace' && typeof o.avatar === 'string' && /^data:image\//.test(o.avatar)) { try { await pput('avatar', await (await fetch(o.avatar)).blob()); dropUrl('avatar'); } catch (e) {} }
  return { cars: added.length, photos: np };
}
let RST = null, avNew = null;

const CSX = window.CS = {
  v: () => V, close: closeM, copy: copyTxt, share: shareTxt,
  go(t) { if (t === 'sal') V.room = ''; if (t === 'col') V.cb = ''; V.tab = t; rr(); window.scrollTo(0, 0); },
  set(k, v) { V[k] = v; rr(); }, q(v) { V.q = v; const e = document.getElementById('cs-gl'); if (e) { e.innerHTML = garList(stats()); hyd(e); } }, hq(v) { V.hq = v; const e = document.getElementById('cs-hl'); if (e) { e.innerHTML = hisList(stats()); hyd(e); } },
  dens(v) { ST.opt.dens = v; save(); rr(); },
  /* captura */
  pick(inp) { const f = inp.files && inp.files[0]; inp.value = ''; if (f) take(f); },
  drop(e) { e.preventDefault(); const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if (f) take(f); else rr(); },
  cancel() { if (pend) URL.revokeObjectURL(pend.url); pend = null; rr(); },
  ai() {
    if (!pend || (pend.ai && pend.ai.st === 'load')) return;
    if (!ST.opt.ai && !confirm('A IA vai baixar um modelo de reconhecimento (jsDelivr e Hugging Face) na primeira vez e guardá-lo no navegador. A foto não sai do seu aparelho. O resultado é só um palpite. Continuar?')) return;
    ST.opt.ai = true; save(); const p = pend; p.ai = { st: 'load' }; rr();
    aiRun(p.url).then(r => { p.ai = r.brands.length ? { st: 'ok', brands: r.brands, models: r.models } : { st: 'err', msg: 'Sem resultado confiável.' }; if (pend === p) rr(); })
      .catch(e => { p.ai = { st: 'err', msg: 'Não foi possível carregar ou executar o modelo (' + ((e && e.message) || 'erro') + '). Verifique a conexão e tente de novo.' }; if (pend === p) rr(); });
  },
  useAi(b, m) { fp = pend; if (fp) fp.aiPick = { brand: b, model: m }; formCar(null, { brand: b, model: m }); },
  form() { fp = pend; formCar(null, {}); }, new() { fp = null; formCar(null, {}); }, newFor(b, m) { fp = null; formCar(null, { brand: b, model: m }); },
  pickForm(inp) { const f = inp.files && inp.files[0]; inp.value = ''; if (!f) return; procPhoto(f).then(p => { fp = { ...p, url: URL.createObjectURL(p.full) }; const h = document.getElementById('cs-fim'); if (h) h.innerHTML = `<img class=on src="${fp.url}" alt="">`; }).catch(e => say((e && e.message) || 'Imagem inválida.')); },
  fbrand() { const f = document.getElementById('cs-f'); if (!f) return; const l = document.getElementById('cs-ml'); if (l) l.innerHTML = modelOpts(gv(f, 'brand')); CSX.prev(); },
  prev() {
    const f = document.getElementById('cs-f'), pv = document.getElementById('cs-pv'); if (!f || !pv) return; const b = gv(f, 'brand'), m = gv(f, 'model');
    if (!b || !m) { pv.textContent = 'Informe marca e modelo para ver a raridade prevista.'; return; }
    const r = rOf({ brand: b, model: m, cat: gv(f, 'cat'), rOv: gv(f, 'rov') === '' ? null : +gv(f, 'rov') }), dup = ST.cars.some(x => x.id !== f.dataset.id && ck(x.brand, x.model) === ck(b, m));
    pv.innerHTML = `Raridade prevista: <b style="color:${RAR[r].c}">${RAR[r].n}</b> · ${dup ? 'modelo já registrado: +1 ponto (repetição)' : 'primeiro registro deste modelo: +' + RAR[r].p + ' pontos'}`;
  },
  submit(e) {
    e.preventDefault(); if (busy) return; const f = e.target, id = f.dataset.id, old = id ? ST.cars.find(c => c.id === id) : null;
    const o = { id: id || rid(), brand: gv(f, 'brand'), model: gv(f, 'model'), gen: gv(f, 'gen'), year: gv(f, 'year'), ver: gv(f, 'ver'), color: gv(f, 'color'), cat: gv(f, 'cat'), rOv: gv(f, 'rov') === '' ? null : +gv(f, 'rov'), date: gv(f, 'date'), place: gv(f, 'place'), value: gv(f, 'value'), room: gv(f, 'room'), notes: gv(f, 'notes'),
      src: old ? old.src : fp && fp.aiPick && nz(fp.aiPick.brand) === nz(gv(f, 'brand')) && nz(fp.aiPick.model) === nz(gv(f, 'model')) ? 'ia' : 'manual', fav: old ? old.fav : false, ph: old ? old.ph : false, t: old ? old.t : Date.now() };
    const car = cleanCar(o); if (!car) return say('Informe ao menos marca e modelo.');
    if (!old && ST.cars.some(x => x.date === car.date && ck(x.brand, x.model) === ck(car.brand, car.model) && nz(x.color) === nz(car.color) && nz(x.gen) === nz(car.gen)) && !confirm('Você já registrou este carro nesta data. Registrar de novo mesmo assim?')) return;
    busy = true; const lv0 = stats().lv.l, photo = fp;
    (async () => {
      try {
        if (photo) { try { await savePhoto(car.id, photo); car.ph = true; } catch (er) { if (!old) car.ph = false; say('A foto não pôde ser guardada neste navegador. Os dados foram salvos.'); } }
        if (old) { const i = ST.cars.indexOf(old); ST.cars[i] = car; } else ST.cars.unshift(car);
        if (!save()) { if (!old) ST.cars.shift(); else ST.cars[ST.cars.indexOf(car)] = old; busy = false; return say('Armazenamento cheio. Nada foi salvo.'); }
        if (photo === pend) { pend = null; }
        fp = null; checkAch(); const s = stats(); closeM(); rr();
        if (!old) reveal(car, s.per[car.id] || 0, s.lv.l > lv0 ? s.lv.l : 0); else say('Alterações salvas.');
      } finally { busy = false; }
    })();
  },
  open(id) {
    const c = ST.cars.find(x => x.id === id); if (!c) return; const s = stats(), r = rOf(c), R = RAR[r];
    modal(`<div class=cs-sheet style="--rc:${R.c}"><div class=cs-dph>${ic('car', 'ph')}${c.ph ? `<img data-ph="${c.id}" alt="">` : ''}<button class=cs-x onclick="CS.close()" aria-label="Fechar">${ic('x')}</button></div><div class=cs-dbd><div class=row style="justify-content:space-between"><span class="cs-rr st">${R.n}</span><b style="color:var(--k2)">+${s.per[c.id] || 0} pts</b></div><h2>${esc(c.brand)} ${esc(c.model)}</h2>
<div class=cs-kv><span>Geração</span><span>${esc(c.gen) || nf}</span><span>Ano</span><span>${c.year || nf}</span><span>Versão</span><span>${esc(c.ver) || nf}</span><span>Cor</span><span>${esc(c.color) || nf}</span><span>Categoria</span><span>${c.cat ? CATN[c.cat] : nf}</span><span>Registrado em</span><span>${dm(c.date)}</span><span>Identificação</span><span>${c.src == 'ia' ? 'Palpite da IA, confirmado por você' : 'Cadastro manual'}</span>${c.room ? `<span>Sala</span><span>${esc(c.room)}</span>` : ''}${c.place ? `<span>Local</span><span>${esc(c.place)}</span>` : ''}${c.value != null ? `<span>Valor</span><span>R$ ${c.value.toLocaleString('pt-BR')} <i class=cs-note>(informado por você)</i></span>` : ''}${c.notes ? `<span>Notas</span><span>${esc(c.notes)}</span>` : ''}</div>
<div class=row style="margin-top:8px"><button class="cs-btn ${c.fav ? '' : 'ghost'} sm" onclick="CS.fav('${c.id}')">${ic('star')}${c.fav ? 'Favorito' : 'Favoritar'}</button><button class="cs-btn ghost sm" onclick="CS.edit('${c.id}')">${ic('edit')}Editar</button><button class="cs-btn ghost sm er" onclick="CS.del('${c.id}')">${ic('trash')}Remover</button></div></div></div>`);
  },
  fav(id) { const c = ST.cars.find(x => x.id === id); if (!c) return; c.fav = !c.fav; commit(); CSX.open(id); },
  edit(id) { const c = ST.cars.find(x => x.id === id); if (c) { fp = null; formCar(c); } },
  del(id) { const c = ST.cars.find(x => x.id === id); if (!c || !confirm(`Remover ${c.brand} ${c.model} da garagem? A foto e os pontos deste registro serão apagados.`)) return; ST.cars = ST.cars.filter(x => x.id !== id); delPhoto(id); closeM(); commit(); say('Registro removido.'); },
  addBrand() { const e = document.getElementById('cs-nb'), b = t1(e && e.value, 30); if (!b) return say('Digite o nome da marca.'); if (collections().some(c => c.b === bk(b))) return say('Essa marca já tem coleção.'); ST.xb.push(b); commit(); say('Marca adicionada às coleções.'); },
  /* salas */
  openRoom(code) { V.tab = 'sal'; V.room = code; rr(); window.scrollTo(0, 0); },
  active(code) { ST.me.room = ST.me.room === code ? '' : code; commit(); say(ST.me.room ? 'Sala ativa: novos carros entram nela.' : 'Nenhuma sala ativa.'); },
  roomForm() {
    const d = DRULES();
    modal(`<form class=cs-sheet onsubmit="CS.mkRoom(event)">${shead('Criar sala')}<div class=cs-fb><div class=cs-f><label class=w>Nome da sala<input name=name required maxlength=30 placeholder="Batalha dos Carros"></label><label>Seu apelido (anfitrião)<input name=host required maxlength=16 value="${esc(ST.me.nick)}"></label><label>Código (você escolhe)<input name=code id=cs-rc required maxlength=16 placeholder="CAR-4821" style="text-transform:uppercase"></label>
<label>Início<input name=start type=date value="${d.start}"></label><label>Duração (dias, 0 = sem prazo)<input name=days type=number min=0 max=365 value="${d.days}"></label><label>Máx. de jogadores<input name=max type=number min=2 max=50 value="${d.max}"></label><label>Pontos por repetição<input name=rep type=number min=0 max=99 value="${d.rep}"></label>
<label>Desempate<select name=tie>${Object.keys(TIES).map(k => `<option value="${k}">${TIES[k][0]}</option>`).join('')}</select></label></div>
<div class=cs-sec style="margin:6px 0 0">Pontos por raridade (primeiro registro de cada modelo) e raridades que valem</div><div class=cs-f style="grid-template-columns:repeat(3,minmax(0,1fr))">${RAR.map((r, i) => `<label style="color:${r.c}"><span><input type=checkbox name=ra${i} checked style="width:auto;height:auto"> ${r.n}</span><input name=p${i} type=number min=0 max=999 value="${d.pts[i]}"></label>`).join('')}</div>
<p class=cs-note>Raridades desmarcadas não pontuam na sala. Cada jogador precisa da mesma regra: o convite leva tudo isso.</p><div class=row><button class=cs-btn>Criar sala</button><button type=button class="cs-btn ghost" onclick="CS.gen()">Sugerir código</button><button type=button class="cs-btn ghost" onclick="CS.close()">Cancelar</button></div></div></form>`);
  },
  gen() { const e = document.getElementById('cs-rc'); if (e) e.value = 'CAR-' + String(Math.floor(1000 + Math.random() * 9000)); },
  mkRoom(e) {
    e.preventDefault(); const f = e.target, code = cleanCode(gv(f, 'code')), host = t1(gv(f, 'host'), 16), name = t1(gv(f, 'name'), 30);
    if (!name || !host) return say('Informe o nome da sala e seu apelido.'); if (!okCode(code)) return say('O código precisa ter 3 a 16 letras, números ou hífen.'); if (ST.rooms.some(r => r.code === code)) return say('Já existe uma sala com esse código neste aparelho.');
    if (ST.rooms.length >= 30) return say('Limite de 30 salas guardadas. Remova alguma.');
    const rules = cleanRules({ pts: [0, 1, 2, 3, 4, 5].map(i => gv(f, 'p' + i)), rar: [0, 1, 2, 3, 4, 5].map(i => f.elements['ra' + i].checked), days: gv(f, 'days'), start: gv(f, 'start'), max: gv(f, 'max'), rep: gv(f, 'rep'), tie: gv(f, 'tie') });
    ST.rooms.push({ code, name, host, rules, t: Date.now() }); ST.me.nick = ST.me.nick || host; ST.me.room = code; closeM(); V.tab = 'sal'; V.room = code; commit(); say('Sala criada. Envie o convite aos amigos.');
  },
  joinForm() { modal(`<form class=cs-sheet onsubmit="CS.joinGo(event)">${shead('Entrar em uma sala')}<div class=cs-fb><div class=cs-f><label>Código da sala<input name=code maxlength=16 placeholder="CAR-4821" style="text-transform:uppercase"></label><label>Seu apelido<input name=nick required maxlength=16 value="${esc(ST.me.nick)}"></label></div><label>Convite do anfitrião (CSR1…)<textarea name=inv rows=4 placeholder="Cole aqui a mensagem que o anfitrião enviou"></textarea></label><p class=cs-note>Se a sala já estiver neste aparelho, basta o código. Se não, cole o convite: sem servidor, é ele que traz o nome e as regras da sala.</p><div class=row><button class=cs-btn>Entrar</button><button type=button class="cs-btn ghost" onclick="CS.close()">Cancelar</button></div></div></form>`); },
  joinGo(e) {
    e.preventDefault(); const f = e.target, code = cleanCode(gv(f, 'code')), nick = t1(gv(f, 'nick'), 16), inv = gv(f, 'inv'); if (!nick) return say('Escolha um apelido.');
    let rm;
    if (inv) {
      const o = dec('CSR1', inv); rm = o && cleanRoom({ code: o.c, name: o.n, host: o.h, rules: o.r }); if (!rm) return say('Convite inválido. Cole a mensagem inteira, incluindo o CSR1…');
      if (code && code !== rm.code) return say('O código digitado não confere com o do convite (' + rm.code + ').');
      const i = ST.rooms.findIndex(r => r.code === rm.code);
      if (i >= 0) { if (!confirm('Esta sala já existe aqui. Atualizar as regras com as do convite?')) return; ST.rooms[i] = { ...rm, t: ST.rooms[i].t }; } else { if (ST.rooms.length >= 30) return say('Limite de 30 salas guardadas.'); ST.rooms.push(rm); }
    } else {
      if (!okCode(code)) return say('Informe o código da sala (3 a 16 letras, números ou hífen).'); rm = ST.rooms.find(r => r.code === code);
      if (!rm) return say('Sala não encontrada neste aparelho. Peça o convite (CSR1…) ao anfitrião e cole no campo de convite.');
    }
    ST.me.nick = nick; ST.me.room = rm.code; closeM(); V.tab = 'sal'; V.room = rm.code; commit(); say('Você entrou em ' + rm.name + '.');
  },
  invite(code) {
    const rm = ST.rooms.find(r => r.code === code); if (!rm) return; const ru = rm.rules;
    showCode('Convite da sala', `CarSpot · sala "${rm.name}"\nCódigo: ${rm.code}${rm.host ? '\nAnfitrião: ' + rm.host : ''}\nPeríodo: ${ru.days ? dm(ru.start) + ' a ' + dm(roomEnd(rm)) : 'sem prazo'}\nPara entrar: CarSpot > Salas > Entrar, e cole este convite.\n${enc('CSR1', { c: rm.code, n: rm.name, h: rm.host, r: ru })}`, 'Envie por WhatsApp ou onde preferir. O convite define as regras: todos pontuam do mesmo jeito.');
  },
  myRes(code) {
    const rm = ST.rooms.find(r => r.code === code); if (!rm) return; if (!ST.me.nick) return say('Defina seu apelido em Perfil antes de exportar.');
    const L = ST.cars.filter(c => c.room === code && inWin(rm, c)).slice(0, 250); if (!L.length) return say('Você ainda não registrou carros nesta sala (dentro do período).');
    const p = score(L, rm.rules.pts, rm.rules.rep, rm.rules.rar);
    showCode('Seu resultado', `CarSpot · ${ST.me.nick} · sala ${code}: ${p.n} carros, ${p.pts} pts (pelas regras da sala)\n${enc('CSP1', { r: code, i: ST.me.id, n: ST.me.nick, t: Date.now(), c: L.map(c => ({ b: c.brand, m: c.model, y: c.year, c: c.cat, o: c.rOv, d: c.date, t: c.t })) })}`, 'Mande este texto ao anfitrião. Ele recalcula a pontuação com as regras da sala; os pontos escritos acima são só informativos. Não vão fotos.');
  },
  impForm() { modal(`<div class=cs-sheet>${shead('Importar resultado')}<div class=cs-fb><label>Resultado do jogador (CSP1…)<textarea id=cs-imp rows=5 placeholder="Cole aqui a mensagem que o amigo enviou"></textarea></label><p class=cs-note>O código tem verificação contra erro de cópia, mas não impede que alguém edite o texto de propósito: confie na sua turma.</p><div id=cs-ip></div><div class=row><button class=cs-btn onclick="CS.impCheck()">Verificar</button><button class="cs-btn ghost" onclick="CS.close()">Cancelar</button></div></div></div>`); },
  impCheck() {
    const t = document.getElementById('cs-imp'), box = document.getElementById('cs-ip'); if (!t || !box) return; IMP = null;
    if (/CSR1\./.test(t.value) && !/CSP1\./.test(t.value)) { box.innerHTML = '<div class=cs-ai>Isso é um convite de sala. Use <b>Salas › Entrar</b>.</div>'; return; }
    const o = dec('CSP1', t.value); if (!o) { box.innerHTML = '<div class=cs-ai>Código inválido ou cortado. Cole a mensagem inteira, incluindo o CSP1…</div>'; return; }
    const r = cleanRes({ room: o.r, id: o.i, nick: o.n, t: o.t, cars: arr(o.c).map(cleanSum).filter(Boolean) }), rm = r && ST.rooms.find(x => x.code === r.room);
    if (!r || !r.cars.length) { box.innerHTML = '<div class=cs-ai>Resultado vazio ou com dados inválidos.</div>'; return; }
    if (!rm) { box.innerHTML = `<div class=cs-ai>A sala <b>${esc(r.room)}</b> não existe neste aparelho. Entre nela primeiro.</div>`; return; }
    if (r.id === ST.me.id) { box.innerHTML = '<div class=cs-ai>Esse resultado é seu mesmo.</div>'; return; }
    const known = ST.results.some(x => x.room === rm.code && x.id === r.id), cnt = new Set(ST.results.filter(x => x.room === rm.code).map(x => x.id)); cnt.add(ST.me.id); cnt.add(r.id);
    if (!known && cnt.size > rm.rules.max) { box.innerHTML = `<div class=cs-ai>A sala já está no limite de ${rm.rules.max} jogadores.</div>`; return; }
    const sc = score(r.cars.map(toCar).filter(c => inWin(rm, c)), rm.rules.pts, rm.rules.rep, rm.rules.rar); IMP = r;
    box.innerHTML = `<div class=cs-ai><b>${esc(r.nick)}</b> na sala <b>${esc(rm.name)}</b>: ${sc.n} carros válidos, <b>${sc.pts} pts</b> pelas regras desta sala. Gerado ${ago(r.t)}.${known ? ' Já existe um resultado dele aqui; o mais novo vence.' : ''}</div><div class=row style="margin-top:10px"><button class=cs-btn onclick="CS.impOk()">Confirmar importação</button></div>`;
  },
  impOk() {
    if (!IMP) return; const r = IMP, i = ST.results.findIndex(x => x.room === r.room && x.id === r.id);
    if (i >= 0 && ST.results[i].t >= r.t) { IMP = null; return say('Você já tem um resultado igual ou mais novo desse jogador.'); }
    if (i >= 0) ST.results[i] = r; else { if (ST.results.length >= 300) return say('Limite de resultados guardados atingido.'); ST.results.push(r); }
    IMP = null; closeM(); if (!commit()) say('Armazenamento cheio.'); else say('Resultado de ' + r.nick + ' importado.');
  },
  rmRes(room, id) { const r = ST.results.find(x => x.room === room && x.id === id); if (r && confirm('Remover o resultado de ' + r.nick + ' desta sala?')) { ST.results = ST.results.filter(x => x !== r); commit(); } },
  rmRoom(code) { const rm = ST.rooms.find(r => r.code === code); if (!rm || !confirm(`Remover a sala "${rm.name}" deste aparelho? Seus carros continuam na garagem. Os resultados importados dela serão apagados.`)) return; ST.rooms = ST.rooms.filter(r => r !== rm); ST.results = ST.results.filter(x => x.room !== code); if (ST.me.room === code) ST.me.room = ''; V.room = ''; commit(); },
  /* perfil e configurações */
  profForm() { avNew = null; modal(`<form class=cs-sheet onsubmit="CS.profSave(event)">${shead('Editar perfil')}<div class=cs-fb><div class=cs-fp><span class=cs-av id=cs-avp>${esc((ST.me.nick || '?').charAt(0).toUpperCase())}<img data-ph="avatar" alt=""></span><label class="cs-btn ghost sm">${ic('image')}Alterar foto<input type=file accept="image/*" hidden onchange="CS.avPick(this)"></label></div><label>Apelido<input name=nick required maxlength=16 value="${esc(ST.me.nick)}"></label><p class=cs-note>O apelido aparece nas salas e nos resultados que você exporta. O perfil existe só neste aparelho.</p><div class=row><button class=cs-btn>Salvar</button><button type=button class="cs-btn ghost" onclick="CS.close()">Cancelar</button></div></div></form>`); },
  avPick(inp) { const f = inp.files && inp.files[0]; inp.value = ''; if (!f) return; procPhoto(f).then(p => { avNew = p.thumb; const e = document.getElementById('cs-avp'); if (e) e.innerHTML = `<img class=on src="${URL.createObjectURL(p.thumb)}" alt="">`; }).catch(er => say((er && er.message) || 'Imagem inválida.')); },
  profSave(e) { e.preventDefault(); const n = t1(gv(e.target, 'nick'), 16); if (!n) return say('Escolha um apelido.'); ST.me.nick = n; (async () => { if (avNew) { try { await pput('avatar', avNew); dropUrl('avatar'); } catch (er) { say('Não foi possível guardar a foto de perfil.'); } avNew = null; } closeM(); commit(); say('Perfil atualizado.'); })(); },
  async sto() {
    const a = document.getElementById('cs-sp'), u = document.getElementById('cs-su'); if (!a || !u) return;
    try { const k = await pkeys(); a.textContent = k.filter(x => x !== 'avatar' && !String(x).endsWith(':t')).length + ' no IndexedDB'; } catch (e) { a.textContent = 'IndexedDB indisponível neste navegador'; }
    try { const est = navigator.storage && navigator.storage.estimate ? await navigator.storage.estimate() : null; u.textContent = est ? (est.usage / 1048576).toFixed(1).replace('.', ',') + ' MB de ' + Math.round(est.quota / 1048576) + ' MB (todo o site do Hub)' : 'o navegador não informa'; } catch (e) { u.textContent = 'o navegador não informa'; }
  },
  async exportAll() {
    say('Preparando o backup…'); const photos = {}; let av = null;
    for (const c of ST.cars) { if (!c.ph) continue; try { const b = await pget(c.id); if (b) photos[c.id] = await blobToData(b); else { const d = lsPhoto(c.id); if (d) photos[c.id] = d; } } catch (e) {} }
    try { const b = await pget('avatar'); if (b) av = await blobToData(b); } catch (e) {}
    const blob = new Blob([JSON.stringify({ app: 'carspot', v: 2, at: Date.now(), data: ST, avatar: av, photos })], { type: 'application/json' }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'carspot-backup-' + TDY() + '.json'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); say('Backup gerado.');
  },
  restore(inp) {
    const f = inp.files && inp.files[0]; inp.value = ''; if (!f) return;
    f.text().then(t => {
      const o = JSON.parse(t); if (!o || o.app !== 'carspot' || !o.data || !arr(o.data.cars)) throw 0; RST = o;
      const have = new Set(ST.cars.map(c => c.id)), cars = arr(o.data.cars).map(cleanCar).filter(Boolean), nw = cars.filter(c => !have.has(c.id)).length;
      modal(`<div class=cs-sheet>${shead('Restaurar backup')}<div class=cs-fb><div class=cs-ai>Arquivo de ${o.at ? new Date(o.at).toLocaleDateString('pt-BR') : 'data desconhecida'}: <b>${cars.length}</b> carros (<b>${nw}</b> novos para este aparelho), ${arr(o.data.rooms).length} salas, ${Object.keys(o.photos || {}).length} fotos.</div><p class=cs-note><b>Mesclar</b> adiciona o que falta e não apaga nada. <b>Substituir</b> troca tudo o que você tem agora pelo conteúdo do arquivo.</p><div class=row><button class=cs-btn onclick="CS.restoreGo('merge')">Mesclar (recomendado)</button><button class="cs-btn ghost er" onclick="CS.restoreGo('replace')">Substituir tudo</button><button class="cs-btn ghost" onclick="CS.close()">Cancelar</button></div></div></div>`);
    }).catch(() => say('Arquivo inválido. Use um backup exportado pelo CarSpot.'));
  },
  restoreGo(mode) {
    if (!RST) return; if (mode === 'replace' && !confirm('Substituir TODOS os dados atuais do CarSpot pelo conteúdo do arquivo? Isso não pode ser desfeito.')) return;
    const o = RST; RST = null; say('Restaurando…');
    applyBackup(o, mode).then(r => { closeM(); if (!commit()) say('Restaurado, mas o armazenamento encheu.'); else say(r.cars + ' carro(s) ' + (mode === 'replace' ? 'restaurados' : 'adicionados') + ', ' + r.photos + ' foto(s).'); }).catch(() => say('Não foi possível restaurar esse arquivo.'));
  },
  async cleanLegacy() {
    if (!confirm('Remover do localStorage as cópias antigas das fotos que já estão no IndexedDB? As fotos continuam na garagem.')) return; let n = 0;
    for (const c of ST.cars) { if (!lsPhoto(c.id)) continue; try { if (await pget(c.id)) { localStorage.removeItem(PK + c.id); n++; } } catch (e) {} }
    say(n ? n + ' cópia(s) antiga(s) removida(s).' : 'Nada a remover: nenhuma foto antiga está no IndexedDB ainda.'); rr();
  },
  wipeForm() { modal(`<div class=cs-sheet>${shead('Limpar dados do CarSpot')}<div class=cs-fb><div class=cs-ai>Isso apaga carros, fotos, salas, resultados e conquistas <b>deste aparelho</b>, inclusive as cópias de segurança do formato antigo. Não afeta os outros módulos do Hub.</div><label>Digite APAGAR para confirmar<input id=cs-wp autocomplete=off></label><div class=row><button class="cs-btn er" onclick="CS.wipeGo()">Apagar tudo</button><button class="cs-btn ghost" onclick="CS.close()">Cancelar</button></div></div></div>`); },
  async wipeGo() {
    const e = document.getElementById('cs-wp'); if (!e || e.value.trim() !== 'APAGAR') return say('Digite APAGAR para confirmar.');
    try { const ks = await pkeys(); for (const k of ks) await pdel(k); } catch (er) {}
    URLS.forEach(u => URL.revokeObjectURL(u)); URLS.clear();
    try { const del = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.indexOf(PK) === 0 || k === BKP) del.push(k); } del.forEach(k => localStorage.removeItem(k)); } catch (er) {}
    ST.cars = []; ST.rooms = []; ST.results = []; ST.xb = []; ST.ach = {}; ST.me.nick = ''; ST.me.room = ''; pend = null; fp = null; V.tab = 'ini'; V.room = ''; V.cb = ''; closeM(); commit(); say('Dados do CarSpot apagados.');
  }
};

migratePhotos();
})();