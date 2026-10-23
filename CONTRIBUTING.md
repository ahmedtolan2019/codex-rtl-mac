# Contributing

Start with a small fictional reproduction. A change that passes on plain links can still fail on native nested labels, so retain the existing nested-span cases.

## Development

Use Node.js 22 or newer. Clone the repository, then:

```sh
npm ci --ignore-scripts
npm run check
npm test
npx playwright install chromium
npm run test:browser
```

The browser suite opens only a local synthetic fixture. Launcher tests use mocked process and CDP operations. Neither test command attaches to a real Codex session.

`npm run doctor` checks local app discovery and assets on macOS without launching the official app. `npm start` actually runs the launcher, so save drafts before using it for manual testing.

## Build the Mac app

Build on macOS with Xcode Command Line Tools installed, including `lipo` and `codesign`:

```sh
npm ci --ignore-scripts
npm run build:mac
```

The build downloads the pinned official Node.js archives for arm64 and x64 over HTTPS, verifies their committed SHA-256 digests, combines the executables with `lipo`, copies the local renderer and ws dependency, and builds the icon. It signs only the separate launcher and its bundled runtime with an ad-hoc signature.

Outputs are under `dist/`: Standard and Lite apps, their ZIPs and `SHA256SUMS.txt`. Standard includes the universal runtime; Lite includes only runtime discovery and the shared toolkit. Both use the same generated icon. The build does not install, open, patch or re-sign the official app. `dist/` and the download cache are excluded from Git. The source build is repeatable from pinned inputs, but ZIP timestamps and local signing mean byte-for-byte reproducibility is not promised.

Before distributing, verify the archive after extraction, run the bundled Node binary with `--version`, run the launcher with `--check`, and manually test opening a closed app, reopening a normal session and reusing an RTL session on a non-sensitive test conversation. Record what was actually tested.

## Changes worth testing

- Arabic paragraphs with English names, punctuation, numbers, paths and URLs.
- Native link labels nested inside spans.
- Arabic tables containing English-only cells and explicit column alignment.
- A renderer replacing a label with identical text.
- Streaming text that changes language or appends a unit.
- English paragraphs, code and editable composer content.
- Narrow windows and overflowing tables.

Do not broaden selectors to every `div` or infer code from the substring `code`. Keep logical text and link destinations intact. Avoid rewriting editable text nodes.

## Releases

Update the version in `package.json` and the lockfile, run checks, build on macOS and review the source diff. Publish the ZIP and checksum with release notes that state compatibility and signing limits. Runtime updates also require updating the official source and both hashes in `scripts/node-runtime.json` after verification.

If Developer ID signing is added later, document the certificate identity and notarization process. Do not claim notarization for ad-hoc builds.

## Screenshots and issues

Use [docs/demo-prompt.md](docs/demo-prompt.md). Do not include personal sessions, account names, credentials, desktop notifications or sidebar history. Mark synthetic fixtures and real app screenshots distinctly. Security reports belong in [private vulnerability reporting](https://github.com/ahmedtolan2019/codex-rtl-mac/security/advisories/new).
