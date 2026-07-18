/** App logo / favicon — header and browser tab. */
export const APP_ICON_SRC = {
  light: "app/res/app-light.svg",
  dark: "app/res/app-dark.svg",
};

/** Signature mark — footer brand link. */
export const SIG_ICON_SRC = {
  light: "app/res/sig-light.svg",
  dark: "app/res/sig-dark.svg",
};

/**
 * @param {"light" | "dark" | string | undefined} theme
 * @returns {string}
 */
export function appIconSrc(theme = document.documentElement.dataset.theme) {
  return theme === "dark" ? APP_ICON_SRC.dark : APP_ICON_SRC.light;
}

/**
 * @param {"light" | "dark" | string | undefined} theme
 * @returns {string}
 */
export function sigIconSrc(theme = document.documentElement.dataset.theme) {
  return theme === "dark" ? SIG_ICON_SRC.dark : SIG_ICON_SRC.light;
}

/** Update favicon and any `[data-brand-icon]` image or link. */
export function syncBrandIcons(theme) {
  const src = appIconSrc(theme);
  document.querySelectorAll("[data-brand-icon]").forEach((el) => {
    if (el instanceof HTMLLinkElement) el.href = src;
    else if (el instanceof HTMLImageElement) el.src = src;
  });
}
