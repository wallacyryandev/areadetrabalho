/* Hub Pessoal - carspot.js
   CarSpot: jogo de colecionar carros encontrados na rua (foto, coleção, catálogo, estatísticas e placar entre amigos).
   Carregar DEPOIS de clima.js e ANTES de home.js (assim o app entra sozinho na grade do Início).
   Usa só o que o Hub já tem (PG, P, UI, esc, uid, D, TD, render, chart). Sem bibliotecas e sem banco de dados.

   DADOS: localStorage 'hub_carspot' (coleção, perfil e placares de amigos) + 'hub_cs_p_<id>' (uma chave por foto).
   Ficam FORA do objeto S de propósito: o S é sincronizado entre aparelhos e vai inteiro no Exportar do Hub,
   e fotos o deixariam pesado. O CarSpot tem o próprio exportar/importar (aba Estatísticas).

   COMPETIÇÃO: não existe servidor. Cada jogador gera um "código de placar" e os amigos colam no app (aba Competição).
   Para sincronizar ao vivo no futuro, basta um transporte que entregue snapshots a CS.receive(); ver NET abaixo.

   CSS injetado uma vez, todo escopado em .cs / .cs-*; usa os tokens do Hub (--card, --bd, --ac...). */
(() => {
'use strict';
if (typeof PG === 'undefined' || typeof P === 'undefined' || typeof esc !== 'function' || typeof D !== 'function' || typeof UI === 'undefined') return;

/* =====================================================================
   1. CATÁLOGO E RARIDADE  (a classificação é editável aqui)
   [raridade, marca, 'modelos separados por vírgula']   0 Comum · 1 Incomum · 2 Raro · 3 Épico · 4 Lendário
   ===================================================================== */
const RAR = [
  { n: 'Comum', p: 1, c: '#9AA3AE' },
  { n: 'Incomum', p: 3, c: '#34B36B' },
  { n: 'Raro', p: 10, c: '#6FA3FF' },
  { n: 'Épico', p: 25, c: '#B58CFF' },
  { n: 'Lendário', p: 60, c: '#E8A33D' }
];
const RAW = [
  [0, 'Fiat', 'Uno,Palio,Siena,Mobi,Argo,Cronos,Strada,Toro,Pulse,Fiorino,Doblò,Punto,Idea,Bravo'],
  [0, 'Volkswagen', 'Gol,Fox,Polo,Voyage,Saveiro,Virtus,Nivus,T-Cross,Up,Jetta,Golf,Amarok,Parati'],
  [0, 'Chevrolet', 'Onix,Prisma,Celta,Corsa,Classic,Cobalt,Cruze,S10,Tracker,Montana,Spin,Agile,Meriva,Vectra,Astra,Zafira'],
  [0, 'Ford', 'Ka,Fiesta,Focus,EcoSport,Ranger,Fusion,Courier'],
  [0, 'Honda', 'Civic,Fit,City,HR-V,CR-V,WR-V'],
  [0, 'Toyota', 'Corolla,Etios,Yaris,Hilux,SW4,Corolla Cross'],
  [0, 'Hyundai', 'HB20,Creta,ix35,Tucson,i30,Azera,Elantra'],
  [0, 'Renault', 'Kwid,Sandero,Logan,Duster,Clio,Oroch,Captur,Fluence,Master'],
  [0, 'Jeep', 'Renegade,Compass,Commander'],
  [0, 'Nissan', 'Kicks,March,Versa,Frontier,Livina,Sentra'],
  [0, 'Peugeot', '206,207,208,2008,307,308,Partner'],
  [0, 'Citroën', 'C3,C4 Cactus,Aircross,C4 Lounge,Jumper'],
  [0, 'Mitsubishi', 'L200 Triton,Pajero,ASX,Outlander,Eclipse Cross'],

  [1, 'Volkswagen', 'Fusca,Kombi,Brasília,Passat,Santana,Gol GTI,Tiguan,SpaceFox,Variant,Taos'],
  [1, 'Chevrolet', 'Opala,Chevette,Monza,Kadett,Omega,Blazer,Silverado,Equinox,Bolt,Trailblazer'],
  [1, 'Ford', 'Maverick,Corcel,Del Rey,Escort,Landau,F-1000,F-250,Edge,Territory,Bronco Sport,Belina'],
  [1, 'Fiat', '147,Tempra,Marea,Stilo,Linea,500,Elba,Fastback,Titano'],
  [1, 'BMW', 'Série 1,Série 3,Série 5,X1,X3,X5,Z3'],
  [1, 'Mercedes-Benz', 'Classe A,Classe C,Classe E,GLA,GLC,CLA,Sprinter'],
  [1, 'Audi', 'A1,A3,A4,A5,Q3,Q5,Q7'],
  [1, 'Volvo', 'XC40,XC60,XC90,S60,V40'],
  [1, 'Land Rover', 'Evoque,Discovery,Freelander,Discovery Sport'],
  [1, 'Mini', 'Cooper,Countryman'],
  [1, 'Subaru', 'Impreza,Forester,XV,Outback'],
  [1, 'Mazda', 'Mazda3,Mazda6,CX-5,CX-30'],
  [1, 'Suzuki', 'Jimny,Vitara,Swift,Grand Vitara'],
  [1, 'Lexus', 'IS,NX,RX,ES'],
  [1, 'Kia', 'Sportage,Cerato,Picanto,Soul,Sorento,Stonic'],
  [1, 'Chery', 'Tiggo 5X,Tiggo 7,Tiggo 8,Arrizo 6,QQ,Celer'],
  [1, 'BYD', 'Dolphin,Dolphin Mini,Song Plus,Yuan Plus,King'],
  [1, 'GWM', 'Haval H6,Ora 03'],
  [1, 'JAC', 'T40,J3,E-JS1'],
  [1, 'Ram', '1500,2500,3500'],
  [1, 'Troller', 'T4,Pantanal'],
  [1, 'Dodge', 'Journey'],
  [1, 'Smart', 'Fortwo'],
  [1, 'Jaguar', 'XE,F-Pace'],

  [2, 'BMW', 'M2,M3,M4,M5,X5 M,Z4,Série 8,M135i'],
  [2, 'Mercedes-Benz', 'A45 AMG,C63 AMG,E63 AMG,SL,GLE Coupé,CLS,Classe S'],
  [2, 'Audi', 'RS3,RS4,RS5,RS6,S3,S4,TT,e-tron'],
  [2, 'Porsche', 'Macan,Cayenne,Panamera,Cayman,Boxster,Taycan'],
  [2, 'Ford', 'Mustang,Bronco,F-150 Raptor,Mustang Mach-E'],
  [2, 'Chevrolet', 'Camaro,Corvette'],
  [2, 'Dodge', 'Challenger,Charger,Ram TRX'],
  [2, 'Nissan', '350Z,370Z,Skyline,Silvia,240SX'],
  [2, 'Toyota', 'Supra,GR86,GR Yaris,Land Cruiser,Celica,MR2'],
  [2, 'Subaru', 'WRX STI,BRZ,Legacy GT'],
  [2, 'Mitsubishi', 'Lancer Evolution,3000GT'],
  [2, 'Honda', 'Civic Type R,S2000,Integra Type R'],
  [2, 'Mazda', 'MX-5 Miata,RX-7,RX-8'],
  [2, 'Tesla', 'Model 3,Model Y,Model S,Model X'],
  [2, 'Maserati', 'Ghibli,Levante,Quattroporte,GranTurismo'],
  [2, 'Alfa Romeo', 'Giulia,Stelvio,4C,Giulietta,MiTo,156'],
  [2, 'Jaguar', 'F-Type,XJ,XK'],
  [2, 'Land Rover', 'Defender,Range Rover,Range Rover Sport,Range Rover Velar'],
  [2, 'Lotus', 'Elise,Exige,Evora'],
  [2, 'Volkswagen', 'Golf GTI,Golf R,Scirocco,Karmann-Ghia'],
  [2, 'Hyundai', 'Veloster N,Ioniq 5,i30 N'],
  [2, 'Lexus', 'LC,RC F,LS'],
  [2, 'Volvo', 'Polestar 2,P1800'],
  [2, 'Mini', 'John Cooper Works'],

  [3, 'Porsche', '911,911 GT3,911 Turbo'],
  [3, 'Nissan', 'GT-R'],
  [3, 'Audi', 'R8,RS7,RS e-tron GT'],
  [3, 'Aston Martin', 'Vantage,DB9,DB11,DBS,DBX'],
  [3, 'Bentley', 'Continental GT,Bentayga,Flying Spur,Mulsanne'],
  [3, 'Rolls-Royce', 'Ghost,Phantom,Wraith,Cullinan,Dawn'],
  [3, 'Mercedes-Benz', 'G63 AMG,Classe G,AMG GT,Maybach S'],
  [3, 'Lamborghini', 'Urus'],
  [3, 'Maserati', 'MC20'],
  [3, 'Honda', 'NSX'],
  [3, 'Dodge', 'Viper'],
  [3, 'Ford', 'Mustang Shelby GT500,GT40'],
  [3, 'Chevrolet', 'Corvette Z06,Corvette ZR1'],
  [3, 'Tesla', 'Cybertruck,Roadster'],
  [3, 'BMW', 'i8,M8,Z8'],
  [3, 'Lotus', 'Emira,Esprit'],
  [3, 'Alfa Romeo', '8C Competizione'],
  [3, 'Puma', 'GTE,GTB'],

  [4, 'Ferrari', '308,328,348,355,360 Modena,F430,458 Italia,488 GTB,California,F8 Tributo,812 Superfast,Roma,296 GTB,SF90 Stradale,Testarossa,F40,F50,Enzo,LaFerrari,Purosangue'],
  [4, 'Lamborghini', 'Miura,Countach,Diablo,Murciélago,Gallardo,Huracán,Aventador,Revuelto'],
  [4, 'McLaren', 'F1,540C,570S,650S,720S,765LT,Artura,P1,Senna'],
  [4, 'Bugatti', 'EB110,Veyron,Chiron,Divo'],
  [4, 'Pagani', 'Zonda,Huayra,Utopia'],
  [4, 'Koenigsegg', 'CCX,Agera,Regera,Jesko'],
  [4, 'Ford', 'GT'],
  [4, 'Porsche', '959,Carrera GT,918 Spyder'],
  [4, 'Aston Martin', 'One-77,Vulcan,Valkyrie'],
  [4, 'Lexus', 'LFA'],
  [4, 'Mercedes-Benz', 'SLS AMG,SLR McLaren,Project One'],
  [4, 'Toyota', '2000GT'],
  [4, 'Rimac', 'Nevera']
];

/* normaliza para comparar: sem acento, minúsculo, só letras e números */
const nz = s => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const ALI = { vw: 'volkswagen', gm: 'chevrolet', chevy: 'chevrolet', mercedes: 'mercedesbenz', benz: 'mercedesbenz', alfa: 'alfaromeo' };
const bk = b => { const k = nz(b); return ALI[k] || k; };
const ck = (b, m) => bk(b) + '|' + nz(m);

const CAT = new Map(), CATL = [], BRANDS = [], MBYB = {};
RAW.forEach(([r, b, ms]) => {
  if (BRANDS.indexOf(b) < 0) BRANDS.push(b);
  const b0 = bk(b); (MBYB[b0] = MBYB[b0] || []);
  ms.split(',').forEach(m => {
    m = m.trim(); const k = ck(b, m);
    if (!m || CAT.has(k)) return;
    const e = { i: CATL.length, k, b, m, r }; CAT.set(k, e); CATL.push(e); MBYB[b0].push(e);
  });
});
BRANDS.sort((a, b) => a.localeCompare(b, 'pt'));

/* =====================================================================
   2. ARMAZENAMENTO (localStorage)
   ===================================================================== */
const KEY = 'hub_carspot', PK = 'hub_cs_p_';
const rid = () => uid() + uid().slice(0, 3);

const cleanCar = x => {
  if (!x || typeof x !== 'object') return null;
  const id = String(x.id || ''), brand = String(x.brand || '').replace(/\s+/g, ' ').trim().slice(0, 30), model = String(x.model || '').replace(/\s+/g, ' ').trim().slice(0, 40);
  if (!/^[A-Za-z0-9]{3,16}$/.test(id) || !brand || !model) return null;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(x.date) ? x.date : TD();
  const y = parseInt(x.year, 10), cy = new Date().getFullYear();
  return { id, brand, model, year: y >= 1886 && y <= cy + 1 ? y : null, date, place: String(x.place || '').replace(/\s+/g, ' ').trim().slice(0, 60), r: x.r >= 0 && x.r <= 4 ? x.r | 0 : 0, ph: !!x.ph, t: isFinite(x.t) ? +x.t : Date.now() };
};
const cleanName = s => String(s == null ? '' : s).replace(/[\u0000-\u001f<>"'`\\]/g, '').replace(/\s+/g, ' ').trim().slice(0, 16);
const cleanRoom = s => String(s == null ? '' : s).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
const int = (v, mx) => { const n = Math.floor(+v); return isFinite(n) && n >= 0 && n <= mx ? n : null; };
const cleanSnap = o => {
  if (!o || typeof o !== 'object') return null;
  const i = String(o.i || ''), n = cleanName(o.n), r = cleanRoom(o.r), c = int(o.c, 1e6), a = int(o.a, 1e6), p = int(o.p, 1e8), t = +o.t;
  if (!/^[A-Za-z0-9]{4,16}$/.test(i) || !n || r.length < 3 || c === null || a === null || p === null || !isFinite(t) || t < 1e12 || t > Date.now() + 864e5) return null;
  return { i, n, r, c, a, p, t };
};

let ST = (() => {
  let o = null;
  try { o = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
  o = o && typeof o === 'object' ? o : {};
  const me = o.me && typeof o.me === 'object' ? o.me : {};
  const st = {
    v: 1,
    cars: (Array.isArray(o.cars) ? o.cars : []).map(cleanCar).filter(Boolean),
    me: { id: /^[A-Za-z0-9]{4,16}$/.test(me.id) ? me.id : rid(), nick: cleanName(me.nick), room: cleanRoom(me.room) },
    friends: (Array.isArray(o.friends) ? o.friends : []).map(cleanSnap).filter(Boolean).slice(0, 50)
  };
  if (!st.me.nick && typeof S !== 'undefined' && S && S.name) st.me.nick = cleanName(S.name);
  return st;
})();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(ST)); return true; } catch (e) { return false; } };
save();

const pget = id => { try { return localStorage.getItem(PK + id) || ''; } catch (e) { return ''; } };
const pset = (id, d) => { try { localStorage.setItem(PK + id, d); return true; } catch (e) { return false; } };
const pdel = id => { try { localStorage.removeItem(PK + id); } catch (e) {} };

/* espaço usado (estimativa em caracteres; o limite do navegador fica perto de 5 milhões) */
const usage = () => {
  let all = 0, mine = 0, n = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i), l = k.length + (localStorage.getItem(k) || '').length;
      all += l; if (k.indexOf('hub_cs_') === 0 || k === KEY) { mine += l; if (k.indexOf(PK) === 0) n++; }
    }
  } catch (e) {}
  return { all, mine, n, lim: 5 * 1024 * 1024 };
};
const mb = n => (n / 1048576).toFixed(1).replace('.', ',') + ' MB';

/* foto: reduz para no máx. 600 px e comprime em JPEG (cada foto fica com poucas dezenas de KB) */
function readPhoto(file) {
  return new Promise((ok, no) => {
    if (!file || !/^image\//.test(file.type || '')) { no(new Error('Escolha um arquivo de imagem.')); return; }
    const im = new Image(), u = URL.createObjectURL(file);
    im.onload = () => {
      try {
        const w = im.naturalWidth || im.width, h = im.naturalHeight || im.height;
        if (!w || !h) throw new Error('Imagem inválida.');
        const s = Math.min(1, 600 / Math.max(w, h)), cw = Math.max(1, Math.round(w * s)), ch = Math.max(1, Math.round(h * s));
        const c = document.createElement('canvas'); c.width = cw; c.height = ch;
        const g = c.getContext('2d'); g.fillStyle = '#111'; g.fillRect(0, 0, cw, ch); g.drawImage(im, 0, 0, cw, ch);
        URL.revokeObjectURL(u); ok(c.toDataURL('image/jpeg', 0.68));
      } catch (e) { URL.revokeObjectURL(u); no(e); }
    };
    im.onerror = () => { URL.revokeObjectURL(u); no(new Error('Não foi possível ler essa imagem.')); };
    im.src = u;
  });
}

/* =====================================================================
   3. CÁLCULOS
   ===================================================================== */
const rOf = c => { const e = CAT.get(ck(c.brand, c.model)); return e ? e.r : (c.r >= 0 && c.r <= 4 ? c.r | 0 : 0); };
/* o 1º avistamento de cada modelo vale os pontos da raridade; repetições valem 1 ponto */
function calc() {
  const L = ST.cars.slice().sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : (a.t || 0) - (b.t || 0));
  const seen = new Set(), cnt = {}, per = {}, byR = [0, 0, 0, 0, 0], brands = {}, found = new Set(), fR = [0, 0, 0, 0, 0];
  let pts = 0;
  L.forEach(c => {
    const k = ck(c.brand, c.model), r = rOf(c); cnt[k] = (cnt[k] || 0) + 1;
    let p = 1;
    if (!seen.has(k)) {
      seen.add(k); p = RAR[r].p; byR[r]++;
      const B = bk(c.brand); brands[B] = brands[B] || { n: c.brand, c: 0 }; brands[B].c++;
      if (CAT.has(k)) { found.add(k); fR[r]++; }
    }
    per[c.id] = p; pts += p;
  });
  return { pts, per, cnt, uniq: seen.size, sight: ST.cars.length, byR, fR, found, catFound: found.size, brands: Object.values(brands).sort((a, b) => b.c - a.c || a.n.localeCompare(b.n, 'pt')), first: L[0] || null, last: L[L.length - 1] || null };
}
const CATR = [0, 0, 0, 0, 0]; CATL.forEach(e => CATR[e.r]++);
const pcat = n => !n ? '0%' : n / CATL.length < 0.01 ? '<1%' : Math.round(n / CATL.length * 100) + '%';

const dm = s => String(s || '').split('-').reverse().join('/');
const ago = t => { const s = Math.max(0, (Date.now() - t) / 1000); if (s < 90) return 'agora'; if (s < 3600) return 'há ' + Math.round(s / 60) + ' min'; if (s < 86400) return 'há ' + Math.round(s / 3600) + ' h'; const d = Math.round(s / 86400); return 'há ' + d + (d == 1 ? ' dia' : ' dias'); };
const say = m => { const e = document.getElementById('tt'); if (!e) return; e.textContent = m; e.classList.add('on'); clearTimeout(say.t); say.t = setTimeout(() => e.classList.remove('on'), 3000); };
const val = id => { const e = document.getElementById(id); return e ? String(e.value || '').replace(/\s+/g, ' ').trim() : ''; };

/* =====================================================================
   4. INTEGRAÇÃO COM O HUB: página, ícones, CSS
   ===================================================================== */
if (!PG.some(p => p[0] === 'car')) {
  const i = PG.findIndex(p => p[0] === 'cfg');
  PG.splice(i < 0 ? PG.length : i, 0, ['car', 'car', 'CarSpot']);
}

/* ícones no estilo do Hub (traço): carro esportivo, câmera e imagem */
const CARP = '<path d="M2 15.5v-1.7c0-.7.5-1.3 1.2-1.5l4.3-1c1.5-1.5 3.1-2.5 5.3-2.7h1.7c1.8.1 3.4 1 5 2.5l1.6.4c1.2.3 1.9 1 1.9 2.2v1.8"/><path d="M2 15.5h2.2M9.8 15.5h4.4M19.8 15.5H22"/><circle cx="7" cy="15.5" r="2.8"/><circle cx="17" cy="15.5" r="2.8"/>';
(() => {
  let defs = document.querySelector('body > svg defs');
  if (!defs) { const s = document.querySelector('svg defs'); defs = s; }
  if (!defs || document.getElementById('i-car')) return;
  defs.insertAdjacentHTML('beforeend',
    '<symbol id="i-car" viewBox="0 0 24 24">' + CARP + '</symbol>' +
    '<symbol id="i-camera" viewBox="0 0 24 24"><path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.5"/></symbol>' +
    '<symbol id="i-image" viewBox="0 0 24 24"><rect x="3" y="4.5" width="18" height="15" rx="2"/><circle cx="8.5" cy="10" r="1.6"/><path d="m4 18 5-5 3.5 3.5L16 13l4 4"/></symbol>');
})();

if (!document.getElementById('cs-css')) {
  /* ícone provisório no Início: fundo escuro + silhueta branca em traço fino.
     Quando você salvar o PNG como carspot-icon.png (mesma pasta), ele passa a cobrir este desenho. */
  const ico = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='1' stroke-linecap='round' stroke-linejoin='round'>" + CARP + '</svg>';
  const st = document.createElement('style');
  st.id = 'cs-css';
  st.textContent = `
.hp-app[onclick="go('car')"] .hp-ic{font-size:0;color:transparent;background:url("carspot-icon.png") center/cover no-repeat,url("data:image/svg+xml,${encodeURIComponent(ico)}") center/76% no-repeat #0c0d10!important}
.cs-kpis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:14px}
.cs-kpi{background:var(--card);border:1px solid var(--bd);border-radius:var(--r);padding:12px 14px;min-width:0}
.cs-kpi b{display:block;font-size:22px;font-weight:700;letter-spacing:-.02em;line-height:1.15;font-variant-numeric:tabular-nums}
.cs-kpi span{font-size:12px;color:var(--t2)}
.cs-sel{display:flex;gap:8px;margin-bottom:12px}
.cs-sel select{flex:1;min-width:0}
.cs-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px}
.cs-card{display:flex;flex-direction:column;text-align:left;padding:0;margin:0;font:inherit;color:inherit;background:var(--card);border:1px solid var(--bd);border-radius:var(--r);overflow:hidden;cursor:pointer;position:relative;transition:border-color .15s,transform .1s}
.cs-card:hover{border-color:var(--t2)}
.cs-card:active{transform:scale(.98)}
.cs-img{aspect-ratio:4/3;background:#0d0f13;display:grid;place-items:center;overflow:hidden}
.cs-img img{width:100%;height:100%;object-fit:cover;display:block}
.cs-ph{width:44px;height:44px;color:var(--t2);opacity:.5}
.cs-rar{position:absolute;top:8px;left:8px;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;background:rgba(10,12,15,.8);color:var(--rc);border:1px solid var(--rc)}
.cs-t{padding:10px 12px 12px;display:flex;flex-direction:column;gap:2px;min-width:0}
.cs-t b{font-size:14px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cs-t span{font-size:12px;color:var(--t2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cs-cr{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--bd)}
.cs-cr:last-child{border:0}
.cs-dot{width:9px;height:9px;border-radius:50%;flex:none;background:var(--rc)}
.cs-ok{color:var(--ok);display:inline-flex}
.cs-bh{font-size:12px;font-weight:600;color:var(--t2);text-transform:uppercase;letter-spacing:.04em;margin:14px 0 2px}
.cs-bh:first-child{margin-top:0}
.cs-bar{height:8px;background:var(--bd);border-radius:4px;overflow:hidden;margin-top:6px}
.cs-bar i{display:block;height:100%;border-radius:4px;background:var(--rc,var(--ac));transition:width .3s}
.cs-rw{margin-bottom:14px}.cs-rw:last-child{margin-bottom:0}
.cs-rw .top{display:flex;justify-content:space-between;gap:8px;font-size:13px}
.cs-pos{width:28px;text-align:center;font-variant-numeric:tabular-nums;color:var(--t2)}
.cs-me{background:var(--hv);border-radius:8px}
.cs-fab{position:fixed;right:16px;bottom:calc(76px + env(safe-area-inset-bottom,0px));width:54px;height:54px;border-radius:50%;background:var(--ac);color:#fff;border:0;display:none;place-items:center;box-shadow:0 6px 18px rgba(0,0,0,.35);z-index:6;cursor:pointer;padding:0}
.cs-fab .i{width:24px;height:24px}
.cs-pv{aspect-ratio:4/3;background:#0d0f13;border:1px solid var(--bd);border-radius:10px;overflow:hidden;display:grid;place-items:center;margin-bottom:10px}
.cs-pv img{width:100%;height:100%;object-fit:cover;display:block}
.cs-2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.cs-rr{display:flex;align-items:center;gap:10px;margin-bottom:12px}
.cs-rr b{padding:2px 10px;border-radius:10px;font-size:12px;font-weight:600;border:1px solid var(--rc);color:var(--rc)}
.cs-out{width:100%;height:auto;padding:10px 12px;font:13px/1.45 ui-monospace,Menlo,Consolas,monospace;resize:none;word-break:break-all}
.cs-info{font-size:13px;color:var(--t2);line-height:1.5}
.cs-info p+p{margin-top:8px}
@media(max-width:760px){.cs-fab{display:grid}.cs .ph .b{display:none}}
@media(max-width:380px){.cs-kpi b{font-size:19px}.cs-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}}`;
  document.head.appendChild(st);
}

/* =====================================================================
   5. TELAS
   ===================================================================== */
let tab = 'col', fq = '', fr = 'all', so = 'rec', cq = '', cf = 'miss', cr = 'all';
let pend = null;
const I = UI.i;
const PLH = '<svg class="i cs-ph" aria-hidden="true"><use href="#i-car"/></svg>';
const rpill = r => `<span class="cs-rar" style="--rc:${RAR[r].c}">${RAR[r].n}</span>`;

/* coloca as fotos depois de montar a tela (em lotes, para não travar com muitas fotos) */
function hyd() {
  const L = [...document.querySelectorAll('#mn img[data-p]')]; let i = 0;
  (function step() {
    const t = Date.now();
    while (i < L.length && Date.now() - t < 12) {
      const im = L[i++]; if (!im.isConnected) continue;
      const d = pget(im.dataset.p);
      if (d) im.src = d; else im.outerHTML = PLH;
    }
    if (i < L.length) requestAnimationFrame(step);
  })();
}

/* ---------- Coleção ---------- */
function listHTML() {
  const cs = calc(), q = nz(fq);
  let L = ST.cars.filter(c => (fr === 'all' || rOf(c) === +fr) && (!q || nz(c.brand + c.model + c.place).includes(q)));
  const cmp = {
    rec: (a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : (b.t || 0) - (a.t || 0),
    rar: (a, b) => rOf(b) - rOf(a) || (a.date < b.date ? 1 : -1),
    mar: (a, b) => (a.brand + ' ' + a.model).localeCompare(b.brand + ' ' + b.model, 'pt')
  }[so];
  L = L.slice().sort(cmp);
  if (!ST.cars.length) return `<div class="em" style="grid-column:1/-1">${I('car')}<p>Sua coleção está vazia.<br>Viu um carro legal na rua? Fotografe e registre!</p><button class="b" onclick="CS.add()">${I('camera')}Registrar primeiro carro</button></div>`;
  if (!L.length) return UI.em('search', 'Nenhum carro encontrado com esses filtros.');
  return L.map(c => {
    const r = rOf(c), t = [c.year, dm(c.date)].filter(Boolean).join(' · ');
    return `<button type="button" class="cs-card" onclick="CS.open('${c.id}')" aria-label="${esc(c.brand + ' ' + c.model)}"><span class="cs-img">${c.ph ? `<img data-p="${c.id}" alt="" decoding="async">` : PLH}</span>${rpill(r)}<span class="cs-t"><b>${esc(c.brand + ' ' + c.model)}</b><span>${esc(t)} · +${cs.per[c.id] || 1} pt${(cs.per[c.id] || 1) > 1 ? 's' : ''}</span></span></button>`;
  }).join('');
}
function paintList() { const e = document.getElementById('cs-list'); if (e) { e.innerHTML = listHTML(); hyd(); } }
function colHTML() {
  return `<div class=sb>${I('search')}<input placeholder="Buscar marca, modelo ou local" value="${esc(fq)}" oninput="CS.q(this.value)" aria-label="Buscar na coleção"></div>
<div class=cs-sel><select onchange="CS.fil(this.value)" aria-label="Filtrar por raridade"><option value=all>Todas as raridades</option>${RAR.map((x, i) => `<option value=${i}${fr == i ? ' selected' : ''}>${x.n}</option>`).join('')}</select><select onchange="CS.srt(this.value)" aria-label="Ordenar">${[['rec', 'Mais recentes'], ['rar', 'Mais raros'], ['mar', 'Marca A-Z']].map(o => `<option value=${o[0]}${so == o[0] ? ' selected' : ''}>${o[1]}</option>`).join('')}</select></div>
<div class=cs-grid id=cs-list>${listHTML()}</div>`;
}

/* ---------- Catálogo ---------- */
function catListHTML() {
  const cs = calc(), q = nz(cq);
  const L = CATL.filter(e => {
    const f = cs.found.has(e.k);
    return (cf == 'all' || (cf == 'miss' ? !f : f)) && (cr === 'all' || e.r === +cr) && (!q || nz(e.b + e.m).includes(q));
  });
  if (!L.length) return cf == 'miss' && !q && cr === 'all' ? UI.em('check', 'Você encontrou tudo do catálogo!') : UI.em('search', 'Nada encontrado com esses filtros.');
  const by = {}; L.forEach(e => (by[e.b] = by[e.b] || []).push(e));
  return Object.keys(by).sort((a, b) => a.localeCompare(b, 'pt')).map(b =>
    `<div class=cs-bh>${esc(b)}</div>` + by[b].sort((x, y) => x.r - y.r || x.m.localeCompare(y.m, 'pt')).map(e => {
      const f = cs.found.has(e.k), R = RAR[e.r];
      return `<div class=cs-cr style="--rc:${R.c}"><i class=cs-dot></i><span class=f>${esc(e.m)}${f && cs.cnt[e.k] > 1 ? ` <span class=s>×${cs.cnt[e.k]}</span>` : ''}<div class=s>${R.n} · ${R.p} pt${R.p > 1 ? 's' : ''}</div></span>${f ? `<span class=cs-ok aria-label="Encontrado">${I('check')}</span>` : `<button class="b g sm" onclick="CS.addc(${e.i})">${I('plus')}Registrar</button>`}</div>`;
    }).join('')).join('');
}
function paintCat() { const e = document.getElementById('cs-cl'); if (e) e.innerHTML = catListHTML(); }
function catHTML() {
  const cs = calc(), pc = CATL.length ? Math.max(cs.catFound ? 1 : 0, Math.round(cs.catFound / CATL.length * 100)) : 0;
  return `<div class=c style="margin-bottom:12px"><div class=ct><h2>Progresso do catálogo</h2><b>${cs.catFound} de ${CATL.length}</b></div><div class=cs-bar><i style="width:${pc}%;--rc:var(--ac)"></i></div><div class="row" style="margin-top:10px;gap:6px 14px">${RAR.map((x, i) => `<span class=s style="color:${x.c}">${x.n}: ${cs.fR[i]}/${CATR[i]}</span>`).join('')}</div></div>
<div class=sb>${I('search')}<input placeholder="Buscar no catálogo" value="${esc(cq)}" oninput="CS.cqq(this.value)" aria-label="Buscar no catálogo"></div>
<div class="row chips">${[['miss', 'Faltam'], ['found', 'Encontrados'], ['all', 'Todos']].map(f => `<span class="ch ${cf == f[0] ? 'on' : ''}" onclick="CS.cff('${f[0]}')">${f[1]}</span>`).join('')}</div>
<div class=cs-sel><select onchange="CS.crr(this.value)" aria-label="Filtrar por raridade"><option value=all>Todas as raridades</option>${RAR.map((x, i) => `<option value=${i}${cr == i ? ' selected' : ''}>${x.n}</option>`).join('')}</select></div>
<div class=c id=cs-cl>${catListHTML()}</div>
<p class="s" style="margin-top:10px">O catálogo é uma lista inicial de modelos comuns no Brasil. Carros fora dela também podem ser registrados na coleção.</p>`;
}

/* ---------- Estatísticas ---------- */
function staHTML() {
  const cs = calc(), u = usage();
  const k = (a, b) => `<div class=r><span class=f>${a}</span><b>${b}</b></div>`;
  const days = [6, 5, 4, 3, 2, 1, 0].map(i => D(add(new Date(), -i)));
  const wk = days.map(d => ST.cars.filter(c => c.date === d).length);
  const mx = Math.max(1, ...cs.brands.map(b => b.c)), top = cs.brands.slice(0, 6), up = Math.min(100, Math.round(u.all / u.lim * 100));
  return `<div class=g2>
<div class=c>${UI.ct('Resumo')}${k('Avistamentos', cs.sight)}${k('Modelos diferentes', cs.uniq)}${k('Marcas diferentes', cs.brands.length)}${k('Pontos', cs.pts)}${k('Catálogo', cs.catFound + ' de ' + CATL.length + ' (' + pcat(cs.catFound) + ')')}${k('Primeiro avistamento', cs.first ? dm(cs.first.date) : '—')}${k('Último avistamento', cs.last ? dm(cs.last.date) : '—')}</div>
<div class=c>${UI.ct('Por raridade')}${RAR.map((x, i) => `<div class=cs-rw style="--rc:${x.c}"><div class=top><span style="color:${x.c};font-weight:600">${x.n}</span><span class=s>${cs.fR[i]} de ${CATR[i]} no catálogo${cs.byR[i] > cs.fR[i] ? ' · +' + (cs.byR[i] - cs.fR[i]) + ' fora' : ''}</span></div><div class=cs-bar><i style="width:${CATR[i] ? Math.round(cs.fR[i] / CATR[i] * 100) : 0}%"></i></div></div>`).join('')}</div>
<div class=c>${UI.ct('Marcas mais encontradas')}${top.length ? top.map(b => `<div class=cs-rw><div class=top><span>${esc(b.n)}</span><b>${b.c}</b></div><div class=cs-bar><i style="width:${Math.round(b.c / mx * 100)}%"></i></div></div>`).join('') : UI.em('car', 'Registre carros para ver suas marcas.')}</div>
<div class=c>${UI.ct('Avistamentos (7 dias)')}${typeof chart === 'function' ? chart(wk, days.map(d => d.slice(8))) : ''}</div>
<div class="c span">${UI.ct('Dados do CarSpot')}<div class=row><button class=b onclick="CS.exp()">${I('down')}Exportar coleção</button><label class="b g">${I('up')}Importar<input type=file accept=.json hidden onchange="CS.imp(this.files[0]);this.value=''"></label></div>
<p class="s" style="margin-top:10px">A coleção fica salva só neste navegador (não entra no Exportar do Hub nem sincroniza com outros aparelhos). Exporte de vez em quando para ter backup, com as fotos.</p>
<div class=cs-bar style="--rc:${up > 80 ? 'var(--er)' : up > 60 ? 'var(--wa)' : 'var(--ok)'}"><i style="width:${Math.max(2, up)}%"></i></div><p class="s" style="margin-top:6px">Armazenamento do navegador (todo o Hub): ~${mb(u.all)} de ~5 MB. CarSpot: ${mb(u.mine)}, ${u.n} foto${u.n == 1 ? '' : 's'}.${up > 80 ? ' Está quase cheio: exporte e remova fotos antigas.' : ''}</p></div></div>`;
}

/* ---------- Competição ---------- */
/* Ponto de encaixe para sincronização real (futuro). Hoje o transporte é manual (código copiado e colado).
   Um transporte ao vivo só precisa: enviar CS.snap() e entregar snapshots dos outros em CS.receive(snap). */
const NET = { mode: 'manual' };
const chk = s => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h.toString(36); };
const enc = o => { const b = btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); return 'CS1.' + b + '.' + chk(b); };
const dec = txt => {
  const m = String(txt || '').match(/CS1\.([A-Za-z0-9_-]+)\.([a-z0-9]+)/);
  if (!m || chk(m[1]) !== m[2]) return null;
  try { let b = m[1].replace(/-/g, '+').replace(/_/g, '/'); while (b.length % 4) b += '='; return cleanSnap(JSON.parse(decodeURIComponent(escape(atob(b))))); } catch (e) { return null; }
};
const snap = () => { const c = calc(); return { i: ST.me.id, n: ST.me.nick || 'Jogador', r: ST.me.room, c: c.uniq, a: c.sight, p: c.pts, t: Date.now() }; };
const shareText = () => { const s = snap(); return `CarSpot · ${s.n} (sala ${s.r}): ${s.c} modelos, ${s.p} pts\n${enc(s)}`; };

function cmpHTML() {
  const me = ST.me, cs = calc(), room = me.room;
  const rows = room ? [{ self: 1, n: me.nick || 'Você', c: cs.uniq, a: cs.sight, p: cs.pts, t: Date.now() }, ...ST.friends.filter(f => f.r === room)] : [];
  rows.sort((a, b) => b.p - a.p || b.c - a.c || a.n.localeCompare(b.n, 'pt'));
  let pos = 0;
  const rk = rows.map((x, i) => { if (!i || x.p !== rows[i - 1].p || x.c !== rows[i - 1].c) pos = i + 1; return `<div class="r${x.self ? ' cs-me' : ''}"><b class=cs-pos>${pos}</b><div class=f><b>${esc(x.n)}</b>${x.self ? ' <span class=s>(você)</span>' : ''}<div class=s>${x.c} modelo${x.c == 1 ? '' : 's'} · ${x.a} avistamento${x.a == 1 ? '' : 's'}${x.self ? '' : ' · ' + ago(x.t)}</div></div><b>${x.p} pts</b>${x.self ? '' : UI.ib(`CS.rmf('${x.i}')`, 'x', 'Remover placar')}</div>`; }).join('');
  const other = ST.friends.filter(f => f.r !== room).length;
  return `<div class=g2>
<div class=c>${UI.ct('Seu perfil')}<label>Apelido<input value="${esc(me.nick)}" maxlength=16 placeholder="Como os amigos vão te ver" onchange="CS.nick(this.value)"></label><label>Código da sala<input value="${esc(room)}" maxlength=12 placeholder="Ex.: AMIGOS7" style="text-transform:uppercase" onchange="CS.room(this.value)"></label><div class=row><button class="b g sm" onclick="CS.newroom()">Criar código de sala</button></div><p class="s" style="margin-top:10px">Todos da mesma competição usam o mesmo código de sala (de 3 a 12 letras ou números). Cada um só altera o próprio progresso.</p></div>
<div class=c>${UI.ct('Meu placar')}<div class=stats><div><b>${cs.uniq}</b><span>modelos</span></div><div><b>${cs.pts}</b><span>pontos</span></div></div>${room ? `<textarea id=cs-out class=cs-out rows=3 readonly onclick="this.select()">${esc(shareText())}</textarea><div class=row style="margin-top:10px"><button class=b onclick="CS.copy()">Copiar para enviar</button>${navigator.share ? '<button class="b g" onclick="CS.shr()">Compartilhar</button>' : ''}</div><p class="s" style="margin-top:10px">Mande esse texto no WhatsApp. Gere de novo sempre que quiser atualizar seu placar.</p>` : '<p class="s" style="margin-top:12px">Defina um código de sala para gerar seu placar.</p>'}</div>
<div class=c>${UI.ct('Adicionar placar de amigo')}<textarea id=cs-in rows=3 placeholder="Cole aqui a mensagem ou o código (começa com CS1.)"></textarea><div class=row style="margin-top:10px"><button class=b onclick="CS.addf()">Adicionar ao ranking</button></div></div>
<div class=c>${UI.ct('Ranking' + (room ? ' · sala ' + esc(room) : ''))}${room ? rk : UI.em('target', 'Defina o código da sala para ver o ranking.')}${other ? `<p class="s" style="margin-top:8px">${other} placar${other == 1 ? '' : 'es'} de outras salas guardado${other == 1 ? '' : 's'}.</p>` : ''}</div>
<div class="c span">${UI.ct('Como funciona, e os limites')}<div class=cs-info><p>Não existe servidor neste app. Por isso o ranking é montado no seu aparelho a partir dos códigos que os amigos mandam, e só muda quando alguém envia um código novo. Não é ao vivo.</p><p>Como nada é conferido por um servidor, o código pode ser alterado. Vale como brincadeira entre amigos, não como competição à prova de trapaça.</p><p>Para um ranking ao vivo entre aparelhos seria preciso um serviço de sinalização ou servidor, com os dois jogadores online. Essa parte está separada do jogo e preparada para ser ligada depois.</p></div></div></div>`;
}

/* ---------- Página ---------- */
function build() {
  const cs = calc();
  const body = tab == 'cat' ? catHTML() : tab == 'sta' ? staHTML() : tab == 'cmp' ? cmpHTML() : colHTML();
  return `<div class=cs>${UI.h('CarSpot', UI.pb('CS.add()', 'Novo avistamento'))}
<div class=cs-kpis><div class=cs-kpi><b>${cs.uniq}</b><span>modelos</span></div><div class=cs-kpi><b>${cs.pts}</b><span>pontos</span></div><div class=cs-kpi><b>${pcat(cs.catFound)}</b><span>do catálogo</span></div></div>
<div class="row chips">${[['col', 'Coleção'], ['cat', 'Catálogo'], ['sta', 'Estatísticas'], ['cmp', 'Competição']].map(t => `<span class="ch ${tab == t[0] ? 'on' : ''}" onclick="CS.tab('${t[0]}')">${t[1]}</span>`).join('')}</div>
${body}<button type=button class=cs-fab onclick="CS.add()" aria-label="Novo avistamento">${I('camera')}</button></div>`;
}
P.car = () => {
  try { const h = build(); setTimeout(hyd, 0); return h; }
  catch (e) { console.error('[carspot]', e); return '<div class=c><h2>CarSpot</h2><p class=s>Não foi possível abrir o CarSpot. Seus dados continuam salvos. Recarregue a página.</p></div>'; }
};

/* =====================================================================
   6. CADASTRO / EDIÇÃO (janela do Hub: #md)
   ===================================================================== */
const closeM = () => { const m = document.getElementById('md'); if (m) { m.className = ''; m.onclick = null; } pend = null; };

function pv() {
  const b = document.getElementById('cs-pv'); if (!b || !pend) return;
  const d = pend.rm ? '' : pend.photo || (pend.had ? pget(pend.id) : '');
  b.innerHTML = d ? '<img alt="Foto do carro">' : PLH;
  if (d) b.firstChild.src = d;
  const x = document.getElementById('cs-rm'); if (x) x.style.display = d ? '' : 'none';
}
function rr() {
  const box = document.getElementById('cs-rr'); if (!box || !pend) return;
  const b = val('cs-b'), m = val('cs-m'); let h = '';
  if (b && m) {
    const k = ck(b, m), e = CAT.get(k), dup = ST.cars.some(c => c.id !== pend.id && ck(c.brand, c.model) === k);
    if (e) { const R = RAR[e.r]; h = `<div class=cs-rr style="--rc:${R.c}"><b>${R.n}</b><span class=s>${dup ? 'Você já tem este modelo: vale 1 ponto.' : 'Modelo novo: vale ' + R.p + (R.p == 1 ? ' ponto.' : ' pontos.')}</span></div>`; }
    else h = `<label>Raridade <span class=s>(modelo fora do catálogo)</span><select onchange="CS.setr(this.value)">${RAR.map((x, i) => `<option value=${i}${pend.r == i ? ' selected' : ''}>${x.n} · ${x.p} pt${x.p > 1 ? 's' : ''}</option>`).join('')}</select></label><p class=s style="margin:-4px 0 12px">${dup ? 'Você já tem este modelo: este avistamento vale 1 ponto.' : 'Modelo novo na coleção.'}</p>`;
  }
  if (box.dataset.h !== h) { box.dataset.h = h; box.innerHTML = h; }
}
function fb() {
  const L = MBYB[bk(val('cs-b'))] || [], dl = document.getElementById('cs-ml');
  if (dl) dl.innerHTML = L.slice().sort((a, b) => a.m.localeCompare(b.m, 'pt')).map(e => `<option value="${esc(e.m)}">`).join('');
  rr();
}

function openForm(c, pre) {
  const m = document.getElementById('md'); if (!m) return;
  pre = pre || {};
  pend = { id: c ? c.id : rid(), edit: !!c, had: !!(c && c.ph), photo: null, rm: false, r: c ? rOf(c) : 0 };
  const v = { brand: c ? c.brand : pre.brand || '', model: c ? c.model : pre.model || '', year: c && c.year ? c.year : '', date: c ? c.date : TD(), place: c ? c.place : '' };
  m.onclick = null;
  m.innerHTML = `<form class=box><h3>${c ? 'Editar avistamento' : 'Novo avistamento'}</h3>
<div class=cs-pv id=cs-pv></div>
<div class=row style="margin:0 0 14px"><button type=button class="b g sm" onclick="CS.pick('cam')">${I('camera')}Tirar foto</button><button type=button class="b g sm" onclick="CS.pick('gal')">${I('image')}Galeria</button><button type=button class="b g sm" id=cs-rm onclick="CS.rmph()" style="display:none">Remover foto</button></div>
<input id=cs-f1 type=file accept="image/*" capture="environment" style="display:none" onchange="CS.file(this)"><input id=cs-f2 type=file accept="image/*" style="display:none" onchange="CS.file(this)">
<label>Marca<input id=cs-b name=brand list=cs-bl autocomplete=off maxlength=30 required value="${esc(v.brand)}" oninput="CS.fb()"></label><datalist id=cs-bl>${BRANDS.map(b => `<option value="${esc(b)}">`).join('')}</datalist>
<label>Modelo<input id=cs-m name=model list=cs-ml autocomplete=off maxlength=40 required value="${esc(v.model)}" oninput="CS.fb()"></label><datalist id=cs-ml></datalist>
<div id=cs-rr></div>
<div class=cs-2><label>Ano <span class=s>(opcional)</span><input name=year type=number inputmode=numeric min=1886 max=${new Date().getFullYear() + 1} step=1 value="${esc(v.year)}" placeholder="Ex.: 2019"></label><label>Data<input name=date type=date required max="${TD()}" value="${esc(v.date)}"></label></div>
<label>Local <span class=s>(opcional)</span><input name=place maxlength=60 value="${esc(v.place)}" placeholder="Ex.: Av. Boa Viagem"></label>
<div class=row><button class=b>Salvar</button><button type=button class="b g" id=cn>Cancelar</button>${c ? `<button type=button class="b er" id=dl>${I('trash')}Excluir</button>` : ''}</div></form>`;
  m.className = 'on';
  const fo = m.firstChild;
  fo.onsubmit = e => { e.preventDefault(); CSX.save(fo); };
  document.getElementById('cn').onclick = closeM;
  if (c) document.getElementById('dl').onclick = () => { if (confirm('Excluir ' + c.brand + ' ' + c.model + ' da coleção?')) { ST.cars = ST.cars.filter(x => x.id !== c.id); pdel(c.id); save(); closeM(); render(); say('Avistamento excluído.'); } };
  pv(); fb();
  if (!c) { const f = document.getElementById(v.brand ? 'cs-m' : 'cs-b'); if (f) f.focus(); }
}

/* =====================================================================
   7. AÇÕES (objeto global CS, chamado pelos onclick)
   ===================================================================== */
const CSX = window.CS = {
  tab(t) { tab = t; render(); try { window.scrollTo(0, 0); } catch (e) {} },
  add(pre) { openForm(null, pre); },
  addc(i) { const e = CATL[i]; if (e) openForm(null, { brand: e.b, model: e.m }); },
  open(id) { const c = ST.cars.find(x => x.id === id); if (c) openForm(c); },
  q(v) { fq = v; paintList(); },
  fil(v) { fr = v; paintList(); },
  srt(v) { so = v; paintList(); },
  cqq(v) { cq = v; paintCat(); },
  cff(v) { cf = v; render(); },
  crr(v) { cr = v; paintCat(); },
  fb, setr(v) { if (pend) pend.r = +v | 0; },
  pick(k) { const e = document.getElementById(k == 'cam' ? 'cs-f1' : 'cs-f2'); if (e) e.click(); },
  file(inp) {
    const f = inp.files && inp.files[0]; inp.value = ''; if (!f || !pend) return;
    readPhoto(f).then(d => { if (!pend) return; pend.photo = d; pend.rm = false; pv(); }).catch(e => say(e && e.message || 'Não foi possível usar essa foto.'));
  },
  rmph() { if (!pend) return; pend.photo = null; pend.rm = true; pv(); },

  save(fo) {
    if (!pend) return;
    const g = n => String((fo.elements[n] || {}).value || '').replace(/\s+/g, ' ').trim();
    let brand = g('brand'), model = g('model'); const place = g('place'), date = g('date'), ys = g('year');
    if (!brand || !model) return say('Informe a marca e o modelo.');
    let year = null;
    if (ys !== '') { year = parseInt(ys, 10); const cy = new Date().getFullYear(); if (!(year >= 1886 && year <= cy + 1)) return say('Ano inválido. Use de 1886 a ' + (cy + 1) + ' ou deixe em branco.'); }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return say('Informe a data em que viu o carro.');
    if (date > TD()) return say('A data não pode estar no futuro.');
    const e = CAT.get(ck(brand, model)); if (e) { brand = e.b; model = e.m; }
    const id = pend.id, c = pend.edit ? ST.cars.find(x => x.id === id) : null;
    if (pend.edit && !c) { closeM(); return; }
    const before = calc().pts, prev = pget(id), snapC = c ? { ...c } : null;
    let ph = c ? !!c.ph : false;
    if (pend.photo) { if (!pset(id, pend.photo)) return say('Sem espaço no navegador para esta foto. Toque em "Remover foto" para salvar sem ela, ou libere espaço.'); ph = true; }
    else if (pend.rm) { pdel(id); ph = false; }
    const rec = { id, brand, model, year, date, place, r: e ? e.r : pend.r | 0, ph, t: c ? c.t : Date.now() };
    if (c) Object.assign(c, rec); else ST.cars.push(rec);
    if (!save()) {
      if (c) Object.assign(c, snapC); else ST.cars = ST.cars.filter(x => x.id !== id);
      if (prev) pset(id, prev); else pdel(id);
      return say('Não foi possível salvar: o armazenamento do navegador está cheio.');
    }
    const d = calc().pts - before, nm = brand + ' ' + model, wasNew = !c;
    closeM(); render();
    say(wasNew ? nm + ' registrado! +' + d + ' ponto' + (d == 1 ? '' : 's') : 'Alterações salvas.');
  },

  /* backup próprio do CarSpot (inclui as fotos) */
  exp() {
    const photos = {}; ST.cars.forEach(c => { if (c.ph) { const d = pget(c.id); if (d) photos[c.id] = d; } });
    const a = document.createElement('a'), u = URL.createObjectURL(new Blob([JSON.stringify({ app: 'carspot', v: 1, at: Date.now(), cars: ST.cars, photos })], { type: 'application/json' }));
    a.href = u; a.download = 'carspot-' + TD() + '.json'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 5000);
    say('Coleção exportada.');
  },
  imp(f) {
    if (!f) return;
    f.text().then(t => {
      const o = JSON.parse(t); if (!o || o.app !== 'carspot' || !Array.isArray(o.cars)) throw new Error('x');
      const have = new Set(ST.cars.map(c => c.id)); let n = 0, lost = 0;
      o.cars.map(cleanCar).filter(Boolean).forEach(c => {
        if (have.has(c.id)) return;
        const d = o.photos && typeof o.photos[c.id] === 'string' ? o.photos[c.id] : '';
        c.ph = false;
        if (d && /^data:image\/jpeg;base64,/.test(d) && d.length < 600000) { if (pset(c.id, d)) c.ph = true; else lost++; }
        ST.cars.push(c); have.add(c.id); n++;
      });
      if (!save()) throw new Error('quota');
      render(); say(n ? n + ' carro' + (n == 1 ? '' : 's') + ' importado' + (n == 1 ? '' : 's') + (lost ? ' (' + lost + ' sem foto por falta de espaço)' : '') + '.' : 'Nada novo para importar.');
    }).catch(e => say(e && e.message === 'quota' ? 'Importado, mas o armazenamento do navegador encheu.' : 'Arquivo inválido. Use um arquivo exportado pelo CarSpot.'));
  },

  /* competição */
  nick(v) { v = cleanName(v); ST.me.nick = v; save(); render(); },
  room(v) {
    v = cleanRoom(v);
    if (v && v.length < 3) { say('O código da sala precisa de 3 a 12 letras ou números.'); render(); return; }
    ST.me.room = v; save(); render();
  },
  newroom() { const A = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 6; i++) s += A[Math.floor(Math.random() * A.length)]; ST.me.room = s; save(); render(); say('Sala ' + s + ' criada. Passe esse código para seus amigos.'); },
  snap,
  /* ponto de entrada de qualquer transporte (colar código hoje; rede no futuro) */
  receive(s) {
    s = cleanSnap(s); if (!s) return { ok: false, msg: 'Placar inválido.' };
    if (s.i === ST.me.id) return { ok: false, msg: 'Esse é o seu próprio placar.' };
    const old = ST.friends.find(f => f.i === s.i);
    if (old && old.t >= s.t) return { ok: false, msg: 'Você já tem um placar igual ou mais novo de ' + old.n + '.' };
    if (old) Object.assign(old, s); else { if (ST.friends.length >= 50) return { ok: false, msg: 'Limite de 50 jogadores guardados. Remova algum.' }; ST.friends.push(s); }
    let joined = false; if (!ST.me.room) { ST.me.room = s.r; joined = true; }
    if (!save()) return { ok: false, msg: 'Não foi possível salvar: armazenamento cheio.' };
    return { ok: true, s, joined };
  },
  addf() {
    const t = document.getElementById('cs-in'), s = dec(t && t.value);
    if (!s) return say('Código inválido. Cole a mensagem inteira que seu amigo mandou (com o CS1...).');
    const r = CSX.receive(s);
    if (!r.ok) return say(r.msg);
    render();
    say(r.joined ? 'Você entrou na sala ' + s.r + '. Placar de ' + s.n + ' adicionado.' : s.r === ST.me.room ? 'Placar de ' + s.n + ' atualizado.' : 'Placar de ' + s.n + ' guardado (sala ' + s.r + '). Entre nessa sala para vê-lo no ranking.');
  },
  rmf(i) { const f = ST.friends.find(x => x.i === i); if (f && confirm('Remover o placar de ' + f.n + '?')) { ST.friends = ST.friends.filter(x => x !== f); save(); render(); } },
  copy() {
    if (!ST.me.room) return say('Defina o código da sala primeiro.');
    const txt = shareText(), fall = () => { const t = document.getElementById('cs-out'); if (!t) return say('Selecione o texto e copie manualmente.'); t.focus(); t.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (e) {} say(ok ? 'Copiado. Cole no WhatsApp.' : 'Selecione o texto e copie manualmente.'); };
    try { navigator.clipboard.writeText(txt).then(() => say('Copiado. Cole no WhatsApp para seus amigos.'), fall); } catch (e) { fall(); }
  },
  shr() { if (!ST.me.room) return say('Defina o código da sala primeiro.'); try { navigator.share({ text: shareText() }).catch(() => {}); } catch (e) {} }
};
CSX.net = NET;
})();