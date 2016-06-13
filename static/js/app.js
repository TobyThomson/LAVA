var SLIDE_TIME = 700;

var ERROR_PHRASE_LIST = [
	"Errrr...",
	"Oops!",
	"Houston, we have a problem!",
	"Yer...no",
	"Computer says Nah!",
	"I haz error!",
	"Well this is embarrassing"
];

var FinishedDate = "0000-00-00 14:00:00";

var confirmOnPageExit = function(e) 
{
	e = e || window.event;

	var message = "It is not recommended that you leave the page at this time";
	
	if (e)
	{
		e.returnValue = message;
	}
	
	return message;
};

function ShowError(errorMessage) {
	var errorPhraseNum = Math.floor(Math.random() * 7);

	var notification = new Notification('Lava Printer', { 
		body: ERROR_PHRASE_LIST[errorPhraseNum] + '\n' + errorMessage
	});
};

function transitionPage(oldPage, newPage) {
	$(oldPage).toggle("slide", {direction: "left"}, SLIDE_TIME);
	$(newPage).toggle("slide", {direction: "right"}, SLIDE_TIME);
}

$(function() {
	window.onerror = function(errorMessage, url, lineNumber) {
		ShowError(errorMessage.split(": ").pop());
	}
	
	if(window.Notification && Notification.permission !== "denied") {
		Notification.requestPermission();
	}
	
	$("#print-countdown").TimeCircles({
		time: {
			Days: { show: false },
			Hours: { color: "#CB4332" },
			Minutes: { color: "#069059" },
			Seconds: { color: "#F48F32" }
		},
		
		use_background: false
	});
	
	if (FinishedDate != "0000-00-00 00:00:00") {
		$("#print-countdown").attr("data-timer", FinishedDate);
		
		$("#print-page").show();
	}
	
	else {
		$("#start-page").show();
	}
	
	$("#upload-button-file").change(function(event) {
		window.onbeforeunload = confirmOnPageExit;
		
		var data = new FormData();
		
		data.append('file', this.files[0]);
		
		$("#settings-button").hide();
		$("#upload-button").hide();
		
		$("#upload-progress-bar").show();

		$.ajax({
			xhr: function() {
				var xhr = new window.XMLHttpRequest();

				xhr.addEventListener("progress", function(evt) {
					if (evt.lengthComputable) {
						var percentComplete = evt.loaded / evt.total;
		
						$("#upload-progress-bar-fill").width(percent + "%");
					}
				}, false);

				return xhr;
			},
			type: 'POST',
			url: "/upload/",
			data: data,
			contentType: false,
			processData: false,
			success: function(data) {
				var notification = new Notification('Lava Printer', { 
					body: 'Print file finished uploading'
				});
				
				$("#upload-progress-bar").hide();
				
				$("#print-button").show();
			}
		}, 'json');

		event.preventDefault();
	});
	
	/*FinishedPrintingAccordingToServer() {
		FinishedDate = Null;
		
		var notification = new Notification('Lava Printer', { 
			body: 'Print finished!'
		});
		
		transitionPage('#print-page', '#finished-page');
	}*/
	
	$("#print-button").click(function() {
		transitionPage('#start-page', '#print-page');
	});
	
	$("#restart-button").click(function() {
		transitionPage('#finished-page', '#start-page');
	});
});
