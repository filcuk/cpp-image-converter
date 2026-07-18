/**
 * Rich text editor — Toast UI Editor wrapper (Markdown + WYSIWYG).
 *
 * Requires vendor scripts and `app/toastui-editor.css` on the page. See `app/toastui-editor.js`.
 *
 * Markup:
 *   <div class="field rich-text-editor" id="my-editor"
 *     data-rich-text-editor-height="320px"
 *     data-rich-text-editor-edit-type="wysiwyg"
 *     data-rich-text-editor-preview="vertical"
 *     data-rich-text-editor-placeholder="Write something…">
 *     <span class="field-label">Body</span>
 *     <div class="rich-text-editor-mount" aria-label="Rich text editor"></div>
 *   </div>
 *
 * data-rich-text-editor-height — editor height (default `300px`)
 * data-rich-text-editor-edit-type — `markdown` | `wysiwyg` (default `wysiwyg`)
 * data-rich-text-editor-preview — `vertical` | `tab` (default `vertical`)
 * data-rich-text-editor-placeholder — placeholder text
 * data-rich-text-editor-value — initial Markdown/HTML content
 * data-rich-text-editor-autofocus — focus the editor on init (default off; Toast UI defaults on)
 */

import {
  getTableMergedCellPlugin,
  getToastUiEditor,
  isToastUiEditorReady,
} from "./toastui-editor.js";
import { APP_CONFIG } from "../config.js";
import { parseBooleanAttr } from "../utils/dom.js";

const EDIT_TYPES = ["markdown", "wysiwyg"];
const PREVIEW_STYLES = ["vertical", "tab"];
const DEFAULT_PLUGINS = ["tableMergedCell"];

const THEME_CLASS = "toastui-editor-dark";

function resolveTheme() {
  const theme = document.documentElement.dataset.theme;
  return theme === "dark" ? "dark" : "light";
}

function applyEditorTheme(mountEl, resolved) {
  const isDark = resolved === "dark";
  mountEl.classList.toggle(THEME_CLASS, isDark);
  mountEl
    .querySelector(".toastui-editor-defaultUI")
    ?.classList.toggle(THEME_CLASS, isDark);
}

function parseEditType(value) {
  return EDIT_TYPES.includes(value) ? value : "wysiwyg";
}

function parsePreviewStyle(value) {
  return PREVIEW_STYLES.includes(value) ? value : "vertical";
}

function readDataOption(rootEl, key, fallback) {
  const fromDataset = rootEl?.dataset?.[key];
  if (fromDataset !== undefined && fromDataset !== "") return fromDataset;
  return fallback;
}

function resolveAutofocus(rootEl, autofocusOption) {
  if (typeof autofocusOption === "boolean") return autofocusOption;
  return parseBooleanAttr(rootEl?.dataset.richTextEditorAutofocus) ?? false;
}

function resolvePlugins(pluginOption) {
  if (pluginOption === false || pluginOption?.length === 0) return [];

  const names = Array.isArray(pluginOption) ? pluginOption : DEFAULT_PLUGINS;
  const plugins = [];

  for (const name of names) {
    if (name === "tableMergedCell") {
      const plugin = getTableMergedCellPlugin();
      if (plugin) plugins.push(plugin);
    }
  }

  return plugins;
}

function readImageAsDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export function initRichTextEditor(
  rootEl,
  {
    height,
    initialEditType,
    previewStyle,
    placeholder,
    initialValue,
    plugins,
    autofocus,
    onChange,
  } = {}
) {
  if (!rootEl || !isToastUiEditorReady()) return null;

  const Editor = getToastUiEditor();
  const mountEl = rootEl.querySelector(".rich-text-editor-mount");
  if (!Editor || !mountEl) return null;

  const resolvedHeight =
    height ?? readDataOption(rootEl, "richTextEditorHeight", "300px");
  const resolvedEditType = parseEditType(
    initialEditType ??
      readDataOption(rootEl, "richTextEditorEditType", "wysiwyg")
  );
  const resolvedPreviewStyle = parsePreviewStyle(
    previewStyle ?? readDataOption(rootEl, "richTextEditorPreview", "vertical")
  );
  const resolvedPlaceholder =
    placeholder ?? readDataOption(rootEl, "richTextEditorPlaceholder", "");
  const resolvedInitialValue =
    initialValue ?? readDataOption(rootEl, "richTextEditorValue", "");
  const resolvedAutofocus = resolveAutofocus(rootEl, autofocus);

  const editor = new Editor({
    el: mountEl,
    height: resolvedHeight,
    initialEditType: resolvedEditType,
    previewStyle: resolvedPreviewStyle,
    placeholder: resolvedPlaceholder || undefined,
    initialValue: resolvedInitialValue,
    autofocus: resolvedAutofocus,
    theme: resolveTheme(),
    plugins: resolvePlugins(plugins),
    hooks: {
      addImageBlobHook(blob, callback) {
        readImageAsDataUrl(blob)
          .then((dataUrl) => callback(dataUrl, blob.name || "image"))
          .catch(() => callback("", blob.name || "image"));
      },
    },
  });

  applyEditorTheme(mountEl, resolveTheme());

  if (!resolvedAutofocus && typeof editor.blur === "function") {
    editor.blur();
  }

  function emitChange(source) {
    onChange?.({
      markdown: editor.getMarkdown(),
      html: editor.getHTML(),
      source,
    });
  }

  function onEditorChange() {
    emitChange("input");
  }

  function onThemeChange(event) {
    const resolved = event.detail?.resolved;
    if (resolved === "dark" || resolved === "light") {
      applyEditorTheme(mountEl, resolved);
    }
  }

  editor.on("change", onEditorChange);
  document.addEventListener(APP_CONFIG.themeChangeEvent, onThemeChange);

  let destroyed = false;

  return {
    getMarkdown() {
      return editor.getMarkdown();
    },
    getHTML() {
      return editor.getHTML();
    },
    setMarkdown(value) {
      editor.setMarkdown(value ?? "");
      emitChange("setMarkdown");
    },
    setHTML(value) {
      editor.setHTML(value ?? "");
      emitChange("setHTML");
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      editor.off("change", onEditorChange);
      document.removeEventListener(APP_CONFIG.themeChangeEvent, onThemeChange);
      editor.destroy();
    },
  };
}

/** Wire every `.rich-text-editor` with a mount node in `root`. */
export function initRichTextEditors(root = document) {
  const instances = [];

  for (const el of root.querySelectorAll(".rich-text-editor")) {
    if (!el.querySelector(".rich-text-editor-mount")) continue;
    const instance = initRichTextEditor(el);
    if (instance) instances.push(instance);
  }

  return instances;
}
