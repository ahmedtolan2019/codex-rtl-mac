import test from 'node:test';
import assert from 'node:assert/strict';
import {discoverApp,validateAppPath,assertLoopbackListeners} from './app-location.mjs';
test('discovers either official app name without assuming its executable',()=>{
 const app='/Applications/Codex.app';assert.deepEqual(discoverApp(undefined,p=>p===app?{app,executable:app+'/Contents/MacOS/Codex'}:null,'/Users/demo'),{app,executable:app+'/Contents/MacOS/Codex'});
});
test('an explicit app path is used without searching elsewhere',()=>{
 const calls=[];const app='/Volumes/Apps/Codex.app';discoverApp(app,p=>{calls.push(p);return{app:p,executable:p+'/Contents/MacOS/Codex'};});assert.deepEqual(calls,[app]);
});
test('ambiguous and unsupported installations fail clearly',()=>{
 assert.throws(()=>discoverApp(undefined,()=>null,'/Users/demo'),/No compatible/);
 assert.throws(()=>discoverApp(undefined,p=>({app:p}),'/Users/demo'),/More than one/);
});
test('paths must be absolute app bundle paths',()=>{
 for(const path of ['Codex.app','/tmp/tool',null,12,'/tmp/a\0.app'])assert.throws(()=>validateAppPath(path));
});
test('all listening addresses must be loopback',()=>{
 assert.equal(assertLoopbackListeners([]),false);
 assert.equal(assertLoopbackListeners(['127.0.0.1:9223','[::1]:9223']),true);
 for(const value of ['*:9223','0.0.0.0:9223','192.168.1.2:9223','127.0.0.1:9222'])assert.throws(()=>assertLoopbackListeners([value]),/not restricted/);
});
