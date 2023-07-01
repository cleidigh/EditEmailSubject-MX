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

import * as ees from "/content/editemailsubject.mjs";

// Define default prefs and migrate legacy settings.
let defaultPrefs = {
  "version": "2.1.1",
  "localOnly": false,
  "addRePrefix": true
};
await eesPreferences.setDefaults(defaultPrefs);

messenger.menus.onShown.addListener(({ selectedMessages }, tab) => {
  messenger.menus.update("edit_email_subject_entry", {
    enabled: !!ees.getSingleMessageFromList(selectedMessages)
  });
  messenger.menus.refresh();
})

messenger.menus.onClicked.addListener(async ({ selectedMessages }, tab) => {
  let localMode = await eesPreferences.getPrefValue("localOnly");
  let addReMode = await eesPreferences.getPrefValue("addRePrefix");
  let selectedMessage = ees.getSingleMessageFromList(selectedMessages);
  if (!selectedMessage || !tab.mailTab) {
    return;
  }

  ees.edit({ selectedMessage, tab, localMode, addReMode });
})

// Keyboard shortcut listener.
messenger.commands.onCommand.addListener(async (command, tab) => {
  if (command == "edit_email_subject" && tab.mailTab) {
    let selectedMessages = await messenger.mailTabs.getSelectedMessages(tab.id);
    let localMode = await eesPreferences.getPrefValue("localOnly");
    let addReMode = await eesPreferences.getPrefValue("addRePrefix");
    let selectedMessage = ees.getSingleMessageFromList(selectedMessages);
    if (!selectedMessage || !tab.mailTab) {
      return;
    }

    ees.edit({ selectedMessage, tab, localMode, addReMode });
  }
});

// Communication from popup window (the window is closed before operation is executed,
// therefore the execution needs to happen here).
messenger.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request && request.action) {
    switch (request.action) {
      case "updateSubject":
        sendResponse();
        // Just update the subject value in the Thunderbird DB, do not change the actual email.
        ees.updateSubject(request);
        break;

      case "updateMessage":
        sendResponse();
        // Change the entire email.
        ees.updateMessage(request);
        break;
    }
  }
})

messenger.menus.create({
  contexts: ["message_list"],
  id: "edit_email_subject_entry",
  title: messenger.i18n.getMessage("lang.menuTitle")
});
