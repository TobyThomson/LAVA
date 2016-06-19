import tornado
import tornado.httpserver
import tornado.ioloop
import tornado.web
import tornado.websocket
import os
import datetime
import uuid
import math
import threading
import time

PrintFinishedDate = "None"

#Command IDs
BEGIN_PRINT_COMMAND = "PRINT"

#Response IDs
PRINT_BEGUN_RESPONSE = "BEGUN._FINISHED_DATE";
PRINT_FINISHED_RESPONSE = "FINISHED";
PRINT_ERROR_RESPONSE = "ERROR";

def test (sendMessage):
	time.sleep(15)
	global PrintFinishedDate
	PrintFinishedDate = None
	sendMessage(PRINT_FINISHED_RESPONSE)

def GetPrintFinishedDate ():
	global PrintFinishedDate

	try:
		printFinishedDateString = PrintFinishedDate.strftime("%Y-%m-%d %H:%M:%S")

	except:
		printFinishedDateString = "None"

	return printFinishedDateString

def SetPrintFinishedDate (estimatedPrintSeconds):
	global PrintFinishedDate

	PrintFinishedDate = (datetime.datetime.now() + datetime.timedelta(seconds = estimatedPrintSeconds))

class MainHandler (tornado.web.RequestHandler):
    def get(self):
        self.render("index.html", printSecondsRemaining = GetPrintFinishedDate())

class WebSocketHandler (tornado.websocket.WebSocketHandler):
    def open(self):
        print("***** WEBSOCKET OPENED *****")

    def on_message(self, message):
        if (message == BEGIN_PRINT_COMMAND):
			SetPrintFinishedDate(10)
			printThread = threading.Thread(name = 'Print Thread', target = test, args = (self.write_message, ))
			printThread.start()

			self.write_message(PRINT_BEGUN_RESPONSE + "***" + GetPrintFinishedDate())

    def on_close(self):
        print("***** WEBSOCKET CLOSED *****")

class UploadHandler (tornado.web.RequestHandler):
	def post(self):
		print('PRINT FILE RECIEVED\n')

		fileinfo = self.request.files['print-file'][0]
		fname = fileinfo['filename']
		extn = os.path.splitext(fname)[1]
		cname = str(uuid.uuid4()) + extn

		f = open('uploads/' + cname, 'w+')

		f.write(fileinfo['body'])

application = tornado.web.Application([
	(r'/', MainHandler),
	(r'/websocket', WebSocketHandler),
	(r'/upload', UploadHandler) ],

    template_path=os.path.join(os.path.dirname(__file__), "templates"),
    static_path=os.path.join(os.path.dirname(__file__), "static"),

    debug=True)

if __name__ == "__main__":
	http_server = tornado.httpserver.HTTPServer(application)
	http_server.listen(8888)
	tornado.ioloop.IOLoop.instance().start()
