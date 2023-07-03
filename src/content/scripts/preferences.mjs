export async function setDefaults(defaultPrefs) {
  // set defaultPrefs in local storage, so we can access them from everywhere
  const prefs = Object.keys(defaultPrefs);
  for (const pref of prefs) {
    await messenger.storage.local.set({ ["pref.default." + pref]: defaultPrefs[pref] });
  }
}

export async function load (document) {
  for (let node of document.querySelectorAll("[preference]")) {
    if (node.getAttribute("instantApply") == "true") {
      node.addEventListener("command", function (event) { savePref(event.target); });
      node.addEventListener("change", function (event) { savePref(event.target); });
    }
    loadPref(node);
  }
}

export async function save (document) {
  for (let node of document.querySelectorAll("[preference]")) {
    savePref(node);
  }
}

async function loadPref (node) {
  let prefName = node.getAttribute("preference");
  let prefValue = await getPrefValue(prefName);
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
}

async function savePref (node) {
  let prefName = node.getAttribute("preference");
  let nodeName = node.tagName.toLowerCase().split(":").pop() + (node.hasAttribute("type") ? "." + node.getAttribute("type").toLowerCase() : "");

  // nodename will have the namespace prefix removed and the value of the type attribute (if any) appended
  switch (nodeName) {
    case "checkbox":
    case "input.checkbox":
      await setPrefValue(prefName, node.checked);
      break;

    case "textbox":
    case "input.text":
    default:
      await setPrefValue(prefName, node.value);
      break;
  }
}

export async function getPrefValue (aName, aFallback = null) {
  let defaultValue = await messenger.storage.local.get({ ["pref.default." + aName]: aFallback });
  let value = await messenger.storage.sync.get({ ["pref.value." + aName]: defaultValue["pref.default." + aName] });
  return value["pref.value." + aName];
}

export async function setPrefValue (aName, aValue) {
  await messenger.storage.sync.set({ ["pref.value." + aName]: aValue });
}
