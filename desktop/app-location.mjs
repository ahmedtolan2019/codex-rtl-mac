import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { homedir } from 'node:os';
import { isAbsolute, join, basename } from 'node:path';

export const BUNDLE_ID = 'com.openai.codex';
export function validateAppPath(value) {
  if (typeof value !== 'string' || !isAbsolute(value) || !value.endsWith('.app') || value.includes('\0')) {
    throw new Error('appPath must be an absolute path ending in .app.');
  }
  return value;
}
export function loadAppPath(file) {
  if (!existsSync(file)) return undefined;
  const value = JSON.parse(readFileSync(file, 'utf8'));
  if (!value || Array.isArray(value) || typeof value !== 'object' || Object.keys(value).some(k=>k!=='appPath')) {
    throw new Error('config.json supports only the appPath setting.');
  }
  return value.appPath === undefined ? undefined : validateAppPath(value.appPath);
}
export function readAppInfo(app) {
  validateAppPath(app);
  if (!existsSync(app)) return null;
  const plist=join(app,'Contents/Info.plist');
  const read=key=>execFileSync('/usr/libexec/PlistBuddy',['-c',`Print ${key}`,plist],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();
  try {
    if (read('CFBundleIdentifier') !== BUNDLE_ID) return null;
    const binary=read('CFBundleExecutable');
    if (!binary || basename(binary)!==binary || binary==='.' || binary==='..') return null;
    const executable=join(app,'Contents/MacOS',binary);
    if (!existsSync(executable)) return null;
    return {app,executable};
  } catch { return null; }
}
export function discoverApp(override, inspect=readAppInfo, home=homedir()) {
  const candidates=override ? [validateAppPath(override)] : [
    '/Applications/ChatGPT.app','/Applications/Codex.app',
    join(home,'Applications/ChatGPT.app'),join(home,'Applications/Codex.app')
  ];
  const found=candidates.map(inspect).filter(Boolean);
  if (found.length===1) return found[0];
  if (found.length>1) throw new Error('More than one compatible app was found. Set appPath in ~/Library/Application Support/Codex RTL/config.json.');
  throw new Error('No compatible Codex app was found. Install the official macOS app, or set appPath in ~/Library/Application Support/Codex RTL/config.json. The required bundle ID is com.openai.codex.');
}
export function assertLoopbackListeners(lines, port=9223) {
  if (lines.some(line=>![`127.0.0.1:${port}`,`[::1]:${port}`].includes(line))) {
    throw new Error('The debugging listener is not restricted to localhost. Quit the official app to close it.');
  }
  return lines.length>0;
}
