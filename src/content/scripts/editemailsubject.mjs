/**
 * Copyright (C) 2011-2017 J-C Prin. (jisse44)
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>
 * 
 * Modifications for TB78, TB91, TB102, TB115 by John Bieling (2020-2023)
 */

import * as preferences from "/content/scripts/preferences.mjs";

// Reduces a MessageList to a single message, if it contains a single message.
export function getSingleMessageFromList(messageList) {
  return messageList && messageList.messages && messageList.messages.length == 1
    ? messageList.messages[0]
    : null
}

// Initiate subject editing by opening the edit dialog.
export async function edit({ selectedMessage, tab }) {
  let popupUrl = new URL(messenger.runtime.getURL("/content/popup/editemailsubjectPopup.html"));
  popupUrl.searchParams.append("tabId", tab.id);
  popupUrl.searchParams.append("msgId", selectedMessage.id);

  return messenger.windows.create({
    height: 180,
    width: 500,
    url: popupUrl.href,
    type: "popup"
  });
}


const setHeader = async (full, name, value) => {
  const encoded = await browser.messengerUtilities.encodeMimeHeader(
    name,
    value
  );
  full.rawHeaders[name.toLowerCase()] = encoded;
};

const getHeader = async (full, name) => {
  const encoded = full.rawHeaders[name.toLowerCase()];
  if (!encoded) {
    return undefined
  }
  return await browser.messengerUtilities.decodeMimeHeader(
    name,
    encoded
  );
};

// Change the entire email (add new + delete original).
export async function updateMessage({ msgId, keepBackup, newSubject, currentSubject }) {
  const msg = await messenger.messages.get(msgId);

  if (keepBackup) {
    let localAccount = (await messenger.accounts.list(false)).find(account => account.type == "none");
    let localFolders = await messenger.folders.getSubFolders(localAccount.rootFolder.id, false);
    let tempFolder = localFolders.find(folder => folder.name == "EES-Temp");
    if (!tempFolder) {
      tempFolder = await messenger.folders.create(localAccount.rootFolder.id, "EES-Temp");
    } else {
      // If a backup is requested, we need to check if the destination folder has
      // the id already. If yes, abort.
      let {messages} = await browser.messages.query({folderId: tempFolder.id, headerMessageId: msg.headerMessageId})
      if (messages.length) {
        throw new Error(`Backup folder already contains a message with id <${msg.headerMessageId}>`)
      }
    }
    const copiedMessage = await new Promise(resolve => {
      const listener = (src, dst) => {
        console.log(src,dst);
        let idx = src.messages.findIndex(m => m.id == msg.id);
        if (idx != -1 && dst.messages[idx].folder.id == tempFolder.id) {
          messenger.messages.onCopied.removeListener(listener);
          resolve(dst.messages[idx]);
        }
      }
      messenger.messages.onCopied.addListener(listener);
      messenger.messages.copy([msg.id], tempFolder.id);
    });
    console.log("Backup [" + msg.id + " -> " + copiedMessage.id + "]");
  }

  const full = await messenger.messages.getFull(msgId, {decodeHeaders: false, decodeContent: false})
  // Handle X-Mozilla-Status, X-Mozilla-Status2 and X-Mozilla-Keys.
  // This is a bug in getRaw().
  for (let name of ["Keys", "Status", "Status2"]) {
    let values = [...new Set(await getHeader(full, `X-Mozilla-${name}`))];
    if (values.length) {
      await setHeader(full, `X-Mozilla-${name}`, values);
    }
  }

  // Update Subject.
  await setHeader(full, "Subject", newSubject);
  
  // Update Message-ID.
  if (await preferences.getPrefValue("changeId")) {
    let server = msg.headerMessageId.split("@").pop();
    let uid = crypto.randomUUID();
    let newHeaderMessageId = uid + "@" + server;
    await setHeader(full, "Message-ID", newHeaderMessageId);
  }

  // Update X-EditEmailSubject headers.
  let now = new Date();
  await setHeader(full, "X-EditEmailSubject", now.toString());
  let originalSubject = await getHeader(full, "X-EditEmailSubject-OriginalSubject");
  if (!originalSubject) {
    await setHeader(full, "X-EditEmailSubject-OriginalSubject", currentSubject);
  }

  // Delete original message.
  await messenger.messages.delete([msg.id], true);
  console.log("Deleted [" + msg.id + "]");

  // Build and import updated message.
  let newMsgFile = await browser.messages.getRaw(full, {data_format: "File"});
  let newMsgHeader = await messenger.messages.import(newMsgFile, msg.folder.id, {
    flagged: msg.flagged,
    read: true,//msg.read,
    tags: msg.tags
  });

  if (!newMsgHeader) {
    console.log("Failed to import!");
    return false;
  }
  console.log("Created [" + msg.id + " -> " + newMsgHeader.id + "]");

  return newMsgHeader;
}
