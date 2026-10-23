# Troubleshooting

## Double-clicking seems to do nothing

The launcher has no main window. It should open or focus Codex. Check `~/Library/Logs/Codex RTL/launcher.log` and `~/Library/Application Support/Codex RTL/status.json`. A first-run macOS block may appear in System Settings > Privacy & Security. See [installation](installation.md).

If Codex has a save dialog or active work, resolve that yourself. The launcher waits for a normal quit, then stops if it cannot finish. It never force-quits. Do not start multiple launcher versions at the same time.

## No compatible app was found

The launcher accepts the official desktop bundle ID `com.openai.codex`, under either the ChatGPT or Codex app name. It cannot turn the older native ChatGPT app into a compatible Electron renderer. For a nonstandard location or multiple installs, set [appPath](customization.md#choose-an-app-installation).

## Port 9223 is already in use

The launcher refuses to attach to an unrelated listener. If you previously started a different RTL tool, quit its app session and stop its watcher before trying this launcher. Do not indiscriminately kill processes or open firewall ports.

## Automation permission was denied

Quit the official app yourself and try the launcher again. Alternatively, inspect the launcher's permission in System Settings > Privacy & Security > Automation. The permission is for requesting a normal application quit. Full Disk Access and Accessibility are not required.

## The app opens but RTL does not appear

Use the [demo prompt](demo-prompt.md) and inspect the status file:

| Field or state | Meaning |
| --- | --- |
| `starting` | App launch or restart is in progress |
| `injected: true` | A renderer confirmed that the script and style were loaded |
| `active: true` | At least one window contains text marked RTL |
| `waiting-for-content` | Script loaded, but no matching RTL text was detected |
| `error` | The launcher stopped; read the error and local log |
| `closed` | The official app process exited |

`active: true` is a detection signal, not a visual correctness guarantee. A future app update can change its DOM or disable debugging. Report the app version and fictional sample text if the fixture works but the real app does not.

## A table is still confusing

Use at least one Arabic header so the direction heuristic has a clear sample. Explicit Markdown column alignment is respected. Keep technical expressions such as commands in inline code when appropriate. There is no full natural-language parser, and unusual nested markup can still need a fix.

Please provide a minimal fictional table and a cropped screenshot. Exclude account names, sidebar threads and other conversations.

## The launcher worked before an update

Quit the official app completely, then open the current RTL launcher again. Check Releases for a compatible version. The launcher preserves official update files, but it cannot promise that future DOM structures or launch flags remain compatible.

## Static readiness check

Developers can run `npm run doctor` from the source checkout. For a prebuilt app:

```sh
"/Applications/Codex RTL for Mac.app/Contents/Resources/node/bin/node" \
  "/Applications/Codex RTL for Mac.app/Contents/Resources/toolkit/desktop/macos.mjs" --check
```

Adjust the location if installed in `~/Applications`. This checks assets and app discovery. It does not open Codex, connect to a debugging session or prove that RTL is active.
