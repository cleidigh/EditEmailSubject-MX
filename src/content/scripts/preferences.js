var editEmailSubjectPreferences = {
  pathToConversionHelperJSM: "chrome://editemailsubject/content/api/ConversionHelper/ConversionHelper.jsm",

  setDefaults: async function(defaultPrefs) {
      // set defaultPrefs in local storage, so we can access them from everywhere
      const prefs = Object.keys(defaultPrefs);
      for (const pref of prefs) {
          await messenger.storage.local.set({ ["pref.default." + pref] : defaultPrefs[pref] });
      }
    },
    
    migrateFromLegacy: async function(defaultPrefs, prefBranch) {
      const prefs = Object.keys(defaultPrefs);
      for (const pref of prefs) {
        let legacyValue = await messenger.LegacyPrefs.get(prefBranch + pref, defaultPrefs[pref]);
        if (legacyValue !== null) {
          console.log("Migrating legacy preference <" + prefBranch + pref + "> = <" + legacyValue + ">.");
          await messenger.storage.sync.set({ ["pref.value." + pref] : legacyValue });
          await messenger.LegacyPrefs.clear(prefBranch + pref);
        }
      }
    },
    
    load: async function(document) {
      for (let node of document.querySelectorAll("[preference]")) {
        if (node.getAttribute("instantApply") == "true") {
          node.addEventListener("command", function(event) {editEmailSubjectPreferences.savePref(event.target);});
          node.addEventListener("change", function(event) {editEmailSubjectPreferences.savePref(event.target);});
        }
      this.loadPref(node);    
      }
    },

    save: async function(document) {
      for (let node of document.querySelectorAll("[preference]")) {
        this.savePref(node);    
      }
    },

    loadPref: async function(node) {
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

    savePref: async function(node) {
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
    



    setupStorage: async function() {
      if (this.storage)
        return;

      //check wether we run in WX or legacy environment
      try {
        if (browser) this.storage = await messenger.storage;
      } catch (e) {
        let { ConversionHelper } = ChromeUtils.import(editEmailSubjectPreferences.pathToConversionHelperJSM);
        await ConversionHelper.webExtensionStartupCompleted();
        this.storage = await ConversionHelper.storage;
      }
    },

    getPrefValue: async function(aName, aFallback = null) {
      await this.setupStorage();
      let defaultValue = await this.storage.local.get({ ["pref.default." + aName] : aFallback });
      let value = await this.storage.sync.get({ ["pref.value." + aName] :  defaultValue["pref.default." + aName] });
      return value["pref.value." + aName];
    },

    setPrefValue: async function(aName, aValue) {
      await this.setupStorage();
      await this.storage.sync.set({ ["pref.value." + aName] : aValue });
    }

};
