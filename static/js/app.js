var BEGIN_PRINT_COMMAND = "PRINT";

var PRINT_BEGUN_RESPONSE = "BEGUN._FINISHED_DATE";
var PRINT_FINISHED_RESPONSE = "FINISHED";
var PRINT_ERROR_RESPONSE = "ERROR";

var Socket = null;

var ERROR_PHRASE_LIST = [
	"Errrr...",
	"Oops!",
	"Houston, we have a problem!",
	"Yer...no",
	"Computer says Nah!",
	"I haz error!",
	"Well this is embarrassing"
];

var SVGFile = null;

var SVGLayers = null;

var currentSVGLayerNumber = 0;

var minimumSVGLayerNumber = 0;
var maximumSVGLayerNumber = null;

var LayerButtonTimeout = null;

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

function GetTimeRemaining(endTime) {
	var timeRemaining = Date.parse(endTime) - Date.parse(new Date());

	var seconds = Math.floor( (timeRemaining / 1000) % 60 );
	var minutes = Math.floor( (timeRemaining / 1000 / 60) % 60 );
	var hours = Math.floor( (timeRemaining / (1000* 60 * 60)) % 24 );

	return {
		'total': timeRemaining,
		'hours': hours,
		'minutes': minutes,
		'seconds': seconds
	};
}

function InitializeCountdown (endTime) {
	var overtimeMessage = $("#print-countdown-overtime-message");

	var seconds = $("#print-countdown-seconds-value");
	var minutes = $("#print-countdown-minutes-value");
	var hours = $("#print-countdown-hours-value");

	var timeInterval = setInterval(function() {
		var timeRemaining = GetTimeRemaining(endTime);

		seconds.html(timeRemaining.seconds);
		minutes.html(timeRemaining.minutes);
		hours.html(timeRemaining.hours);

		if(timeRemaining.hours <= 0) {
			hours.parent().hide();
		}

		if (timeRemaining.minutes <= 0) {
			minutes.parent().hide();
		}

		if (timeRemaining.total <= 0) {
			seconds.parent().hide();

			overtimeMessage.show();

			clearInterval(timeInterval);
		}
	}, 1000);
}

function ConnectToSocket (oldPage, newPage) {
	var host = "ws://" + location.host + "/websocket"

	Socket = new WebSocket(host);

	Socket.onmessage = function(message) {
		responseID = message.data.split("***").shift();
		responseContent = message.data.split("***").pop();

		if (responseID == PRINT_BEGUN_RESPONSE) {
			InitializeCountdown(responseContent);

			TransitionPage('#print-page', '#print-countdown-page');
		}

		if (responseID == PRINT_FINISHED_RESPONSE) {
			var message = 'Print finished!';

			SendNotification(message);

			$('#finished-title').rainbow({
				colors: [
					'#FF0000',
					'#f26522',
					'#fff200',
					'#00a651',
					'#28abe2',
					'#2e3192',
					'#6868ff'
				],
				animate: true,
				animateInterval: 100,
				pad: false,
				pauseLength: 100,
			});

			TransitionPage('#print-countdown-page', '#finished-page');
		}

		if (responseID == PRINT_ERROR_RESPONSE) {
			ShowError(responseContent);
		}
	}
}

function changeSVGLayer() {
	var currentSVGLayer = SVGLayers[currentSVGLayerNumber];

	var polygons = currentSVGLayer.getElementsByTagName('polygon');

	for (var i = 0; i < polygons.length; i++)
	{
		var polygon = polygons[i];

		polygon.style.fill = "#F48F32";
	}

	var SVGPanel = $('#svg-canvas').svg('get');

	SVGPanel.clear();

	SVGPanel.add(currentSVGLayer);
}

function updateCurrentSVGLayerNumber (value) {
	if (SVGLayers) {
		currentSVGLayerNumber = value;
		console.log(currentSVGLayerNumber);
		if (value > maximumSVGLayerNumber) {
			currentSVGLayerNumber = maximumSVGLayerNumber;
		}

		else if (value < minimumSVGLayerNumber) {
			currentSVGLayerNumber = minimumSVGLayerNumber;
		}

		changeSVGLayer();

		$("#layer-number-input").val(currentSVGLayerNumber);
	}
}

$(document).keydown(function(e) {
	if (e.keyCode == 39) {
		updateCurrentSVGLayerNumber(currentSVGLayerNumber + 1);
	}

	else if (e.keyCode == 37) {
		updateCurrentSVGLayerNumber(currentSVGLayerNumber - 1);
	}
});

$(function() {
	if(window.Notification && Notification.permission !== "denied") {
		Notification.requestPermission();
	}

	window.onerror = function(errorMessage, url, lineNumber) {
		ShowError(errorMessage.split(": ").pop());
	}

	$("#upload-button-file").change(function(event) {
		var form = $("#upload-button-file");
		var file = form.get(0).files[0];

    if (file) {
        var reader = new FileReader();

        reader.readAsText(file);
        reader.onload = function(e) {
						SVGFile = $.parseXML(e.target.result);

						SVGLayers = SVGFile.getElementsByTagName('g');

						maximumSVGLayerNumber = SVGLayers.length - 1;

						changeSVGLayer();
        };
    }

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

			TransitionPage("#start-page", "#print-page");
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

		var secondsRemaining = $("#print-countdown").attr("data");

		if (secondsRemaining == "None") {
			$("#start-page").show();
		}

		else {
			InitializeCountdown(secondsRemaining);

			$("#print-countdown-page").show();
		}
	}

	else {
		$('#websockets-required').show();
	}

	$('#svg-canvas').svg().svg('get').configure({width: "100%", height: "400px", viewBox:"-15 -15 50 50", color: "#F48F32"});

	$("#previous-layer-button").mousedown(function(){
		LayerButtonTimeout = setInterval(function(){
				updateCurrentSVGLayerNumber(currentSVGLayerNumber - 1);
			}, 15);

			return false;
	});

	$("#next-layer-button").mousedown(function(){
		LayerButtonTimeout = setInterval(function(){
				updateCurrentSVGLayerNumber(currentSVGLayerNumber + 1);
			}, 15);

			return false;
	});

	$(document).mouseup(function(){
		clearInterval(LayerButtonTimeout);

		return false;
	});

	$("#layer-number-input").change(function(event) {
		var newValue = $("#layer-number-input").val();

		if (isNaN(newValue)) {
			$("#layer-number-input").val(currentSVGLayerNumber);
		}

		else
		{
			newValue = parseInt(newValue);

			updateCurrentSVGLayerNumber(newValue);
		}
	});
});
