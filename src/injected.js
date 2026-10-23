(function codexRtlToolkit() {
  const STYLE_ID = "codex-rtl-toolkit-style";
  const ARABIC_SCRIPT_RE = /(?=\p{Script=Arabic})\p{L}/u;
  const LATIN_RE = /[A-Za-z]/;
  window.__CODEX_RTL_OBSERVER__?.disconnect();
  const processed = new WeakMap();
  const isolated = new WeakMap();
  const pending = new Set();
  let scheduled = false;
  // Use actual renderer semantics, never class substrings like "code":
  // ordinary classes such as text-codex-description also contain that string.
  const CONTENT_SELECTOR = "[data-markdown-text-style], [class*='_MarkdownRoot_'], [data-message-author-role], .markdown, .message-markdown, .message-text";
  const BLOCK_SELECTOR = `:is(${CONTENT_SELECTOR}) :is(p,li,blockquote,h1,h2,h3,h4,h5,h6,[data-markdown-list-item-content])`;
  const TEXT_LEAF_SELECTOR = `${CONTENT_SELECTOR}, :is(${CONTENT_SELECTOR}) :is(div,span)`;
  const INTERACTIVE_SELECTOR = "textarea,input,[contenteditable='true'],[contenteditable='plaintext-only'],[role='textbox'],button,[role='button'],[data-markdown-copy='exclude']";
  const CODE_BLOCK_SELECTOR = "pre,code,kbd,samp,[data-markdown-copy='code-block'],[data-markdown-copy='inline-code'],[data-code-block-source],.cm-editor,.monaco-editor,.xterm,.hljs,.shiki";
  const MARKDOWN_EDITOR_SELECTOR = ".cm-content[data-language='markdown']";

  function ensureStyle() {
    let style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement("style");
      style.id = STYLE_ID;
      document.documentElement.appendChild(style);
    }
    style.textContent = window.__CODEX_RTL_STYLE__ || "";
    document.documentElement.dataset.codexRtlRoot = "true";
  }

  function isCodeLike(node) {
    if (!node || node.nodeType !== Node.ELEMENT_NODE) return false;
    return Boolean(node.closest(`${CODE_BLOCK_SELECTOR}, textarea, input, [role='textbox']`));
  }

  function isInteractive(node) {
    if (!node || node.nodeType !== Node.ELEMENT_NODE) return false;
    return Boolean(node.closest(INTERACTIVE_SELECTOR));
  }

  function isMarkdownEditor(node) {
    if (!node || node.nodeType !== Node.ELEMENT_NODE) return false;
    return Boolean(
      node.matches?.(MARKDOWN_EDITOR_SELECTOR)
      || node.closest?.(MARKDOWN_EDITOR_SELECTOR)
      || node.querySelector?.(MARKDOWN_EDITOR_SELECTOR)
    );
  }

  function classifyText(text) {
    const hasArabic = ARABIC_SCRIPT_RE.test(text);
    if (!hasArabic) return "ltr";
    const arabicCount = (text.match(new RegExp(ARABIC_SCRIPT_RE.source, "gu")) || []).length;
    // Technical addresses should not outweigh the language of the sentence.
    const prose = text.replace(/(?:https?:\/\/|www\.|(?:~?\/)[A-Za-z])\S*|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "");
    const latinCount = (prose.match(/[A-Za-z]/g) || []).length;
    const firstLetter = text.match(/\p{L}/u)?.[0] || "";
    return ARABIC_SCRIPT_RE.test(firstLetter) || arabicCount >= Math.max(2, latinCount * 0.65) ? "rtl" : "ltr";
  }

  function applyDirection(el) {
    if (!el || isCodeLike(el) || isInteractive(el)) return;
    // Do not change direction on layout containers or multi-paragraph lists.
    if (el.querySelector("p,table,pre,ul,ol,blockquote,h1,h2,h3,h4,h5,h6")) return;
    const text = (el.innerText || el.textContent || "").trim();
    if (processed.get(el) === text) return;
    processed.set(el, text);

    const direction = classifyText(text);
    el.dataset.codexDirection = direction;
    delete el.dataset.codexBidi;
    if (direction === "rtl") el.dataset.codexRtl = "true";
    else delete el.dataset.codexRtl;
    el.dir = direction;
  }

  // Table direction controls visual column order; cell direction is independent.
  // Prefer headers to avoid changing an English table merely for one Arabic value.
  function applyTableDirection(table) {
    if (!table.closest(CONTENT_SELECTOR) || isCodeLike(table) || isInteractive(table)) return;
    const headers = Array.from(table.querySelectorAll("th")).filter(el => el.closest("table") === table);
    const sample = headers.length ? headers.map(el => el.textContent).join(" ") : table.textContent;
    const direction = classifyText(sample || "");
    table.dir = direction;
    table.dataset.codexTableDirection = direction;
    const columns = Array.from(table.tHead?.rows[0]?.cells || table.rows[0]?.cells || []);
    for (const cell of table.querySelectorAll("th,td")) {
      if (cell.closest("table") !== table) continue;
      // Alignment belongs to the column; direction belongs to the cell text.
      // Preserve explicit Markdown column alignment (e.g. :---:), otherwise
      // align all cells to the table's reading edge, including English labels.
      const requestedAlignment = columns[cell.cellIndex]?.getAttribute("align");
      cell.dataset.codexCellAlign = ["left", "center", "right"].includes(requestedAlignment)
        ? requestedAlignment : direction === "rtl" ? "right" : "left";
      const text = cell.textContent || "";
      const cellDirection = direction === "rtl" && ARABIC_SCRIPT_RE.test(text) ? "rtl" : classifyText(text);
      cell.dir = cellDirection;
      cell.dataset.codexDirection = cellDirection;
      if (cellDirection === "rtl") cell.dataset.codexRtl = "true";
      else delete cell.dataset.codexRtl;
    }
  }

  function codeLanguage(code) {
    const classNames = [
      code.getAttribute("class") || "",
      code.closest("pre")?.getAttribute("class") || ""
    ].join(" ");
    const classMatch = classNames.match(/(?:language|lang)-([a-z0-9_-]+)/i);
    if (classMatch?.[1]) return classMatch[1].toLowerCase();

    const codeBlock = code.closest("[class*='codeBlock' i], [data-testid*='code' i]");
    const headerLabel = codeBlock?.firstElementChild?.firstElementChild?.textContent?.trim();
    if (/^[a-z0-9_-]{1,24}$/i.test(headerLabel || "")) return headerLabel.toLowerCase();

    const firstLine = (code.textContent || "").trimStart().split(/\r?\n/, 1)[0]?.trim();
    return /^[a-z0-9_-]{1,24}$/i.test(firstLine || "") ? firstLine.toLowerCase() : "";
  }

  function applyProseCodeDirection(code) {
    const language = codeLanguage(code);
    const pre = code.closest("pre");
    const isText = ["text", "txt", "plain", "plaintext"].includes(language);
    const isMarkdown = ["md", "markdown"].includes(language)
      || (!language && Boolean(code.querySelector(".hljs-bullet, .hljs-section, .hljs-strong, .hljs-emphasis")));

    delete code.dataset.codexTextBlock;
    delete pre?.dataset.codexTextBlock;
    if (!isText && !isMarkdown) return;

    const lineContainer = code.firstElementChild;
    if (!lineContainer?.children.length) return;

    code.dataset.codexProseCode = "true";
    code.dir = "ltr";

    for (const line of lineContainer.children) {
      const direction = ARABIC_SCRIPT_RE.test(line.textContent || "") ? "rtl" : "ltr";
      line.dir = direction;
      line.dataset.codexProseDirection = direction;
      delete line.dataset.codexMarkdownRtl;

      for (const token of line.querySelectorAll("*")) {
        if (direction === "rtl" && ARABIC_SCRIPT_RE.test(token.textContent || "")) {
          token.dir = "rtl";
          token.dataset.codexProseTokenRtl = "true";
        } else if (token.dataset.codexProseTokenRtl === "true" || token.dataset.codexMarkdownTokenRtl === "true") {
          delete token.dataset.codexProseTokenRtl;
          delete token.dataset.codexMarkdownTokenRtl;
          if (token.getAttribute("dir") === "rtl") token.removeAttribute("dir");
        }
      }
    }
  }

  function hasDirectText(el) {
    return Array.from(el.childNodes).some((node) => (
      node.nodeType === Node.TEXT_NODE && ARABIC_SCRIPT_RE.test(node.textContent || "")
    ));
  }

  function applyTextLeafDirection(el) {
    if (!el || isCodeLike(el) || isInteractive(el) || (!hasDirectText(el) && !el.dataset.codexDirection)) return;
    // A formatting span is part of its paragraph/cell, not a new sentence.
    // Native links contain Mention > Label spans. Classifying the Label alone
    // makes "Contabo، ذاكرة 12 GB" LTR and prevents its unit from being isolated.
    // Let inline descendants inherit their established text container instead.
    if (el.parentElement?.closest("[data-codex-direction]")) return;
    applyDirection(el);
  }

  function isolateLatinRuns(el) {
    if (!el?.dataset.codexRtl || isCodeLike(el) || isInteractive(el)) return;
    // React can replace a label with identical text and remove our isolates.
    // Compare the rendered markup too, then cache the completed result. This
    // also makes observer notifications from our own edits a no-op.
    if (isolated.get(el) === el.innerHTML) return;
    for (const bdi of el.querySelectorAll("bdi[data-codex-ltr-run]")) {
      bdi.replaceWith(document.createTextNode(bdi.textContent));
    }
    el.normalize();
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    let node;

    while ((node = walker.nextNode())) {
      const parent = node.parentElement;
      if (!parent || parent.closest(`${CODE_BLOCK_SELECTOR}, [data-codex-ltr-run], ${INTERACTIVE_SELECTOR}`)) continue;
      if (parent.closest("[data-codex-direction]")?.dataset.codexDirection === "ltr") continue;
      if (/[A-Za-z0-9]/.test(node.textContent || "")) textNodes.push(node);
    }

    // Keep numbers with units/product names, and preserve URL/path prefixes.
    // Do not include surrounding Arabic punctuation or whitespace in an isolate.
    const latinRun = /(?:[~/.\\+@#-]*[A-Za-z0-9](?:[A-Za-z0-9._:/\\+@#%?=&~-]|,(?=\d{3}(?:\D|$)))*)(?:[ \t]+[A-Za-z0-9](?:[A-Za-z0-9._:/\\+@#%?=&~-]|,(?=\d{3}(?:\D|$)))*)*/g;
    for (const textNode of textNodes) {
      const text = textNode.textContent || "";
      const matches = Array.from(text.matchAll(latinRun));
      if (matches.length === 0) continue;

      const fragment = document.createDocumentFragment();
      let offset = 0;
      for (const match of matches) {
        const index = match.index || 0;
        fragment.append(text.slice(offset, index));
        const trailingPunctuation = match[0].match(/[.,;:!?]+$/)?.[0] || "";
        const latinText = trailingPunctuation
          ? match[0].slice(0, -trailingPunctuation.length)
          : match[0];
        const bdi = document.createElement("bdi");
        bdi.dir = "ltr";
        bdi.dataset.codexLtrRun = "true";
        // A bidi isolate can still wrap between its number and unit. Keep short
        // memory quantities intact without disabling wrapping for English prose.
        if (/^[+-]?\d[\d.,]*[ \t]+[KMGTPE]?i?B$/i.test(latinText)) {
          bdi.dataset.codexUnitRun = "true";
        }
        bdi.textContent = latinText;
        fragment.append(bdi);
        fragment.append(trailingPunctuation);
        offset = index + match[0].length;
      }
      fragment.append(text.slice(offset));
      textNode.replaceWith(fragment);
    }
    isolated.set(el, el.innerHTML);
  }

  function applyMarkdownEditorLineDirection(line) {
    const text = (line.innerText || line.textContent || "").trim();
    const direction = ARABIC_SCRIPT_RE.test(text) ? "rtl" : "ltr";
    if (
      processed.get(line) === text
      && line.dataset.codexMarkdownEditorDirection === direction
      && line.getAttribute("dir") === direction
    ) return;

    processed.set(line, text);
    line.dataset.codexMarkdownEditorDirection = direction;
    line.dir = direction;
  }

  function applyMarkdownEditorDirection(root) {
    const containingEditor = root.closest?.(MARKDOWN_EDITOR_SELECTOR);
    if (containingEditor) {
      containingEditor.dataset.codexMarkdownEditor = "true";
      const line = root.matches?.(".cm-line") ? root : root.closest?.(".cm-line");
      if (line && line.parentElement === containingEditor) {
        applyMarkdownEditorLineDirection(line);
      } else {
        containingEditor.querySelectorAll(":scope > .cm-line").forEach(applyMarkdownEditorLineDirection);
      }
      return;
    }

    const editors = [];
    if (root.matches?.(MARKDOWN_EDITOR_SELECTOR)) editors.push(root);
    root.querySelectorAll?.(MARKDOWN_EDITOR_SELECTOR).forEach((editor) => editors.push(editor));

    for (const editor of editors) {
      editor.dataset.codexMarkdownEditor = "true";
      editor.querySelectorAll(":scope > .cm-line").forEach(applyMarkdownEditorLineDirection);
    }
  }

  function scan(root) {
    if (!root || root.nodeType !== Node.ELEMENT_NODE) return;
    applyMarkdownEditorDirection(root);
    if (isInteractive(root) && !isMarkdownEditor(root)) return;
    root.querySelectorAll?.(CODE_BLOCK_SELECTOR).forEach((el) => {
      el.dir = "ltr";
      el.dataset.codexCodeLtr = "true";
    });
    if (root.matches && root.matches("code")) applyProseCodeDirection(root);
    root.querySelectorAll?.("code").forEach(applyProseCodeDirection);
    // Establish cell direction before visiting native links' nested spans.
    if (root.matches?.("table")) applyTableDirection(root);
    root.querySelectorAll?.("table").forEach(applyTableDirection);
    if (root.matches && root.matches(BLOCK_SELECTOR)) applyDirection(root);
    root.querySelectorAll?.(BLOCK_SELECTOR).forEach(applyDirection);
    if (root.matches && root.matches(TEXT_LEAF_SELECTOR)) applyTextLeafDirection(root);
    root.querySelectorAll?.(TEXT_LEAF_SELECTOR).forEach(applyTextLeafDirection);
    if (root.matches && root.matches("[data-codex-rtl='true']")) isolateLatinRuns(root);
    root.querySelectorAll?.("[data-codex-rtl='true']").forEach(isolateLatinRuns);
  }

  function flushPending() {
    const batch = Array.from(pending).slice(0, 25);
    batch.forEach((root) => pending.delete(root));
    batch.forEach(scan);

    if (pending.size > 0) {
      requestAnimationFrame(flushPending);
    } else {
      scheduled = false;
    }
  }

  function scheduleScan(root) {
    if (!root || root.nodeType !== Node.ELEMENT_NODE) return;
    const scanRoot = root.closest?.("[data-markdown-copy='code-block'], [data-code-block-source]")
      || root.closest?.("code")
      || root.closest?.("table")
      || root.closest?.("p,li,blockquote,[data-codex-direction]")
      || root;
    if (isInteractive(scanRoot) && !isMarkdownEditor(scanRoot)) return;
    pending.add(scanRoot);
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(flushPending);
  }

  // Undo only attributes/wrappers created by earlier toolkit versions before
  // scanning. This also recovers from a previous version classifying a layout
  // container as code. No message text or native class is changed.
  for (const el of document.querySelectorAll("[data-codex-code-ltr],[data-codex-direction],[data-codex-rtl],[data-codex-bidi],[data-codex-table-direction],[data-codex-cell-align]")) {
    el.removeAttribute("dir");
    for (const name of ["codexCodeLtr","codexDirection","codexRtl","codexBidi","codexTableDirection","codexCellAlign"]) delete el.dataset[name];
  }
  for (const bdi of document.querySelectorAll("bdi[data-codex-ltr-run]")) {
    bdi.replaceWith(document.createTextNode(bdi.textContent));
  }
  ensureStyle();
  scan(document.body);

  if (window.__CODEX_RTL_OBSERVER__) {
    window.__CODEX_RTL_OBSERVER__.disconnect();
  }

  window.__CODEX_RTL_OBSERVER__ = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "characterData") {
        scheduleScan(mutation.target.parentElement);
      }
      if (
        mutation.type === "attributes"
        && mutation.target.matches?.(".cm-line")
        && isMarkdownEditor(mutation.target)
      ) {
        scheduleScan(mutation.target);
      }
      if (mutation.type === "childList") scheduleScan(mutation.target);
      for (const node of mutation.addedNodes) {
        scheduleScan(node.nodeType === Node.TEXT_NODE ? node.parentElement : node);
      }
    }
  });

  window.__CODEX_RTL_OBSERVER__.observe(document.body, {
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["dir", "data-codex-markdown-editor-direction"],
    subtree: true
  });

  window.__CODEX_RTL_ACTIVE__ = true;
})();
