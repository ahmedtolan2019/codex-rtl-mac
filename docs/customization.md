# Customization

Settings and source changes belong to this separate launcher. Do not edit the official app's files. There is no settings window in this release.

## Choose an app installation

The one runtime setting is `appPath`. Create `~/Library/Application Support/Codex RTL/config.json` with an absolute path:

```json
{
  "appPath": "/Applications/Codex.app"
}
```

Use the actual `.app` path on your Mac. `~` is not expanded inside JSON. The app must have bundle identifier `com.openai.codex`. Unknown settings and invalid JSON produce an error. Quit the official app and reopen the launcher after changing this setting. Delete `config.json` to restore automatic discovery.

The port stays fixed at `9223`; there is no remote-host option. For a port conflict, close the unrelated listener or change the port in source and update its tests before rebuilding. Never change the binding away from loopback.

## Change table spacing

Edit `src/rtl-style.css`. Find the marked table-cell rule:

```css
[data-codex-rtl-root="true"] table[data-codex-table-direction] :is(th,td) {
  padding-inline: 16px !important;
}
```

Keep padding on both sides. For example, `20px` gives adjacent cells a combined 40 px minimum gutter. Direction and alignment are separate: an English name can read LTR while aligning to the right edge of an Arabic table column. Preserve explicit Markdown column alignment.

## Use a local font

Append a scoped rule to `src/rtl-style.css`, using fonts installed on your Mac:

```css
[data-codex-rtl-root="true"] [data-codex-direction="rtl"] {
  font-family: "Geeza Pro", system-ui, sans-serif;
  line-height: 1.8;
}
```

This changes marked rendered prose. It does not intentionally change code or the entire application UI. Do not add a global `*` rule or remote font imports. Include a font's license if you later bundle it for redistribution.

## Tune language selection

`classifyText()` in `src/injected.js` uses the first letter and Arabic-to-Latin letter counts. Addresses and paths do not outweigh the prose. Table headers choose column direction; Arabic-containing cells in an Arabic table receive RTL direction.

The message detector uses Unicode Arabic-script letters. Supporting Hebrew or another script requires a deliberate detector change and new mixed-direction fixtures, not just changing a label in the README. Keep English paragraphs and programming code in the regression suite.

## Keep inline phrases intact

`isolateLatinRuns()` wraps Latin phrases in `bdi dir="ltr"` without inserting hidden control characters into message text. Its cache includes markup because a renderer can replace a label without changing its text.

Inline spans inherit their paragraph or cell's base direction. Do not classify a native link's nested label as a new paragraph. Do not match code with a broad selector such as `[class*="code"]`: ordinary Codex class names also contain that string.

## Composer behavior

`desktop/macos-composer.js` chooses direction per paragraph and changes presentation attributes only. It deliberately avoids wrapping editable text, which can disrupt selection and cursor behavior. Complex mixed-number ordering while typing remains a limitation of the native editor.

## Test and rebuild

Follow [CONTRIBUTING.md](../CONTRIBUTING.md), then run:

```sh
npm ci --ignore-scripts
npm run check
npm test
npm run test:browser
npm run build:mac
```

Quit the official app and replace your launcher with the rebuilt app. Editing files inside an already signed launcher invalidates its signature; rebuilding is the supported customization path.
