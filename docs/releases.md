# Tagged releases

Stable tags follow `vMAJOR.MINOR.PATCH`, for example `v0.3.0`. Pushing a version tag starts [Release](../.github/workflows/release.yml). It validates the version, runs the shared test workflow, builds both apps on macOS and verifies the same downloaded archives on Apple silicon and Intel before publishing a GitHub Release.

The tag must match `package.json`, both lockfile version fields and a file named `docs/releases/vMAJOR.MINOR.PATCH.md`. The tagged commit must be on `main`. An invalid tag fails before building or publishing. Prerelease suffixes are not supported by this workflow yet.

## Publish the next version

Start from an up-to-date, clean `main` checkout. Choose the next version based on the change. For example, to prepare `0.3.2`:

```sh
git switch main
git pull --ff-only
npm version 0.3.2 --no-git-tag-version --ignore-scripts
```

Write `docs/releases/v0.3.2.md` with the behavior changes, downloads and actual verification scope. Update version-specific installation examples where needed. Then:

```sh
npm ci --ignore-scripts
npm run check
npm test
npx playwright install chromium
npm run test:browser
node scripts/release-metadata.mjs v0.3.2
git add package.json package-lock.json docs
git commit -m 'Prepare v0.3.2'
git push origin main
```

Wait for that commit's Test workflow to pass. Create an annotated tag on the prepared commit and push it explicitly:

```sh
git tag -a v0.3.2 -m 'Codex RTL for Mac v0.3.2'
git push origin v0.3.2
gh run list --workflow release.yml
```

The workflow uploads the Standard ZIP, Lite ZIP and SHA-256 checksum file to a draft, then publishes only after the build and both architecture checks pass. No signing secret or personal access token is required. Only the final publishing job has repository write permission.

## Failed or repeated runs

If a runner or network request fails, rerun the failed jobs in GitHub Actions. You can also dispatch the workflow against the existing tag:

```sh
gh workflow run release.yml --ref v0.3.2
```

A draft belonging to the same source commit can be completed. An already published release is left unchanged. A release pointing at a different source commit is rejected. Never move a published tag or replace its assets. Fix source mistakes in a new patch version and tag.

For local package checks on macOS:

```sh
npm run build:mac
npm run verify:release
```

Verification extracts temporary copies, checks signatures and checksums, compares bundled files against source, and runs the runtime without opening Codex. It does not test a signed-in app session. The build uses the existing icon at `assets/icon-v2.png`.

See GitHub's [tag-trigger documentation](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#push) and the [official runner image list](https://github.com/actions/runner-images#available-images).
