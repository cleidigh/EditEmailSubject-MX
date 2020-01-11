/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2018 */

(async function() {
  let storagePrefs = await browser.runtime.sendMessage({ action: "get-prefs" });
  await browser.storage.local.set(storagePrefs);

console.log(" options.js   get Prefs: ",storagePrefs)

  for (let [name, value] of Object.entries(storagePrefs)) {
    let node = document.getElementById(name);
    if (node != null){
      console.log(" get Prefs  name:", name)
      if (typeof value == "boolean") {
        node.checked = value;
      } else {
        node.value = value;
      }
    } else {
      console.error(" get Prefs  ERROR unknown prefs: ", name)
    }
  }

  for (let node of document.querySelectorAll("[data-l10n-id]")) {

console.log(" options.js   get `locale` for: ",node)

    let l10nid = node.getAttribute("data-l10n-id");
    node.textContent = browser.i18n.getMessage(l10nid);

    // Set the title attribute
    if (node.localName == "label") {
      node = node.parentNode;
    }
  /*
   *   A `node` on the page should handle tooltiptext ... but doesn't
   *    ... not clear why!
   */
  //??  node.title = browser.i18n.getMessage(l10nid + ".title");
  //??  node.tooltiptext = browser.i18n.getMessage(l10nid + ".tooltiptext");
  }

  /*
   *  Read changed values and stote to `prefs`
   */
  document.body.addEventListener("change", () => {
    let prefs = {  //XXX MX
      //string     aString: document.getElementById("aNumber").value
      //integer    aNumber: parseInt(document.getElementById("aNumber").value, 10)
      //boolean    aboolean: document.getElementById("aboolean").checked

      version: document.getElementById("version").value,
      localOnly: document.getElementById("localOnly").checked
    };

    browser.runtime.sendMessage({ action: "set-prefs", prefs: prefs });
    browser.storage.local.set(prefs);
  });
})();
