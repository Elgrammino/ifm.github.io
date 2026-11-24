const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const api=require('../storage'),root=path.join(__dirname,'..');
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
function app(response,values={}){
 const classes=new Set(['loading']);
 const elements=Object.fromEntries(['#v','#nv','#sh','#splash'].map(k=>[k,{innerHTML:'',style:{},classList:{add(n){this.value=n}},setAttribute(){},remove(){this.removed=true}}]));
 const ctx={window:{scrollY:120,listeners:{},addEventListener(k,fn){this.listeners[k]=fn}},history:{pushState(){},back(){}},IFM:api,IFM_REMOTE:()=>({ready:false}),localStorage:backend(values),location:{pathname:'/ifm.github.io/'},document:{querySelector:k=>elements[k],createElement:()=>({setAttribute(){},remove(){},classList:{add(){}}}),body:{style:{},classList:{contains:n=>classes.has(n),add:n=>classes.add(n),remove:n=>classes.delete(n)},append(){}},addEventListener(){}},navigator:{},fetch:async()=>response,setTimeout(fn,delay){(ctx.timers??=[]).push({fn,delay});return ctx.timers.length},setInterval:()=>0,clearTimeout(id){if(ctx.timers?.[id-1])ctx.timers[id-1].cancelled=true},scrollTo(x,y){ctx.lastScroll=[x,y]},console};
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
 const {ctx,elements}=app({ok:true,json:async()=>data});await flush();
 assert.match(elements['#v'].innerHTML,/class="ann"/);
 assert.match(elements['#v'].innerHTML,/Регистрация участников/);
 assert.match(elements['#v'].innerHTML,/О событии/);
 vm.runInContext("star('a1')",ctx);
 assert.match(elements['#v'].innerHTML,/aria-pressed="true">Убрать из расписания/);
 const state={'ifm2027:/ifm.github.io/:s':JSON.stringify({shift:0,off:{a1:true},add:[],news:[]})};
 const cancelled=app({ok:true,json:async()=>data},state);await flush();
 assert.match(cancelled.elements['#v'].innerHTML,/<section class="ann"[^>]*>[\s\S]*?<h2>Открытие форума<\/h2>/);
 assert.doesNotMatch(cancelled.elements['#v'].innerHTML,/<h2>Регистрация участников<\/h2>/);
});
test('event sheet locks background and restores its scroll position',async()=>{
 const {ctx,elements}=app({ok:true,json:async()=>data});await flush();
 vm.runInContext("openEv('a1')",ctx);
 assert.equal(ctx.document.body.style.position,'fixed');assert.equal(ctx.document.body.style.top,'-120px');
 assert.equal(elements['#sh'].style.display,'block');
 vm.runInContext('closeSh()',ctx);
 assert.equal(ctx.document.body.style.position,'');assert.deepEqual(ctx.lastScroll,[0,120]);
 vm.runInContext("openEv('a1')",ctx);ctx.window.listeners.popstate();
 assert.equal(elements['#sh'].style.display,'none');assert.equal(ctx.document.body.style.position,'');
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
 const ctx={URL,Response,Set,Error,self:{registration:{scope},clients:{claim:async()=>{}},addEventListener:(k,f)=>handlers[k]=f},caches:{keys:async()=>['other-app','ifm2027:'+scope+':old','ifm2027:https://example.com/other/:old'],delete:async k=>deleted.push(k),open:async()=>({match:async()=>new Response('cached')})},fetch:async()=>{throw Error('offline')}};
 vm.runInNewContext(fs.readFileSync(path.join(root,'sw.js'),'utf8'),ctx);let p;
 handlers.activate({waitUntil:x=>p=x});await p;assert.deepEqual(deleted,['ifm2027:'+scope+':old']);
 handlers.fetch({request:{url:scope+'data.json',method:'GET'},respondWith:x=>p=x});assert.equal(await(await p).text(),'cached');
});
