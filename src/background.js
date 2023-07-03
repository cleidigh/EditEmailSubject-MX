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
import * as ees from "/content/scripts/editemailsubject.mjs";

// Define default prefs and migrate legacy settings.
let defaultPrefs = {
  "localOnly": false, // no longer supported, only kept here to be able to inform users about deprecation
  "keepBackup": true,
};
await preferences.setDefaults(defaultPrefs);

// Menu show listener, to disable/enable menu item based on selected message(s).
messenger.menus.onShown.addListener(({ selectedMessages }, tab) => {
  messenger.menus.update("edit_email_subject_entry", {
    enabled: !!ees.getSingleMessageFromList(selectedMessages)
  });
  messenger.menus.refresh();
})

// Menu click listener.
messenger.menus.onClicked.addListener(async ({ selectedMessages }, tab) => {
  let selectedMessage = ees.getSingleMessageFromList(selectedMessages);
  if (!selectedMessage || !tab.mailTab) {
    return;
  }

  ees.edit({ selectedMessage, tab });
})

// Keyboard shortcut listener.
messenger.commands.onCommand.addListener(async (command, tab) => {
  if (command == "edit_email_subject" && tab.mailTab) {
    let selectedMessages = await messenger.mailTabs.getSelectedMessages(tab.id);
    let selectedMessage = ees.getSingleMessageFromList(selectedMessages);
    if (!selectedMessage || !tab.mailTab) {
      return;
    }

    ees.edit({ selectedMessage, tab });
  }
});

messenger.menus.create({
  contexts: ["message_list"],
  id: "edit_email_subject_entry",
  title: messenger.i18n.getMessage("lang.menuTitle")
});

// Open tab with deprecation info on localOnly.
let localOnly = await preferences.getPrefValue("localOnly");
if (localOnly) {
  messenger.tabs.create({url: "/content/localModeDeprecated.html"});
  preferences.setPrefValue("localOnly", false); 
}
