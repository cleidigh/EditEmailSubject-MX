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

// Reduces a MessageList to a single message, if it contains a single message.
export function getSingleMessageFromList(messageList) {
  return messageList && messageList.messages && messageList.messages.length == 1
    ? messageList.messages[0]
    : null
}

// Initiate subject editing by opening the edit dialog.
export async function edit({ selectedMessage, tab, keepBackup }) {
  let full = await messenger.messages.getFull(selectedMessage.id);

  // It looks like TB is storing a leading Re: not as part of the MessageHeader subject,
  // but inside an internal message flag not accessible to WebExtensions.
  // -> Get the real subject from full.headers.subject. 
  let currentSubject = full.headers.subject[0];

  // If the header contains X-EditEmailSubject, we show a warning about being already modified.
  let originalSubject = full.headers.hasOwnProperty("x-editemailsubject") && full.headers.hasOwnProperty("x-editemailsubject-originalsubject")
    ? full.headers["x-editemailsubject-originalsubject"]
    : null

  let popupUrl = new URL(messenger.runtime.getURL("/content/editemailsubjectPopup.html"));
  popupUrl.searchParams.append("tabId", tab.id);
  popupUrl.searchParams.append("msgId", selectedMessage.id);
  popupUrl.searchParams.append("currentSubject", currentSubject);

  if (originalSubject) popupUrl.searchParams.append("originalSubject", originalSubject);
  if (keepBackup) popupUrl.searchParams.append("keepBackup", keepBackup);

  return messenger.windows.create({
    height: !!originalSubject ? 260 : 170,
    width: 500,
    url: popupUrl.href,
    type: "popup"
  });
}

// Change the entire email (add new + delete original).
export async function updateMessage({ msgId, tabId, keepBackup, newSubject, currentSubject, originalSubject }) {
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
  while (headerPart.match(/\r\nSubject: .*\r\n\s+/))
    headerPart = headerPart.replace(/(\r\nSubject: .*)(\r\n\s+)/, "$1 ");

  // Either replace the subject header or add one if missing.
  if (headerPart.includes("\nSubject: ")) {
    headerPart = headerPart.replace(/\nSubject: .*\r\n/, "\nSubject: " + unescape(encodeURIComponent(newSubject)) + "\r\n");
  } else {
    headerPart += "Subject: " + unescape(encodeURIComponent(newSubject)) + "\r\n";
  }

  // Without changing the message-id, the MessageHeader obj of the new message and the old message will
  // share the same ID.
  let server = msg.headerMessageId.split("@").pop();
  let uid = crypto.randomUUID();
  let newHeaderMessagId = uid + "@" + server;
  headerPart = headerPart.replace(/\nMessage-ID: *.*\r\n/i, "\nMessage-ID: <" + newHeaderMessagId + ">\r\n");

  // Update or modify X-EditEmailSubject headers
  let now = new Date;
  let EditEmailSubjectHead = ("X-EditEmailSubject: " + now.toString()).replace(/\(.+\)/, "").substring(0, 75);
  let EditEmailSubjectOriginal = ("X-EditEmailSubject-OriginalSubject: " + unescape(encodeURIComponent(originalSubject || currentSubject)));
  if (!headerPart.includes("\nX-EditEmailSubject: ")) {
    headerPart += EditEmailSubjectHead + "\r\n" + EditEmailSubjectOriginal + "\r\n";
  } else {
    headerPart = headerPart.replace(/\nX-EditEmailSubject: .+\r\n/, "\n" + EditEmailSubjectHead + "\r\n");
  }

  // Remove the leading linebreak.
  headerPart = headerPart.substring(2);

  let newMsgContent = headerPart + bodyPart;

  let newMsgId = await messenger.MessageModification.addRaw(newHeaderMessagId, newMsgContent, msg.folder, msg.id);
  if (newMsgId) {
    console.log("Success [" + msgId + " vs " + newMsgId + "]");
    await messenger.mailTabs.setSelectedMessages(tabId, [newMsgId]);
    
    if (keepBackup) {
      let localAccount = (await messenger.accounts.list(false)).find(account => account.type == "none");
      let localFolders = await messenger.folders.getSubFolders(localAccount, false);
      let tempFolder = localFolders.find(folder => folder.name == "EES-Temp");
      if (!tempFolder) {
        tempFolder = await messenger.folders.create(localAccount, "EES-Temp");
      }
      await messenger.messages.move([msg.id], tempFolder);
    } else {
      await messenger.messages.delete([msg.id], true);
    }
  }
}