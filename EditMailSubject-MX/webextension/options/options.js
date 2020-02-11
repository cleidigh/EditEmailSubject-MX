/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2018
 * Portions Copyright (C) Guenter Wahl, 2020
 */

this.EXPORTED_SYMBOLS = ["EditMailSubjectOptions"];

/*
*   `options.js` is called with loading `options.html`
*    it prepares the `prefs` and the `locales` strings
*    for the html page.
*/

(async function() {
  // Preferences -----
  let storagePrefs = await browser.runtime.sendMessage({
    action: "get-prefs"
  });
  await browser.storage.local.set(storagePrefs);

  for (let [name, value] of Object.entries(storagePrefs)) {
    let node = document.getElementById(name);
    if (node != null) {
      console.log(" get Prefs  name:", name)
      if (typeof value == "boolean") {
        node.checked = value;
      } else {
        if(node.nodeType == 1) node.textContent = value;
        node.value = value;
      }
    } else {
      console.error(" get-Prefs  ERROR unknown prefs: ", name)
    }
  }

  await EditMailSubjectOptions.localization();

  /*
   *  Updating the `localStorage` with changed values,
   *  read them from the html page and store to `prefs`
   */
  document.body.addEventListener("change", () => {
    let prefs = {  //XXX MX
      //string     aString: document.getElementById("aNumber").value
      //integer    aNumber: parseInt(document.getElementById("aNumber").value, 10)
      //boolean    aboolean: document.getElementById("aboolean").checked

      version: document.getElementById("version").value,
      localOnly: document.getElementById("localOnly").checked
    };

    browser.runtime.sendMessage({
      action: "set-prefs",
      prefs: prefs
    });
    browser.storage.local.set(prefs);
  });

})();


// Helper functions
var EditMailSubjectOptions = {
  localization: function() {
    // Localize Text Strings i18n -----
    // References: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/i18n
    //             https://www.chromium.org/developers/design-documents/extensions/how-the-extension-system-works/i18n
    //  This section based on https://github.com/erosman/HTML-Internationalization
    //  MPL2 License: https://discourse.mozilla.org/t/translating-options-pages/19604/23
    for (const node of document.querySelectorAll("[data-i18n]")) {
      let [text, attr] = node.dataset.i18n.split("|");
      text = resolveSub(browser.i18n.getMessage(text));
      attr
        ?
        (node[attr] = text) :
        node.appendChild(document.createTextNode(text));
    }

    // Compatibilty with XUL/dtd feature `&string;`
    // Substrings like `&string;` as part of the passed string point to another
    // string definition. `resolveSub` resolves this. Nested substrings are allowed.
    function resolveSub(textString) {
      while (textString.search("&") > -1 && textString.search(";") > -1 ) {
        let posStart = textString.indexOf("&");
        let posEnd = textString.indexOf(";");
        if (posEnd == -1) break;
        if ((posStart > -1) && (posEnd > posStart)) {
          let str0 = textString.substring(posStart + 1, posEnd);
          textString = textString.replace("&" + str0 + ";", browser.i18n.getMessage(str0));
        }
      }
      return textString;
    }
  }
}
