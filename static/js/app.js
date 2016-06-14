var BEGIN_PRINT_COMMAND = "PRINT";

var PRINT_BEGUN_RESPONSE = "BEGUN._TIME_REMANING";
var PRINT_FINISHED_RESPONSE = "FINISHED";
var PRINT_ERROR_RESPONSE = "ERROR";

var Socket = null;

var LargestDisplayedTimeUnit = "Hours";

var PrintCountdownCreated = false;
var PrintCountdownListenerAdded = false;

var ERROR_PHRASE_LIST = [
	"Errrr...",
	"Oops!",
	"Houston, we have a problem!",
	"Yer...no",
	"Computer says Nah!",
	"I haz error!",
	"Well this is embarrassing"
];

function SendNotification (message) {
	var notification = new Notification('Lava Printer', { 
		body: message
	});
};

function ShowError (errorMessage) {
	var errorPhraseNum = Math.floor(Math.random() * 7);
	
	var message = ERROR_PHRASE_LIST[errorPhraseNum] + '\n' + errorMessage;
	
	SendNotification(message);
};

function TransitionPage (oldPage, newPage) {
	$(oldPage).toggle("slide", {direction: "left"}, 700);
	$(newPage).toggle("slide", {direction: "right"}, 700);
}

function UpdateTimeCircles (printSecondsRemaining) {
	var printCountdown = $("#print-countdown");
	
	if (PrintCountdownCreated) {
		printSecondsRemaining = printCountdown.TimeCircles().getTime();
		
		printCountdown.TimeCircles().destroy();
	}
	
	else {
		if (printSecondsRemaining == undefined) {
			printSecondsRemaining = printCountdown.attr("data-timer");
		}
	}
	
	var updatedTimeCircles = { time: {
		Hours: { color: "#CB4332" },
		Minutes: { color: "#069059" },
		Seconds: { color: "#F48F32" }
	}};
	
    if (printSecondsRemaining < 3600)
    {
    	updatedTimeCircles.time.Hours.show = false;
    	
    	LargestDisplayedTimeUnit = "Minutes";
    }
    
    if (printSecondsRemaining < 60)
    {
    	updatedTimeCircles.time.Minutes.show = false;
    	
    	LargestDisplayedTimeUnit = "Seconds";
    }
    
    printCountdown.data('timer', parseInt(printSecondsRemaining));
    
    printCountdown.TimeCircles(updatedTimeCircles);
    
    PrintCountdownCreated = true;
    
	if (!PrintCountdownListenerAdded) {
		printCountdown.TimeCircles().addListener(function (unit, value, total) {
			if (unit == LargestDisplayedTimeUnit && value == 0) {
				UpdateTimeCircles();
			}
			
			if (unit == "Seconds") {
				var message = 'Print finished!';
			
				SendNotification(message);
			
				TransitionPage('#print-page', '#finished-page');
			}
		});
		
		PrintCountdownListenerAdded = true;
	}
}

function ConnectToSocket (oldPage, newPage) {
	var host = "ws://" + location.host + "/websocket"
	
	Socket = new WebSocket(host);

	Socket.onmessage = function(message) {
		responseID = message.data.split(":").shift();
		responseContent = message.data.split(":").pop();
		
		if (responseID == PRINT_BEGUN_RESPONSE) {
			UpdateTimeCircles(responseContent);
			
			TransitionPage('#start-page', '#print-page');
		}
		
		if (responseID == PRINT_FINISHED_RESPONSE) {
			var message = 'Print finished!';
			
			SendNotification(message);
			
			TransitionPage('#print-page', '#finished-page');
		}
		
		if (responseID == PRINT_ERROR_RESPONSE) {
			ShowError(responseContent);
		}
	}
}

$(function() {
	if(window.Notification && Notification.permission !== "denied") {
		Notification.requestPermission();
	}

	window.onerror = function(errorMessage, url, lineNumber) {
		ShowError(errorMessage.split(": ").pop());
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
			var message = "Print file finished uploading";
			
			SendNotification(message);
			
			$("#upload-progress-bar").hide();
			
			$("#print-button").show();
		}
	});
	
	$("#print-button").click(function() {
		Socket.send(BEGIN_PRINT_COMMAND);
	});
	
	$("#restart-button").click(function() {
		location.reload(true);
	});
	
	if (("WebSocket" in window)) {
		ConnectToSocket();
		
		if ($("#print-countdown").attr("data-timer") == "None") {
			$("#start-page").show();
		}
	
		else {
			UpdateTimeCircles();
			
			$("#print-page").show();
		}
	}

	else {
		$('#websockets-required').show();
	}
});
