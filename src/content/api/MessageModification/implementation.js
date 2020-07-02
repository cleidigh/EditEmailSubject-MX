/* eslint-disable object-shorthand */

var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { setTimeout, clearTimeout } = ChromeUtils.import("resource://gre/modules/Timer.jsm");
// inculding EnigmailStdlib because it includes msgHdrsDelete
var { EnigmailStdlib } = ChromeUtils.import( "chrome://openpgp/content/modules/stdlib.jsm");

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
        
        selectMessage: async function(aID) {
          const msgHdr = context.extension.messageManager.get(aID);
          const win = Services.wm.getMostRecentWindow("mail:3pane");
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
        
        addRaw: async function(aContent, aMailFolder, aID) {
          return new Promise(function(resolve, reject) {
              let folder = context.extension.folderManager.get(aMailFolder.accountId, aMailFolder.path);

              //to be replaced
              let msgHdr = context.extension.messageManager.get(aID);

              let postActionInfo = {};              
              let postActions = function() {
                  let msgHeader = folder.GetMessageHeader(postActionInfo.key);
                  let newId = context.extension.messageManager.convert(msgHeader).id;
                  if (msgHeader.flags & 2) folder.addMessageDispositionState(msgHeader,0);
                  if (msgHeader.flags & 4096) folder.addMessageDispositionState(msgHeader,1);                  
                  return newId;
                  //Delete old mail
                  //let list = Components.classes["@mozilla.org/array;1"].createInstance(Components.interfaces.nsIMutableArray);
                  //list.appendElement(msgHdr, false);
                  //folder.deleteMessages(list,null,true,true,null,false);
                  //we delete using the
              };

              let copyListener = {
                QueryInterface : ChromeUtils.generateQI(["nsIMsgCopyServiceListener"]),
                GetMessageId: function (messageId) {},
                OnProgress: function (progress, progressMax) {},
                SetMessageKey: function (key) {
                  console.log("EES: SetMessageKey");
                  postActionInfo.key = key;
                  postActionInfo.URI = folder.URI;
                }, 
                OnStartCopy: function () {},
                OnStopCopy: function (statusCode) {
                    if (statusCode === 0) {
                      console.log("EES: Copy complete");
                      //IMAP and NEWS needs time and we should listen for the folder...
                      resolve(postActions());
                    } else {
                      console.log("EES: Error copying message: " + statusCode);
                      resolve(false);
                    }
                }
            }
            
            if (folder) {
              // openPGP is using similar code, maybe a bit more modern
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
              copyMess.CopyFileMessage(fileSpec, folder, null, false, msgHdr.flags, msgHdr.getStringProperty("keywords"), copyListener, null /*msgWindow*/);
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
