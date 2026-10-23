import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

export function validateRelease(tag, pkg, lock) {
  assert.match(tag, /^v(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/, 'Use a stable version tag such as v0.3.0.');
  const version = tag.slice(1);
  assert.equal(pkg.version, version, 'Tag must match package.json.');
  assert.equal(lock.version, version, 'Tag must match package-lock.json.');
  assert.equal(lock.packages?.['']?.version, version, 'Lockfile root package must match the tag.');
  return version;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const tag = process.argv[2] || '';
  const read = file => JSON.parse(readFileSync(resolve(root, file), 'utf8'));
  const version = validateRelease(tag, read('package.json'), read('package-lock.json'));
  assert.ok(existsSync(resolve(root, `docs/releases/${tag}.md`)), 'Add release notes for this tag.');
  console.log(`Validated ${tag}: package and lockfile versions are ${version}; release notes exist.`);
}
