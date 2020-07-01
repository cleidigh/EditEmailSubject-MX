async function okAndInput(e) {
	if ((e.type == "keydown" && e.key == "Enter") || e.type == "click") {
		await messenger.runtime.sendMessage({action: "requestUpdate", newSubject: document.getElementById("editemailsubjectInput").value});
		const windowId = (await messenger.windows.getCurrent()).id;
		await messenger.windows.remove(windowId);	
	}
	
	if (e.type == "keydown" && e.key == "Escape") {
		const windowId = (await messenger.windows.getCurrent()).id;
		await messenger.windows.remove(windowId);	
	}
}

async function cancel(e) {
	const windowId = (await messenger.windows.getCurrent()).id;
	await messenger.windows.remove(windowId);
}

async function load() {
	document.getElementById("editemailsubjectCANCEL").addEventListener('click', cancel);
	document.getElementById("editemailsubjectOK").addEventListener('click', okAndInput);
	document.getElementById("editemailsubjectInput").addEventListener('keydown', okAndInput);

	let msg = await messenger.runtime.sendMessage({action: "requestData"});
	document.getElementById("editemailsubjectInput").value = msg.subject;
	document.getElementById("editemailsubjectInput").focus();
	
	if (!msg.alreadyModified) { 
		document.getElementById("modifiedInfo").style.display = "none";
	}

}

document.addEventListener('DOMContentLoaded', load, { once: true });
