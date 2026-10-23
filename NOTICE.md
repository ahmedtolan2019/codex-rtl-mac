# Attribution and provenance

## Direct source ancestry

The renderer in `src/injected.js` and `src/rtl-style.css` was adapted from [pawnsmaster/codex-rtl-toolkit](https://github.com/pawnsmaster/codex-rtl-toolkit), starting at commit `bbe3c1d600620f84175bce71607c803240537028`, version 0.1.6.

The upstream project provided the initial message scanning, Arabic-script direction handling and local renderer-injection idea. This repository retains the upstream MIT notice verbatim in [licenses/codex-rtl-toolkit-MIT.txt](licenses/codex-rtl-toolkit-MIT.txt). The Mac-specific launcher and packaging, composer companion, semantic selector correction, table layout and alignment handling, nested-label direction inheritance, markup-aware reprocessing and regression fixtures were developed for this adaptation.

This repository is a standalone macOS adaptation. It is not maintained by the upstream author. Issues specific to this release belong here.

## Other approaches investigated

- [mmnaderi/chatgpt-rtl](https://github.com/mmnaderi/chatgpt-rtl), previously linked as `codex-rtl`, provided a useful comparison for smart RTL modes and reversible app patching.
- [aviz85/codex-desktop-rtl-patch](https://github.com/aviz85/codex-desktop-rtl-patch) was reviewed as another macOS patching approach.

Their app-patching code is not included in this repository. Mentioning these projects is attribution and context, not an endorsement by their maintainers.

## Bundled dependencies

- [ws](https://github.com/websockets/ws), MIT licensed. Its license is included with the runtime dependency in release bundles.
- [Node.js](https://nodejs.org/), distributed under its own license and third-party notices. The Standard edition includes the full upstream `LICENSE` at `Contents/Resources/node/LICENSE`. The runtime version, source URL and archive digests are pinned in `scripts/node-runtime.json`. The Lite edition uses the user's existing Node installation and does not redistribute Node.
- Playwright is a development-only dependency and is not included in the launcher app.

No official Codex or ChatGPT binary, app icon, extracted renderer asset, credential or session file is distributed. The cover and launcher icon were generated specifically for this project. See [artwork provenance](docs/artwork/README.md).

OpenAI, Codex, ChatGPT, Apple and macOS are names or trademarks of their respective owners. This community utility has no affiliation with or endorsement from those owners.
