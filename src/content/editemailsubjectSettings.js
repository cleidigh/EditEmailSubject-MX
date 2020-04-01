var extSettings = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);

function loadSettings() {
	document.getElementById("editemailsubjectSettings").addEventListener("dialogaccept", function(event) {
		saveSettings();
	});
	document.getElementById("localOnly").checked = extSettings.getBoolPref("extensions.editemailsubject.localOnly");
}

function saveSettings() {
	extSettings.setBoolPref("extensions.editemailsubject.localOnly",document.getElementById("localOnly").checked);
}