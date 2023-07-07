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
let currentSubject = Array.isArray(full.headers.subject) && full.headers.subject.length > 0 ? full.headers.subject[0] : "";

// If the header contains X-EditEmailSubject, we show a warning about being already modified.
let headerOriginalSubject = full.headers.hasOwnProperty("x-editemailsubject") && full.headers.hasOwnProperty("x-editemailsubject-originalsubject")
  ? full.headers["x-editemailsubject-originalsubject"]
  : null

document.getElementById("editemailsubjectCANCEL").addEventListener('click', cancel);
document.getElementById("editemailsubjectOK").addEventListener('click', okAndInput);
document.getElementById("editemailsubjectInput").addEventListener('keydown', okAndInput);

document.getElementById("editemailsubjectInput").value = currentSubject;

if (headerOriginalSubject) {
  document.getElementById("editemailsubjectOld").value = headerOriginalSubject;
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
    let newMsgHeader;

    if (msgId && tabId && currentSubject != newSubject) {
      busy = true;
      document.getElementById("busy").style.display = "block"
      newMsgHeader = await ees.updateMessage({
        msgId,
        keepBackup,
        newSubject,
        currentSubject,
      });
      busy = false;
      document.getElementById("busy").style.display = "none"
    }

    if (newMsgHeader) {      
      document.getElementById("ok").style.display = "block";
      await messenger.mailTabs.setSelectedMessages(tabId, [newMsgHeader.id]);
      await new Promise(resolve => window.setTimeout(resolve, 500));
      let popupTab = await messenger.tabs.getCurrent();
      await messenger.tabs.remove(popupTab.id);
    } else {
      document.getElementById("error").style.display = "block";
      await new Promise(resolve => window.setTimeout(resolve, 750));
      document.getElementById("error").style.display = "none";
    }
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