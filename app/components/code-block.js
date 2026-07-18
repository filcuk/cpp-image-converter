/**
 * Interactive code blocks: optional line numbers, Prism highlight toggle, copy button.
 *
 * Markup:
 *   <div class="code-block" data-code-mode="select" data-code-copy="true">
 *     <div class="code-block-toolbar">…toggles…</div>
 *     <div class="code-block-body">
 *       <button type="button" class="code-block-copy btn">Copy</button>
 *       <pre class="line-numbers language-python"><code>…</code></pre>
 *     </div>
 *   </div>
 *
 * Options via data attributes on `.code-block`:
 *   data-code-mode="view|select|edit" — interaction mode (default `select`)
 *   data-code-copy="false"          — omit copy button behaviour
 *   data-code-line-numbers="false"  — start without line numbers
 *   data-code-highlight="false"     — start without highlighting
 *
 * Edit mode uses a transparent textarea over a highlighted `<pre>` so line
 * numbers and Prism tokens match view/select appearance.
 *
 * Optional fullscreen: add `data-expandable-surface` on `.code-block` and
 * `data-expandable-surface-trigger` on `.code-block-body`; wire with
 * `initExpandableSurfaces()` from `app/expandable-surface.js`.
 */

import { setHidden } from "../utils/dom.js";

const LANGUAGE_RE = /language-([\w-]+)/;
const CODE_MODES = ["view", "select", "edit"];

function parseLanguage(codeEl) {
  for (const cls of codeEl.classList) {
    const match = cls.match(LANGUAGE_RE);
    if (match) return match[1];
  }
  return null;
}

function parseMode(value) {
  return CODE_MODES.includes(value) ? value : "select";
}

function removeLineNumberMarkup(codeEl) {
  codeEl.querySelector(".line-numbers-rows")?.remove();
  codeEl.querySelector(".line-numbers-sizer")?.remove();
}

function setCopyEnabled(container, enabled) {
  const copyBtn = container.querySelector(".code-block-copy");
  if (!copyBtn) return;
  setHidden(copyBtn, !enabled);
  copyBtn.disabled = !enabled;
}

function updateLineNumbersToggle(toggle, highlightEnabled) {
  toggle.disabled = !highlightEnabled;
  toggle.setAttribute("aria-disabled", highlightEnabled ? "false" : "true");
}

function insertTabAtCursor(textarea) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = textarea.value;
  textarea.value = `${value.slice(0, start)}\t${value.slice(end)}`;
  textarea.selectionStart = textarea.selectionEnd = start + 1;
}

/** Strip trailing newlines from HTML `textContent` (avoids a phantom last line). */
function normalizeSource(text) {
  return text.replace(/\n+$/, "");
}

function countDisplayLines(text) {
  if (text === "") return 1;
  return text.split("\n").length;
}

/**
 * @param {HTMLElement} container
 * @param {{
 *   copyButton?: boolean,
 *   lineNumbers?: boolean,
 *   highlight?: boolean,
 *   mode?: string,
 * }} [options]
 */
export function initCodeBlock(container, options = {}) {
  if (!(container instanceof HTMLElement)) return null;
  if (container.dataset.codeBlockInit !== undefined) return null;
  container.dataset.codeBlockInit = "";

  const pre = container.querySelector("pre");
  const code = pre?.querySelector("code");
  if (!pre || !code) return null;

  const copyButton =
    options.copyButton ??
    container.dataset.codeCopy !== "false";
  const lineNumbersDefault =
    options.lineNumbers ??
    container.dataset.codeLineNumbers !== "false";
  const highlightDefault =
    options.highlight ??
    container.dataset.codeHighlight !== "false";
  let mode = parseMode(options.mode ?? container.dataset.codeMode);

  const language = parseLanguage(code);
  let source = normalizeSource(code.textContent);
  code.dataset.source = source;

  let lineNumbersEnabled = lineNumbersDefault;
  let highlightEnabled = highlightDefault;

  const lineNumbersToggle = container.querySelector('[data-code-toggle="line-numbers"]');
  const highlightToggle = container.querySelector('[data-code-toggle="highlight"]');
  const copyBtn = container.querySelector(".code-block-copy");
  /** @type {HTMLTextAreaElement | null} */
  let editorEl = null;
  /** @type {HTMLElement | null} */
  let editorStackEl = null;

  if (copyBtn && !copyBtn.closest(".surface-actions")) {
    const actionsHost = document.createElement("div");
    actionsHost.className = "surface-actions";
    copyBtn.parentNode?.insertBefore(actionsHost, copyBtn);
    actionsHost.appendChild(copyBtn);
  }

  function ensureEditorStack() {
    if (editorEl && editorStackEl) {
      return { stack: editorStackEl, editor: editorEl };
    }

    editorStackEl = document.createElement("div");
    editorStackEl.className = "code-block-editor-stack";
    pre.parentNode?.insertBefore(editorStackEl, pre);
    editorStackEl.appendChild(pre);

    editorEl = document.createElement("textarea");
    editorEl.className = "code-block-editor";
    editorEl.spellcheck = false;
    editorEl.setAttribute("autocapitalize", "off");
    editorEl.setAttribute("autocomplete", "off");
    editorEl.setAttribute(
      "aria-label",
      container.dataset.codeEditorLabel || "Code editor"
    );
    editorStackEl.appendChild(editorEl);

    editorEl.addEventListener("input", () => {
      source = editorEl.value;
      code.dataset.source = source;
      refreshDisplay();
    });

    editorEl.addEventListener("scroll", () => {
      pre.scrollTop = editorEl.scrollTop;
      pre.scrollLeft = editorEl.scrollLeft;
    });

    editorEl.addEventListener("keydown", (event) => {
      if (event.key === "Tab") {
        event.preventDefault();
        insertTabAtCursor(editorEl);
        source = editorEl.value;
        code.dataset.source = source;
        refreshDisplay();
      }
    });

    return { stack: editorStackEl, editor: editorEl };
  }

  function syncSourceFromEditor() {
    if (!editorEl) return;
    source = editorEl.value;
    code.dataset.source = source;
  }

  function syncScrollPosition() {
    if (!editorEl) return;
    pre.scrollTop = editorEl.scrollTop;
    pre.scrollLeft = editorEl.scrollLeft;
  }

  function applyLineNumbersClass() {
    pre.classList.toggle("line-numbers", lineNumbersEnabled && highlightEnabled);
  }

  function renderPlain() {
    removeLineNumberMarkup(code);
    pre.className = "";
    code.className = "";
    code.textContent = source;
  }

  function renderHighlighted() {
    if (!window.Prism || !language) {
      renderPlain();
      return;
    }

    removeLineNumberMarkup(code);
    code.textContent = source;
    code.className = `language-${language}`;
    pre.className = `language-${language}`;
    applyLineNumbersClass();
    window.Prism.highlightElement(code);
  }

  function syncToggleStates() {
    lineNumbersToggle?.setAttribute(
      "aria-pressed",
      lineNumbersEnabled ? "true" : "false"
    );
    highlightToggle?.setAttribute(
      "aria-pressed",
      highlightEnabled ? "true" : "false"
    );
    if (lineNumbersToggle) {
      updateLineNumbersToggle(lineNumbersToggle, highlightEnabled);
    }
  }

  function syncLineNumberRows() {
    if (!lineNumbersEnabled || !highlightEnabled) return;
    if (!pre.classList.contains("line-numbers")) return;

    const rows = pre.querySelector(".line-numbers-rows");
    if (!rows) return;

    const targetLines = countDisplayLines(source);

    while (rows.children.length < targetLines) {
      rows.appendChild(document.createElement("span"));
    }
    while (rows.children.length > targetLines) {
      rows.lastElementChild?.remove();
    }

    window.Prism?.plugins?.lineNumbers?.resize?.(pre);
  }

  function refreshDisplay() {
    const scrollTop = editorEl?.scrollTop ?? 0;
    const scrollLeft = editorEl?.scrollLeft ?? 0;

    if (highlightEnabled) {
      renderHighlighted();
    } else {
      renderPlain();
    }
    syncToggleStates();
    syncLineNumberRows();

    if (mode === "edit" && editorEl) {
      editorEl.scrollTop = scrollTop;
      editorEl.scrollLeft = scrollLeft;
      syncScrollPosition();
    }
  }

  function applyMode() {
    container.classList.remove(
      "code-block--view",
      "code-block--select",
      "code-block--edit"
    );
    container.classList.add(`code-block--${mode}`);
    container.dataset.codeMode = mode;

    if (mode === "edit") {
      const { editor } = ensureEditorStack();
      editor.value = source;
      setHidden(editor, false);
      setHidden(pre, false);
      refreshDisplay();
      setCopyEnabled(container, copyButton);
    } else {
      if (editorEl) {
        setHidden(editorEl, true);
      }
      setHidden(pre, false);
      refreshDisplay();
      setCopyEnabled(container, copyButton && mode !== "view");
    }
  }

  lineNumbersToggle?.addEventListener("click", () => {
    if (!highlightEnabled) return;
    lineNumbersEnabled = !lineNumbersEnabled;
    refreshDisplay();
  });

  highlightToggle?.addEventListener("click", () => {
    highlightEnabled = !highlightEnabled;
    refreshDisplay();
  });

  copyBtn?.addEventListener("click", async () => {
    if (!copyButton || copyBtn.disabled) return;

    const text = mode === "edit" && editorEl ? editorEl.value : source;

    try {
      await navigator.clipboard.writeText(text);
      const label = copyBtn.getAttribute("aria-label") || "Copy code";
      copyBtn.textContent = "Copied";
      copyBtn.setAttribute("aria-label", "Copied");
      window.setTimeout(() => {
        copyBtn.textContent = "Copy";
        copyBtn.setAttribute("aria-label", label);
      }, 2000);
    } catch {
      copyBtn.textContent = "Failed";
      window.setTimeout(() => {
        copyBtn.textContent = "Copy";
      }, 2000);
    }
  });

  applyMode();

  return {
    setLineNumbers(enabled) {
      lineNumbersEnabled = enabled;
      refreshDisplay();
    },
    setHighlight(enabled) {
      highlightEnabled = enabled;
      refreshDisplay();
    },
    getSource() {
      return mode === "edit" && editorEl ? editorEl.value : source;
    },
    setSource(next) {
      source = next;
      code.dataset.source = next;
      if (editorEl) editorEl.value = next;
      refreshDisplay();
    },
    getMode() {
      return mode;
    },
    setMode(nextMode) {
      const parsed = parseMode(nextMode);
      if (parsed === mode) return;

      if (mode === "edit") {
        syncSourceFromEditor();
      }

      mode = parsed;
      applyMode();
    },
  };
}

/** Wire every `.code-block` in `root`. */
export function initCodeBlocks(root = document) {
  const instances = [];
  for (const container of root.querySelectorAll(".code-block")) {
    const instance = initCodeBlock(container);
    if (instance) instances.push(instance);
  }
  return instances;
}
