/**
 * Toast UI Editor vendor helpers. Load scripts before calling:
 *   app/vendor/toastui-editor/toastui-editor-all.min.js
 *   app/vendor/toastui-editor-plugin-table-merged-cell/toastui-editor-plugin-table-merged-cell.min.js
 *
 * Pinned versions: editor 3.2.2 (includes theme/toastui-editor-dark.min.css via app/toastui-editor.css), table-merged-cell plugin (CDN latest at vendoring).
 */

/** @type {const} */
export const TOASTUI_EDITOR_VERSION = "3.2.2";

export function isToastUiEditorReady() {
  return Boolean(window.toastui?.Editor);
}

export function getToastUiEditor() {
  return window.toastui?.Editor ?? null;
}

export function getTableMergedCellPlugin() {
  return window.toastui?.Editor?.plugin?.tableMergedCell ?? null;
}
