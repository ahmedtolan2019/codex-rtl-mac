import assert from 'node:assert/strict';
import {readFileSync, readdirSync, existsSync, mkdtempSync, rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {resolve, dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

assert.equal(process.platform, 'darwin', 'Verify the Mac packages on macOS.');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(process.argv[2] || join(root, 'dist'));
const pkg = JSON.parse(readFileSync(join(root, 'package.json')));
const runtime = JSON.parse(readFileSync(join(root, 'scripts/node-runtime.json')));
const run = (program, args) => execFileSync(program, args, {encoding:'utf8'}).trim();
const hash = file => createHash('sha256').update(readFileSync(file)).digest('hex');
const lines = readFileSync(join(dist, 'SHA256SUMS.txt'), 'utf8').trim().split('\n');
const expected = [false,true].map(lite => `Codex-RTL-for-Mac${lite?'-Lite':''}-v${pkg.version}.zip`);
assert.equal(lines.length, 2, 'Expect one checksum for each edition.');
const sums = new Map(lines.map(line => {
  const match = line.match(/^([a-f0-9]{64})  (Codex-RTL-for-Mac(?:-Lite)?-v\d+\.\d+\.\d+\.zip)$/);
  assert.ok(match, 'Invalid checksum entry.');
  return [match[2], match[1]];
}));
assert.deepEqual([...sums.keys()].sort(), expected.toSorted());

function compareTree(source, destination) {
  assert.deepEqual(readdirSync(destination).sort(), readdirSync(source).sort());
  for (const entry of readdirSync(source, {withFileTypes:true})) {
    const a = join(source, entry.name), b = join(destination, entry.name);
    if (entry.isDirectory()) compareTree(a,b);
    else assert.equal(hash(b), hash(a), `Packaged file differs: ${entry.name}`);
  }
}

let iconHash;
for (const lite of [false,true]) {
  const name = expected[Number(lite)];
  const archive = join(dist, name);
  assert.equal(hash(archive), sums.get(name), `Checksum mismatch: ${name}`);
  const folder = mkdtempSync(join(tmpdir(), 'codex-rtl-verify-'));
  try {
    run('/usr/bin/ditto', ['-x','-k',archive,folder]);
    const appName = `Codex RTL for Mac${lite?' Lite':''}.app`;
    assert.deepEqual(readdirSync(folder), [appName]);
    const app = join(folder, appName), resources = join(app,'Contents/Resources');
    const toolkit = join(resources,'toolkit');
    run('/usr/bin/codesign', ['--verify','--deep','--strict',app]);
    run('/bin/bash', ['-n',join(app,'Contents/MacOS/launch')]);
    const plist = key => run('/usr/libexec/PlistBuddy', ['-c',`Print ${key}`,join(app,'Contents/Info.plist')]);
    assert.equal(plist('CFBundleShortVersionString'), pkg.version);
    assert.equal(plist('CFBundleIdentifier'), `io.github.ahmedtolan2019.codex-rtl-mac${lite?'.lite':''}`);
    for (const directory of ['src','desktop','licenses']) compareTree(join(root,directory),join(toolkit,directory));
    for (const file of ['LICENSE','SECURITY.md','NOTICE.md']) assert.equal(hash(join(toolkit,file)),hash(join(root,file)));
    assert.equal(JSON.parse(readFileSync(join(toolkit,'node_modules/ws/package.json'))).version,pkg.dependencies.ws);
    const icon = hash(join(resources,'AppIcon.icns'));
    if (iconHash) assert.equal(icon,iconHash,'Both editions must use the same icon.');
    iconHash = icon;
    let node = process.execPath;
    if (lite) {
      assert.equal(existsSync(join(resources,'node')),false,'Lite must not bundle a runtime.');
    } else {
      node = join(resources,'node/bin/node');
      assert.deepEqual(run('/usr/bin/lipo',['-archs',node]).split(/\s+/).sort(),['arm64','x86_64']);
      assert.equal(run(node,['--version']),`v${runtime.version}`);
      assert.ok(existsSync(join(resources,'node/LICENSE')));
    }
    assert.equal(run(node,['-p','process.arch']),process.arch);
    // Importing the module checks its packaged dependency graph. main() is not invoked.
    // No official app is opened, discovered, controlled or contacted here.
    run(node,['--input-type=module','-e',
      'import {pathToFileURL} from "node:url"; const m=await import(pathToFileURL(process.argv[1]).href); if(typeof m.injection!=="string" || !m.injection.includes("__CODEX_RTL_REVISION__")) process.exit(1);',
      join(toolkit,'desktop/macos.mjs')]);
    console.log(`Verified ${name} on ${process.arch}: checksum, extracted signature, version, source, icon and runtime.`);
  } finally {
    rmSync(folder,{recursive:true,force:true});
  }
}
