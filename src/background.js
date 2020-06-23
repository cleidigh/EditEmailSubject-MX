async function main() {
  // register chrome URLs, just like in the now obsolete chrome.manifest
  await messenger.ConversionHelper.registerChromeUrl([ ["content", "editemailsubject", "content/"] ]);
  await messenger.ConversionHelper.registerApiFolder("chrome://editemailsubject/content/api/ConversionHelper/");

  // define default prefs and migrate legacy settings
  let defaultPrefs = {
    "version": "2.1.1",
    "localOnly": true
  };
  await editEmailSubjectPreferences.setDefaults(defaultPrefs);
  await editEmailSubjectPreferences.migrateFromLegacy(defaultPrefs, "extensions.editemailsubject.");

  // notify legacy code that startup of background script has finished
  await messenger.ConversionHelper.notifyStartupCompleted();
}

main();
