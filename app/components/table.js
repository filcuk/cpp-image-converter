/**
 * Data table — styled table with optional sortable columns and row selection.
 *
 * Markup:
 *   <div class="table-block" data-table-sortable data-table-selectable>
 *     <div class="table-wrap">
 *       <table class="table table--striped">
 *         <caption class="table-caption">Team members</caption>
 *         <thead>
 *           <tr>
 *             <th class="table-select-col" scope="col">
 *               <label class="checkbox">
 *                 <input type="checkbox" class="checkbox-input" data-table-select-all
 *                   aria-label="Select all rows" />
 *               </label>
 *             </th>
 *             <th scope="col" data-table-sort data-sort-type="text">
 *               <button type="button" class="table-sort-button">Name</button>
 *             </th>
 *           </tr>
 *         </thead>
 *         <tbody>
 *           <tr data-table-row-id="1">
 *             <td class="table-select-col">…</td>
 *             <td>…</td>
 *           </tr>
 *         </tbody>
 *       </table>
 *     </div>
 *   </div>
 *
 * data-table-sortable — enable column sorting (requires data-table-sort on th)
 * data-table-selectable — enable row checkboxes and select-all
 * data-table-disabled — disable interaction
 * data-sort-type on th — text | number | date (default text)
 */

import { createIcon } from "../utils/icons.js";
import { parseBooleanAttr, setHidden } from "../utils/dom.js";

const SORT_TYPES = ["text", "number", "date"];

function parseSortType(value) {
  return SORT_TYPES.includes(value) ? value : "text";
}

function resolveSortable(blockEl, sortableOption) {
  if (typeof sortableOption === "boolean") return sortableOption;
  return parseBooleanAttr(blockEl?.dataset.tableSortable) ?? false;
}

function resolveSelectable(blockEl, selectableOption) {
  if (typeof selectableOption === "boolean") return selectableOption;
  return parseBooleanAttr(blockEl?.dataset.tableSelectable) ?? false;
}

function resolveDisabled(blockEl, disabledOption) {
  if (typeof disabledOption === "boolean") return disabledOption;
  return parseBooleanAttr(blockEl?.dataset.tableDisabled) ?? false;
}

export function getCellValue(cell, sortType) {
  const raw = cell?.textContent?.trim() ?? "";
  if (sortType === "number") {
    const value = Number.parseFloat(raw.replace(/[^\d.-]/g, ""));
    return Number.isFinite(value) ? value : 0;
  }
  if (sortType === "date") {
    const value = Date.parse(raw);
    return Number.isFinite(value) ? value : 0;
  }
  return raw.toLocaleLowerCase();
}

export function compareValues(a, b, sortType) {
  if (sortType === "number" || sortType === "date") {
    return a - b;
  }
  return String(a).localeCompare(String(b), undefined, { sensitivity: "base" });
}

function ensureSortIcon(button) {
  let icon = button.querySelector(".table-sort-icon");
  if (icon) return icon;

  icon = document.createElement("span");
  icon.className = "table-sort-icon hidden";
  icon.setAttribute("aria-hidden", "true");
  icon.append(createIcon("chevron-up", { className: "table-sort-icon-svg" }));
  button.append(icon);
  return icon;
}

function setSortButtonState(button, direction) {
  if (!direction) {
    button.removeAttribute("aria-sort");
    const icon = button.querySelector(".table-sort-icon");
    if (icon) setHidden(icon, true);
    return;
  }

  button.setAttribute("aria-sort", direction);
  const icon = ensureSortIcon(button);
  setHidden(icon, false);
  const iconName = direction === "ascending" ? "chevron-up" : "chevron-down";
  icon.replaceChildren(createIcon(iconName, { className: "table-sort-icon-svg" }));
}

export function initTable(
  blockEl,
  { sortable, selectable, disabled, onSort, onSelectionChange } = {}
) {
  if (!blockEl) return null;

  const tableEl = blockEl.querySelector("table.table");
  const tbody = tableEl?.querySelector("tbody");
  if (!tableEl || !tbody) return null;

  const isSortable = resolveSortable(blockEl, sortable);
  const isSelectable = resolveSelectable(blockEl, selectable);
  let isDisabled = resolveDisabled(blockEl, disabled);

  const sortHeaders = isSortable
    ? [...tableEl.querySelectorAll("th[data-table-sort]")]
    : [];
  const sortButtons = sortHeaders.map((th) => {
    let button = th.querySelector(".table-sort-button");
    if (!button) {
      button = document.createElement("button");
      button.type = "button";
      button.className = "table-sort-button";
      button.textContent = th.textContent?.trim() ?? "";
      th.textContent = "";
      th.append(button);
    }
    return button;
  });

  const selectAllInput = blockEl.querySelector("[data-table-select-all]");
  const rowInputs = () => [
    ...tbody.querySelectorAll("[data-table-row-select]"),
  ];

  function syncDisabledClass() {
    blockEl.classList.toggle("table-block--disabled", isDisabled);
  }

  function getSelectedRows() {
    return rowInputs()
      .filter((input) => input.checked)
      .map((input) => input.closest("tr"))
      .filter(Boolean);
  }

  function getSelectedIds() {
    return getSelectedRows()
      .map((row) => row.dataset.tableRowId)
      .filter((id) => id !== undefined);
  }

  function emitSelection(source) {
    onSelectionChange?.({
      selectedRows: getSelectedRows(),
      selectedIds: getSelectedIds(),
      source,
    });
  }

  function syncSelectAllState() {
    if (!selectAllInput) return;
    const inputs = rowInputs();
    const checkedCount = inputs.filter((input) => input.checked).length;
    selectAllInput.indeterminate =
      checkedCount > 0 && checkedCount < inputs.length;
    selectAllInput.checked = inputs.length > 0 && checkedCount === inputs.length;
  }

  function sortByColumn(columnIndex, direction, sortType) {
    const rows = [...tbody.querySelectorAll("tr")];
    const multiplier = direction === "descending" ? -1 : 1;

    rows.sort((rowA, rowB) => {
      const cellA = rowA.cells[columnIndex];
      const cellB = rowB.cells[columnIndex];
      const valueA = getCellValue(cellA, sortType);
      const valueB = getCellValue(cellB, sortType);
      return compareValues(valueA, valueB, sortType) * multiplier;
    });

    for (const row of rows) {
      tbody.append(row);
    }
  }

  function clearOtherSortStates(activeButton) {
    for (const button of sortButtons) {
      if (button !== activeButton) {
        setSortButtonState(button, null);
      }
    }
  }

  function onSortHeaderClick(th, button) {
    if (isDisabled) return;

    const columnIndex = th.cellIndex;
    const sortType = parseSortType(th.dataset.sortType);
    const current = button.getAttribute("aria-sort");
    const next =
      current === "ascending"
        ? "descending"
        : current === "descending"
          ? "ascending"
          : "ascending";

    clearOtherSortStates(button);
    setSortButtonState(button, next);
    sortByColumn(columnIndex, next, sortType);

    onSort?.({
      columnIndex,
      direction: next,
      sortType,
      source: "header",
    });
  }

  const sortHandlers = sortHeaders.map((th, index) => {
    const button = sortButtons[index];
    const handler = () => onSortHeaderClick(th, button);
    button.addEventListener("click", handler);
    return { button, handler };
  });

  function onSelectAllChange() {
    if (isDisabled || !selectAllInput) return;
    const checked = selectAllInput.checked;
    for (const input of rowInputs()) {
      input.checked = checked;
    }
    selectAllInput.indeterminate = false;
    emitSelection("selectAll");
  }

  function onRowSelectChange() {
    if (isDisabled) return;
    syncSelectAllState();
    emitSelection("row");
  }

  selectAllInput?.addEventListener("change", onSelectAllChange);

  const rowHandlers = [];

  if (isSelectable) {
    for (const input of rowInputs()) {
      const handler = onRowSelectChange;
      input.addEventListener("change", handler);
      rowHandlers.push({ input, handler });
    }
  } else {
    const selectCells = [
      selectAllInput?.closest("th, td"),
      ...rowInputs().map((input) => input.closest("td, th")),
    ].filter(Boolean);

    for (const cell of selectCells) {
      setHidden(cell, true);
    }
  }

  syncDisabledClass();
  syncSelectAllState();

  return {
    getSelectedRows() {
      return getSelectedRows();
    },
    getSelectedIds() {
      return getSelectedIds();
    },
    clearSelection() {
      if (selectAllInput) {
        selectAllInput.checked = false;
        selectAllInput.indeterminate = false;
      }
      for (const input of rowInputs()) {
        input.checked = false;
      }
      emitSelection("clear");
    },
    setDisabled(next) {
      isDisabled = Boolean(next);
      syncDisabledClass();
    },
    destroy() {
      for (const { button, handler } of sortHandlers) {
        button.removeEventListener("click", handler);
      }
      selectAllInput?.removeEventListener("change", onSelectAllChange);
      for (const { input, handler } of rowHandlers) {
        input.removeEventListener("change", handler);
      }
    },
  };
}

/** Wire every `.table-block` with a `table.table` in `root`. */
export function initTables(root = document) {
  const instances = [];

  for (const el of root.querySelectorAll(".table-block")) {
    const instance = initTable(el);
    if (instance) instances.push(instance);
  }

  return instances;
}
