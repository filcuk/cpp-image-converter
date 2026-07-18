import { parseBooleanAttr, setHidden } from "../utils/dom.js";
import { createIcon } from "../utils/icons.js";

/**
 * Drag-and-drop / click-to-browse file picker.
 *
 * Markup:
 *   <div class="file-dropzone" data-file-multiple data-file-max="5">
 *     <div class="file-dropzone-target">
 *       <input type="file" class="file-dropzone-input" aria-label="Upload a file" />
 *       <div class="file-dropzone-prompt" aria-hidden="true">
 *         <span data-icon="upload" data-icon-class="file-dropzone-icon"></span>
 *         <span class="file-dropzone-text">
 *           <span class="file-dropzone-primary">Drop files here</span>
 *           <span class="file-dropzone-secondary">or browse</span>
 *         </span>
 *       </div>
 *     </div>
 *     <ul class="file-dropzone-list hidden" hidden></ul>
 *   </div>
 *
 * The file input is a full-size transparent overlay so browse and drop both use
 * the native control. Avoid a restrictive `accept` attribute — Windows often
 * omits MIME types for `.c` / `.h` and the browser will reject the drop.
 * Filter by extension in `onFiles` if needed.
 *
 * data-file-multiple — presence or "true" for multiple files
 * data-file-max — optional maximum file count
 */

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) {
    const kb = bytes / 1024;
    return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ensureTarget(dropzoneEl, input, prompt) {
  let target = dropzoneEl.querySelector(".file-dropzone-target");
  if (target) {
    if (!target.contains(input)) target.prepend(input);
    if (!target.contains(prompt)) target.append(prompt);
    return target;
  }

  target = document.createElement("div");
  target.className = "file-dropzone-target";
  input.replaceWith(target);
  target.append(input, prompt);
  return target;
}

export function initFileDropzone(
  dropzoneEl,
  { accept, multiple, maxFiles, onFiles, onError, onClear } = {}
) {
  if (!dropzoneEl) return null;

  const input = dropzoneEl.querySelector(".file-dropzone-input");
  const prompt = dropzoneEl.querySelector(".file-dropzone-prompt");
  const list = dropzoneEl.querySelector(".file-dropzone-list");
  if (!input || !prompt) return null;

  const target = ensureTarget(dropzoneEl, input, prompt);

  input.hidden = false;
  input.removeAttribute("hidden");
  input.classList.remove("hidden");
  // Restrictive accept breaks drop for .c/.h on Windows — keep picker open to all
  input.removeAttribute("accept");
  if (prompt.tagName === "BUTTON") {
    // Visual only; the overlay input receives clicks
    prompt.setAttribute("tabindex", "-1");
  }
  prompt.setAttribute("aria-hidden", "true");

  if (!input.getAttribute("aria-label")) {
    input.setAttribute("aria-label", "Upload a file");
  }

  const isMultiple =
    multiple ?? parseBooleanAttr(dropzoneEl.dataset.fileMultiple) ?? false;
  const max =
    maxFiles ??
    (dropzoneEl.dataset.fileMax ? Number(dropzoneEl.dataset.fileMax) : undefined);

  // accept option is intentionally ignored for the native attribute (see header).
  // Callers may still pass it for documentation; filtering belongs in onFiles.
  void accept;

  input.multiple = isMultiple;

  /** @type {File[]} */
  let files = [];
  let dragDepth = 0;

  function setDragover(active) {
    dropzoneEl.classList.toggle("is-dragover", active);
  }

  function commitFiles(nextFiles) {
    const hadFiles = files.length > 0;
    files = nextFiles;

    if (!files.length) {
      if (hadFiles) onClear?.({ dropzoneEl });
      onFiles?.({ dropzoneEl, files });
    } else {
      onFiles?.({ dropzoneEl, files });
    }

    try {
      renderList();
    } catch {
      onError?.({
        dropzoneEl,
        message: "Could not update the file list UI.",
        files,
      });
    }
  }

  function trimToMax(candidateFiles) {
    if (!max || !Number.isFinite(max) || max <= 0) return candidateFiles;
    if (candidateFiles.length <= max) return candidateFiles;

    onError?.({
      dropzoneEl,
      message: `You can add at most ${max} file${max === 1 ? "" : "s"}.`,
      files: candidateFiles,
    });
    return candidateFiles.slice(0, max);
  }

  function addFiles(incoming) {
    if (!incoming.length) return;
    const next = isMultiple ? [...files, ...incoming] : incoming.slice(0, 1);
    commitFiles(trimToMax(next));
  }

  function removeFile(index) {
    commitFiles(files.filter((_, fileIndex) => fileIndex !== index));
  }

  function renderList() {
    if (!list) return;

    if (!files.length) {
      setHidden(list, true);
      list.replaceChildren();
      return;
    }

    setHidden(list, false);
    list.replaceChildren();

    files.forEach((file, index) => {
      const item = document.createElement("li");
      item.className = "file-dropzone-item";

      const name = document.createElement("span");
      name.className = "file-dropzone-item-name";
      name.textContent = file.name;

      const meta = document.createElement("span");
      meta.className = "file-dropzone-item-meta";
      meta.textContent = formatFileSize(file.size);

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "file-dropzone-remove btn btn-icon";
      removeBtn.setAttribute("aria-label", `Remove ${file.name}`);
      removeBtn.append(createIcon("error", { className: "file-dropzone-remove-icon" }));
      removeBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        removeFile(index);
      });

      item.append(name, meta, removeBtn);
      list.append(item);
    });
  }

  function openPicker() {
    input.value = "";
    input.click();
  }

  function onInputChange() {
    const incoming = [...(input.files ?? [])];
    if (!incoming.length) return;

    if (isMultiple) {
      addFiles(incoming);
      return;
    }

    commitFiles(incoming.slice(0, 1));
  }

  function onDragEnter(event) {
    event.preventDefault();
    event.stopPropagation();
    dragDepth += 1;
    setDragover(true);
  }

  function onDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
  }

  function onDragLeave(event) {
    event.preventDefault();
    event.stopPropagation();
    dragDepth -= 1;
    if (dragDepth <= 0) {
      dragDepth = 0;
      setDragover(false);
    }
  }

  function onDrop(event) {
    // Prefer our handler so we always get files even when the OS MIME is empty
    event.preventDefault();
    event.stopPropagation();
    dragDepth = 0;
    setDragover(false);

    const incoming = [...(event.dataTransfer?.files ?? [])];
    if (!incoming.length) return;

    // Clear native selection so a later identical browse still fires change
    input.value = "";

    if (isMultiple) {
      addFiles(incoming);
      return;
    }

    commitFiles(incoming.slice(0, 1));
  }

  input.addEventListener("change", onInputChange);
  target.addEventListener("dragenter", onDragEnter);
  target.addEventListener("dragover", onDragOver);
  target.addEventListener("dragleave", onDragLeave);
  target.addEventListener("drop", onDrop, true);

  renderList();

  return {
    openPicker,
    clear: () => {
      input.value = "";
      commitFiles([]);
    },
    getFiles: () => [...files],
    destroy: () => {
      input.removeEventListener("change", onInputChange);
      target.removeEventListener("dragenter", onDragEnter);
      target.removeEventListener("dragover", onDragOver);
      target.removeEventListener("dragleave", onDragLeave);
      target.removeEventListener("drop", onDrop, true);
      dragDepth = 0;
      setDragover(false);
    },
  };
}

/** Wire every `.file-dropzone` block in `root`. */
export function initFileDropzones(root = document) {
  const instances = [];
  root.querySelectorAll(".file-dropzone").forEach((dropzoneEl) => {
    const instance = initFileDropzone(dropzoneEl);
    if (instance) instances.push(instance);
  });
  return instances;
}
