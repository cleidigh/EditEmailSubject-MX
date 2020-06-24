async function okAndInput(e) {
	if ((e.type == "keydown" && e.key == "Enter") || e.type == "click") {
		await messenger.runtime.sendMessage({action: "requestOK", newSubject: document.getElementById("editemailsubjectInput").value});
	}
	if (e.type == "keydown" && e.key == "Escape") {
		await messenger.runtime.sendMessage({action: "requestCANCEL"});
	}
}

async function cancel(e) {
	await messenger.runtime.sendMessage({action: "requestCANCEL"});
}

async function load() {
	document.getElementById("editemailsubjectCANCEL").addEventListener('click', cancel);
	document.getElementById("editemailsubjectOK").addEventListener('click', okAndInput);
	document.getElementById("editemailsubjectInput").addEventListener('keydown', okAndInput);

	let data = await messenger.runtime.sendMessage({action: "requestSubject"});
	document.getElementById("editemailsubjectInput").value = data.currentSubject;
	document.getElementById("editemailsubjectInput").focus();
}

document.addEventListener('DOMContentLoaded', load, { once: true });
