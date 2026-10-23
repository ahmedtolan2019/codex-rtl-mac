import { readFileSync, mkdirSync, writeFileSync, rmSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import WebSocket from 'ws';
import { homedir } from 'node:os';
import { createHash } from 'node:crypto';
import { discoverApp, loadAppPath, assertLoopbackListeners } from './app-location.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let app, executable;
const port = 9223;
const stateDir = resolve(homedir(), 'Library/Application Support/Codex RTL');
const statusFile = resolve(stateDir, 'status.json');
const endpoint = `http://127.0.0.1:${port}/json`;
const pause = ms => new Promise(done => setTimeout(done, ms));
const css = readFileSync(resolve(root, 'src/rtl-style.css'), 'utf8');
const source = readFileSync(resolve(root, 'src/injected.js'), 'utf8') + '\n' +
  readFileSync(resolve(root, 'desktop/macos-composer.js'), 'utf8');

const revision = createHash('sha256').update(css + source).digest('hex').slice(0, 16);

export function isAppTarget(target) {
  if (target.type !== 'page') return false;
  try {
    const page = new URL(target.url);
    const socket = new URL(target.webSocketDebuggerUrl);
    return page.protocol === 'app:' && socket.protocol === 'ws:' &&
      ['127.0.0.1', 'localhost', '[::1]'].includes(socket.hostname) &&
      socket.port === String(port);
  } catch { return false; }
}

export const injection = `(() => {
  if (!document.body) return {active:false};
  if (window.__CODEX_RTL_REVISION__ !== ${JSON.stringify(revision)}) {
    window.__CODEX_RTL_STYLE__ = ${JSON.stringify(css)};
    (0, eval)(${JSON.stringify(source)});
    window.__CODEX_RTL_REVISION__ = ${JSON.stringify(revision)};
  }
  return {
    active: window.__CODEX_RTL_ACTIVE__ === true,
    revision: window.__CODEX_RTL_REVISION__,
    style: Boolean(document.getElementById('codex-rtl-toolkit-style')),
    messageRoots: document.querySelectorAll('[data-markdown-text-style], [class*="_MarkdownRoot_"]').length,
    rtlTables: document.querySelectorAll('table[data-codex-table-direction="rtl"]').length,
    rtlBlocks: document.querySelectorAll('[data-codex-rtl="true"]').length
  };
})()`;

function appPid() {
  const lines = execFileSync('/bin/ps', ['-axo', 'pid=,comm='], {encoding:'utf8'}).split('\n');
  for (const line of lines) {
    const match = line.trim().match(/^(\d+)\s+(.+)$/);
    if (match?.[2] === executable) return Number(match[1]);
  }
  return null;
}

function localListener(pid) {
  if (!pid) return false;
  let lines;
  try {
    lines = execFileSync('/usr/sbin/lsof', ['-nP', '-a', '-p', String(pid),
      `-iTCP:${port}`, '-sTCP:LISTEN', '-Fn'], {encoding:'utf8', stdio:['ignore','pipe','ignore']})
      .split('\n').filter(line => line.startsWith('n')).map(line => line.slice(1));
  } catch { return false; }
  return assertLoopbackListeners(lines, port);
}

async function targets() {
  const response = await fetch(endpoint, {signal:AbortSignal.timeout(2000), redirect:'error'});
  if (!response.ok) throw new Error(`DevTools returned HTTP ${response.status}.`);
  return (await response.json()).filter(isAppTarget);
}

export function evaluate(url, expression = injection, createSocket = address => new WebSocket(address)) {
  if (!isAppTarget({type:'page', url:'app://desktop/', webSocketDebuggerUrl:url})) {
    throw new Error('Refusing a non-local debugging target.');
  }
  return new Promise((done, fail) => {
    const ws = createSocket(url);
    const timer = setTimeout(() => { ws.terminate(); fail(new Error('Renderer response timed out.')); }, 5000);
    const finish = (error, value) => {
      clearTimeout(timer);
      ws.close();
      error ? fail(error) : done(value);
    };
    ws.on('open', () => ws.send(JSON.stringify({id:1, method:'Runtime.evaluate',
      params:{expression, returnByValue:true}})));
    ws.on('error', error => finish(error));
    ws.on('message', data => {
      let message;
      try { message = JSON.parse(String(data)); } catch { return; }
      if (message.id !== 1) return;
      if (message.error || message.result?.exceptionDetails) finish(new Error('RTL script evaluation failed.'));
      else finish(null, message.result?.result?.value);
    });
  });
}

// Dependency injection keeps restart behavior testable without closing the host app.
export async function ensureAppSession(io) {
  let pid = io.pid();
  if (pid && io.listener(pid)) { io.focus(); return 'reused'; }
  io.assertPortFree();
  if (pid) {
    io.log('Reopening Codex with RTL support using a normal application quit.');
    await io.quit();
    const deadline = io.now() + 30000;
    while (io.pid()) {
      if (io.now() >= deadline) throw new Error('Codex did not finish quitting. No force quit was attempted. Close any open dialog, then try Codex RTL again.');
      await io.pause(500);
    }
  }
  io.assertPortFree();
  io.start();
  return pid ? 'restarted' : 'started';
}

function assertPortFree() {
  try {
    execFileSync('/usr/sbin/lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN'], {stdio:'ignore'});
    throw new Error(`Port ${port} is already in use. Close the other listener and try again.`);
  } catch (error) {
    if (error.status !== 1) throw error;
  }
}
function saveStatus(value) {
  mkdirSync(stateDir, {recursive:true});
  writeFileSync(statusFile, JSON.stringify({updatedAt:new Date().toISOString(), ...value}, null, 2));
}
function focusApp() { execFileSync('/usr/bin/open', [app]); }
function acquireLock() {
  mkdirSync(stateDir, {recursive:true});
  const lock = resolve(stateDir, 'watcher.lock');
  try { mkdirSync(lock); }
  catch (error) {
    if (error.code !== 'EEXIST') throw error;
    let owner;
    try { owner = Number(readFileSync(resolve(lock, 'pid'), 'utf8')); } catch {}
    let alive = false;
    if (Number.isInteger(owner) && owner > 0) {
      try { process.kill(owner, 0); alive = true; } catch (error) { if (error.code === 'EPERM') alive = true; }
    }
    // Allow another launch a moment to finish writing its PID.
    if (alive || (!owner && Date.now() - statSync(lock).mtimeMs < 10000)) return false;
    rmSync(lock, {recursive:true});
    mkdirSync(lock);
  }
  writeFileSync(resolve(lock, 'pid'), String(process.pid));
  process.on('exit', () => {
    try { if (readFileSync(resolve(lock, 'pid'), 'utf8') === String(process.pid)) rmSync(lock, {recursive:true, force:true}); } catch {}
  });
  process.once('SIGTERM', () => process.exit(0));
  process.once('SIGINT', () => process.exit(0));
  return true;
}

async function main() {
  if (process.platform !== 'darwin') throw new Error('This launcher is for macOS.');
  ({app, executable} = discoverApp(loadAppPath(resolve(stateDir, 'config.json'))));
  if (process.argv.includes('--check')) {
    if (!css.includes('unicode-bidi') || !source.includes('MutationObserver')) throw new Error('Incomplete RTL assets.');
    console.log(`Compatible app: ${app}. Runtime: Node.js ${process.versions.node}.`);
    console.log(`Mac launcher and RTL assets are ready (${revision}). This check did not launch or modify Codex.`);
    return;
  }
  if (!acquireLock()) {
    const current = appPid();
    if (current && localListener(current)) focusApp();
    console.log('The RTL launcher is already starting or watching Codex.');
    return;
  }
  saveStatus({active:false, state:'starting', revision});
  await ensureAppSession({
    pid:appPid, listener:localListener, assertPortFree, focus:focusApp,
    now:Date.now, pause, log:console.log,
    quit:() => execFileSync('/usr/bin/osascript', ['-e',
      'with timeout of 30 seconds\n tell application id "com.openai.codex" to quit\nend timeout'],
      {timeout:35000, stdio:['ignore','pipe','pipe']}),
    start:() => execFileSync('/usr/bin/open', [app, '--args',
      '--remote-debugging-address=127.0.0.1', `--remote-debugging-port=${port}`])
  });
  let pid;
  const deadline = Date.now() + 60000;
  let ready = false;
  while (Date.now() < deadline) {
    pid = appPid();
    if (localListener(pid)) {
      try { ready = (await targets()).length > 0; } catch { /* Renderer is starting. */ }
      if (ready) break;
    }
    await pause(1000);
  }
  if (!ready) throw new Error('This app did not expose a compatible desktop renderer. RTL is not active.');


  const seen = new Set();
  let failures = 0;
  let lastStatus = "";
  while (appPid() === pid) {
    try {
      if (!localListener(pid)) throw new Error('The local debugging listener closed.');
      let activated = false;
      const windows = [];
      for (const target of await targets()) {
        const result = await evaluate(target.webSocketDebuggerUrl);
        if (!result?.active || !result?.style) continue;
        activated = true;
        windows.push({id:target.id, rtlBlocks:result.rtlBlocks, rtlTables:result.rtlTables, messageRoots:result.messageRoots, revision:result.revision});
        if (!seen.has(target.id)) {
          seen.add(target.id);
          console.log('RTL script loaded in a desktop window. Content detection is recorded separately in status.json.');
        }
      }
      if (!activated) throw new Error("No compatible window confirmed RTL activation.");
      const signature = JSON.stringify(windows);
      if (signature !== lastStatus) {
        lastStatus = signature;
        const active = windows.some(window => window.rtlBlocks > 0);
        saveStatus({active, injected:true, state:active ? 'rtl-content-detected' : 'waiting-for-content', app, port, revision, windows});
      }
      failures = 0;
    } catch (error) {
      failures++;
      if (failures === 1) console.error(`Waiting for the desktop renderer: ${error.message}`);
      if (failures >= 15) throw error;
    }
    await pause(2000);
  }
  saveStatus({active:false, state:'closed', closedAt:new Date().toISOString()});
  console.log('ChatGPT closed. Use Codex RTL again next time.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => {
    console.error(`RTL launcher: ${error.message}`);
    saveStatus({active:false, state:'error', error:error.message, revision});
    if (!process.argv.includes('--check')) {
      try {
        // Pass error text as argv, never as executable AppleScript source.
        execFileSync('/usr/bin/osascript', ['-e',
          'on run argv\n display alert "Codex RTL could not start" message (item 1 of argv) as critical\nend run',
          error.message + '\n\nDetails: ~/Library/Logs/Codex RTL/launcher.log'], {timeout:60000});
      } catch {}
    }
    process.exitCode = 1;
  });
}
