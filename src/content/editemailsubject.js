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

	// communication with popup window
	handleMessage: function(request, sender, sendResponse) {
		if (request && request.action) {
			switch (request.action) {
				case "requestData":
					sendResponse(this.msg);
				break;
				case "requestUpdate":
					if (this.msg.localMode) {
						// local update in Thunderbird
						messenger.MessageModification.setSubjectOfMessage(this.msg.id, request.newSubject);
					} else {
						// remote update on the server
						console.log("Not implemented");
					}
				break;
			}
		}
	},
	
	edit: async function (info) {
		this.msg = {};
		this.msg.localMode = await editEmailSubjectPreferences.getPrefValue("localOnly");

		console.log(info);
		if (info.selectedMessages && info.selectedMessages.messages.length > 0) {
			let MessageHeader = info.selectedMessages.messages[0];
			this.msg.subject = MessageHeader.subject;
			this.msg.date = MessageHeader.date;
			this.msg.id = MessageHeader.id;
			this.msg.alreadyModified = false;

			// in remoteMode, if the header contains X-EditEmailSubject, we show a warning about being already modified
			if (!this.msg.localMode) {
				this.msg.header = await messenger.MessageModification.getHeaderOfMessage(this.msg.id);
				this.msg.alreadyModified = this.msg.header.includes("X-EditEmailSubject:");
			}

			messenger.runtime.onMessage.addListener(editEmailSubjectMain.handleMessage);	
			this.msg.popupWindow = await messenger.windows.create({
				height: this.msg.alreadyModified ? 260 : 170,
				width: 500,
				url: "/content/editemailsubjectPopup.html",
				type: "popup"
			});
		} else {
			console.log("No Message Selected!");
		}
	}
};
