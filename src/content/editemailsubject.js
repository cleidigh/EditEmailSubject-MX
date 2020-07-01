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
				case "requestSubject":
					sendResponse({currentSubject: this.msg.subject});
				break;
				case "requestOK":
					messenger.MessageModification.setSubjectOfMessage(this.msg.index, request.newSubject);
				case "requestCANCEL":
					messenger.windows.remove(this.msg.popupWindow.id);
				break;					
			}
		}
	},
	
	// open popup window
	open: async function (info) {
		this.msg = {};
		if (await editEmailSubjectPreferences.getPrefValue("localOnly")) {		
			// change subject only in local Thunderbird

			let indices = await messenger.MessageModification.getSelectedMessages();
			if (indices.length > 0) {
				this.msg.index = indices[0];
				this.msg.subject = await messenger.MessageModification.getSubjectOfMessage(this.msg.index);
				
				messenger.runtime.onMessage.addListener(editEmailSubjectMain.handleMessage);	
				this.msg.popupWindow = await messenger.windows.create({
					height: 140,
					width: 500,
					url: "/content/editemailsubjectPopup.html",
					type: "popup"
				});
			} else {
				console.log("No Message Selected!");
			}
		} else {
			// change subject on Server
		}
	}
};
