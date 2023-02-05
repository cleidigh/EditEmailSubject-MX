async function main() {

  // define default prefs and migrate legacy settings
  let defaultPrefs = {
    "version": "2.1.1",
    "localOnly": true,
    "addRePrefix": true
  };
  await editEmailSubjectPreferences.setDefaults(defaultPrefs);

  messenger.menus.create({
    contexts: ["message_list"],
    id: "edit_email_subject_entry",
    onclick: editEmailSubjectMain.onClick.bind(editEmailSubjectMain),
    title: messenger.i18n.getMessage("lang.menuTitle")
  });

  messenger.commands.onCommand.addListener((command) => {
    if (command == "edit_email_subject") {
      console.log(command);
      editEmailSubjectMain.onCommand();
    }
  });
}



main();
