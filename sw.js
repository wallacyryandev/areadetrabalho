/* Hub Pessoal - sw.js: abre sem internet (cache) + notificações do sistema no Android/Chrome */
const CACHE='hub-v1';
const FILES=['./','index.html','index.js','musica.js','manifest.json','icon-192.png','icon-512.png','icon-180.png'];

self.addEventListener('install',e=>{
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c=>Promise.all(FILES.map(u=>c.add(u).catch(()=>{})))));
});
self.addEventListener('activate',e=>e.waitUntil(
  caches.keys().then(ks=>Promise.all(ks.filter(k=>k!=CACHE).map(k=>caches.delete(k)))).then(()=>clients.claim())
));

/* Com internet: pega a versão nova e atualiza o cache. Sem internet (ou rede lenta, 4s): usa o cache. */
self.addEventListener('fetch',e=>{
  const r=e.request;
  if(r.method!='GET'||new URL(r.url).origin!=location.origin)return;
  const fromCache=()=>caches.match(r,{ignoreSearch:true}).then(m=>m||(r.mode=='navigate'?caches.match('./'):null));
  const net=fetch(r).then(res=>{
    if(res&&res.status==200&&res.type=='basic'){const cp=res.clone();caches.open(CACHE).then(c=>c.put(r,cp)).catch(()=>{})}
    return res;
  });
  e.respondWith(
    Promise.race([net,new Promise((_,rej)=>setTimeout(rej,4000))])
      .catch(()=>fromCache().then(m=>m||net))
      .catch(()=>Response.error())
  );
});

self.addEventListener('notificationclick',e=>{e.notification.close();e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(l=>l.length?l[0].focus():clients.openWindow('./')))});