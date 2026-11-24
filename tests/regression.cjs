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
 const elements=Object.fromEntries(['#v','#nv','#sh'].map(k=>[k,{innerHTML:'',style:{},setAttribute(){}}]));
 const ctx={window:{addEventListener(){}},history:{pushState(){},back(){}},IFM:api,IFM_REMOTE:()=>({ready:false}),localStorage:backend(values),location:{pathname:'/ifm.github.io/'},document:{querySelector:k=>elements[k],createElement:()=>({setAttribute(){},remove(){}}),body:{append(){}},addEventListener(){}},navigator:{},fetch:async()=>response,setTimeout:()=>0,setInterval:()=>0,clearTimeout(){},scrollTo(){},console};
 vm.createContext(ctx);vm.runInContext(script,ctx);return {ctx,elements};
}
const flush=()=>new Promise(r=>setImmediate(r));
test('program, speaker, saved note and favourite render',async()=>{
 const {ctx,elements}=app({ok:true,json:async()=>data},{'ifm2027:/ifm.github.io/:notes':'{"a3":"Сохранено"}'});await flush();
 assert.match(elements['#v'].innerHTML,/Международный форум/);vm.runInContext("go('prog');star('a3');openEv('a3')",ctx);
 assert.match(elements['#sh'].innerHTML,/Сохранено/);assert.match(elements['#sh'].innerHTML,/В моём расписании/);
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
