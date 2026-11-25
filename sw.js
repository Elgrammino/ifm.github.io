const PREFIX = 'ifm2027:' + self.registration.scope + ':';
const DEMO_PREFIX = 'ifm2027:' + new URL('./demo/', self.registration.scope).href + ':';
const CACHE = PREFIX + 'app-14';
const ASSETS = ['./','./index.html','./assets/js/storage.js','./assets/js/firebase-config.js','./assets/js/remote.js','./data.json','./manifest.json','./assets/images/hero.jpg','./assets/icons/icon-180.png','./assets/icons/icon-192.png','./assets/icons/icon-512.png','./assets/fonts/m500.woff2','./assets/fonts/m700.woff2','./assets/fonts/m800.woff2','./assets/participants/asi.jpg','./assets/participants/mind.jpg','./assets/participants/umid.jpg','./assets/participants/duo.jpg','./assets/participants/artak.jpg'];
const urls = new Set(ASSETS.map(file => new URL(file,self.registration.scope).href));
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => (key.startsWith(PREFIX) && key !== CACHE) || key.startsWith(DEMO_PREFIX)).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
 const request=event.request,url=new URL(request.url);url.search='';
 if(request.method!=='GET'||!urls.has(url.href))return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  try{
   const response=await fetch(request);if(!response.ok)throw Error('HTTP '+response.status);
   try{await cache.put(url.href,response.clone())}catch{}
   return response;
  }catch{
   const stored=await cache.match(url.href);if(stored)return stored;
   if(request.mode==='navigate'){const page=await cache.match(new URL('./index.html',self.registration.scope).href);if(page)return page}
   return new Response('Offline asset unavailable',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
  }
 })());
});
