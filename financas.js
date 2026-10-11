/* financas.js — app Finanças do Hub, organizado como o VAULT Finance Dashboard (Visão geral / Transações / Análises).
   Dados: S.fin (mesmo armazenamento de antes: { id, k:'in'|'out', t, v, cat, date }). Nada é inventado: tudo é calculado dos seus lançamentos.
   Usa os helpers do index.html: fm, uid, D/TD, sum, esc, RD. */
(() => {
  if (typeof PG === 'undefined' || typeof P === 'undefined' || typeof S === 'undefined' || typeof fm !== 'function') return;
  if (!Array.isArray(S.fin)) S.fin = [];
  if (!PG.some(p => p[0] === 'fin')) {
    const i = PG.findIndex(p => p[0] === 'cfg');
    PG.splice(i < 0 ? PG.length : i, 0, ['fin', '💰', 'Finanças']);
  }

  /* ---------- base ---------- */
  const INV = 'Investimento';
  const CATS = ['Alimentação', 'Transporte', 'Moradia', 'Lazer', 'Saúde', 'Estudos', INV, 'Salário', 'Renda extra', 'Outros'];
  const CC = { Moradia: '#7C93B8', Alimentação: '#8FAF8F', Transporte: '#C9A978', Lazer: '#B79AC4', Saúde: '#D9958A', Estudos: '#7FB0AD', [INV]: '#B5BF6B', Outros: '#8B93A1' };
  const col = c => CC[c] || '#A3A9B5';
  const R = n => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const ym = d => D(d).slice(0, 7);
  const parseD = s => { const [y, mo, d] = s.split('-').map(Number); return new Date(y, mo - 1, d); };
  const addD = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const shift = (k, n) => { const [y, mo] = k.split('-').map(Number); return ym(new Date(y, mo - 1 + n, 1)); };
  const mlabel = k => { const [y, mo] = k.split('-').map(Number); const t = new Date(y, mo - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }); return t[0].toUpperCase() + t.slice(1); };
  const mshort = k => { const [y, mo] = k.split('-').map(Number); return new Date(y, mo - 1, 1).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''); };
  const dfmt = s => parseD(s).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/\./g, '').replace(/ de /g, ' ');
  const dshort = d => String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0');
  const pct = n => (n >= 0 ? '+' : '−') + Math.abs(n).toFixed(1).replace('.', ',') + '%';
  const compact = v => { const a = Math.abs(v), s = v < 0 ? '−' : ''; return a >= 1e6 ? s + (a / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mi' : a >= 1e3 ? s + (a / 1e3).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mil' : s + Math.round(a); };
  const nice = v => { if (v <= 0) return 1; const p = 10 ** Math.floor(Math.log10(v)), f = v / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; };
  const inK = (L, k) => sum(L.filter(x => x.k === k), 'v');
  /* investimento = saída de caixa que NÃO é gasto: sai do saldo, mas conta como economia */
  const isInv = x => x.k === 'out' && x.cat === INV;
  const outK = L => sum(L.filter(x => x.k === 'out' && !isInv(x)), 'v');
  const invK = L => sum(L.filter(isInv), 'v');
  const inM = (k) => S.fin.filter(x => x.date && x.date.startsWith(k));

  /* estado de tela (não grava nada) */
  let m = TD().slice(0, 7), tab = 'dash', per = '1M', q = '', typ = 'all', cat = 'all', srt = 'new', scope = 'm', lastW = 0;

  /* ---------- ícones ---------- */
  const ic = p => `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${p}</svg>`;
  const IC = {
    wallet: '<path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5"/><path d="M16 13h2"/>',
    inn: '<path d="M17 7 7 17"/><path d="M17 17H7V7"/>',
    out: '<path d="M7 17 17 7"/><path d="M7 7h10v10"/>',
    sav: '<path d="M19 5 5 19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    chart: '<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 5-6"/>'
  };

  /* ---------- CSS (tudo dentro de .vt; não afeta as outras áreas) ---------- */
  if (!document.getElementById('vt-css')) {
    const st = document.createElement('style');
    st.id = 'vt-css';
    st.textContent = `
.vt{--v-s:#171A21;--v-e:#1D2129;--v-tx:#F5F5F5;--v-mu:#9299A6;--v-bd:#292E38;--v-ac:#8FAF8F;--v-acs:rgba(143,175,143,.14);--v-in:#8FAF8F;--v-out:#D9958A;--v-hv:rgba(255,255,255,.04);font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif;color:var(--v-tx);font-variant-numeric:tabular-nums}
:root[data-t=light] .vt{--v-s:#fff;--v-e:#fff;--v-tx:#171A1C;--v-mu:#6B7280;--v-bd:#E5E7EB;--v-ac:#547A59;--v-acs:rgba(84,122,89,.12);--v-in:#547A59;--v-out:#B5584B;--v-hv:rgba(0,0,0,.035)}
.vt *{box-sizing:border-box}
.vt-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap;margin-bottom:20px}
.vt h1{font-size:26px;font-weight:600;letter-spacing:-.02em;line-height:1.2}
.vt-sub{color:var(--v-mu);font-size:14px;margin-top:4px}
.vt-month{display:flex;align-items:center;gap:4px;background:var(--v-s);border:1px solid var(--v-bd);border-radius:12px;padding:4px}
.vt-month b{min-width:138px;text-align:center;font-size:14px;font-weight:500}
.vt button{font:inherit;color:inherit;cursor:pointer}
.vt-ib{width:32px;height:32px;border:0;background:none;border-radius:8px;color:var(--v-mu);font-size:18px;line-height:1}
.vt-ib:hover{background:var(--v-hv);color:var(--v-tx)}
.vt-tabs{display:flex;gap:4px;border-bottom:1px solid var(--v-bd);margin-bottom:20px;overflow-x:auto}
.vt-tab{background:none;border:0;border-bottom:2px solid transparent;padding:10px 14px;margin-bottom:-1px;color:var(--v-mu);font-size:14px;font-weight:500;white-space:nowrap}
.vt-tab:hover{color:var(--v-tx)}
.vt-tab.on{color:var(--v-tx);border-bottom-color:var(--v-ac)}
.vt button:focus-visible,.vt input:focus-visible,.vt select:focus-visible{outline:2px solid var(--v-ac);outline-offset:2px}
.vt-card{background:var(--v-s);border:1px solid var(--v-bd);border-radius:16px;padding:20px;min-width:0}
.vt-ch{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;margin-bottom:14px}
.vt-ch h2{font-size:16px;font-weight:600;letter-spacing:-.01em;margin:0}
.vt-ch p{color:var(--v-mu);font-size:13px;margin-top:2px}
.vt-grid4{display:grid;gap:16px;grid-template-columns:repeat(4,minmax(0,1fr));margin-bottom:16px}
.vt-m .vt-grid4{grid-template-columns:repeat(2,minmax(0,1fr))}
.vt-s .vt-grid4{grid-template-columns:minmax(0,1fr)}
.vt-row{display:grid;gap:16px;grid-template-columns:minmax(0,1fr);margin-bottom:16px}
.vt-l .vt-row{grid-template-columns:minmax(0,2fr) minmax(0,1fr)}
.vt-ov{display:flex;flex-direction:column;gap:6px}
.vt-ov .top{display:flex;justify-content:space-between;align-items:center;color:var(--v-mu);font-size:13px}
.vt-ov .ico{width:32px;height:32px;border-radius:10px;background:var(--v-acs);color:var(--v-ac);display:grid;place-items:center}
.vt svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.vt .vt-chart svg{width:100%;height:auto;stroke-width:1;stroke-linecap:butt}
.vt-ov .val{font-size:26px;font-weight:600;letter-spacing:-.02em;line-height:1.2}
.vt-ov .dl{font-size:12.5px;color:var(--v-mu)}
.vt .up{color:var(--v-in)}.vt .dn{color:var(--v-out)}
.vt-per{display:flex;gap:2px;background:var(--v-e);border:1px solid var(--v-bd);border-radius:10px;padding:3px}
.vt-per button{border:0;background:none;border-radius:7px;padding:4px 10px;font-size:12.5px;color:var(--v-mu);font-weight:500}
.vt-per button.on{background:var(--v-s);color:var(--v-tx);box-shadow:0 0 0 1px var(--v-bd)}
.vt-leg{display:flex;gap:16px;font-size:12.5px;color:var(--v-mu);margin-bottom:8px}
.vt-leg i{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px}
.vt-empty{color:var(--v-mu);font-size:14px;padding:28px 8px;text-align:center}
.vt-chart text{fill:var(--v-mu);font-size:11px}
.vt-chart .gl{stroke:var(--v-bd);stroke-dasharray:3 4}
.vt-dn{display:flex;flex-direction:column;align-items:center;gap:16px}
.vt-dn .ctr{text-align:center}
.vt-dn .ctr span{display:block;font-size:11.5px;fill:var(--v-mu);color:var(--v-mu)}
.vt-lg{width:100%;display:flex;flex-direction:column;gap:8px}
.vt-lg div{display:flex;align-items:center;gap:8px;font-size:13.5px}
.vt-lg i{width:8px;height:8px;border-radius:50%;flex:none}
.vt-lg span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.vt-lg em{font-style:normal;color:var(--v-mu);width:44px;text-align:right}
.vt-it{display:flex;align-items:center;gap:12px;width:100%;background:none;border:0;border-bottom:1px solid var(--v-bd);padding:12px 4px;text-align:left;border-radius:0}
.vt-it:last-child{border-bottom:0}
.vt-it:hover{background:var(--v-hv)}
.vt-av{width:36px;height:36px;border-radius:50%;flex:none;display:grid;place-items:center;font-size:14px;font-weight:600;color:#fff}
.vt-it .tt{flex:1;min-width:0}
.vt-it .tt b{display:block;font-weight:500;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.vt-it .tt span{font-size:12.5px;color:var(--v-mu)}
.vt-it .am{font-weight:600;font-size:14px;white-space:nowrap}
.vt-qa{display:flex;flex-direction:column;gap:8px}
.vt-btn{display:inline-flex;align-items:center;gap:8px;background:var(--v-e);border:1px solid var(--v-bd);border-radius:10px;padding:10px 14px;font-size:14px;font-weight:500;text-align:left}
.vt-btn:hover{background:var(--v-hv)}
.vt-btn.p{background:var(--v-ac);border-color:var(--v-ac);color:#0F1115}
.vt-btn.p:hover{filter:brightness(1.08);background:var(--v-ac)}
.vt-qa .vt-btn{width:100%}
.vt-tb{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:14px}
.vt-srch{position:relative;flex:1 1 220px;min-width:0}
.vt-srch svg{position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--v-mu);pointer-events:none}
.vt input.vt-in,.vt select.vt-in{background:var(--v-s);color:var(--v-tx);border:1px solid var(--v-bd);border-radius:10px;padding:9px 12px;font:inherit;font-size:14px;width:auto;max-width:100%}
.vt .vt-srch input.vt-in{width:100%;padding-left:36px}
.vt-seg{display:flex;gap:2px;background:var(--v-e);border:1px solid var(--v-bd);border-radius:10px;padding:3px}
.vt-seg button{border:0;background:none;border-radius:7px;padding:6px 12px;font-size:13.5px;color:var(--v-mu);font-weight:500}
.vt-seg button.on{background:var(--v-s);color:var(--v-tx);box-shadow:0 0 0 1px var(--v-bd)}
.vt-cnt{color:var(--v-mu);font-size:13px;margin-bottom:10px}
.vt-table table{width:100%;border-collapse:collapse}
.vt-table th{text-align:left;font-size:12.5px;font-weight:500;color:var(--v-mu);padding:12px 16px;border-bottom:1px solid var(--v-bd)}
.vt-table td{padding:13px 16px;border-bottom:1px solid var(--v-bd);font-size:14px}
.vt-table tr:last-child td{border-bottom:0}
.vt-table tbody tr{cursor:pointer}
.vt-table tbody tr:hover{background:var(--v-hv)}
.vt-table .r{text-align:right;font-weight:600;white-space:nowrap}
.vt-table .nm{display:flex;align-items:center;gap:12px;min-width:0}
.vt-table .nm b{font-weight:500;overflow:hidden;text-overflow:ellipsis}
.vt-table .cat{display:inline-flex;align-items:center;gap:8px;color:var(--v-mu)}
.vt-table .cat i,.vt-it i.cd{width:8px;height:8px;border-radius:50%;display:inline-block}
.vt-table.wrap{padding:0;overflow:hidden}
.vt-cards{display:none}
.vt-s .vt-table.wrap{display:none}
.vt-s .vt-cards{display:block;padding:4px 12px}
.vt-ins{display:grid;gap:16px;grid-template-columns:repeat(3,minmax(0,1fr))}
.vt-m .vt-ins{grid-template-columns:repeat(2,minmax(0,1fr))}
.vt-s .vt-ins{grid-template-columns:minmax(0,1fr)}
.vt-ins .lb{font-size:13px;color:var(--v-mu);margin-bottom:6px}
.vt-ins .vl{font-size:20px;font-weight:600;letter-spacing:-.01em;margin-bottom:4px;overflow-wrap:anywhere}
.vt-ins .ds{font-size:13px;color:var(--v-mu)}
@media(max-width:600px){.vt h1{font-size:22px}.vt-card{padding:16px}.vt-month{width:100%;justify-content:space-between}}`;
    document.head.appendChild(st);
  }

  /* ---------- ações (mesmo cadastro de antes; só mudou o lugar do botão) ---------- */
  const FN = window.FN = {
    nav(n) { m = shift(m, n); render(); },
    today() { m = TD().slice(0, 7); render(); },
    tab(t) { tab = t; render(); },
    per(p) { per = p; render(); },
    flt(k, v) { if (k === 'typ') typ = v; else if (k === 'cat') cat = v; else if (k === 'srt') srt = v; else if (k === 'scope') scope = v; render(); },
    q(v) { q = v; render(); const i = document.getElementById('vt-q'); if (i) { i.focus(); i.setSelectionRange(v.length, v.length); } },
    form: x => [
      { k: 'k', l: 'Tipo', t: 'select', v: isInv(x) ? 'inv' : x.k || 'out', o: [['out', 'Saída (gasto)'], ['inv', 'Investimento (aplicação)'], ['in', 'Entrada (ganho)']] },
      { k: 't', l: 'Descrição', v: x.t, r: 1 },
      { k: 'v', l: 'Valor (R$)', t: 'number', v: x.v, r: 1 },
      { k: 'cat', l: 'Categoria', t: 'select', v: x.cat || 'Outros', o: CATS.map(c => [c, c]) },
      { k: 'date', l: 'Data', t: 'date', v: x.date, r: 1 }
    ],
    /* Tipo "Investimento" grava como saída (k:'out') com categoria Investimento; os dados antigos continuam iguais */
    parse: (o, id) => { const inv = o.k === 'inv' || (o.k === 'out' && o.cat === INV); return { id, k: inv ? 'out' : o.k, t: o.t, v: Math.abs(parseFloat(String(o.v).replace(',', '.'))) || 0, cat: inv ? INV : o.cat, date: o.date }; },
    add(k) { fm(k === 'in' ? 'Nova receita' : k === 'out' ? 'Nova despesa' : 'Novo lançamento', FN.form({ k, cat: k === 'in' ? 'Salário' : 'Outros', date: TD() }), o => { S.fin.push(FN.parse(o, uid())); RD(); }); },
    edit(id) {
      const x = S.fin.find(y => y.id === id); if (!x) return;
      fm('Editar lançamento', FN.form(x), o => { Object.assign(x, FN.parse(o, x.id)); RD(); }, () => { S.fin = S.fin.filter(y => y !== x); RD(); });
    }
  };

  /* ---------- gráficos (SVG próprio, sem dependências) ---------- */
  const yAxis = (ymin, ymax, W, H, pl, pt, pb) => {
    let o = '';
    for (let k = 0; k <= 4; k++) {
      const v = ymin + (ymax - ymin) * k / 4, y = pt + (H - pt - pb) * (1 - k / 4);
      o += `<line class="gl" x1="${pl}" x2="${W}" y1="${y}" y2="${y}"/><text x="${pl - 8}" y="${y + 4}" text-anchor="end">${compact(v)}</text>`;
    }
    return o;
  };
  const xLabels = (labs, xf, H) => { const st = Math.ceil(labs.length / 6); return labs.map((t, i) => i % st === 0 || i === labs.length - 1 && (labs.length - 1) % st > st / 2 ? `<text x="${xf(i)}" y="${H - 6}" text-anchor="middle">${t}</text>` : '').join(''); };

  const flowChart = (data, W) => {
    const H = 230, pl = 44, pr = 10, pt = 12, pb = 28, n = data.length;
    const ymax = nice(Math.max(...data.map(d => Math.max(d.i, d.o)), 1));
    const x = i => n === 1 ? (pl + W - pr) / 2 : pl + i * (W - pl - pr) / (n - 1);
    const y = v => pt + (H - pt - pb) * (1 - v / ymax);
    const line = k => data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d[k]).toFixed(1)}`).join('');
    const area = k => `${line(k)}L${x(n - 1).toFixed(1)},${y(0)}L${x(0).toFixed(1)},${y(0)}Z`;
    const dots = n <= 14 ? data.map((d, i) => `<circle cx="${x(i)}" cy="${y(d.i)}" r="3" fill="var(--v-in)"/><circle cx="${x(i)}" cy="${y(d.o)}" r="3" fill="var(--v-out)"/>`).join('') : '';
    const hit = data.map((d, i) => { const w = (W - pl - pr) / Math.max(n - 1, 1); return `<rect x="${x(i) - w / 2}" y="${pt}" width="${w}" height="${H - pt - pb}" fill="transparent"><title>${d.lab} — Receitas ${R(d.i)} · Despesas ${R(d.o)}</title></rect>`; }).join('');
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Fluxo de caixa: receitas e despesas"><defs><linearGradient id="vtgi" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--v-in)" stop-opacity=".28"/><stop offset="1" stop-color="var(--v-in)" stop-opacity="0"/></linearGradient><linearGradient id="vtgo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--v-out)" stop-opacity=".22"/><stop offset="1" stop-color="var(--v-out)" stop-opacity="0"/></linearGradient></defs>${yAxis(0, ymax, W, H, pl, pt, pb)}<path d="${area('i')}" fill="url(#vtgi)"/><path d="${area('o')}" fill="url(#vtgo)"/><path d="${line('i')}" fill="none" stroke="var(--v-in)" stroke-width="2"/><path d="${line('o')}" fill="none" stroke="var(--v-out)" stroke-width="2"/>${dots}${xLabels(data.map(d => d.xl), x, H)}${hit}</svg>`;
  };

  const barChart = (labs, series, colors, names, W) => {
    const H = 220, pl = 44, pr = 8, pt = 12, pb = 28, n = labs.length;
    const all = series.flat(), mx = Math.max(0, ...all), mn = Math.min(0, ...all);
    const ymax = mx > 0 ? nice(mx) : 0, ymin = mn < 0 ? -nice(-mn) : 0, rg = (ymax - ymin) || 1;
    const y = v => pt + (H - pt - pb) * (1 - (v - ymin) / rg), y0 = y(0);
    const gw = (W - pl - pr) / n, bw = Math.min(26, gw * 0.7 / series.length);
    let o = yAxis(ymin, ymax || 1, W, H, pl, pt, pb);
    labs.forEach((lb, i) => {
      const cx = pl + gw * i + gw / 2;
      series.forEach((s, j) => {
        const v = s[i], bx = cx - (series.length * bw) / 2 + j * bw, top = Math.min(y(v), y0), h = Math.max(Math.abs(y(v) - y0), v ? 1 : 0);
        const c = typeof colors[j] === 'function' ? colors[j](v) : colors[j];
        o += `<rect x="${bx + 1}" y="${top}" width="${bw - 2}" height="${h}" rx="3" fill="${c}"><title>${lb} — ${names[j]}: ${R(v)}</title></rect>`;
      });
      o += `<text x="${cx}" y="${H - 6}" text-anchor="middle">${lb}</text>`;
    });
    return `<svg viewBox="0 0 ${W} ${H}" role="img">${o}<line x1="${pl}" x2="${W}" y1="${y0}" y2="${y0}" stroke="var(--v-bd)"/></svg>`;
  };

  const donut = (items, total) => {
    const S0 = 168, r = 66, C = 2 * Math.PI * r; let acc = 0;
    const seg = items.map(([c, v]) => { const len = v / total * C, gap = items.length > 1 ? Math.min(3, len) : 0, s = `<circle cx="${S0 / 2}" cy="${S0 / 2}" r="${r}" fill="none" stroke="${col(c)}" stroke-width="18" stroke-dasharray="${Math.max(len - gap, 0)} ${C - Math.max(len - gap, 0)}" stroke-dashoffset="${-acc}" transform="rotate(-90 ${S0 / 2} ${S0 / 2})"><title>${esc(c)}: ${R(v)}</title></circle>`; acc += len; return s; }).join('');
    return `<div class="vt-dn"><div style="position:relative;width:${S0}px;height:${S0}px"><svg viewBox="0 0 ${S0} ${S0}" style="width:${S0}px;height:${S0}px;stroke-width:1" role="img" aria-label="Gastos por categoria"><circle cx="${S0 / 2}" cy="${S0 / 2}" r="${r}" fill="none" stroke="var(--v-bd)" stroke-width="18"/>${seg}</svg><div class="ctr" style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center"><span>Total gasto</span><b style="font-size:15px;font-weight:600">${R(total)}</b></div></div><div class="vt-lg">${items.map(([c, v]) => `<div><i style="background:${col(c)}"></i><span>${esc(c)}</span><b style="font-weight:500">${R(v)}</b><em>${Math.round(v / total * 100)}%</em></div>`).join('')}</div></div>`;
  };

  /* ---------- dados derivados ---------- */
  const flowData = () => {
    const today = new Date(), [y, mo] = m.split('-').map(Number);
    const end = m === ym(today) ? today : new Date(y, mo, 0);
    const mk = (from, to, lab, xl) => { const f = D(from), t = D(to), L = S.fin.filter(x => x.date && x.date >= f && x.date <= t); return { lab, xl, i: inK(L, 'in'), o: outK(L) }; };
    if (per === '1S' || per === '1M') { const n = per === '1S' ? 7 : 30; return Array.from({ length: n }, (_, i) => { const d = addD(end, -(n - 1 - i)); return mk(d, d, dfmt(D(d)), dshort(d)); }); }
    if (per === '3M') return Array.from({ length: 13 }, (_, j) => { const to = addD(end, -(12 - j) * 7), from = addD(to, -6); return mk(from, to, dshort(from) + ' – ' + dshort(to), dshort(to)); });
    const n = per === '6M' ? 6 : 12, e = ym(end);
    return Array.from({ length: n }, (_, i) => { const k = shift(e, -(n - 1 - i)), L = inM(k); return { lab: mlabel(k), xl: mshort(k), i: inK(L, 'in'), o: outK(L) }; });
  };
  const cats = L => { const o = {}; L.filter(x => x.k === 'out' && !isInv(x)).forEach(x => o[x.cat] = (o[x.cat] || 0) + x.v); return Object.entries(o).sort((a, b) => b[1] - a[1]); };

  /* ---------- peças de tela ---------- */
  const baseW = () => { const mn = document.getElementById('mn'); let w = 800; if (mn) { const cs = getComputedStyle(mn); w = mn.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight); } return Math.max(280, w); };
  const item = x => `<button class="vt-it" onclick="FN.edit('${x.id}')" aria-label="Editar ${esc(x.t)}"><span class="vt-av" style="background:${x.k === 'in' ? 'var(--v-in)' : col(x.cat)}">${esc((x.t || '?').trim()[0] || '?').toUpperCase()}</span><span class="tt"><b>${esc(x.t)}</b><span>${esc(x.cat)} · ${dfmt(x.date)}</span></span><span class="am ${x.k === 'in' ? 'up' : ''}">${x.k === 'in' ? '+' : '−'}${R(x.v)}</span></button>`;
  const card = (label, icon, val, sub, cls) => `<div class="vt-card vt-ov"><div class="top"><span>${label}</span><span class="ico">${ic(IC[icon])}</span></div><div class="val">${val}</div><div class="dl ${cls || ''}">${sub}</div></div>`;
  const delta = (cur, prev, goodUp) => prev > 0 ? { t: pct((cur - prev) / prev * 100) + ' vs mês anterior', c: ((cur - prev) >= 0) === goodUp ? 'up' : 'dn' } : { t: 'sem dados no mês anterior', c: '' };

  const dashView = W => {
    const L = inM(m), inn = inK(L, 'in'), out = outK(L), net = inn - out, pL = inM(shift(m, -1));
    const bal = sum(S.fin.filter(x => x.date && x.date <= m + '-31' && x.k === 'in'), 'v') - sum(S.fin.filter(x => x.date && x.date <= m + '-31' && x.k === 'out'), 'v');
    const dI = delta(inn, inK(pL, 'in'), true), dO = delta(out, outK(pL), false);
    const flow = flowData(), has = flow.some(d => d.i || d.o), cl = cats(L), recent = L.slice().sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : 0).slice(0, 5);
    const cw = W >= 860 ? Math.floor((W - 16) * 2 / 3) - 42 : W - 42;
    return `<div class="vt-grid4">${card('Saldo total', 'wallet', R(bal), (net >= 0 ? '+' : '−') + R(Math.abs(net)) + ' neste mês', net >= 0 ? 'up' : 'dn')}${card('Receitas', 'inn', R(inn), dI.t, dI.c)}${card('Despesas', 'out', R(out), dO.t, dO.c)}${card('Economia', 'sav', R(net), inn > 0 ? Math.round(net / inn * 100) + '% da renda' : 'sem receitas no mês', inn > 0 ? (net >= 0 ? 'up' : 'dn') : '')}</div>
<div class="vt-row"><div class="vt-card"><div class="vt-ch"><div><h2>Fluxo de caixa</h2><p>Receitas x despesas</p></div><div class="vt-per" role="group" aria-label="Período">${[['1S', '1S'], ['1M', '1M'], ['3M', '3M'], ['6M', '6M'], ['1A', '1A']].map(p => `<button class="${per === p[0] ? 'on' : ''}" onclick="FN.per('${p[0]}')">${p[1]}</button>`).join('')}</div></div><div class="vt-leg"><span><i style="background:var(--v-in)"></i>Receitas</span><span><i style="background:var(--v-out)"></i>Despesas</span></div>${has ? `<div class="vt-chart">${flowChart(flow, cw)}</div>` : '<div class="vt-empty">Sem lançamentos neste período.</div>'}</div>
<div class="vt-card"><div class="vt-ch"><div><h2>Gastos por categoria</h2><p>${mlabel(m)}</p></div></div>${cl.length ? donut(cl, out) : '<div class="vt-empty">Nenhum gasto neste mês.</div>'}</div></div>
<div class="vt-row"><div class="vt-card"><div class="vt-ch"><div><h2>Lançamentos recentes</h2><p>Últimos de ${mlabel(m)}</p></div><button class="vt-btn" onclick="FN.tab('tx')">Ver todos</button></div>${recent.map(item).join('') || '<div class="vt-empty">Nada lançado neste mês.</div>'}</div>
<div class="vt-card"><div class="vt-ch"><div><h2>Ações rápidas</h2><p>Tarefas comuns</p></div></div><div class="vt-qa"><button class="vt-btn p" onclick="FN.add('out')">${ic(IC.plus)}Nova despesa</button><button class="vt-btn" onclick="FN.add('in')">${ic(IC.plus)}Nova receita</button><button class="vt-btn" onclick="FN.tab('tx')">${ic(IC.list)}Ver transações</button><button class="vt-btn" onclick="FN.tab('an')">${ic(IC.chart)}Ver análises</button></div></div></div>`;
  };

  const txView = () => {
    const base = scope === 'all' ? S.fin.filter(x => x.date) : inM(m);
    const allCats = [...new Set([...CATS, ...S.fin.map(x => x.cat).filter(Boolean)])];
    const ql = q.trim().toLowerCase();
    let L = base.filter(x => (typ === 'all' || x.k === typ) && (cat === 'all' || x.cat === cat) && (!ql || (x.t + ' ' + x.cat).toLowerCase().includes(ql)));
    const cmp = { new: (a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : 0, old: (a, b) => a.date > b.date ? 1 : a.date < b.date ? -1 : 0, high: (a, b) => b.v - a.v, low: (a, b) => a.v - b.v }[srt];
    L = L.slice().sort(cmp);
    const row = x => `<tr tabindex="0" onclick="FN.edit('${x.id}')" onkeydown="if(event.key==='Enter')FN.edit('${x.id}')" aria-label="Editar ${esc(x.t)}"><td><div class="nm"><span class="vt-av" style="background:${x.k === 'in' ? 'var(--v-in)' : col(x.cat)}">${esc((x.t || '?').trim()[0] || '?').toUpperCase()}</span><b>${esc(x.t)}</b></div></td><td><span class="cat"><i style="background:${x.k === 'in' ? 'var(--v-in)' : col(x.cat)}"></i>${esc(x.cat)}</span></td><td>${dfmt(x.date)}</td><td class="r ${x.k === 'in' ? 'up' : ''}">${x.k === 'in' ? '+' : '−'}${R(x.v)}</td></tr>`;
    const seg = [['all', 'Todos'], ['in', 'Receitas'], ['out', 'Despesas']];
    return `<div class="vt-tb"><div class="vt-srch">${ic(IC.search)}<input id="vt-q" class="vt-in" type="search" placeholder="Buscar lançamentos" value="${esc(q)}" oninput="FN.q(this.value)" aria-label="Buscar lançamentos"></div><div class="vt-seg" role="group" aria-label="Tipo">${seg.map(s => `<button class="${typ === s[0] ? 'on' : ''}" onclick="FN.flt('typ','${s[0]}')">${s[1]}</button>`).join('')}</div><select class="vt-in" aria-label="Categoria" onchange="FN.flt('cat',this.value)"><option value="all">Categoria: todas</option>${allCats.map(c => `<option value="${esc(c)}"${cat === c ? ' selected' : ''}>${esc(c)}</option>`).join('')}</select><select class="vt-in" aria-label="Ordenar" onchange="FN.flt('srt',this.value)">${[['new', 'Mais recentes'], ['old', 'Mais antigos'], ['high', 'Maior valor'], ['low', 'Menor valor']].map(o => `<option value="${o[0]}"${srt === o[0] ? ' selected' : ''}>${o[1]}</option>`).join('')}</select><select class="vt-in" aria-label="Período" onchange="FN.flt('scope',this.value)"><option value="m"${scope === 'm' ? ' selected' : ''}>${mlabel(m)}</option><option value="all"${scope === 'all' ? ' selected' : ''}>Todos os meses</option></select><button class="vt-btn p" onclick="FN.add()">${ic(IC.plus)}Adicionar lançamento</button></div>
<div class="vt-cnt">Mostrando ${L.length} de ${base.length} lançamentos</div>${L.length ? `<div class="vt-card vt-table wrap"><table><thead><tr><th>Lançamento</th><th>Categoria</th><th>Data</th><th class="r" style="text-align:right">Valor</th></tr></thead><tbody>${L.map(row).join('')}</tbody></table></div><div class="vt-card vt-cards">${L.map(item).join('')}</div>` : '<div class="vt-card"><div class="vt-empty">Nenhum lançamento encontrado. Ajuste os filtros ou adicione um lançamento.</div></div>'}`;
  };

  const anView = W => {
    const L = inM(m), inn = inK(L, 'in'), out = outK(L), inv = invK(L), cl = cats(L), pOut = outK(inM(shift(m, -1)));
    const ms = [5, 4, 3, 2, 1, 0].map(i => shift(m, -i)), labs = ms.map(mshort);
    const I = ms.map(k => inK(inM(k), 'in')), O = ms.map(k => outK(inM(k))), N = I.map((v, i) => v - O[i]);
    const has = I.some(Boolean) || O.some(Boolean), cw = W >= 860 ? Math.floor((W - 16) / 2) - 42 : W - 42;
    const today = new Date(), days = m === ym(today) ? today.getDate() : new Date(+m.slice(0, 4), +m.slice(5), 0).getDate();
    const top = L.filter(x => x.k === 'out' && !isInv(x)).sort((a, b) => b.v - a.v)[0];
    const ins = [];
    if (inv > 0) ins.push(['Investido no mês', R(inv), inn > 0 ? Math.round(inv / inn * 100) + '% da renda aplicada' : 'aplicações de ' + mlabel(m)]);
    if (cl.length) ins.push(['Maior categoria de gasto', esc(cl[0][0]), `${R(cl[0][1])} · ${Math.round(cl[0][1] / out * 100)}% das despesas`]);
    if (inn > 0) ins.push(['Taxa de economia', Math.round((inn - out) / inn * 100) + '%', `${R(inn - out)} guardados de ${R(inn)} recebidos`]);
    if (pOut > 0) ins.push(['Despesas vs mês anterior', pct((out - pOut) / pOut * 100), `${R(out)} agora · ${R(pOut)} antes`]);
    if (out > 0) ins.push(['Média diária de gastos', R(out / days), `em ${days} ${days === 1 ? 'dia' : 'dias'} de ${mlabel(m)}`]);
    if (top) ins.push(['Maior despesa do mês', R(top.v), esc(top.t) + ' · ' + esc(top.cat)]);
    const two = W >= 860 ? 'vt-row" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr)' : 'vt-row';
    const ch = (t, p, inner) => `<div class="vt-card"><div class="vt-ch"><div><h2>${t}</h2><p>${p}</p></div></div>${has ? `<div class="vt-chart">${inner}</div>` : '<div class="vt-empty">Sem lançamentos nos últimos 6 meses.</div>'}</div>`;
    return `<div class="${two}">${ch('Receitas x despesas', 'Últimos 6 meses', `<div class="vt-leg"><span><i style="background:var(--v-in)"></i>Receitas</span><span><i style="background:var(--v-out)"></i>Despesas</span></div>` + barChart(labs, [I, O], ['var(--v-in)', 'var(--v-out)'], ['Receitas', 'Despesas'], cw))}${ch('Resultado mensal', 'Receitas menos despesas', barChart(labs, [N], [v => v >= 0 ? 'var(--v-in)' : 'var(--v-out)'], ['Resultado'], cw))}</div>
<div class="${two}"><div class="vt-card"><div class="vt-ch"><div><h2>Gastos por categoria</h2><p>${mlabel(m)}</p></div></div>${cl.length ? donut(cl, out) : '<div class="vt-empty">Nenhum gasto neste mês.</div>'}</div><div class="vt-card"><div class="vt-ch"><div><h2>Insights</h2><p>Calculados dos seus lançamentos de ${mlabel(m)}</p></div></div>${ins.length ? `<div class="vt-ins" style="grid-template-columns:minmax(0,1fr)">${ins.map(i => `<div><div class="lb">${i[0]}</div><div class="vl">${i[1]}</div><div class="ds">${i[2]}</div></div>`).join('')}</div>` : '<div class="vt-empty">Adicione lançamentos para ver insights.</div>'}</div></div>`;
  };

  /* ---------- página ---------- */
  P.fin = () => {
    if (!Array.isArray(S.fin)) S.fin = [];
    const W = baseW(), b = W >= 860 ? 'l' : W >= 600 ? 'm' : 's', h = new Date().getHours();
    lastW = innerWidth;
    const head = tab === 'tx' ? ['Transações', 'Acompanhe e gerencie seus lançamentos.'] : tab === 'an' ? ['Análises', 'Entenda para onde vai o seu dinheiro.'] : [(h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite') + (S.name ? ', ' + esc(S.name) : '') + '.', 'Aqui está o resumo das suas finanças.'];
    const body = tab === 'tx' ? txView() : tab === 'an' ? anView(W) : dashView(W);
    return `<div class="vt vt-${b}"><div class="vt-head"><div><h1>${head[0]}</h1><p class="vt-sub">${head[1]}</p></div><div class="vt-month"><button class="vt-ib" onclick="FN.nav(-1)" aria-label="Mês anterior">‹</button><b>${mlabel(m)}</b><button class="vt-ib" onclick="FN.nav(1)" aria-label="Próximo mês">›</button>${m !== TD().slice(0, 7) ? '<button class="vt-ib" style="width:auto;padding:0 10px;font-size:13px" onclick="FN.today()">Hoje</button>' : ''}</div></div><div class="vt-tabs" role="tablist">${[['dash', 'Visão geral'], ['tx', 'Transações'], ['an', 'Análises']].map(t => `<button class="vt-tab ${tab === t[0] ? 'on' : ''}" role="tab" aria-selected="${tab === t[0]}" onclick="FN.tab('${t[0]}')">${t[1]}</button>`).join('')}</div>${body}</div>`;
  };

  // refaz a tela só quando a LARGURA muda (não quando o teclado do celular abre)
  let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (typeof page !== 'undefined' && page === 'fin' && innerWidth !== lastW) render(); }, 150); });
})();