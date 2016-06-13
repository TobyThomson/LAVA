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

function ShowError(errorMessage) {
	var errorPhraseNum = Math.floor(Math.random() * 7);

	var notification = new Notification('Lava Printer', { 
		body: ERROR_PHRASE_LIST[errorPhraseNum] + '\n' + errorMessage
	});
};

function TransitionPage(oldPage, newPage) {
	$(oldPage).toggle("slide", {direction: "left"}, SLIDE_TIME);
	$(newPage).toggle("slide", {direction: "right"}, SLIDE_TIME);
}

$(function() {
	if(window.Notification && Notification.permission !== "denied") {
		Notification.requestPermission();
	}
	
	window.onerror = function(errorMessage, url, lineNumber) {
		ShowError(errorMessage.split(": ").pop());
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
	
	if ($("#print-countdown").attr("data-timer") == "None") {
		$("#start-page").show();
	}
	
	else {		
		$("#print-page").show();
	}
	
	$("#upload-button-file").change(function(event) {
		$("#upload-form").submit();
	});
	

	$("form").ajaxForm({
		beforeSend: function() {
			var percentVal = '0%';
			
			$('#upload-progress-bar-fill').width(percentVal);
			
			$("#settings-button").hide();
			$("#upload-button").hide();
		
			$("#upload-progress-bar").show();
		},
		uploadProgress: function(event, position, total, percentComplete) {
			var percentVal = percentComplete + '%';
			
			$('#upload-progress-bar-fill').width(percentVal);
		},
		complete: function(response) {
			var notification = new Notification("Lava Printer", { 
				body: "Print file finished uploading"
			});
			
			$("#upload-progress-bar").hide();
			
			$("#print-button").show();
		}
	});
	
	/*FinishedPrintingAccordingToServer() {
		FinishedDate = null;
		
		var notification = new Notification('Lava Printer', { 
			body: 'Print finished!'
		});
		
		transitionPage('#print-page', '#finished-page');
	}
	
	*/
	
	$("#print-button").click(function() {
		TransitionPage('#start-page', '#print-page');
	});
	
	$("#restart-button").click(function() {
		 location.reload(true);
	});
});
