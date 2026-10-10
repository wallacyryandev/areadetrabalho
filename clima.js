/* clima.js — app Clima do Hub.
   Previsão via Open-Meteo (gratuito, sem chave). A cidade escolhida fica em S.clima (entra no Exportar/Importar);
   a última previsão fica em localStorage 'hub_wx' para abrir mesmo sem internet. */
(() => {
  if (typeof PG === 'undefined' || typeof P === 'undefined' || typeof S === 'undefined' || typeof fm !== 'function') return;
  if (!PG.some(p => p[0] === 'cli')) {
    const i = PG.findIndex(p => p[0] === 'cfg');
    PG.splice(i < 0 ? PG.length : i, 0, ['cli', '🌤️', 'Clima']);
  }

  const WX = { 0: ['☀️', 'Céu limpo'], 1: ['🌤️', 'Poucas nuvens'], 2: ['⛅', 'Parcialmente nublado'], 3: ['☁️', 'Nublado'], 45: ['🌫️', 'Neblina'], 48: ['🌫️', 'Neblina'], 51: ['🌦️', 'Garoa fraca'], 53: ['🌦️', 'Garoa'], 55: ['🌦️', 'Garoa forte'], 56: ['🌧️', 'Garoa congelante'], 57: ['🌧️', 'Garoa congelante'], 61: ['🌧️', 'Chuva fraca'], 63: ['🌧️', 'Chuva'], 65: ['🌧️', 'Chuva forte'], 66: ['🌧️', 'Chuva congelante'], 67: ['🌧️', 'Chuva congelante'], 71: ['❄️', 'Neve fraca'], 73: ['❄️', 'Neve'], 75: ['❄️', 'Neve forte'], 77: ['❄️', 'Grãos de neve'], 80: ['🌦️', 'Pancadas de chuva'], 81: ['🌧️', 'Pancadas de chuva'], 82: ['🌧️', 'Pancadas fortes'], 85: ['❄️', 'Pancadas de neve'], 86: ['❄️', 'Pancadas de neve'], 95: ['⛈️', 'Tempestade'], 96: ['⛈️', 'Tempestade com granizo'], 99: ['⛈️', 'Tempestade com granizo'] };
  const wc = c => WX[c] || ['🌡️', '—'];
  const KC = 'hub_wx', STALE = 10 * 60 * 1000;
  const cache = () => { try { return JSON.parse(localStorage.getItem(KC)); } catch (e) { return null; } };
  const place = () => S.clima && isFinite(S.clima.lat) && isFinite(S.clima.lon) ? S.clima : null;
  const key = p => (+p.lat).toFixed(2) + ',' + (+p.lon).toFixed(2);
  const hm = t => new Date(t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const deg = n => Math.round(n) + '°';
  let d = null, busy = 0, err = '', failAt = 0;

  const getJ = async u => {
    const c = new AbortController(), t = setTimeout(() => c.abort(), 10000);
    try { const r = await fetch(u, { signal: c.signal, cache: 'no-store' }); if (!r.ok) throw new Error('HTTP ' + r.status); return await r.json(); }
    finally { clearTimeout(t); }
  };

  const CL = window.CL = {
    load() {
      const p = place(); if (!p || busy) return;
      busy = 1; err = '';
      const u = 'https://api.open-meteo.com/v1/forecast?latitude=' + p.lat + '&longitude=' + p.lon +
        '&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code' +
        '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=7';
      getJ(u).then(j => {
        if (!j || !j.current || !j.daily) throw new Error('resposta inválida');
        d = { k: key(p), t: Date.now(), j };
        try { localStorage.setItem(KC, JSON.stringify(d)); } catch (e) {}
      }).catch(() => { err = 'Não foi possível atualizar agora.'; failAt = Date.now(); })
        .finally(() => { busy = 0; if (page === 'cli') render(); });
    },
    refresh() { failAt = 0; CL.load(); render(); },
    set(r) { S.clima = { name: [r.name, r.admin1].filter(Boolean).join(', '), lat: r.latitude, lon: r.longitude }; d = null; failAt = 0; RD(); },
    find() {
      fm('Buscar cidade', [{ k: 'q', l: 'Nome da cidade', r: 1 }], o => {
        getJ('https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(o.q) + '&count=5&language=pt&format=json').then(j => {
          const r = j.results || [];
          if (!r.length) return alert('Cidade não encontrada.');
          if (r.length === 1) return CL.set(r[0]);
          fm('Escolha o local', [{ k: 'i', l: 'Resultados', t: 'select', v: '0', o: r.map((x, i) => [String(i), [x.name, x.admin1, x.country].filter(Boolean).join(', ')]) }], q => CL.set(r[+q.i]));
        }).catch(() => alert('Não foi possível buscar agora. Verifique a conexão.'));
      });
    },
    here() {
      if (!navigator.geolocation) return alert('Este navegador não oferece localização.');
      navigator.geolocation.getCurrentPosition(
        p => { S.clima = { name: 'Minha localização', lat: p.coords.latitude, lon: p.coords.longitude }; d = null; failAt = 0; RD(); },
        () => alert('Não foi possível obter a localização. Verifique a permissão do navegador ou busque pela cidade.'),
        { timeout: 10000, maximumAge: 600000 });
    }
  };

  P.cli = () => {
    const p = place();
    const btn = `<button class="b g sm" onclick="CL.find()">Buscar cidade</button><button class="b g sm" onclick="CL.here()">📍 Minha localização</button>`;
    if (!p) return `<h1>Clima</h1><div class=g2><div class=c><h2>Escolha o local</h2><p class=s style="margin-bottom:12px">Busque uma cidade ou use a localização do aparelho para ver a previsão.</p><div class=row>${btn}</div></div></div>`;
    d = d || cache();
    const cur = d && d.k === key(p) ? d : null;
    if (!busy && (!cur || Date.now() - cur.t > STALE) && Date.now() - failAt > 60000) CL.load();
    const status = busy ? 'Atualizando…' : err ? err + (cur ? ' Mostrando dados salvos às ' + hm(cur.t) + '.' : '') : cur ? 'Atualizado às ' + hm(cur.t) : '';
    let body = `<div class=c><p class=s>Carregando previsão…</p></div>`;
    if (cur) {
      const c = cur.j.current, q = cur.j.daily, [em, tx] = wc(c.weather_code);
      body = `<div class=c><h2>Agora</h2><div class=big>${em} ${deg(c.temperature_2m)}</div><p>${tx}</p><p class=s style="margin-top:6px">Sensação ${deg(c.apparent_temperature)} · Umidade ${Math.round(c.relative_humidity_2m)}% · Vento ${Math.round(c.wind_speed_10m)} km/h</p></div>
<div class=c><h2>Próximos dias</h2>${q.time.map((dt, i) => `<div class=r><div style="width:52px">${i === 0 ? 'Hoje' : new Date(dt + 'T12:00').toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</div><div class=f>${wc(q.weather_code[i])[0]} <span class=s>${wc(q.weather_code[i])[1]}</span></div><span class=s>${q.precipitation_probability_max && q.precipitation_probability_max[i] != null ? '💧' + q.precipitation_probability_max[i] + '%' : ''}</span><b style="width:78px;text-align:right">${deg(q.temperature_2m_max[i])} <span class=s>${deg(q.temperature_2m_min[i])}</span></b></div>`).join('')}</div>`;
    }
    return `<h1>Clima</h1><div class=row style="margin:10px 0"><b>${esc(p.name)}</b>${btn}<button class="b g sm" onclick="CL.refresh()">↻</button></div><p class=s>${esc(status)}</p><div class=g2>${body}</div>`;
  };
})();