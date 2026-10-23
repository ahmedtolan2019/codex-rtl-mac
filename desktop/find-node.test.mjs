import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const script=fileURLToPath(new URL('./find-node.sh',import.meta.url));
function run(file){return execFileSync('/bin/bash',['-c','source "$1"; codex_find_node "$2"','test',script,file],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();}
test('Lite accepts an explicit installed Node path',()=>{
 const dir=mkdtempSync(join(tmpdir(),'rtl-node-test-'));try{const file=join(dir,'node-path.txt');writeFileSync(file,process.execPath+'\n');assert.equal(run(file),process.execPath);}finally{rmSync(dir,{recursive:true});}
});
test('Lite does not evaluate shell syntax in the configured path',()=>{
 const dir=mkdtempSync(join(tmpdir(),'rtl-node-test-'));try{const file=join(dir,'node-path.txt');writeFileSync(file,'$(echo unsafe)');assert.throws(()=>run(file));}finally{rmSync(dir,{recursive:true});}
});
test('Lite can discover Node from PATH without sourcing a profile',()=>{assert.ok(run('/nonexistent/rtl-config').startsWith('/'));});
