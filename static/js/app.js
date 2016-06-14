var ERROR_PHRASE_LIST = [
	"Errrr...",
	"Oops!",
	"Houston, we have a problem!",
	"Yer...no",
	"Computer says Nah!",
	"I haz error!",
	"Well this is embarrassing"
];

var BEGIN_PRINT_COMMAND = "PRINT";

var PRINT_BEGUN_RESPONSE = "BEGUN._TIME_REMANING";
var PRINT_FINISHED_RESPONSE = "FINISHED";
var PRINT_ERROR_RESPONSE = "ERROR";

var Socket = null;

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

function ConnectToSocket (oldPage, newPage) {
	var host = "ws://" + location.host + "/websocket"
	
	Socket = new WebSocket(host);

	Socket.onopen = function() {
		alert("open");
	}

	Socket.onmessage = function(message) {
		responseID = message.data.split(":").shift();
		responseContent = message.data.split(":").pop();
		
		if (responseID == PRINT_BEGUN_RESPONSE) {
			$("#print-countdown").attr("data-timer", responseContent);
			
			$("#print-countdown").TimeCircles({
			time: {
				Days: { show: false },
				Hours: { color: "#CB4332" },
				Minutes: { color: "#069059" },
				Seconds: { color: "#F48F32" }
			},
	
			use_background: false
		});
			
			TransitionPage('#start-page', '#print-page');
		}
		
		if (responseID == PRINT_FINISHED_RESPONSE) {
			var message = 'Print finished!';
			
			SendNotification(message);
			
			transitionPage('#print-page', '#finished-page');
		}
		
		if (responseID == PRINT_ERROR_RESPONSE) {
			ShowError(responseContent);
		}
	}

	Socket.onclose = function() {
		alert("closed");
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
			$("#print-page").show();
		}
	}

	else {
		$('#websockets-required').show();
	}
});
