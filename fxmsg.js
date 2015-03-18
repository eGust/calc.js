// setup firefox add-on msg
self.port.on("show", function () {
	var e = document.getElementById("fireUpdateUI");
	e && e.onclick && e.onclick();
});

self.port.on("setInput", function (text) {
	if (text.trim() == '')
		return;

	myStg.set( { 'inputting': text, } );
});
