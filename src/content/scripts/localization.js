/*
 license: The MIT License, Copyright (c) 2016-2019 YUKI "Piro" Hiroshi
 original: http://github.com/piroor/webextensions-lib-l10n
 
  Modification by John Bieling:
   * Auto select ConversionHelper.i18n or browser.i18n
   * Removed logging
*/

var localization = {
  get i18n() {
    if (!this._i18n) {
      // Check wether this is called from the WebExtension part of the add-on,
      // or from the legacy part, where the ConversionHelper provides the API.
      // If the ConversionHelper is no longer needed, because the add-on has
      // been converted to a pure WebExtension, this may simply return
      // browser.1i8n
      let rv = null;
      try {
        rv = ConversionHelper.i18n;
      } catch (e) {
        //not there, fallback to browser
      }
      
      this._i18n = rv || chrome.i18n;
    }
    
    return this._i18n;
  },
  
  updateString(string) {
    return string.replace(/__MSG_(.+?)__/g, matched => {
      const key = matched.slice(6, -2);
      return this.i18n.getMessage(key) || matched;
    });
  },

  updateSubtree(node) {
    const texts = document.evaluate(
      'descendant::text()[contains(self::text(), "__MSG_")]',
      node,
      null,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
      null
    );
    for (let i = 0, maxi = texts.snapshotLength; i < maxi; i++) {
      const text = texts.snapshotItem(i);
      text.nodeValue = this.updateString(text.nodeValue);
    }

    const attributes = document.evaluate(
      'descendant::*/attribute::*[contains(., "__MSG_")]',
      node,
      null,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
      null
    );
    for (let i = 0, maxi = attributes.snapshotLength; i < maxi; i++) {
      const attribute = attributes.snapshotItem(i);
      attribute.value = this.updateString(attribute.value);
    }
  },

  updateDocument() {
    this.updateSubtree(document);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  localization.updateDocument();
}, { once: true });

