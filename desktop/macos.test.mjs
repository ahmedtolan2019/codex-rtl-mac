import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureAppSession, isAppTarget, injection, evaluate } from './macos.mjs';
import { EventEmitter } from 'node:events';

function mock({running=null, debug=false, stuck=false, portBusy=false, denied=false}={}) {
  let pid=running, clock=0; const calls=[];
  return {calls, io:{pid:()=>pid, listener:()=>debug, now:()=>clock,
    pause:async ms=>{clock+=ms;}, log:()=>{}, focus:()=>calls.push('focus'),
    assertPortFree:()=>{calls.push('port'); if(portBusy)throw Error('occupied');},
    quit:async()=>{calls.push('quit'); if(denied)throw Error('denied'); if(!stuck)pid=null;},
    start:()=>{calls.push('start');pid=99;}}};
}
test('closed app opens automatically',async()=>{const m=mock();assert.equal(await ensureAppSession(m.io),'started');assert.deepEqual(m.calls,['port','port','start']);});
test('normal app quits gracefully and reopens automatically',async()=>{const m=mock({running:1});assert.equal(await ensureAppSession(m.io),'restarted');assert.deepEqual(m.calls,['port','quit','port','start']);});
test('existing debug session is focused without restart',async()=>{const m=mock({running:1,debug:true});assert.equal(await ensureAppSession(m.io),'reused');assert.deepEqual(m.calls,['focus']);});
test('quit blocked by app never forces quit or starts duplicate',async()=>{const m=mock({running:1,stuck:true});await assert.rejects(ensureAppSession(m.io),/No force quit/);assert.deepEqual(m.calls,['port','quit']);});
test('automation denied surfaces error',async()=>{const m=mock({running:1,denied:true});await assert.rejects(ensureAppSession(m.io),/denied/);assert.deepEqual(m.calls,['port','quit']);});
test('occupied port leaves running app untouched',async()=>{const m=mock({running:1,portBusy:true});await assert.rejects(ensureAppSession(m.io),/occupied/);assert.deepEqual(m.calls,['port']);});
test('only local app targets accepted',()=>{
 const target={type:'page',url:'app://-/',webSocketDebuggerUrl:'ws://127.0.0.1:9223/devtools/page/test'};
 assert.ok(isAppTarget(target));
 for(const change of [{type:'worker'},{url:'https://example.com'},{webSocketDebuggerUrl:'ws://example.com:9223/x'},{webSocketDebuggerUrl:'ws://127.0.0.1:9222/x'}])assert.equal(isAppTarget({...target,...change}),false);
});
test('asset revision permits an upgraded script to reapply',()=>{assert.match(injection,/__CODEX_RTL_REVISION__ !==/);assert.doesNotMatch(injection,/if \(!window.__CODEX_RTL_ACTIVE__/);});
test('mock transport receives Runtime.evaluate without contacting the running app',async()=>{
 const connect=address=>{
  assert.equal(address,'ws://127.0.0.1:9223/mock');
  const ws=new EventEmitter();
  ws.close=()=>{};ws.terminate=()=>{};
  ws.send=data=>{
   const message=JSON.parse(data);assert.equal(message.method,'Runtime.evaluate');
   assert.equal(message.params.expression,'true');assert.equal(message.params.returnByValue,true);
   queueMicrotask(()=>ws.emit('message',JSON.stringify({id:message.id,result:{result:{value:{active:true,style:true,mock:true}}}})));
  };
  queueMicrotask(()=>ws.emit('open'));
  return ws;
 };
 assert.deepEqual(await evaluate('ws://127.0.0.1:9223/mock','true',connect),{active:true,style:true,mock:true});
});
