import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateRelease} from './release-metadata.mjs';

const pkg = {version:'0.3.0'};
const lock = {version:'0.3.0', packages:{'':{version:'0.3.0'}}};
test('release tags must identify the exact package and lockfile version', () => {
  assert.equal(validateRelease('v0.3.0', pkg, lock), '0.3.0');
  for (const tag of ['main','v0.3','v00.3.0','v0.3.0-beta.1','v0.3.0/other','v0.3.1']) {
    assert.throws(() => validateRelease(tag, pkg, lock));
  }
  assert.throws(() => validateRelease('v0.3.0', pkg, {...lock,version:'0.2.0'}));
  assert.throws(() => validateRelease('v0.3.0', pkg, {...lock,packages:{'':{version:'0.2.0'}}}));
});
