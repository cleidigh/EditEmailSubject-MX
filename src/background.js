async function main() {
  // init ConversionHelper
    
  await messenger.ConversionHelper.init("chrome://editemailsubject/content/api/ConversionHelper/ConversionHelper.jsm");

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
