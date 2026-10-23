# Compatibility and verification

## Intended platform

- macOS 13.5 or newer, plus whatever your official app requires.
- Official desktop bundle identifier `com.openai.codex`, installed as ChatGPT.app or Codex.app.
- An app build that accepts a loopback Chromium debugging port and exposes compatible `app:` renderer pages.
- Arabic mixed with English is the primary tested language case.

The Node.js runtime's minimum macOS requirement is documented in [Node.js v24.22.1 BUILDING.md](https://github.com/nodejs/node/blob/v24.22.1/BUILDING.md). A universal executable is a packaging capability, not proof that every Intel and Apple silicon app build works.

## Evidence for this release

The core renderer was manually confirmed by a user on the macOS desktop app version **26.1016.61520**, build **21421**, after fixing nested Arabic-English links and table alignment. That user confirmation predates the standalone public packaging.

The public package adds app discovery and a bundled universal runtime. Automated tests cover app discovery, normal quit/reopen decisions, blocked quits, occupied ports, loopback restrictions and mock protocol transport. Browser tests cover fictional content, nested link labels, explicit column alignment, spacing, preservation of logical text, streaming and replacement with identical text.

The tagged-release workflow builds on Apple silicon and verifies the extracted packages, signatures and runtime execution on both Apple silicon and Intel runners. Full launch and visual verification of the newly packaged app across other Macs still needs community testing. A browser fixture is not evidence that a signed-in desktop session was inspected. The publisher does not claim a full device matrix or an independent security audit.

The release additionally prevents short number-and-memory-unit pairs such as `12 GB` from wrapping across lines. That adjustment is covered by the synthetic narrow-window browser regression, rather than a new signed-in desktop capture.

## Known limits

- The app must continue to accept the debugging flags. No fallback patches the official bundle.
- Generated class names and Markdown markup can change after an app update.
- The detector handles Arabic-script letters. Persian and Urdu may benefit, but do not yet have the same verification coverage. Hebrew rendering is not supported by the message detector.
- Complex number/unit ordering inside the composer remains subject to native editing behavior.
- Latin phrases split across unusual nested markup may not be grouped into one isolate.
- Very wide tables still depend on the app's native scrolling container.
- Existing Markdown alignment choices are respected, so an explicitly left-aligned column stays left-aligned.
- This does not fix window chrome, question cards, exported PDFs, slides, terminal bidi behavior or other products.
- Runtime injection lasts only for the current app session. Always use the RTL launcher when starting a new RTL session.

Report a bug with the launcher version, official app version, macOS version, architecture and a small fictional reproduction. Use the issue template rather than uploading personal conversation logs.
