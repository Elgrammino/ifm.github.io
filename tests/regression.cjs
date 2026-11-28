const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const api=require('../assets/js/storage'),root=path.join(__dirname,'..');
const data=JSON.parse(fs.readFileSync(path.join(root,'data.json'),'utf8'));
const script=fs.readFileSync(path.join(root,'index.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
function backend(v={}){return {getItem:k=>Object.hasOwn(v,k)?v[k]:null,setItem:(k,x)=>v[k]=x}}
test('corrupt and blocked storage recover without losing in-session notes',()=>{
 assert.equal(api.storage(backend({'ifm2027:/:s':'{'}),'/')('s'),null);
 let warnings=0;const s=api.storage({getItem(){throw Error()},setItem(){throw Error()}},'/',()=>warnings++);
 assert.equal(s('s'),null);s('notes',{a3:'Заметка'});s('fav',{a3:true});assert.equal(s('notes').a3,'Заметка');assert.equal(warnings,1);
});
test('only identified IFM legacy data is migrated',()=>{
 assert.deepEqual(api.storage(backend({d:JSON.stringify(data),notes:'{"a3":"Текст"}'}),'/')('notes'),{a3:'Текст'});
 assert.equal(api.storage(backend({notes:'{"a3":"Чужое"}'}),'/')('notes'),null);
});
test('partial state and invalid event input recover',()=>{
 assert.deepEqual(api.state({shift:'bad',off:null,add:[{}],news:[{}]}),{shift:0,off:{},add:[],news:[]});
 assert.ok(data.events.every(api.validEvent));assert.equal(api.validEvent({...data.events[0],t:'25:00'}),false);assert.equal(api.validEvent({...data.events[0],d:-1}),false);
});
function app(response,values={},serviceWorker,options={}){
 const classes=new Set(['loading']);
 const elements=Object.fromEntries(['#v','#nv','#sh','#splash','#app-scroll','#install','#install-ios','#install-android','#demo-notice'].map(k=>[k,{innerHTML:'',style:{},scrollTop:k==='#app-scroll'?120:0,classList:{add(n){this.value=n}},setAttribute(){},remove(){this.removed=true}}]));
 const ctx={URL,window:{scrollY:120,innerWidth:390,listeners:{},addEventListener(k,fn){this.listeners[k]=fn}},history:{pushState(){},back(){}},IFM:api,IFM_REMOTE:()=>({ready:false}),localStorage:backend(values),location:{pathname:'/ifm.github.io/',href:'https://example.com/ifm.github.io/'+(options.search||'')},document:{querySelector:k=>elements[k],createElement:()=>({setAttribute(){},remove(){},classList:{add(){}}}),body:{style:{},classList:{contains:n=>classes.has(n),add:n=>classes.add(n),remove:n=>classes.delete(n)},append(){}},addEventListener(){}},navigator:{serviceWorker,...options.navigator},fetch:async()=>response,setTimeout(fn,delay){(ctx.timers??=[]).push({fn,delay});return ctx.timers.length},setInterval:()=>0,clearTimeout(id){if(ctx.timers?.[id-1])ctx.timers[id-1].cancelled=true},scrollTo(x,y){ctx.lastScroll=[x,y]},console};
 const sheet=elements['#sh'];sheet.listeners={};sheet.clientWidth=390;sheet.addEventListener=(name,fn)=>sheet.listeners[name]=fn;sheet.setPointerCapture=()=>{};
 vm.createContext(ctx);vm.runInContext(script,ctx);return {ctx,elements};
}
const flush=()=>new Promise(r=>setImmediate(r));
test('loader waits for program and reveals either content or retry screen',async()=>{
 let resolve;const pending=new Promise(r=>resolve=r),appWithData=app(pending);
 assert.equal(appWithData.ctx.document.body.classList.contains('loading'),true);
 resolve({ok:true,json:async()=>data});await flush();
 assert.match(appWithData.elements['#v'].innerHTML,/Международный форум/);
 assert.equal(appWithData.ctx.document.body.classList.contains('loading'),true);
 appWithData.ctx.timers.find(t=>!t.cancelled&&t.delay<=480).fn();
 assert.equal(appWithData.ctx.document.body.classList.contains('app-ready'),true);
 assert.equal(appWithData.elements['#splash'].classList.value,'done');
 const stalled=app(new Promise(()=>{}));stalled.ctx.timers.find(t=>t.delay===10000).fn();
 assert.match(stalled.elements['#v'].innerHTML,/Программа загружается слишком долго/);
 stalled.ctx.timers.find(t=>t.delay<=480).fn();
 assert.equal(stalled.ctx.document.body.classList.contains('app-ready'),true);
});
test('home announcement follows live schedule, cancellation and favourites',async()=>{
 const actualProgramme={...data,showcaseEvent:null};
 const {ctx,elements}=app({ok:true,json:async()=>actualProgramme});await flush();
 assert.match(elements['#v'].innerHTML,/class="ann"/);
 assert.match(elements['#v'].innerHTML,/Регистрация участников/);
 assert.match(elements['#v'].innerHTML,/О событии/);
 vm.runInContext("star('a1')",ctx);
 assert.match(elements['#v'].innerHTML,/aria-pressed="true">Убрать из расписания/);
 const state={'ifm2027:/ifm.github.io/:s':JSON.stringify({shift:0,off:{a1:true},add:[],news:[]})};
 const cancelled=app({ok:true,json:async()=>actualProgramme},state);await flush();
 assert.match(cancelled.elements['#v'].innerHTML,/<section class="ann"[^>]*>[\s\S]*?<h2>Открытие форума<\/h2>/);
 assert.doesNotMatch(cancelled.elements['#v'].innerHTML,/<h2>Регистрация участников<\/h2>/);
});
test('empty program, missing speaker fields and long content stay usable',async()=>{
 const empty=app({ok:true,json:async()=>({events:[],speakers:[],links:[],dealers:[]})});await flush();
 assert.match(empty.elements['#v'].innerHTML,/Программа скоро появится/);
 vm.runInContext("go('prog')",empty.ctx);assert.match(empty.elements['#v'].innerHTML,/Программа пока не опубликована/);
 vm.runInContext("go('sp')",empty.ctx);assert.match(empty.elements['#v'].innerHTML,/Информация о спикерах скоро появится/);
 const worst={events:[{...data.events[0],title:'Демонстрация невероятных иллюзий с очень длинным названием и дополнительными пояснениями для посетителей форума'}],speakers:[{id:'long',name:'👩🏽‍💻 Александра Вишневская-Ковальчук',photo:'missing.jpg',products:[{n:'Набор реквизита'}]},{id:'blank'}],links:[],dealers:[]};
 const a=app({ok:true,json:async()=>worst});await flush();
 vm.runInContext("go('sp')",a.ctx);
 assert.match(a.elements['#v'].innerHTML,/Александра Вишневская-Ковальчук/);
 assert.match(a.elements['#v'].innerHTML,/Имя спикера уточняется/);
 assert.match(a.elements['#v'].innerHTML,/onerror="this.remove\(\)"/);
 assert.doesNotMatch(a.elements['#v'].innerHTML,/undefined/);
 vm.runInContext("openSp('long')",a.ctx);
 assert.match(a.elements['#sh'].innerHTML,/Ссылка появится позже/);
 assert.match(a.elements['#sh'].innerHTML,/Выступления спикера пока не добавлены/);
 const newsState={'ifm2027:/ifm.github.io/:s':JSON.stringify({shift:0,off:{},add:[],news:[{t:' ',x:'',ts:Date.now()}]})};
 const newsApp=app({ok:true,json:async()=>worst},newsState);await flush();
 vm.runInContext("go('news')",newsApp.ctx);
 assert.match(newsApp.elements['#v'].innerHTML,/Обновление программы/);
 assert.doesNotMatch(newsApp.elements['#v'].innerHTML,/<p style="margin:6px 0"><\/p>/);
});
test('short tabs keep navigation outside scroll area; sheet restores its scroll position',async()=>{
 const {ctx,elements}=app({ok:true,json:async()=>data});await flush();
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.ok(html.indexOf('<nav id="nv"')>html.indexOf('</main></div>'));
 assert.match(html,/body\{position:relative;[^}]*height:100dvh/);
 assert.match(html,/nav\{position:fixed;left:0;right:0;bottom:0/);
 vm.runInContext("openEv('a1')",ctx);
 assert.equal(elements['#app-scroll'].style.overflowY,'hidden');
 assert.equal(elements['#sh'].style.display,'block');
 vm.runInContext('closeSh()',ctx);
 assert.equal(elements['#app-scroll'].style.overflowY,'');assert.equal(elements['#app-scroll'].scrollTop,120);
 vm.runInContext("openEv('a1')",ctx);ctx.window.listeners.popstate();
 assert.equal(elements['#sh'].style.display,'none');assert.equal(elements['#app-scroll'].style.overflowY,'');
 vm.runInContext("go('notes')",ctx);assert.equal(elements['#app-scroll'].scrollTop,0);
 ctx.document.activeElement={closest:k=>k==='#nv'?{}:null};elements['#nv'].querySelector=()=>({focus(){ctx.restoredFocus=true}});
 vm.runInContext("go('news')",ctx);assert.match(elements['#v'].innerHTML,/Новости/);
 assert.equal(ctx.restoredFocus,true);
});
test('program, speaker, saved note and favourite render',async()=>{
 const {ctx,elements}=app({ok:true,json:async()=>data},{'ifm2027:/ifm.github.io/:notes':'{"a3":"Сохранено"}'});await flush();
 assert.match(elements['#v'].innerHTML,/Международный форум/);vm.runInContext("go('prog');star('a3');openEv('a3')",ctx);
 assert.match(elements['#v'].innerHTML,/<button class="event-open"/);
 assert.match(elements['#v'].innerHTML,/<\/button><button class="st /);
 assert.match(elements['#v'].innerHTML,/aria-pressed="true"/);
 assert.match(elements['#sh'].innerHTML,/Сохранено/);assert.match(elements['#sh'].innerHTML,/Удалить из моего расписания/);
 vm.runInContext("openSp('umid')",ctx);assert.match(elements['#sh'].innerHTML,/Умид Миргасанов/);
});
test('HTTP failure gives recovery screen or valid cached program',async()=>{
 const f=app({ok:false,status:404});await flush();assert.match(f.elements['#v'].innerHTML,/Программа не загрузилась/);
 const c=app({ok:false,status:503},{'ifm2027:/ifm.github.io/:d':JSON.stringify(data)});await flush();assert.match(c.elements['#v'].innerHTML,/Международный форум/);
});
test('worker preserves other apps and serves cached data offline',async()=>{
 const handlers={},deleted=[],scope='https://example.com/ifm.github.io/';
 const ctx={URL,Response,Set,Error,self:{registration:{scope},clients:{claim:async()=>{}},addEventListener:(k,f)=>handlers[k]=f},caches:{keys:async()=>['other-app','ifm2027:'+scope+':old','ifm2027:'+scope+'demo/:demo-11','ifm2027:https://example.com/other/:old'],delete:async k=>deleted.push(k),open:async()=>({match:async()=>new Response('cached')})},fetch:async()=>{throw Error('offline')}};
 vm.runInNewContext(fs.readFileSync(path.join(root,'sw.js'),'utf8'),ctx);let p;
 handlers.activate({waitUntil:x=>p=x});await p;assert.deepEqual(deleted,['ifm2027:'+scope+':old','ifm2027:'+scope+'demo/:demo-11']);
 handlers.fetch({request:{url:scope+'data.json',method:'GET'},respondWith:x=>p=x});assert.equal(await(await p).text(),'cached');
});

test('reorganized assets resolve and are available to the offline installer',async()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));
 const references=[...html.matchAll(/(?:src|href)="([^"$]+)"|url\(([^)]+)\)/g)]
   .map(m=>m[1]||m[2]).filter(p=>p.startsWith('assets/')||p==='manifest.json');
 references.push(...manifest.icons.map(i=>i.src),...data.speakers.map(s=>s.photo).filter(Boolean));
 let assets;
 const scope='https://example.com/ifm.github.io/',handlers={};
 let skipCount=0, previousCaches=[];
 const ctx={URL,Request,Set,Error,self:{registration:{scope},skipWaiting:async()=>{skipCount++},addEventListener:(k,f)=>handlers[k]=f},caches:{keys:async()=>previousCaches,open:async()=>({addAll:async requests=>{
  assert.ok(requests.every(request=>request.cache==='reload'));
  assets=requests.map(request=>'./'+request.url.slice(scope.length));
 }})}};
 vm.runInNewContext(fs.readFileSync(path.join(root,'sw.js'),'utf8'),ctx);
 let install;handlers.install({waitUntil:p=>install=p});await install;
 assert.equal(skipCount,0);
 handlers.message({data:{type:'OTHER'},waitUntil:()=>assert.fail('Unrelated message was handled')});
 let activation;handlers.message({data:{type:'IFM_ACTIVATE_UPDATE'},waitUntil:p=>activation=p});
 await activation;assert.equal(skipCount,1);
 previousCaches=['ifm2027:'+scope+':app-22'];
 handlers.install({waitUntil:p=>install=p});await install;
 assert.equal(skipCount,1,'a version with an update button waits for user approval');
 previousCaches=['ifm2027:'+scope+':app-15'];
 handlers.install({waitUntil:p=>install=p});await install;
 assert.equal(skipCount,2,'the version without a button can migrate automatically');
 for(const file of assets)assert.ok(fs.existsSync(path.join(root,file==='./'?'index.html':file)),file+' missing from disk');
 for(const file of references){assert.ok(fs.existsSync(path.join(root,file)),file+' missing');assert.ok(assets.includes('./'+file),file+' missing from offline cache');}
 assert.equal(data.speakers.filter(s=>s.photo&&!s.photo.startsWith('assets/participants/')).length,0);
 assert.equal(fs.existsSync(path.join(root,'demo')),false);
});

test('opening main unregisters only the retired demo worker',async()=>{
 const removed=[],base='https://example.com/ifm.github.io/';
 const worker={register:async()=>({}),getRegistrations:async()=>[base,base+'demo/','https://example.com/other/demo/'].map(scope=>({scope,unregister:async()=>removed.push(scope)}))};
 app({ok:true,json:async()=>data},{},worker);await flush();
 assert.deepEqual(removed,[base+'demo/']);
});

test('QR shows platform-appropriate installation and the installed app opens home',async()=>{
 const response={ok:true,json:async()=>data};
 const ios=app(response,{},undefined,{navigator:{userAgent:'iPhone'}});
 assert.equal(ios.elements['#install'].hidden,false);
 assert.equal(ios.elements['#install-ios'].hidden,false);
 assert.equal(ios.elements['#install-android'].hidden,true);
 const android=app(response,{},undefined,{navigator:{userAgent:'Android'}});
 assert.equal(android.elements['#install-ios'].hidden,true);
 assert.equal(android.elements['#install-android'].hidden,false);
 const installed=app(response,{},undefined,{navigator:{standalone:true}});
 assert.equal(installed.ctx.document.body.classList.contains('install-view'),false);
 await flush();assert.match(installed.elements['#v'].innerHTML,/<h1>Сейчас<\/h1>/);
});
test('lecture preview isolates old notes and sheet swipe accepts only qualifying right gestures',async()=>{
 const {ctx,elements}=app({ok:true,json:async()=>data},{d:JSON.stringify(data),notes:'{"b5":"Private note"}'},undefined,{search:'?preview=lecture'});
 await flush();
 assert.match(elements['#v'].innerHTML,/Идёт сейчас[\s\S]*Asi Wind/);
 vm.runInContext("openEv('b5')",ctx);
 const sheet=elements['#sh'];
 assert.doesNotMatch(sheet.innerHTML,/Private note/);
 const {pointerdown,pointermove,pointerup}=sheet.listeners;
 const gesture=(start,end,ms)=>{
  const seed={pointerId:1,isPrimary:true,pointerType:'touch',clientY:150,target:{closest:()=>null},timeStamp:0};
  pointerdown({...seed,clientX:start});pointermove({...seed,clientX:end,timeStamp:ms-10});
  pointerup({...seed,clientX:end,type:'pointerup',timeStamp:ms});
 };
 gesture(15,190,210);assert.equal(sheet.style.display,'block');
 gesture(50,85,350);assert.equal(sheet.style.display,'block');assert.equal(sheet.style.transform,'');
 gesture(50,220,300);assert.equal(sheet.style.display,'none');
});

test('closing a card keeps the final rendered frame until the sheet is hidden',async()=>{
 const {ctx,elements}=app({ok:true,json:async()=>data});await flush();
 const sheet=elements['#sh'];
 const animationRuns=[];
 ctx.getComputedStyle=()=>({opacity:'0.8',transform:'matrix(1, 0, 0, 1, 0, 20)'});
 sheet.getBoundingClientRect=()=>({x:0,y:0,width:390,height:844});
 sheet.toggleAttribute=()=>{};
 sheet.animate=(frames,options)=>{
  let finish;
  const animation={frames,options,finished:new Promise(resolve=>{finish=resolve}),finish:()=>finish(),cancel(){this.cancelledWhen=sheet.style.display}};
  animationRuns.push(animation);
  return animation;
 };
 vm.runInContext("openEv('b5')",ctx);
 assert.equal(animationRuns[0].frames[0].opacity,0);
 vm.runInContext('closeSh()',ctx);
 const close=animationRuns[1];
 assert.equal(close.frames[0].opacity,0.8);
 assert.equal(close.frames[1].opacity,0);
 assert.equal(sheet.style.display,'block');
 close.finish();await flush();
 assert.equal(sheet.style.display,'none');
 assert.equal(close.cancelledWhen,'none');
});

test('installed demo presents the agreed lecture and reuses its photograph in the speaker card',async()=>{
 const {ctx,elements}=app({ok:true,json:async()=>data},{},undefined,{navigator:{standalone:true}});
 await flush();
 assert.match(elements['#v'].innerHTML,/Демо форума/);
 assert.match(elements['#v'].innerHTML,/Идёт сейчас[\s\S]*Asi Wind[\s\S]*Записать заметку/);
 vm.runInContext("openSp('asi')",ctx);
 assert.match(elements['#sh'].innerHTML,/now-portrait[\s\S]*<h1 dir="auto">Asi Wind<\/h1>/);
 assert.equal((elements['#sh'].innerHTML.match(/<img\b/g)||[]).length,1);
});
