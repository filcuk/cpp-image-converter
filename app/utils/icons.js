/**
 * Central inline SVG icons. Add or edit paths here, then use in HTML:
 *
 *   <button type="button" data-icon="light-mode" data-icon-class="theme-icon"></button>
 *
 * Or in JS: import { createIcon } from "./icons.js";
 *           button.append(createIcon("light-mode", { className: "theme-icon" }));
 *
 * Third-party icons may require attribution — set `attribution` on the icon
 * definition (see ICON_ATTRIBUTIONS). It is inserted as an SVG comment in the
 * rendered markup, e.g. <!-- Icon from … -->.
 *
 * Match `viewBox` to the source SVG (Material Icons from Icônes use `0 0 24 24`;
 * Octicons in this file use `0 0 16 16`). CSS width/height scales the icon to fit.
 *
 * For third-party icons, set `name` to the icon's name in the source collection
 * (e.g. `round-info` on Icônes) — metadata only; the `ICONS` key is the app id
 * used in `data-icon` / `createIcon()`.
 *
 * To reuse an existing icon under another id, set `ref` to the target key:
 *   lines: { ref: "note" },
 *
 * Available: light-mode, dark-mode, auto-mode, lines, info, success, note, warning, error, important, chevron-up, chevron-down, arrow-outward, link, fullscreen, fullscreen-exit, upload, calendar, check
 */

const SVG_NS = "http://www.w3.org/2000/svg";

/** Reusable attribution strings for licensed icon sets. */
export const ICON_ATTRIBUTIONS = {
  materialIcons:
    "Icon from Google Material Icons by Material Design Authors - https://github.com/material-icons/material-icons/blob/master/LICENSE",
};

/** @typedef {{ viewBox: string, markup: string, attribution?: string, name?: string }} IconSvgDef */
/** @typedef {{ ref: string }} IconRefDef */
/** @typedef {IconSvgDef | IconRefDef} IconDef */

/** @type {Record<string, IconDef>} */
export const ICONS = {
  "light-mode": {
    viewBox: "0 0 24 24",
    markup: `<path fill="currentColor" d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5s5-2.24 5-5s-2.24-5-5-5M2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1m18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1M11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1m0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1M5.99 4.58a.996.996 0 0 0-1.41 0a.996.996 0 0 0 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41zm12.37 12.37a.996.996 0 0 0-1.41 0a.996.996 0 0 0 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0a.996.996 0 0 0 0-1.41zm1.06-10.96a.996.996 0 0 0 0-1.41a.996.996 0 0 0-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0zM7.05 18.36a.996.996 0 0 0 0-1.41a.996.996 0 0 0-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0z"/>`,
    attribution: ICON_ATTRIBUTIONS.materialIcons,
    name: "round-light-mode",
  },
  "dark-mode": {
    viewBox: "0 0 24 24",
    markup: `<path fill="currentColor" d="M11.57 2.3c2.38-.59 4.68-.27 6.63.64c.35.16.41.64.1.86C15.7 5.6 14 8.6 14 12s1.7 6.4 4.3 8.2c.32.22.26.7-.09.86c-1.28.6-2.71.94-4.21.94c-6.05 0-10.85-5.38-9.87-11.6c.61-3.92 3.59-7.16 7.44-8.1"/>`,
    attribution: ICON_ATTRIBUTIONS.materialIcons,
    name: "round-nightlight",
  },
  "auto-mode": {
    viewBox: "0 0 24 24",
    markup: `<path fill="currentColor" d="M12 22c5.52 0 10-4.48 10-10S17.52 2 12 2S2 6.48 2 12s4.48 10 10 10m1-17.93c3.94.49 7 3.85 7 7.93s-3.05 7.44-7 7.93z"/>`,
    attribution: ICON_ATTRIBUTIONS.materialIcons,
    name: "round-contrast",
  },
  lines: { ref: "note" },
  info: {
    viewBox: "0 0 24 24",
    markup: `<path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2m0 15c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1s1 .45 1 1v4c0 .55-.45 1-1 1m1-8h-2V7h2z"/>`,
    attribution: ICON_ATTRIBUTIONS.materialIcons,
    name: "round-info",
  },
  success: {
    viewBox: "0 0 24 24",
    markup: `<path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2M9.29 16.29L5.7 12.7a.996.996 0 1 1 1.41-1.41L10 14.17l6.88-6.88a.996.996 0 1 1 1.41 1.41l-7.59 7.59a.996.996 0 0 1-1.41 0"/>`,
    attribution: ICON_ATTRIBUTIONS.materialIcons,
    name: "round-check-circle",
  },
  note: {
    viewBox: "0 0 24 24",
    markup: `<path fill="currentColor" d="M20 11H4c-.55 0-1 .45-1 1s.45 1 1 1h16c.55 0 1-.45 1-1s-.45-1-1-1M4 18h10c.55 0 1-.45 1-1s-.45-1-1-1H4c-.55 0-1 .45-1 1s.45 1 1 1M20 6H4c-.55 0-1 .45-1 1v.01c0 .55.45 1 1 1h16c.55 0 1-.45 1-1V7c0-.55-.45-1-1-1"/>`,
    attribution: ICON_ATTRIBUTIONS.materialIcons,
    name: "round-notes",
  },
  important: {
    viewBox: "0 0 24 24",
    markup: `<path fill="currentColor" d="m12 17.27l4.15 2.51c.76.46 1.69-.22 1.49-1.08l-1.1-4.72l3.67-3.18c.67-.58.31-1.68-.57-1.75l-4.83-.41l-1.89-4.46c-.34-.81-1.5-.81-1.84 0L9.19 8.63l-4.83.41c-.88.07-1.24 1.17-.57 1.75l3.67 3.18l-1.1 4.72c-.2.86.73 1.54 1.49 1.08z"/>`,
    attribution: ICON_ATTRIBUTIONS.materialIcons,
    name: "round-star",
  },
  warning: {
    viewBox: "0 0 24 24",
    markup: `<path fill="currentColor" d="M4.47 21h15.06c1.54 0 2.5-1.67 1.73-3L13.73 4.99c-.77-1.33-2.69-1.33-3.46 0L2.74 18c-.77 1.33.19 3 1.73 3M12 14c-.55 0-1-.45-1-1v-2c0-.55.45-1 1-1s1 .45 1 1v2c0 .55-.45 1-1 1m1 4h-2v-2h2z"/>`,
    attribution: ICON_ATTRIBUTIONS.materialIcons,
    name: "round-warning",
  },
  error: {
    viewBox: "0 0 24 24",
    markup: `<path fill="currentColor" d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10s10-4.47 10-10S17.53 2 12 2m4.3 14.3a.996.996 0 0 1-1.41 0L12 13.41L9.11 16.3a.996.996 0 1 1-1.41-1.41L10.59 12L7.7 9.11A.996.996 0 1 1 9.11 7.7L12 10.59l2.89-2.89a.996.996 0 1 1 1.41 1.41L13.41 12l2.89 2.89c.38.38.38 1.02 0 1.41"/>`,
    attribution: ICON_ATTRIBUTIONS.materialIcons,
    name: "round-cancel",
  },
  "chevron-up": {
    viewBox: "0 0 24 24",
    markup: `<path fill="currentColor" d="M8.12 14.71L12 10.83l3.88 3.88a.996.996 0 1 0 1.41-1.41L12.7 8.71a.996.996 0 0 0-1.41 0L6.7 13.3a.996.996 0 0 0 0 1.41c.39.38 1.03.39 1.42 0"/>`,
    attribution: ICON_ATTRIBUTIONS.materialIcons,
    name: "round-keyboard-arrow-up",
  },
  "chevron-down": {
    viewBox: "0 0 24 24",
    markup: `<path fill="currentColor" d="M15.88 9.29L12 13.17L8.12 9.29a.996.996 0 1 0-1.41 1.41l4.59 4.59c.39.39 1.02.39 1.41 0l4.59-4.59a.996.996 0 0 0 0-1.41c-.38-.38-1.03-.39-1.42 0"/>`,
    attribution: ICON_ATTRIBUTIONS.materialIcons,
    name: "round-keyboard-arrow-down",
  },
  "arrow-outward": {
    viewBox: "0 0 24 24",
    markup: `<path fill="currentColor" d="m16 8.4l-8.9 8.9q-.275.275-.7.275t-.7-.275t-.275-.7t.275-.7L14.6 7H7q-.425 0-.712-.288T6 6t.288-.712T7 5h10q.425 0 .713.288T18 6v10q0 .425-.288.713T17 17t-.712-.288T16 16z"/>`,
    attribution: ICON_ATTRIBUTIONS.materialIcons,
    name: "arrow-outward-rounded",
  },
  "link": {
    viewBox: "0 0 24 24",
    markup: `<path fill="currentColor" d="M7 17q-2.075 0-3.537-1.463T2 12t1.463-3.537T7 7h3q.425 0 .713.288T11 8t-.288.713T10 9H7q-1.25 0-2.125.875T4 12t.875 2.125T7 15h3q.425 0 .713.288T11 16t-.288.713T10 17zm2-4q-.425 0-.712-.288T8 12t.288-.712T9 11h6q.425 0 .713.288T16 12t-.288.713T15 13zm5 4q-.425 0-.712-.288T13 16t.288-.712T14 15h3q1.25 0 2.125-.875T20 12t-.875-2.125T17 9h-3q-.425 0-.712-.288T13 8t.288-.712T14 7h3q2.075 0 3.538 1.463T22 12t-1.463 3.538T17 17z"/>`,
    attribution: ICON_ATTRIBUTIONS.materialIcons,
    name: "link-rounded",
  },
  "fullscreen": {
    viewBox: "0 0 24 24",
    markup: `<path fill="currentColor" d="M5 19h2q.425 0 .713.288T8 20t-.288.713T7 21H4q-.425 0-.712-.288T3 20v-3q0-.425.288-.712T4 16t.713.288T5 17zm14 0v-2q0-.425.288-.712T20 16t.713.288T21 17v3q0 .425-.288.713T20 21h-3q-.425 0-.712-.288T16 20t.288-.712T17 19zM5 5v2q0 .425-.288.713T4 8t-.712-.288T3 7V4q0-.425.288-.712T4 3h3q.425 0 .713.288T8 4t-.288.713T7 5zm14 0h-2q-.425 0-.712-.288T16 4t.288-.712T17 3h3q.425 0 .713.288T21 4v3q0 .425-.288.713T20 8t-.712-.288T19 7z"/>`,
    attribution: ICON_ATTRIBUTIONS.materialIcons,
    name: "fullscreen-rounded",
  },
  "fullscreen-exit": {
    viewBox: "0 0 24 24",
    markup: `<path fill="currentColor" d="M6 18H4q-.425 0-.712-.288T3 17t.288-.712T4 16h3q.425 0 .713.288T8 17v3q0 .425-.288.713T7 21t-.712-.288T6 20zm12 0v2q0 .425-.288.713T17 21t-.712-.288T16 20v-3q0-.425.288-.712T17 16h3q.425 0 .713.288T21 17t-.288.713T20 18zM6 6V4q0-.425.288-.712T7 3t.713.288T8 4v3q0 .425-.288.713T7 8H4q-.425 0-.712-.288T3 7t.288-.712T4 6zm12 0h2q.425 0 .713.288T21 7t-.288.713T20 8h-3q-.425 0-.712-.288T16 7V4q0-.425.288-.712T17 3t.713.288T18 4z"/>`,
    attribution: ICON_ATTRIBUTIONS.materialIcons,
    name: "fullscreen-exit-rounded",
  },
  upload: {
    viewBox: "0 0 24 24",
    markup: `<path fill="currentColor" d="M12 15.575q-.2 0-.375-.062T11.3 15.3l-3.6-3.6q-.3-.3-.288-.7t.288-.7q.3-.3.713-.312t.712.287L11 12.15V5q0-.425.288-.712T12 4t.713.288T13 5v7.15l1.875-1.875q.3-.3.713-.288t.712.313q.275.3.288.7t-.288.7l-3.6 3.6q-.15.15-.325.213t-.375.062M6 20q-.825 0-1.412-.587T4 18v-2q0-.425.288-.712T5 15t.713.288T6 16v2h12v-2q0-.425.288-.712T19 15t.713.288T20 16v2q0 .825-.587 1.413T18 20z"/>`,
    attribution: ICON_ATTRIBUTIONS.materialIcons,
    name: "round-upload",
  },
  calendar: {
    viewBox: "0 0 24 24",
    markup: `<path fill="currentColor" d="M5 22q-.825 0-1.412-.587T3 20V6q0-.825.588-1.412T5 4h1V3q0-.425.288-.712T7 2t.713.288T8 3v1h8V3q0-.425.288-.712T17 2t.713.288T18 3v1h1q.825 0 1.413.588T21 6v14q0 .825-.587 1.413T19 22zm0-2h14V10H5z"/>`,
    attribution: ICON_ATTRIBUTIONS.materialIcons,
    name: "calendar-today-rounded",
  },
  check: {
    viewBox: "0 0 24 24",
    markup: `<path fill="currentColor" d="m9.55 15.15l8.475-8.475q.3-.3.7-.3t.7.3t.3.713t-.3.712l-9.175 9.2q-.3.3-.7.3t-.7-.3L4.55 13q-.3-.3-.288-.712t.313-.713t.713-.3t.712.3z"/>`,
    attribution: ICON_ATTRIBUTIONS.materialIcons,
    name: "check-rounded",
  },
};

/**
 * @param {string} name
 * @param {Set<string>} [seen]
 * @returns {IconSvgDef}
 */
function resolveIconDef(name, seen = new Set()) {
  if (seen.has(name)) {
    throw new Error(`Icon ref cycle: ${[...seen, name].join(" → ")}`);
  }

  const entry = ICONS[name];
  if (!entry) {
    throw new Error(`Unknown icon: ${name}`);
  }

  if ("ref" in entry) {
    seen.add(name);
    return resolveIconDef(entry.ref, seen);
  }

  return entry;
}

function appendAttribution(svg, text) {
  if (!text) return;
  svg.insertBefore(document.createComment(` ${text} `), svg.firstChild);
}

/**
 * @param {string} name
 * @param {{ className?: string, includeAttribution?: boolean }} [options]
 */
export function createIcon(name, { className = "", includeAttribution = true } = {}) {
  const def = resolveIconDef(name);

  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", def.viewBox);
  svg.setAttribute("aria-hidden", "true");
  if (className) {
    svg.setAttribute("class", className);
  }
  svg.innerHTML = def.markup;
  if (includeAttribution && def.attribution) {
    appendAttribution(svg, def.attribution);
  }
  return svg;
}

/**
 * @param {Element} element
 * @param {string} name
 * @param {{ className?: string, replace?: boolean, includeAttribution?: boolean }} [options]
 */
export function mountIcon(element, name, { className = "", replace = true, includeAttribution = true } = {}) {
  const iconClass = className || element.dataset.iconClass || "";
  const svg = createIcon(name, { className: iconClass, includeAttribution });

  if (replace) {
    element.replaceChildren(svg);
  } else {
    element.append(svg);
  }

  return svg;
}

/** Mount icons on elements with `data-icon` (optional `data-icon-class`). */
export function initIcons(root = document) {
  root.querySelectorAll("[data-icon]").forEach((element) => {
    mountIcon(element, element.dataset.icon, {
      className: element.dataset.iconClass || "",
    });
  });
}
