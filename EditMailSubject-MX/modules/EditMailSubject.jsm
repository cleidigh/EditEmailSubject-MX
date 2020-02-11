/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.  */

 ChromeUtils.import("resource://gre/modules/LegacyExtensionsUtils.jsm");
 ChromeUtils.import("resource://gre/modules/Preferences.jsm");
 ChromeUtils.import("resource://gre/modules/Services.jsm");
 ChromeUtils.import("resource://gre/modules/AddonManager.jsm");

this.EXPORTED_SYMBOLS = ["EditMailSubject"];

/**
 *  String Handler
 *    replaces legacy .properties processing    //XXX MX
 */
var EditMailSubject = {
  addonName: "editemailsubject",
  properties: "chrome://editemailsubject/locales/editemailsubject.properties",

  getString: function(aStringName, aParams) {
    let propName = this.properties;
    try {
      let props = Services.strings.createBundle(propName);

      if (aParams && aParams.length) {
        return props.formatStringFromName(aStringName, aParams, aParams.length);
      } else {
        return props.GetStringFromName(aStringName);
      }
    } catch (ex) {
      let s = `Failed to read ${aStringName} from ${propName}.`;
      Components.utils.reportError(s + " Error: " + ex);
      return s;
    }
  },

  /**
   * Get the window. Used heavily to get a reference to globals etc
   * @param (string) the window name, eg. "mail:3pane"
   * @return The window object for the called window
   */
  getWindow: function (thisWindow) {
    return Cc["@mozilla.org/appshell/window-mediator;1"]
            .getService(Ci.nsIWindowMediator)
            .getMostRecentWindow(thisWindow);
  },

  /**
   *  Open an URL on a new TAB or Window
   *  @param (string) url
   *  @param (null, string or integer)
   *    string = open/reopen Window with mode=1 and winId =`string`
   *    0 = open a new Window
   *    1 = open/reuse Window, winId =`extra`
   *    2 = open a new 'TAB' (may reuse other TABs like AddOn Mngr)
   *    null = open an external browser/mailto
   */
  openURL: function(aUrl, mode){
    mode = (mode == null) ? -1 : mode;
    var winId  = 'extra';
    if (typeof mode == "string") {
      winId = mode;
      mode = 1;
    }
    console.log(".jsm  openURL  aUrl:", aUrl, mode, winId);

    let window = EditMailSubject.getWindow("mail:3pane");
    // Counting some extra pixels for window decorations.
    let height = Math.min(window.screen.availHeight - 30, 1024);
    switch (mode) {
      case 0:
        window.open(aUrl, "_blank", "chrome,resizable,width=640,height=" + height);
        break;
      case 1:
        window.open(aUrl, winId, "chrome,resizable,toolbar,width=640,height=" + height);
        break;
      case 2:
        window.document.getElementById("tabmail").openTab("chromeTab", {
          chromePage: aUrl
        });
        break;

      default:
        var messenger = Cc["@mozilla.org/messenger;1"].createInstance()
          .QueryInterface(Ci.nsIMessenger);
        messenger.launchExternalURL(aUrl);
        break;
    }
  }
};


/**
 *  Legacy Prefs Handler
 *    Note: uses prefs store, need to be migrated
 */
function webExtensionPrefsMsgHandler(msg, sender, sendReply) {
  console.log(" webExtensionPrefsMsgHandler:", msg, sender, sendReply)

  let prefix ="extensions.editemailsubject." ;

  if (msg.action == "get-prefs") { //XXX MX  below change prefs names and default values
    sendReply({
      version: Preferences.get(prefix + "version", "2.1.1-mx"),
      localOnly: Preferences.get(prefix + "localOnly", true)
    });
  } else
  if (msg.action == "set-prefs") { //XXX MX  below change prefs names and default values
    Preferences.set(prefix + "version", msg.prefs.version);
    Preferences.set(prefix + "localOnly", msg.prefs.localOnly);
  }
}

/**
 * WebExtension startup code
 */
(async function() {
  let id = "editemailsubject@jcp.convenant";             //XXX MX
  let addon = await AddonManager.getAddonByID(id);

console.log("WebExtension startup code  addon:", addon)


  let res = Services.io.getProtocolHandler("resource").QueryInterface(Ci.nsIResProtocolHandler)
  let resourceURI = Services.io.newURI(res.resolveURI(Services.io.newURI("resource://editemailsubject/")));  //XXX MX

  let webext = LegacyExtensionsUtils.getEmbeddedExtensionFor({
    id: id,
    version: addon.version,
    resourceURI: resourceURI
  });
  console.log("WebExtension startup code  webext:", webext)

  if (webext.started) {
    return;
  }

  let { browser } = await webext.startup(1);

  browser.runtime.onMessage.addListener(webExtensionPrefsMsgHandler);
})().catch(Components.utils.reportError.bind(Components.utils));
