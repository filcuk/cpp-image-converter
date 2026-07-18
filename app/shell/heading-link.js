import { createIcon } from "../utils/icons.js";
import { openTooltip } from "../components/tooltip.js";

const TOOLTIP_DEFAULT = "Get link";
const TOOLTIP_COPIED = "Copied!";

function headingUrl(heading) {
  const { origin, pathname, search } = window.location;
  return `${origin}${pathname}${search}#${heading.id}`;
}

/**
 * Add a hover-revealed link icon to section headings; click copies the heading URL.
 *
 * @param {ParentNode} [root=document]
 * @param {{ selector?: string }} [options]
 */
export function initHeadingLinks(
  root = document,
  { selector = "main h2[id]" } = {}
) {
  for (const heading of root.querySelectorAll(selector)) {
    if (!(heading instanceof HTMLElement)) continue;
    if (!heading.id || heading.dataset.headingLink !== undefined) continue;

    heading.classList.add("heading-anchor");
    heading.dataset.headingLink = "";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "heading-link-btn";
    button.dataset.tooltip = TOOLTIP_DEFAULT;
    button.dataset.tooltipPosition = "top";
    button.setAttribute("aria-label", "Copy section link");
    button.append(createIcon("link", { className: "heading-link-icon" }));

    button.addEventListener("click", async () => {
      history.replaceState(null, "", `#${heading.id}`);

      try {
        await navigator.clipboard.writeText(headingUrl(heading));
        button.dataset.tooltip = TOOLTIP_COPIED;
      } catch {
        button.dataset.tooltip = "Copy failed";
      }

      button.blur();
      openTooltip(button);

      window.setTimeout(() => {
        button.dataset.tooltip = TOOLTIP_DEFAULT;
      }, 2000);
    });

    heading.append(button);
  }
}
