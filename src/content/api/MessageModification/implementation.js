/* eslint-disable object-shorthand */

var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

var MessageModification = class extends ExtensionCommon.ExtensionAPI {
  //simple sleep helper
  sleep (delay) {
    let timer =  Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
    return new Promise(function(resolve, reject) {
      let event = {
        notify: function(timer) {
          resolve();
        }
      }            
      timer.initWithCallback(event, delay, Components.interfaces.nsITimer.TYPE_ONE_SHOT);
    });
  }

  getAPI(context) {    
    context.callOnClose(this);
    let self = this;
    
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
        
        selectMessage: async function(aID) {
          let msgHdr = context.extension.messageManager.get(aID);
          let win = Services.wm.getMostRecentWindow("mail:3pane");
          win.gFolderTreeView.selectFolder(msgHdr.folder, true);
          win.gFolderDisplay.selectMessage(msgHdr);
        },

        getMessageFlags: async function(aID) {
          let msgHdr = context.extension.messageManager.get(aID);
          if (msgHdr) {
            return msgHdr.flags;
          }
          return false;          
        },

        getFolderServerType: async function(aMailFolder) {
          //https://searchfox.org/comm-central/source/mail/components/extensions/parent/ext-messages.js#115
          let folder = context.extension.folderManager.get(aMailFolder.accountId, aMailFolder.path);
          if (folder) {
            return folder.server.type;
          }
          return false;          
        },
        
        addRaw: async function(aContent, aMailFolder, aRefID) {
          return new Promise(function(resolve, reject) {
              let folder = context.extension.folderManager.get(aMailFolder.accountId, aMailFolder.path);

              // reference message for flags and stuff
              let refMsgHdr = context.extension.messageManager.get(aRefID);

              let copyListener = {
                QueryInterface : ChromeUtils.generateQI(["nsIMsgCopyServiceListener"]),
                GetMessageId: function (messageId) {},
                OnProgress: function (progress, progressMax) {},
                SetMessageKey: function (key) {
                  this.key = key;
                }, 
                OnStartCopy: function () {},
                OnStopCopy: async function (statusCode) {
                    if (statusCode === 0) {
                      // HACK: For some reason the newly added message is "unstable"
                      // in a short period after creation
                      // This works directly here after it has been added:
                      // let msgHeader = folder.GetMessageHeader(this.key);
                      // let newId = context.extension.messageManager.convert(msgHeader).id;
                      // let msgHdr = context.extension.messageManager.get(aID);
                      
                      // BUT if I call the last line later again, it returns an invalid msgHdr
                      // and if I call it even later, it works again *puzzled*
                      // Observed by calling selectMessage() after addRaw() has resolved
                      
                      // Adding a sleep here seems to help. I played with folderListeners as well, and
                      // instead of resolving in OnStopCopy, I resolved after the message was added
                      // and I could se, that it onAdd event was fired twice, but as I do not understand
                      // that code at all, I did not include it.
                      await self.sleep(200);
                      
                      let msgHeader = folder.GetMessageHeader(this.key);
                      let newId = context.extension.messageManager.convert(msgHeader).id;

                      if (msgHeader.flags & 2) folder.addMessageDispositionState(msgHeader, 0);
                      if (msgHeader.flags & 4096) folder.addMessageDispositionState(msgHeader, 1);                  
                      resolve(newId);
                    } else {
                      console.log("Error adding message: " + statusCode);
                    }
                }
              }
                                
              if (folder) {
                var tempFile = Services.dirsvc.get("TmpD", Ci.nsIFile);
                tempFile.append("EMS.eml");
                tempFile.createUnique(0, 436); // == 0664, octal is deprecated (openPGP is using 384=0600)
                
                var foStream = Components.classes["@mozilla.org/network/file-output-stream;1"].createInstance(Ci.nsIFileOutputStream);
                foStream.init(tempFile, 2, 0x200, false); // open as "write only"
                foStream.write(aContent, aContent.length);
                foStream.close();

                var fileSpec = Components.classes["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
                fileSpec.initWithPath(tempFile.path);
                var extService = Components.classes['@mozilla.org/uriloader/external-helper-app-service;1'].getService(Components.interfaces.nsPIExternalAppLauncher);
                extService.deleteTemporaryFileOnExit(fileSpec);

                var copyMess = Components.classes["@mozilla.org/messenger/messagecopyservice;1"].getService(Components.interfaces.nsIMsgCopyService);
                copyMess.CopyFileMessage(fileSpec, folder, null, false, refMsgHdr.flags, refMsgHdr.getStringProperty("keywords"), copyListener, null /*msgWindow*/);
              } else {
                resolve(false);
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
