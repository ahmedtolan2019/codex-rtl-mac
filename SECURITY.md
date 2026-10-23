# Security and privacy

This is a community workaround that uses a powerful debugging interface. It is not an OpenAI-supported extension, a sandbox, or a guarantee that the app is safe to expose to other local software.

## What it reads and changes

The renderer reads text already present in the app's DOM to choose direction. It sets presentation attributes, inserts local styles and wraps Latin phrases in `bdi` elements. It does not intentionally change logical message text or write conversation records. Composer changes are limited to presentation attributes.

The launcher reads its bundled scripts, the app's `Info.plist`, local process/listener information and its own optional `config.json`. It stores a PID lock, a local status JSON and a launcher log under `~/Library`. Status contains renderer IDs and counts, not message bodies. Error logs can contain local paths. Review diagnostics before sharing them.

It does not read credentials or request an API key, scan conversation databases, upload message text, include analytics, or contact an update server. Runtime HTTP and WebSocket traffic from the launcher is limited to the local debug endpoint. These claims cover this utility's source, not Codex's own services or its normal network traffic.

The official executable, signatures, `app.asar` and update files are not modified. Only the separate launcher app is signed during packaging. The build downloads official Node.js archives and npm dependencies; normal launcher use performs no such downloads.

## Debugging-port threat model

The official app starts with `--remote-debugging-address=127.0.0.1` and port `9223`. The launcher checks the app PID's listening addresses with `lsof` before connecting and during its watch loop. It rejects wildcard or network-interface listeners, non-local WebSocket targets, non-`app:` pages and occupied ports.

A loopback debugging port is still a privileged interface without application-level authentication. Another local process that can reach it can potentially inspect conversations or execute code in the renderer. Localhost is not a defense against malware, another untrusted account on the same host, or a port forwarded by a tunnel or container. Do not publish, proxy, tunnel or forward this port. Avoid the workaround on shared or managed devices unless that risk is acceptable and permitted.

PID and address checks reduce accidental attachment. They cannot eliminate process races, prove that a same-user process is trustworthy, or protect a compromised machine. If a listener is unexpectedly exposed beyond loopback, the launcher stops injecting and tells you to quit the official app. It does not silently reconfigure a firewall or force-kill a running app.

**To close the debug port, quit the official app completely.** Stopping the watcher alone does not close it. Reopen the official app normally to continue without RTL injection.

## Distribution

Releases are ad-hoc signed, not signed with an Apple Developer ID and not notarized. macOS may block first launch. A checksum confirms a download matches the published file; an ad-hoc signature does not identify the publisher. Review the source and [Apple's guidance](https://support.apple.com/en-us/102445). We do not recommend globally disabling Gatekeeper, SIP or other macOS protections.

Standard bundles Node.js. Lite locates a user-installed Node.js 22+ runtime and does not bundle or update it. Its optional `node-path.txt` contains an executable path, never shell code; shell profiles are not sourced. The user must trust and maintain that runtime.

The bundled Node.js version and SHA-256 digests are pinned in `scripts/node-runtime.json`. The build verifies archives before extracting them. `package-lock.json` pins npm dependencies. Install scripts are disabled in documented development and CI commands. Standard includes Node.js and ws license notices. Lite includes the ws notice.

## Verification and limits

Launcher startup/quit and CDP transport tests use mocks. Browser regression tests exercise synthetic content and do not connect to a signed-in app. The core renderer has also received manual user confirmation on the app version listed in [compatibility](docs/compatibility.md). None of this is an independent security audit or proof of compatibility with future releases.

## Report a vulnerability

Use [GitHub private vulnerability reporting](https://github.com/ahmedtolan2019/codex-rtl-mac/security/advisories/new). Include a minimal reproduction, affected version and risk. Do not include tokens, private conversations, full browsing history or unredacted diagnostics. For ordinary layout bugs, use a public issue with fictional sample text.
