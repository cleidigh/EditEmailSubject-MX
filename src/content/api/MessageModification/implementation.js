/* eslint-disable object-shorthand */

var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
  
var MessageModification = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {    
    context.callOnClose(this);

    return {
      MessageModification: {
        
        setSubjectOfMessage: async function(aID, aSubject) {
          let msgHdr = context.extension.messageManager.get(aID);
          if (msgHdr) {
            msgHdr.subject = unescape(encodeURIComponent(aSubject));
            return true;
          }
          return false;
        },
        
        getHeaderOfMessage: async function(aID) {
            return new Promise(function(resolve, reject) {
                let listener = {

                    QueryInterface : function(iid)  {
                            if (iid.equals(Components.interfaces.nsIStreamListener) || 
                                iid.equals(Components.interfaces.nsISupports))
                             return this;
                
                            throw Components.results.NS_NOINTERFACE;
                            return 0;
                    },
                    
                    onStartRequest : function (aRequest) {
                        this.text = "";			
                    },
                        
                    onDataAvailable : function (aRequest, aInputStream, aOffset, aCount) {
                        var scriptInStream = Components.classes["@mozilla.org/scriptableinputstream;1"].createInstance().QueryInterface(Components.interfaces.nsIScriptableInputStream);
                        scriptInStream.init(aInputStream);
                        this.text += scriptInStream.read(scriptInStream.available());
                     },

                    onStopRequest : function (aRequest, aStatusCode) {
                        console.log(this.text);
                        resolve(this.text);
                    }
                }

                let msgHdr = context.extension.messageManager.get(aID);
                if (!msgHdr) {
                  return null;
                }
                let aUri = msgHdr.folder.getUriForMsg(msgHdr);
                let messenger = Cc["@mozilla.org/messenger;1"].createInstance(Ci.nsIMessenger);
                let mms = messenger.messageServiceFromURI(aUri);
                mms.streamMessage(aUri, listener, null, null, false, null);
            });
        }
      },
    };
  }
  
  close() {
    // Flush all caches
    Services.obs.notifyObservers(null, "startupcache-invalidate");
  }  
};
