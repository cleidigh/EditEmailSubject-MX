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

import * as q from "/content/scripts/q.mjs";

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

// Change the entire email (add new + delete original).
export async function updateMessage({ msgId, keepBackup, newSubject, currentSubject }) {
  let msg = await messenger.messages.get(msgId);
  let raw = (await messenger.messages.getRaw(msgId))
    .replace(/\r/g, "") //for RFC2822
    .replace(/\n/g, "\r\n");

  // Extract the header section and include the linebreak belonging to the last header and include
  // a linebreak before the first header.
  // Prevent blank line into headers and binary attachments broken (thanks to Achim Czasch for fix).
  let headerEnd = raw.search(/\r\n\r\n/);
  let headerPart = "\r\n" + raw.substring(0, headerEnd + 2).replace(/\r\r/, "\r");
  let bodyPart = raw.substring(headerEnd + 2);

  // Update subject, check if subject is multiline.
  while (headerPart.match(/\r\nSubject:.*\r\n\s+/)) {
    headerPart = headerPart.replace(/(\r\nSubject:.*)(\r\n\s+)/, "$1 ");
  }

  // RFC2047 Q-Encoding
  const encodeHeader = (name, value) => {
    const startLine = " =?utf-8?q?"
    const nextLine = "=?="
    const endLine = "?=";

    let lines = [];
    let currentLine = `${name}:${startLine}`;

    let uint8Array = new TextEncoder().encode(value);
    for (let v of uint8Array.values()) {
      let next = q.encode(String.fromCharCode(v)); // or btoa() for b-encoding
      if (currentLine.length + next.length + endLine.length > 78) {
        lines.push(currentLine + nextLine);
        currentLine = startLine;
      }
      currentLine += next;
    }
    lines.push(currentLine + endLine);

    return lines.join("\r\n");
  }

  // Either replace the subject header or add one if missing.
  if (headerPart.includes("\r\nSubject:")) {
    headerPart = headerPart.replace(/\r\nSubject:.*\r\n/, "\r\n" + encodeHeader("Subject", newSubject) + "\r\n");
  } else {
    headerPart += encodeHeader("Subject", newSubject) + "\r\n";
  }

  // Without changing the message-id, the MessageHeader obj of the new message and the old message will
  // share the same ID.
  let server = msg.headerMessageId.split("@").pop();
  let uid = crypto.randomUUID();
  let newHeaderMessagId = uid + "@" + server;
  headerPart = headerPart.replace(/\r\nMessage-ID: *.*\r\n/i, "\r\nMessage-ID: <" + newHeaderMessagId + ">\r\n");

  // Update or modify X-EditEmailSubject headers.
  let now = new Date;
  let EditEmailSubjectHead = ("X-EditEmailSubject: " + now.toString()).replace(/\(.+\)/, "").substring(0, 75);
  if (!headerPart.includes("\r\nX-EditEmailSubject: ")) {
    headerPart += EditEmailSubjectHead + "\r\n" + encodeHeader("X-EditEmailSubject-OriginalSubject", currentSubject) + "\r\n";
  } else {
    headerPart = headerPart.replace(/\r\nX-EditEmailSubject: .+\r\n/, "\r\n" + EditEmailSubjectHead + "\r\n");
  }

  // Remove the leading linebreak.
  headerPart = headerPart.substring(2);

  // Create message file.
  // https://thunderbird.topicbox.com/groups/addons/T06356567165277ee-M25e96f2d58e961d6167ad348
  let newMsgContent = `${headerPart}${bodyPart}`;
  let newMsgBytes = new Array(newMsgContent.length);
  for (let i = 0; i < newMsgBytes.length; i++) {
    newMsgBytes[i] = newMsgContent.charCodeAt(i) & 0xFF;
  }
  let newMsgFile = new File([new Uint8Array(newMsgBytes)], `${uid}.eml`, { type: 'message/rfc822' });
  let newMsgHeader = await messenger.messages.import(newMsgFile, msg.folder.id, {
    flagged: msg.flagged,
    read: msg.read,
    tags: msg.tags
  });
  if (!newMsgHeader) {
    console.log("Failed to import!");
    return false;
  }
  console.log("Created [" + msg.id + " -> " + newMsgHeader.id + "]");

  // Remove or Backup original message.
  if (keepBackup) {
    let localAccount = (await messenger.accounts.list(false)).find(account => account.type == "none");
    let localFolders = await messenger.folders.getSubFolders(localAccount.rootFolder.id, false);
    let tempFolder = localFolders.find(folder => folder.name == "EES-Temp");
    if (!tempFolder) {
      tempFolder = await messenger.folders.create(localAccount.rootFolder.id, "EES-Temp");
    }

    const movedMessage = await new Promise(resolve => {
      const listener = (src, dst) => {
        console.log(src,dst);
        let idx = src.messages.findIndex(m => m.id == msg.id);
        if (idx != -1 && dst.messages[idx].folder.id == tempFolder.id) {
          messenger.messages.onMoved.removeListener(listener);
          resolve(dst.messages[idx]);
        }
      }
      messenger.messages.onMoved.addListener(listener);
      messenger.messages.move([msg.id], tempFolder.id);
    })
    console.log("Moved [" + msg.id + " -> " + movedMessage.id + "]");

  } else {
    await messenger.messages.delete([msg.id], true);
    console.log("Deleted [" + msg.id + "]");
  }

  return newMsgHeader;
}
