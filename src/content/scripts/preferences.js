var eesPreferences = {
  setDefaults: async function (defaultPrefs) {
    // set defaultPrefs in local storage, so we can access them from everywhere
    const prefs = Object.keys(defaultPrefs);
    for (const pref of prefs) {
      await messenger.storage.local.set({ ["pref.default." + pref]: defaultPrefs[pref] });
    }
  },

  load: async function (document) {
    for (let node of document.querySelectorAll("[preference]")) {
      if (node.getAttribute("instantApply") == "true") {
        node.addEventListener("command", function (event) { eesPreferences.savePref(event.target); });
        node.addEventListener("change", function (event) { eesPreferences.savePref(event.target); });
      }
      this.loadPref(node);
    }
  },

  save: async function (document) {
    for (let node of document.querySelectorAll("[preference]")) {
      this.savePref(node);
    }
  },

  loadPref: async function (node) {
    let prefName = node.getAttribute("preference");
    let prefValue = await this.getPrefValue(prefName);
    let nodeName = node.tagName.toLowerCase().split(":").pop() + (node.hasAttribute("type") ? "." + node.getAttribute("type").toLowerCase() : "");

    // nodename will have the namespace prefix removed and the value of the type attribute (if any) appended
    switch (nodeName) {
      case "checkbox":
      case "input.checkbox":
        node.checked = prefValue;
        break;

      case "textbox":
      case "input.text":
      default:
        node.setAttribute("value", prefValue);
        break;
    }
  },

  savePref: async function (node) {
    let prefName = node.getAttribute("preference");
    let nodeName = node.tagName.toLowerCase().split(":").pop() + (node.hasAttribute("type") ? "." + node.getAttribute("type").toLowerCase() : "");

    // nodename will have the namespace prefix removed and the value of the type attribute (if any) appended
    switch (nodeName) {
      case "checkbox":
      case "input.checkbox":
        await this.setPrefValue(prefName, node.checked);
        break;

      case "textbox":
      case "input.text":
      default:
        await this.setPrefValue(prefName, node.value);
        break;
    }
  },



  getPrefValue: async function (aName, aFallback = null) {
    let defaultValue = await messenger.storage.local.get({ ["pref.default." + aName]: aFallback });
    let value = await messenger.storage.sync.get({ ["pref.value." + aName]: defaultValue["pref.default." + aName] });
    return value["pref.value." + aName];
  },

  setPrefValue: async function (aName, aValue) {
    await messenger.storage.sync.set({ ["pref.value." + aName]: aValue });
  }

};
