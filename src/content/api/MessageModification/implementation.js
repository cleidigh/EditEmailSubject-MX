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
        
        getMessageServerType: async function(aID) {
          let msgHdr = context.extension.messageManager.get(aID);
          if (msgHdr) {
            return msgHdr.folder.server.type;
          }
          return false;          
        },
        
        updateMessage: async function(aID, aContent) {
          // CopyFileMessage uses a callback -> Promisify
          return new Promise(function(resolve, reject) {
            let msgHdr = context.extension.messageManager.get(aID);
            
            let copyListener = {
                QueryInterface : ChromeUtils.generateQI(["nsIMsgCopyServiceListener"]),
                GetMessageId: function (messageId) {},
                OnProgress: function (progress, progressMax) {},
                OnStartCopy: function () {},
                OnStopCopy: function (status) {
                  resolve(true);
                },
                SetMessageKey: function (key) {
                    /*if (msgHdr.folder.server.type == "imap" || msgHdr.folder.server.type == "news") {
                        Components.classes["@mozilla.org/messenger/services/session;1"].getService(Components.interfaces.nsIMsgMailSession).AddFolderListener(objEditemailsubject.folderListener, Components.interfaces.nsIFolderListener.all);
                        objEditemailsubject.folderListener.key = key;
                        objEditemailsubject.folderListener.URI = objEditemailsubject.msgFolder.URI;
                    }
                    else setTimeout(function() {objEditemailsubject.postActions(key);}, 500);*/
                } 
            }
            
            if (msgHdr) {
              // openPGP is using similar code, maybe a bit more modern
              var tempFile = Services.dirsvc.get("TmpD", Ci.nsIFile);
              tempFile.append("EMS.eml");
              tempFile.createUnique(0, 436); // == 0664, octal is deprecated (openPGP is using 384=0600)
              
              var foStream = Components.classes["@mozilla.org/network/file-output-stream;1"].createInstance(Ci.nsIFileOutputStream);
              foStream.init(tempFile, 2, 0x200, false); // open as "write only"
              foStream.write(aContent, aContent.length);
              foStream.close();
                      
              //objEditemailsubject.list = Components.classes["@mozilla.org/array;1"].createInstance(Components.interfaces.nsIMutableArray);
              //objEditemailsubject.list.appendElement(objEditemailsubject.msgHeader, false);

              var fileSpec = Components.classes["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
              fileSpec.initWithPath(tempFile.path);
              var extService = Components.classes['@mozilla.org/uriloader/external-helper-app-service;1'].getService(Components.interfaces.nsPIExternalAppLauncher);
              extService.deleteTemporaryFileOnExit(fileSpec);

              var copyMess = Components.classes["@mozilla.org/messenger/messagecopyservice;1"].getService(Components.interfaces.nsIMsgCopyService);
              copyMess.CopyFileMessage(fileSpec, msgHdr.folder, null, false, msgHdr.flags, msgHdr.getStringProperty("keywords"), copyListener, null /*msgWindow*/);
            } else {
              resolve(null);
            }
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
