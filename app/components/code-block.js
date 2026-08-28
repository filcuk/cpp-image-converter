/**
 * Lightweight code block display/editor used by the converter.
 *
 * A code block contains a `<pre><code>` pair. Edit mode adds a transparent
 * textarea over the display layer so callers can keep the normal editor
 * behaviour while the content uses code-block styling.
 */

const C_TOKEN_RE =
  /\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|^[ \t]*#\s*[A-Za-z_]\w*|\b(?:0[xX][\da-fA-F]+|0[bB][01]+|\d+(?:\.\d+)?(?:[uUlLfF]+)?)\b|\b(?:alignas|auto|bool|break|case|char|class|const|constexpr|continue|default|define|defined|do|double|else|enum|extern|false|float|for|if|include|inline|int|long|namespace|nullptr|private|protected|public|return|short|signed|sizeof|static|struct|switch|template|this|true|typedef|typename|union|unsigned|using|void|volatile|while)\b|[+\-*/%=&|!<>^~]+/gm;

/**
 * @param {string} value
 * @returns {string}
 */
function escapeHtml(value) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character]
  );
}

/**
 * Highlight the C/C++ constructs commonly found in image arrays.
 * Every non-token fragment is escaped before it is inserted as HTML.
 * @param {string} source
 * @returns {string}
 */
function highlightC(source) {
  let html = "";
  let cursor = 0;

  for (const match of source.matchAll(C_TOKEN_RE)) {
    const token = match[0];
    const start = match.index ?? cursor;
    html += escapeHtml(source.slice(cursor, start));

    let tokenClass = "operator";
    if (token.startsWith("//") || token.startsWith("/*")) {
      tokenClass = "comment";
    } else if (token.trimStart().startsWith("#")) {
      tokenClass = "directive";
    } else if (token.startsWith('"') || token.startsWith("'")) {
      tokenClass = "string";
    } else if (/^(?:0[xX]|0[bB]|\d)/.test(token)) {
      tokenClass = "number";
    } else if (/^(?:alignas|auto|bool|break|case|char|class|const|constexpr|continue|default|define|defined|do|double|else|enum|extern|false|float|for|if|include|inline|int|long|namespace|nullptr|private|protected|public|return|short|signed|sizeof|static|struct|switch|template|this|true|typedef|typename|union|unsigned|using|void|volatile|while)$/.test(token)) {
      tokenClass = "keyword";
    }

    html += `<span class="token ${tokenClass}">${escapeHtml(token)}</span>`;
    cursor = start + token.length;
  }

  return html + escapeHtml(source.slice(cursor));
}

/**
 * @param {HTMLElement} container
 * @param {{ onInput?: (event: { source: string }) => void }} [options]
 */
export function initCodeBlock(container, options = {}) {
  if (!(container instanceof HTMLElement)) return null;
  if (container.dataset.codeBlockInit !== undefined) return null;

  const pre = container.querySelector("pre");
  const code = pre?.querySelector("code");
  if (!(pre instanceof HTMLElement) || !(code instanceof HTMLElement)) return null;

  container.dataset.codeBlockInit = "";
  container.classList.add("code-block");

  let source = code.textContent ?? "";
  const mode =
    container.dataset.codeMode === "edit" ? "edit" : "select";
  let editor = null;

  container.classList.add(`code-block--${mode}`);

  function render() {
    code.innerHTML = highlightC(source);
    if (editor && editor.value !== source) editor.value = source;
  }

  function syncScroll() {
    if (!editor) return;
    pre.scrollTop = editor.scrollTop;
    pre.scrollLeft = editor.scrollLeft;
  }

  if (mode === "edit") {
    const stack = document.createElement("div");
    stack.className = "code-block-editor-stack";
    pre.parentNode?.insertBefore(stack, pre);
    stack.appendChild(pre);

    editor = document.createElement("textarea");
    editor.className = "code-block-editor";
    editor.spellcheck = false;
    editor.wrap = "off";
    editor.setAttribute("autocapitalize", "off");
    editor.setAttribute("autocomplete", "off");
    editor.setAttribute(
      "aria-label",
      container.dataset.codeEditorLabel || "Code editor"
    );
    editor.value = source;
    stack.appendChild(editor);

    editor.addEventListener("input", () => {
      source = editor?.value ?? "";
      render();
      options.onInput?.({ source });
    });
    editor.addEventListener("scroll", syncScroll);
    editor.addEventListener("keydown", (event) => {
      if (event.key !== "Tab" || !editor) return;
      event.preventDefault();
      const start = editor.selectionStart;
      const end = editor.selectionEnd;
      editor.value = `${editor.value.slice(0, start)}\t${editor.value.slice(end)}`;
      editor.selectionStart = editor.selectionEnd = start + 1;
      source = editor.value;
      render();
      options.onInput?.({ source });
    });
  }

  render();

  return {
    /** @returns {string} */
    getSource() {
      return source;
    },
    /** @param {string} next */
    setSource(next) {
      source = String(next ?? "");
      render();
      syncScroll();
    },
    /** @returns {HTMLTextAreaElement | null} */
    getEditor() {
      return editor;
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
