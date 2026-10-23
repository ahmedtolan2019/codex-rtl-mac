import {readFileSync,writeFileSync,mkdirSync,cpSync,chmodSync,existsSync,rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
if(process.platform!=='darwin')throw new Error('Build on macOS with Xcode Command Line Tools.');
const run=(program,args)=>execFileSync(program,args,{cwd:root,stdio:'inherit'});
const pkg=JSON.parse(readFileSync(join(root,'package.json')));
const runtime=JSON.parse(readFileSync(join(root,'scripts/node-runtime.json')));
const cache=join(root,'.cache');mkdirSync(cache,{recursive:true});
const runtimeDirs=[];
for(const arch of ['arm64','x64']) {
 const name=`node-v${runtime.version}-darwin-${arch}`;
 const archive=join(cache,`${name}.tar.gz`);
 if(!existsSync(archive))run('/usr/bin/curl',['--fail','--location','--proto','=https','--tlsv1.2','--silent','--show-error',`https://nodejs.org/dist/v${runtime.version}/${name}.tar.gz`,'--output',archive]);
 const digest=createHash('sha256').update(readFileSync(archive)).digest('hex');
 if(digest!==runtime.sha256[arch])throw new Error(`Checksum mismatch for ${name}. Delete the cached archive and investigate.`);
 const dir=join(cache,name);
 if(existsSync(dir))rmSync(dir,{recursive:true});
 run('/usr/bin/tar',['-xzf',archive,'-C',cache]);runtimeDirs.push(dir);
}
const checksums=[];
for(const lite of [false,true]) {
const appName=lite ? 'Codex RTL for Mac Lite' : 'Codex RTL for Mac';
const app=join(root,`dist/${appName}.app`);
// Only replace this build output. Never touch the official application.
if(existsSync(app))rmSync(app,{recursive:true});
const contents=join(app,'Contents'),resources=join(contents,'Resources'),toolkit=join(resources,'toolkit');
for(const dir of ['MacOS','Resources/toolkit',...(!lite?['Resources/node/bin']:[])])mkdirSync(join(contents,dir),{recursive:true});
for(const dir of ['src','desktop','licenses'])cpSync(join(root,dir),join(toolkit,dir),{recursive:true});
cpSync(join(root,'node_modules/ws'),join(toolkit,'node_modules/ws'),{recursive:true});
for(const file of ['LICENSE','SECURITY.md','NOTICE.md'])cpSync(join(root,file),join(toolkit,file));
const binary=join(resources,'node/bin/node');
if(!lite) {
cpSync(join(runtimeDirs[0],'LICENSE'),join(resources,'node/LICENSE'));
run('/usr/bin/lipo',['-create',...runtimeDirs.map(p=>join(p,'bin/node')),'-output',binary]);chmodSync(binary,0o755);
run('/usr/bin/codesign',['--force','--sign','-',binary]);
}
const iconset=join(cache,'AppIcon.iconset');mkdirSync(iconset,{recursive:true});
for(const size of [16,32,128,256,512])for(const scale of [1,2]) {
 const name=`icon_${size}x${size}${scale===2?'@2x':''}.png`;
 execFileSync('/usr/bin/sips',['-z',String(size*scale),String(size*scale),join(root,'assets/icon-v2.png'),'--out',join(iconset,name)],{stdio:'ignore'});
}
run('/usr/bin/iconutil',['--convert','icns',iconset,'--output',join(resources,'AppIcon.icns')]);
writeFileSync(join(contents,'Info.plist'),`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>CFBundleName</key><string>${appName}</string>
<key>CFBundleDisplayName</key><string>${appName}</string>
<key>CFBundleIdentifier</key><string>io.github.ahmedtolan2019.codex-rtl-mac${lite?'.lite':''}</string>
<key>CFBundleExecutable</key><string>launch</string>
<key>CFBundlePackageType</key><string>APPL</string>
<key>CFBundleIconFile</key><string>AppIcon</string>
<key>CFBundleShortVersionString</key><string>${pkg.version}</string>
<key>CFBundleVersion</key><string>${pkg.version}</string>
<key>LSMinimumSystemVersion</key><string>13.5</string>
<key>LSUIElement</key><true/>
<key>NSAppleEventsUsageDescription</key><string>Request a normal quit of Codex so it can reopen with local RTL rendering enabled.</string>
</dict></plist>`);
const launcher=join(contents,'MacOS/launch');
const chooseNode=lite ? `source "$resources/toolkit/desktop/find-node.sh"
if ! node_binary="$(codex_find_node "$HOME/Library/Application Support/Codex RTL/node-path.txt")"; then
  /usr/bin/osascript -e 'display alert "Node.js 22 or newer was not found" message "Install the Standard edition of Codex RTL for Mac to use its bundled runtime, or set an absolute Node path in ~/Library/Application Support/Codex RTL/node-path.txt." as critical'
  exit 1
fi` : 'node_binary="$resources/node/bin/node"';
writeFileSync(launcher,`#!/bin/bash
set -eu
resources="$(cd -- "$(dirname -- "$0")/../Resources" && pwd)"
${chooseNode}
log_dir="$HOME/Library/Logs/Codex RTL"
mkdir -p "$log_dir"
umask 077
/usr/bin/nohup "$node_binary" "$resources/toolkit/desktop/macos.mjs" >> "$log_dir/launcher.log" 2>&1 < /dev/null &
exit 0
`);chmodSync(launcher,0o755);
run('/bin/bash',['-n',launcher]);
run('/usr/bin/codesign',['--force','--sign','-',app]);
run('/usr/bin/codesign',['--verify','--deep','--strict',app]);
if(!lite){run('/usr/bin/lipo',['-archs',binary]);run(binary,['--version']);}
const archive=join(root,`dist/Codex-RTL-for-Mac${lite?'-Lite':''}-v${pkg.version}.zip`);
if(existsSync(archive))rmSync(archive);
run('/usr/bin/ditto',['-c','-k','--keepParent','--norsrc',app,archive]);
const digest=createHash('sha256').update(readFileSync(archive)).digest('hex');
checksums.push(`${digest}  Codex-RTL-for-Mac${lite?'-Lite':''}-v${pkg.version}.zip`);
console.log(`Built ${archive}. Ad-hoc signed, not Apple-notarized. No official app files were changed.`);

}
writeFileSync(join(root,'dist/SHA256SUMS.txt'),checksums.join('\n')+'\n');
