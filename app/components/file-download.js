import { createIcon } from "../utils/icons.js";

/**
 * Click-to-download file rows. Content is generated on demand via `getContent`.
 *
 * Markup:
 *   <div class="file-download">
 *     <ul class="file-download-list">
 *       <li class="file-download-item" data-file-download-name="notes.txt">
 *         <span class="file-download-item-name">notes.txt</span>
 *         <span class="file-download-item-meta">Plain text</span>
 *         <button type="button" class="file-download-action btn btn-icon" aria-label="Download notes.txt"
 *           data-icon="upload" data-icon-class="file-download-action-icon"></button>
 *       </li>
 *     </ul>
 *   </div>
 *
 * data-file-download-name — default filename
 * data-file-download-mime — MIME type (defaults to text/plain)
 */

const DEFAULT_MIME_TYPE = "text/plain;charset=utf-8";

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) {
    const kb = bytes / 1024;
    return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function resolveByteLength(content) {
  if (typeof content === "string") {
    return new TextEncoder().encode(content).byteLength;
  }
  if (content instanceof Blob) return content.size;
  if (content instanceof ArrayBuffer) return content.byteLength;
  return 0;
}

async function resolveContent(getContent, fallbackContent) {
  if (getContent) return getContent();
  return fallbackContent ?? "";
}

function toBlob(content, mimeType) {
  if (content instanceof Blob) return content;
  if (content instanceof ArrayBuffer) {
    return new Blob([content], { type: mimeType });
  }
  return new Blob([String(content)], { type: mimeType });
}

/**
 * Trigger a browser download for the given content.
 *
 * @param {{ filename: string, content?: string | Blob | ArrayBuffer, mimeType?: string, getContent?: () => string | Blob | ArrayBuffer | Promise<string | Blob | ArrayBuffer> }} options
 */
export async function downloadFile({
  filename,
  content,
  mimeType = DEFAULT_MIME_TYPE,
  getContent,
} = {}) {
  const resolved = await resolveContent(getContent, content);
  const blob = toBlob(resolved, mimeType);
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 0);
  return { filename, size: blob.size };
}

function readMimeType(sourceEl, fallback) {
  return sourceEl?.dataset.fileDownloadMime?.trim() || fallback || DEFAULT_MIME_TYPE;
}

function readFilename(sourceEl, fallback) {
  return sourceEl?.dataset.fileDownloadName?.trim() || fallback || "download.txt";
}

function formatItemMeta(byteLength) {
  return byteLength ? formatFileSize(byteLength) : "";
}

function updateItemMeta(itemEl, { filename, byteLength }) {
  const nameEl = itemEl.querySelector(".file-download-item-name");
  const metaEl = itemEl.querySelector(".file-download-item-meta");

  if (nameEl) nameEl.textContent = filename;
  if (metaEl) metaEl.textContent = formatItemMeta(byteLength);
}

function ensureDownloadActionButton(itemEl, filename) {
  let action = itemEl.querySelector(".file-download-action");
  if (action) return action;

  action = document.createElement("button");
  action.type = "button";
  action.className = "file-download-action btn btn-icon";
  action.setAttribute("aria-label", `Download ${filename}`);
  action.append(createIcon("upload", { className: "file-download-action-icon" }));
  itemEl.append(action);
  return action;
}

function bindDownloadAction(actionEl, handler) {
  actionEl.addEventListener("click", handler);
  return () => actionEl.removeEventListener("click", handler);
}

export function initFileDownload(
  downloadEl,
  { filename, mimeType, content, getContent, files, onDownload } = {}
) {
  if (!downloadEl) return null;

  const items = [...downloadEl.querySelectorAll(".file-download-item")];
  if (!items.length) return null;

  const cleanups = [];

  async function runDownload(fileConfig, sourceEl) {
    const resolvedFilename = fileConfig.filename ?? readFilename(sourceEl, filename);
    const resolvedMimeType = fileConfig.mimeType ?? readMimeType(sourceEl, mimeType);
    const result = await downloadFile({
      filename: resolvedFilename,
      content: fileConfig.content ?? content,
      mimeType: resolvedMimeType,
      getContent: fileConfig.getContent ?? getContent,
    });
    onDownload?.({
      downloadEl,
      filename: resolvedFilename,
      size: result.size,
      sourceEl,
    });
    return result;
  }

  items.forEach((itemEl, index) => {
    const fromOptions = files?.[index] ?? {};
    const fileConfig = {
      filename: fromOptions.filename ?? readFilename(itemEl, filename),
      mimeType: fromOptions.mimeType ?? readMimeType(itemEl, mimeType),
      content: fromOptions.content ?? content,
      getContent: fromOptions.getContent ?? getContent,
    };

    const action = ensureDownloadActionButton(itemEl, fileConfig.filename);
    action.setAttribute("aria-label", `Download ${fileConfig.filename}`);

    void resolveContent(fileConfig.getContent, fileConfig.content).then((resolved) => {
      updateItemMeta(itemEl, {
        filename: fileConfig.filename,
        byteLength: resolveByteLength(resolved),
      });
    });

    cleanups.push(
      bindDownloadAction(action, () => {
        void runDownload(fileConfig, itemEl);
      })
    );
  });

  return {
    download: (index = 0) => {
      const itemEl = items[index];
      if (!itemEl) return Promise.resolve(null);
      const fromOptions = files?.[index] ?? {};
      return runDownload(
        {
          filename: fromOptions.filename ?? readFilename(itemEl, filename),
          mimeType: fromOptions.mimeType ?? readMimeType(itemEl, mimeType),
          content: fromOptions.content ?? content,
          getContent: fromOptions.getContent ?? getContent,
        },
        itemEl
      );
    },
    destroy: () => cleanups.forEach((cleanup) => cleanup()),
  };
}

/** Wire every `.file-download` block in `root`. */
export function initFileDownloads(root = document) {
  const instances = [];
  root.querySelectorAll(".file-download").forEach((downloadEl) => {
    const instance = initFileDownload(downloadEl);
    if (instance) instances.push(instance);
  });
  return instances;
}
