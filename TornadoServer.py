import tornado
import tornado.httpserver
import tornado.ioloop
import tornado.web
import tornado.websocket

import os
import datetime
import threading
from time import sleep

from Printer import Printer

#Configuration
STEPPER_DIRECTION_PIN = 1
STEPPER_STEP_PIN = 1
PROJECTOR_RESOLUTION = (800, 480)
AP_PASSWORD = 'abc123'
RESIN_CURE_TIME = 1
LAYER_HEIGHT = 1
THREADS_PER_INCH = 1

PrintFinishedDate = None

#Command IDs
BEGIN_PRINT_COMMAND = "PRINT"

#Response IDs
PRINT_BEGUN_RESPONSE = "BEGUN._FINISHED_DATE";
PRINT_FINISHED_RESPONSE = "FINISHED";
PRINT_ERROR_RESPONSE = "ERROR";

def SetPrintFile (printFile):
	printFile = open('uploads/PrintFile.svg', 'w')

	f.write(printFile)

def GetPrintFile ():
	printFile = open('uploads/PrintFile.svg', 'r')

	printFileContents = printFile.read()

	return printFileContents

def GetEstimatedPrintFinishedDate ():
	global PrintFinishedDate

	try:
		printFinishedDateString = PrintFinishedDate.strftime("%Y-%m-%d %H:%M:%S")

	except:
		printFinishedDateString = "None"

	return printFinishedDateString

def SetEstimatedPrintFinishedDate (estimatedPrintSeconds):
	global PrintFinishedDate

	PrintFinishedDate = (datetime.datetime.now() + datetime.timedelta(seconds = estimatedPrintSeconds))

class MainHandler (tornado.web.RequestHandler):
    def get(self):
        self.render("index.html", printSecondsRemaining = GetPrintFinishedDate())

class WebSocketHandler (tornado.websocket.WebSocketHandler):
    def open(self):
        pass

    def on_message(self, message):
        if (message == BEGIN_PRINT_COMMAND and GetPrintFile != None):
			LAVAPrinter.SetPrintFile(GetPrintFile())

			SetEstimatedPrintFinishedDate(LAVAPrinter.GetEstimatedPrintSeconds())

			self.PrintThread = threading.Thread(name = 'Print Thread', target = LAVAPrinter.Print(), args = (self.write_message, ))
			self.PrintThread.start()

			self.write_message(PRINT_BEGUN_RESPONSE + "***" + GetPrintFinishedDate())

    def on_close(self):
        pass

class UploadHandler (tornado.web.RequestHandler):
	def post(self):
		fileinfo = self.request.files['print-file'][0]
		printFile = fileinfo['body']

		SetPrintFile(printFile)

application = tornado.web.Application([
	(r'/', MainHandler),
	(r'/websocket', WebSocketHandler),
	(r'/upload', UploadHandler) ],

    template_path=os.path.join(os.path.dirname(__file__), "templates"),
    static_path=os.path.join(os.path.dirname(__file__), "static"),

    debug=True)

if __name__ == "__main__":
	LAVAPrinter = Printer(STEPPER_DIRECTION_PIN, STEPPER_STEP_PIN, PROJECTOR_RESOLUTION, AP_PASSWORD, RESIN_CURE_TIME, LAYER_HEIGHT, THREADS_PER_INCH)
	LAVAPrinter.DisplayAPPassword()
	sleep(5)
	LAVAPrinter = None
	http_server = tornado.httpserver.HTTPServer(application)
	http_server.listen(8888)
	tornado.ioloop.IOLoop.instance().start()
