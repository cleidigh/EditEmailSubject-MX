import * as preferences from "/content/scripts/preferences.mjs";
import * as ees from "/content/scripts/editemailsubject.mjs";

const urlParams = new URLSearchParams(window.location.search);
let msgId = parseInt(urlParams.get('msgId'), 10);
let tabId = parseInt(urlParams.get('tabId'), 10);
let busy = false;

window.addEventListener("beforeunload", event => {
  if (busy) {
    event.preventDefault();
  };
})

// It looks like TB is storing a leading Re: not as part of the MessageHeader subject,
// but inside an internal message flag not accessible to WebExtensions.
// -> Get the real subject from full.headers.subject. 
let full = await messenger.messages.getFull(msgId);
let currentSubject = full.headers.subject[0];
// If the header contains X-EditEmailSubject, we show a warning about being already modified.
let originalSubject = full.headers.hasOwnProperty("x-editemailsubject") && full.headers.hasOwnProperty("x-editemailsubject-originalsubject")
  ? full.headers["x-editemailsubject-originalsubject"]
  : null

document.getElementById("editemailsubjectCANCEL").addEventListener('click', cancel);
document.getElementById("editemailsubjectOK").addEventListener('click', okAndInput);
document.getElementById("editemailsubjectInput").addEventListener('keydown', okAndInput);

document.getElementById("editemailsubjectInput").value = currentSubject;

if (originalSubject) {
  document.getElementById("editemailsubjectOld").value = originalSubject;
} else {
  document.getElementById("editemailsubjectOld").style.visibility = "hidden";
  document.getElementById("editemailsubjectOldDesc").style.visibility = "hidden";
}

// Preselect the keep backup checkbox with the value from the preferences.
if (await preferences.getPrefValue("keepBackup")) {
  document.getElementById("keepBackup").setAttribute("checked", true);
}

document.getElementById("body").style.display = "block";
document.getElementById("editemailsubjectInput").focus();
window.focus();

async function okAndInput(e) {
  if ((e.type == "keydown" && e.key == "Enter") || e.type == "click") {
    let newSubject = document.getElementById("editemailsubjectInput").value;
    let keepBackup = document.getElementById("keepBackup").checked;

    if (msgId && tabId && currentSubject != newSubject) {
      busy = true;
      await ees.updateMessage({
        msgId,
        tabId,
        keepBackup,
        newSubject,
        currentSubject,
        originalSubject
      });
      busy = false;
    }

    let popupTab = await messenger.tabs.getCurrent();
    await messenger.tabs.remove(popupTab.id);
  }

  if (e.type == "keydown" && e.key == "Escape") {
    let popupTab = await messenger.tabs.getCurrent();
    await messenger.tabs.remove(popupTab.id);
  }
}

async function cancel(e) {
  let popupTab = await messenger.tabs.getCurrent();
  await messenger.tabs.remove(popupTab.id);
}