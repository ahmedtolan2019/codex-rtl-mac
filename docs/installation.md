# Installation

## Choose the right download

Open [Releases](https://github.com/ahmedtolan2019/codex-rtl-mac/releases/latest) and choose one edition:

| Download | App inside | Best for |
| --- | --- | --- |
| `Codex-RTL-for-Mac-v0.3.0.zip` | Codex RTL for Mac.app | Standard. Includes Node.js; no setup needed |
| `Codex-RTL-for-Mac-Lite-v0.3.0.zip` | Codex RTL for Mac Lite.app | Smaller download for an existing Node.js 22+ installation |

GitHub's automatically generated "Source code" ZIP contains source, not a ready-to-open app. Both editions contain the same renderer, launcher logic and icon. Use one edition at a time.

Standard includes a universal Node.js executable for Apple silicon and Intel. Lite uses your installed runtime. No administrator access is needed when installing in your personal Applications folder. Both require macOS 13.5 or newer, plus the requirements of the official app.

## Lite and existing Node.js

Choose Lite if Node.js 22 or newer is already installed. Finder launches apps with a different environment from Terminal, so Lite checks PATH and common Homebrew, Volta, fnm and nvm-current locations. It does not run shell profiles or install anything automatically.

If Lite cannot find Node, create `~/Library/Application Support/Codex RTL/node-path.txt` containing one absolute executable path. For example:

```text
/opt/homebrew/bin/node
```

Use your actual path. `command -v node` in Terminal can help locate it, but avoid temporary version-manager shell paths that disappear after closing Terminal. A stable Homebrew executable or version-manager alias is preferable. An invalid explicit path produces an error instead of silently choosing another runtime. Remove this file to restore detection.

If you do not want to manage Node, use Standard. You are responsible for updating the Node installation used by Lite. Standard's runtime is updated by replacing the launcher release.

## Verify the download

Each release includes `SHA256SUMS.txt`. For an optional checksum check, place the ZIP and checksum file in the same folder and run:

```sh
shasum -a 256 Codex-RTL-for-Mac-v0.3.0.zip
```

Compare the displayed hash with the matching filename in `SHA256SUMS.txt`. Use the Lite filename if that is your download. A matching checksum verifies that your file matches the release asset. It does not establish the identity or trustworthiness of the publisher if the release account itself were compromised.

Both editions are ad-hoc signed to detect accidental bundle changes. Neither has a Developer ID identity or Apple notarization. You can build from source instead using [CONTRIBUTING.md](../CONTRIBUTING.md).

## First launch and macOS security

1. Extract the ZIP in Finder.
2. Move your chosen **Codex RTL for Mac.app** or **Codex RTL for Mac Lite.app** to `/Applications` or your personal `~/Applications` folder. Avoid running it inside the ZIP or leaving it in a temporary extraction folder.
3. Save unfinished input and let active Codex tasks finish.
4. Double-click the launcher.

macOS may say that the developer cannot be verified or Apple cannot check the app. Read [Apple's guidance on opening downloaded apps](https://support.apple.com/en-us/102445). If you have reviewed and trust this release, Apple's per-app **Open Anyway** option in System Settings > Privacy & Security may be available after the blocked launch. You make that trust decision. This project does not disable Gatekeeper or remove quarantine automatically. A malware, revoked-signature or damaged-app alert should be investigated, not dismissed as a routine installation step.

If the official app is already open in a normal session, macOS may request Automation permission to let the launcher request a normal quit. It does not need Accessibility, Screen Recording or Full Disk Access. You can avoid that quit request by quitting the official app yourself before launching RTL.

No additional launcher window stays open. Codex opens or comes to the front, and the background watcher applies the renderer fix. Startup may take a few seconds.

## Daily use

Open **Codex RTL for Mac** whenever you want RTL support. An existing compatible debugging session can be reused without restarting. A normal session must reopen with the local debugging flag. If the app refuses to quit because of a dialog, the launcher stops with an explanation and does not force the quit.

The watcher monitors new renderer windows and reapplies its script after renderer reloads. A detection count is not proof that every visible line is correct. Check a mixed-language response, ideally with the [demo prompt](demo-prompt.md).

## Official app location

The launcher checks these locations for bundle identifier `com.openai.codex`:

```text
/Applications/ChatGPT.app
/Applications/Codex.app
~/Applications/ChatGPT.app
~/Applications/Codex.app
```

It reads the executable name from `Info.plist`. It does not target the older native ChatGPT app with a different bundle identifier. If multiple compatible copies exist, or your app is elsewhere, set [appPath](customization.md#choose-an-app-installation).

## Update

1. Quit the official app completely. This closes the debug port and allows the old watcher to exit.
2. Replace the old launcher with the new app from Releases.
3. Open the new launcher.

The launcher does not check for or install updates automatically. The same quit-first procedure applies if you previously used the locally built app named `Codex RTL.app`.

## Disable RTL

Quit the official app completely, then open the official app directly. This removes session-only injection and the debug flag. Deleting the launcher or closing a chat window does not close a debugging port in an already-running process.

## Uninstall

Quit the official app, then move the chosen launcher app to Trash. You can also remove these utility-owned folders using Finder if you no longer want local settings or diagnostics:

```text
~/Library/Application Support/Codex RTL
~/Library/Logs/Codex RTL
```

Do not delete the official app's support folders. No restore patch is needed because this tool never edits the official bundle.
