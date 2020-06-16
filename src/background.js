async function main() {
  // init ConversionHelper
    
  await messenger.ConversionHelper.init("chrome://editemailsubject/content/api/ConversionHelper/ConversionHelper.jsm");
  // notify legacy code that startup of background script has finished
  await messenger.ConversionHelper.notifyStartupCompleted();
}

main();
