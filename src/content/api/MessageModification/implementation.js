/* eslint-disable object-shorthand */

var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
  
var MessageModification = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {    
    
    return {
      MessageModification: {
        
        getSelectedMessages: async function() {
          let window = Services.wm.getMostRecentWindow("mail:3pane");          
          return window.gDBView.getIndicesForSelection();
        },

        getSubjectOfMessage: async function(aIndex) {
          let window = Services.wm.getMostRecentWindow("mail:3pane");
          let msgHeader = window.gDBView.getMsgHdrAt(aIndex);
          return msgHeader.mime2DecodedSubject;
        },

        setSubjectOfMessage: async function(aIndex, aSubject) {
          let window = Services.wm.getMostRecentWindow("mail:3pane");
          let msgHeader = window.gDBView.getMsgHdrAt(aIndex);
          if (msgHeader) {
            msgHeader.subject = unescape(encodeURIComponent(aSubject));
            return true;
          }
          return false;
        }

      },
    };
  }
};
