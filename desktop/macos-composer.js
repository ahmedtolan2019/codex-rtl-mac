// Mac-specific companion to the upstream message renderer.
// The installed app uses ProseMirror with role=textbox and dir=auto.
// Set presentation attributes only; leave editor text and selection untouched.
(() => {
  const selector = '.ProseMirror[contenteditable="true"][role="textbox"]';
  const excluded = '.cm-editor,.monaco-editor,.xterm,pre,code';
  const styleId = 'codex-rtl-mac-composer-style';
  let style = document.getElementById(styleId);
  if (!style) {
    style = document.createElement('style');
    style.id = styleId;
    document.documentElement.appendChild(style);
  }
  style.textContent = `
    [data-codex-rtl-root="true"] .ProseMirror [data-codex-composer-direction="rtl"],
    [data-codex-rtl-root="true"] .ProseMirror[data-codex-composer-direction="rtl"] {
      direction: rtl !important; text-align: right !important; unicode-bidi: plaintext !important;
    }
    [data-codex-rtl-root="true"] .ProseMirror [data-codex-composer-direction="ltr"],
    [data-codex-rtl-root="true"] .ProseMirror[data-codex-composer-direction="ltr"] {
      direction: ltr !important; text-align: left !important; unicode-bidi: plaintext !important;
    }
  `;
  function direction(el) {
    const firstLetter = (el.textContent || '').match(/\p{L}/u)?.[0] || '';
    const rtl = /[\u0590-\u08ff\ufb1d-\ufdff\ufe70-\ufeff]/.test(firstLetter);
    el.dataset.codexComposerDirection = rtl ? 'rtl' : 'ltr';
  }
  function update(editor) {
    if (!editor || editor.closest(excluded)) return;
    direction(editor);
    editor.querySelectorAll('p,li').forEach(el => {
      if (!el.closest(excluded)) direction(el);
    });
  }
  function scan(node) {
    const el = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    if (!el) return;
    const editor = el.closest(selector);
    if (editor) update(editor);
    else el.querySelectorAll(selector).forEach(update);
  }
  window.__CODEX_RTL_COMPOSER_OBSERVER__?.disconnect();
  const pending = new Set();
  let frame = null;
  window.__CODEX_RTL_COMPOSER_OBSERVER__ = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      if (mutation.type === 'characterData') pending.add(mutation.target);
      for (const node of mutation.addedNodes) pending.add(node);
    }
    if (frame !== null) return;
    frame = requestAnimationFrame(() => {
      pending.forEach(scan);
      pending.clear();
      frame = null;
    });
  });
  scan(document.body);
  window.__CODEX_RTL_COMPOSER_OBSERVER__.observe(document.body, {
    subtree:true, childList:true, characterData:true
  });
})();
