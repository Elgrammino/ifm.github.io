// При каждом изменении файлов меняйте номер версии, иначе останется старый кэш.
const C = "ifm-v1";
const A = ["./", "./index.html", "./data.json", "./manifest.json", "./hero.jpg", "./icon-180.png", "./icon-192.png", "./icon-512.png",
  "./m500.woff2", "./m700.woff2", "./m800.woff2", "./asi.jpg", "./mind.jpg", "./umid.jpg", "./duo.jpg", "./artak.jpg"];

self.addEventListener("install", e => e.waitUntil(caches.open(C).then(c => c.addAll(A)).then(() => self.skipWaiting())));
self.addEventListener("activate", e => e.waitUntil(
  caches.keys().then(k => Promise.all(k.filter(x => x !== C).map(x => caches.delete(x)))).then(() => self.clients.claim())));

self.addEventListener("fetch", e => {
  const r = e.request;
  if (r.method !== "GET") return;
  const u = new URL(r.url);
  if (u.origin !== location.origin) return; // запросы к базе (Firebase) идут напрямую
  // Расписание и страница: сначала сеть (свежие данные), без сети берём кэш
  const fresh = u.pathname.endsWith("data.json") || u.pathname.endsWith("index.html") || u.pathname.endsWith("/");
  e.respondWith(fresh
    ? fetch(r).then(x => { if (x.ok) { const y = x.clone(); caches.open(C).then(c => c.put(r, y)); } return x; })
        .catch(() => caches.match(r, { ignoreSearch: true }))
    : caches.match(r).then(m => m || fetch(r).then(x => { if (x.ok) { const y = x.clone(); caches.open(C).then(c => c.put(r, y)); } return x; })));
});
