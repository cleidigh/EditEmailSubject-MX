let msgId, tabId, localMode, currentSubject, originalSubject;

async function okAndInput(e) {
  if ((e.type == "keydown" && e.key == "Enter") || e.type == "click") {
    let newSubject = document.getElementById("editemailsubjectInput").value;

    if (msgId && tabId && currentSubject != newSubject) {
      await messenger.runtime.sendMessage({
        action: localMode ? "updateSubject" : "updateMessage",
        msgId,
        tabId,
        newSubject,
        currentSubject,
        originalSubject
      });
    }

    let win = await messenger.windows.getCurrent();
    await messenger.windows.remove(win.id);
  }

  if (e.type == "keydown" && e.key == "Escape") {
    let win = await messenger.windows.getCurrent();
    await messenger.windows.remove(win.id);
  }
}

async function cancel(e) {
  let win = await messenger.windows.getCurrent();
  await messenger.windows.remove(win.id);
}

async function load() {
  const urlParams = new URLSearchParams(window.location.search);
  msgId = parseInt(urlParams.get('msgId'), 10);
  tabId = parseInt(urlParams.get('tabId'), 10);
  localMode = !!urlParams.get('localMode');
  currentSubject = urlParams.get('currentSubject');
  originalSubject = urlParams.get('originalSubject');

  document.getElementById("editemailsubjectCANCEL").addEventListener('click', cancel);
  document.getElementById("editemailsubjectOK").addEventListener('click', okAndInput);
  document.getElementById("editemailsubjectInput").addEventListener('keydown', okAndInput);

  document.getElementById("editemailsubjectInput").value = currentSubject;

  if (originalSubject) {
    document.getElementById("editemailsubjectOld").value = originalSubject;
  } else {
    document.getElementById("modifiedInfo").style.display = "none";
  }

  document.getElementById("body").style.display = "block";
  document.getElementById("editemailsubjectInput").focus();
  window.focus();
}

document.addEventListener('DOMContentLoaded', load, { once: true });
