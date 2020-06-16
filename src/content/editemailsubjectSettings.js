document.addEventListener('DOMContentLoaded', () => {
	editEmailSubject.preferences.load(document);
	document.getElementById("editemailsubjectSettings").addEventListener("dialogaccept", function() { 
		editEmailSubject.preferences.save(document);
	});
}, { once: true });
