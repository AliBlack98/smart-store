// يخلّي التطبيق ينفتح بدون إنترنت: بيحفظ نسخة من الصفحة ومن مكتبة Supabase
const V = 'ms-v1';
const CORE = ['./', 'index.html', 'supabase.js'];

self.addEventListener('install', function(e){
  e.waitUntil(caches.open(V).then(function(c){
    return Promise.all(CORE.map(function(u){ return c.add(new Request(u, {cache:'reload'})).catch(function(){}); }));
  }));
  self.skipWaiting();
});

self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(ks){
    return Promise.all(ks.filter(function(k){ return k !== V; }).map(function(k){ return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});

self.addEventListener('fetch', function(e){
  const r = e.request;
  if(r.method !== 'GET') return;
  const u = new URL(r.url);
  if(/supabase\.co$/.test(u.hostname)) return;        // طلبات البيانات ما بتنحفظ أبداً
  const ok = u.origin === self.location.origin || /(^|\.)jsdelivr\.net$|fonts\.googleapis\.com$|fonts\.gstatic\.com$/.test(u.hostname);
  if(!ok) return;
  e.respondWith(netFirst(r));
});

async function netFirst(r){
  const cache = await caches.open(V);
  try{
    const res = await Promise.race([
      fetch(r),
      new Promise(function(_, rej){ setTimeout(function(){ rej(new Error('slow')); }, 5000); })
    ]);
    if(res && (res.ok || res.type === 'opaque')) cache.put(r, res.clone());
    return res;
  }catch(err){
    const hit = (await cache.match(r, {ignoreSearch:true})) ||
                (r.mode === 'navigate' ? ((await cache.match('index.html')) || (await cache.match('./'))) : null);
    if(hit) return hit;
    throw err;
  }
}
