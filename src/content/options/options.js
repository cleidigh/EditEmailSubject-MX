import * as preferences from "/content/scripts/preferences.mjs";

document.addEventListener('DOMContentLoaded', () => {
  preferences.load(document);
}, { once: true });
