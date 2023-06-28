/* eslint-disable object-shorthand */

var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
var { MailServices } = ChromeUtils.import("resource:///modules/MailServices.jsm");
var { XPCOMUtils } = ChromeUtils.import(
  "resource://gre/modules/XPCOMUtils.jsm"
);

XPCOMUtils.defineLazyGlobalGetters(this, ["IOUtils", "PathUtils"]);

var MessageModification = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {
    return {
      MessageModification: {
        setSubjectOfMessage: async function (aID, aSubject) {
          let msgHdr = context.extension.messageManager.get(aID);
          if (msgHdr) {
            msgHdr.subject = unescape(encodeURIComponent(aSubject));
            return true;
          }
          return false;
        },

        selectMessage: async function (aID) {
          let msgHdr = context.extension.messageManager.get(aID);
          let win = Services.wm.getMostRecentWindow("mail:3pane");
          win.gFolderTreeView.selectFolder(msgHdr.folder, true);
          win.gFolderDisplay.selectMessage(msgHdr);
        },

        getMessageFlags: async function (aID) {
          let msgHdr = context.extension.messageManager.get(aID);
          if (msgHdr) {
            return msgHdr.flags;
          }
          return false;
        },

        generateUUID: async function () {
          return Services.uuid.generateUUID().toString().replace(/[{}]/g, "");
        },

        addRaw: async function (aUUID, aContent, aMailFolder, aRefID) {
          return new Promise(async function (resolve, reject) {
            // reference message for flags and stuff
            let refMsgHdr = context.extension.messageManager.get(aRefID);
            let folder = context.extension.folderManager.get(aMailFolder.accountId, aMailFolder.path);

            let copyListener = {
              QueryInterface: ChromeUtils.generateQI(["nsIMsgCopyServiceListener"]),
              GetMessageId: function () { },
              OnProgress: function () { },
              SetMessageKey: function () { },
              OnStartCopy: function () {
                MailServices.mailSession.AddFolderListener(folderListener, Ci.nsIFolderListener.all);
              },
              OnStopCopy: async function (statusCode) {
                if (statusCode) {
                  MailServices.mailSession.RemoveFolderListener(folderListener);
                }
              }
            }

            let folderListener = {
              onFolderAdded: function () { },
              onMessageAdded: function (parentItem, msgHeader) {
                if (aUUID == msgHeader.messageId && folder.URI == msgHeader.folder.URI) {
                  MailServices.mailSession.RemoveFolderListener(folderListener);
                  //let msgHeader = folder.GetMessageHeader(aUUID);
                  if (msgHeader.flags & 2) folder.addMessageDispositionState(msgHeader, 0);
                  if (msgHeader.flags & 4096) folder.addMessageDispositionState(msgHeader, 1);
                  resolve(context.extension.messageManager.convert(msgHeader).id);
                }
              },
              onFolderRemoved: function () { },
              onMessageRemoved: function () { },
              onFolderPropertyChanged: function () { },
              onFolderIntPropertyChanged: function () { },
              onFolderBoolPropertyChanged: function () { },
              onFolderUnicharPropertyChanged: function () { },
              onFolderPropertyFlagChanged: function () { },
              onFolderEvent: function () { }
            }

            if (folder) {
              let pathTempFile = await IOUtils.createUniqueFile(
                PathUtils.tempDir,
                "EES.eml",
                0o600
              );
              let tempFile = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
              tempFile.initWithPath(pathTempFile);
              let extAppLauncher = Cc[
                "@mozilla.org/uriloader/external-helper-app-service;1"
              ].getService(Ci.nsPIExternalAppLauncher);
              extAppLauncher.deleteTemporaryFileOnExit(tempFile);

              await IOUtils.writeUTF8(pathTempFile, aContent);
              MailServices.copy.copyFileMessage(tempFile, folder, null, false, refMsgHdr.flags, refMsgHdr.getStringProperty("keywords"), copyListener, null /*msgWindow*/);
            } else {
              resolve(false);
            }
          });
        }
      },
    };
  }

  onShutdown(isAppShutdown) {
    if (isAppShutdown) {
      return; // the application gets unloaded anyway
    }
    // Flush all caches
    Services.obs.notifyObservers(null, "startupcache-invalidate");
  }
};
