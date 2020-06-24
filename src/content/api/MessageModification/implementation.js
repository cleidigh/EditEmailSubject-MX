/* eslint-disable object-shorthand */

var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
  
var MessageModification = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {    
    
    return {
      MessageModification: {

        getSubjectOfSelectedMessage: async function() {
          this.window = Services.wm.getMostRecentWindow("mail:3pane");
          this.msgHeader = this.window.gDBView.hdrForFirstSelectedMessage;
          return this.msgHeader.mime2DecodedSubject;
        },

        setSubjectOfSelectedMessage: async function(aSubject) {
          if (this.msgHeader) this.msgHeader.subject = unescape(encodeURIComponent(aSubject));
        }

      },
    };
  }
};
