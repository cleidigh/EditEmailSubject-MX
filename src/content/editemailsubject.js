/*
 Copyright (C) 2011-2017 J-C Prin. (jisse44)

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>
	
    Modifications for TB78 by John Bieling (2020)
*/

var editEmailSubjectMain = {

  onClick: async function (info) {
    if (info.selectedMessages && info.selectedMessages.messages && info.selectedMessages.messages.length == 1) {
      this.edit(info.selectedMessages.messages[0]);
    }
  },

  onCommand: async function () {
    let selectedMessages = await messenger.mailTabs.getSelectedMessages();
    if (selectedMessages && selectedMessages.messages && selectedMessages.messages.length == 1) {
      this.edit(selectedMessages.messages[0]);
    }
  },

  // open edit popup
  edit: async function (MessageHeader) {
    this.msg = {};
    this.msg.localMode = await editEmailSubjectPreferences.getPrefValue("localOnly");

    if (MessageHeader) {
      this.msg.folder = MessageHeader.folder;
      this.msg.subject = MessageHeader.subject;
      this.msg.date = MessageHeader.date;
      this.msg.id = MessageHeader.id;
      this.msg.alreadyModified = false;


      let flags = await messenger.MessageModification.getMessageFlags(this.msg.id);
      //It looks like TB is storing a leading Re: not as part of the subject, but inside a flag, which is not honored by the subject member
      if (flags & 0x0010) this.msg.subject = "Re: " + this.msg.subject;

      // in remoteMode, if the header contains X-EditEmailSubject, we show a warning about being already modified
      if (!this.msg.localMode) {
        let full = await messenger.messages.getFull(this.msg.id);
        this.msg.headers = full.headers;
        this.msg.alreadyModified = this.msg.headers.hasOwnProperty("x-editemailsubject");
        this.msg.raw = await messenger.messages.getRaw(this.msg.id);
      }

      messenger.runtime.onMessage.addListener(this.handleMessage);
      this.msg.popupWindow = await messenger.windows.create({
        height: this.msg.alreadyModified ? 260 : 170,
        width: 500,
        url: "/content/editemailsubjectPopup.html",
        type: "popup"
      });
    } else {
      console.log("No Message Selected!");
    }
  },

  // communication with popup window
  // this is called within global context
  handleMessage: function (request, sender, sendResponse) {
    if (request && request.action) {
      switch (request.action) {
        case "requestData":
          sendResponse(editEmailSubjectMain.msg);
          break;
        case "requestUpdate":
          if (request.newSubject != editEmailSubjectMain.msg.subject) {
            if (editEmailSubjectMain.msg.localMode) {
              // just update the subject value in the Thunderbird DB, do not change the actual email
              editEmailSubjectMain.updateSubject(request);
            } else {
              //change the entire email 
              editEmailSubjectMain.updateMessage(request);
            }
          }
          break;
      }
    }
  },



  // just update the subject value in the Thunderbird DB, do not change the actual email
  // it would be nice to be able to do this via messages.update(), but the newProperties obj does not have a subject member.
  updateSubject: function (request) {
    messenger.MessageModification.setSubjectOfMessage(editEmailSubjectMain.msg.id, request.newSubject);
  },

  //change the entire email (add new + delete original)
  updateMessage: async function (request) {
    let raw = this.msg.raw
      .replace(/\r/g, "") //for RFC2822
      .replace(/\n/g, "\r\n");

    // extract the header section and include the linebreak belonging to the last header and include
    // a linebreak before the first header
    // prevent blank line into headers and binary attachments broken (thanks to Achim Czasch for fix)
    let headerEnd = raw.search(/\r\n\r\n/);
    let headers = "\r\n" + raw.substring(0, headerEnd + 2).replace(/\r\r/, "\r");
    let body = raw.substring(headerEnd + 2);

    // update subject, check if subject is multiline
    while (headers.match(/\r\nSubject: .*\r\n\s+/))
      headers = headers.replace(/(\r\nSubject: .*)(\r\n\s+)/, "$1 ");

    // either replace the subject header or add one if missing
    if (headers.includes("\nSubject: ")) {
      headers = headers.replace(/\nSubject: .*\r\n/, "\nSubject: " + unescape(encodeURIComponent(request.newSubject)) + "\r\n");
    } else {
      headers += "Subject: " + unescape(encodeURIComponent(request.newSubject)) + "\r\n";
    }

    // Without changing the message-id, the MessageHeader obj of the new message and the old message will
    // share the same ID.
    let [, oldServer] = this.msg.headers["message-id"][0].split("@");
    oldServer = oldServer.split(">")[0];
    let newUID = [await messenger.MessageModification.generateUUID(), oldServer].join("@")
    headers = headers.replace(/\nMessage-ID: *.*\r\n/i, "\nMessage-ID: <" + newUID + ">\r\n");

    // update or modify X-EditEmailSubject headers
    let now = new Date;
    let EditEmailSubjectHead = ("X-EditEmailSubject: " + now.toString()).replace(/\(.+\)/, "").substring(0, 75);
    let EditEmailSubjectOriginal = ("X-EditEmailSubject-OriginalSubject: " + unescape(encodeURIComponent(this.msg.subject)));
    if (!headers.includes("\nX-EditEmailSubject: ")) {
      headers += EditEmailSubjectHead + "\r\n" + EditEmailSubjectOriginal + "\r\n";
    } else {
      headers = headers.replace(/\nX-EditEmailSubject: .+\r\n/, "\n" + EditEmailSubjectHead + "\r\n");
    }

    //remove the leading linebreak;
    headers = headers.substring(2);

    let newID = await messenger.MessageModification.addRaw(newUID, headers + body, this.msg.folder, this.msg.id);
    if (newID) {
      console.log("Success [" + this.msg.id + " vs " + newID + "]");
      // IMAP servers may trigger a message key change which sometimes deselects the message,
      // so let's wait a bit.
      await new Promise(r => window.setTimeout(r, 500));
      await messenger.MessageModification.selectMessage(newID);
      await messenger.messages.delete([this.msg.id], true);
    }
  }
};
