import tornado
import tornado.httpserver
import tornado.ioloop
import tornado.web
import tornado.websocket
import os
import datetime
import uuid

PrintFinishedDate = None

class UploadHandler (tornado.web.RequestHandler):
	def post(self):
		global PrintFinishedDate

		print('PRINT FILE RECIEVED\n')

		PrintFinishedDate = (datetime.datetime.now() + datetime.timedelta(seconds=30000))

		print(PrintFinishedDate)

		fileinfo = self.request.files['print-file'][0]
		fname = fileinfo['filename']
		extn = os.path.splitext(fname)[1]
		cname = str(uuid.uuid4()) + extn

		f = open('uploads/' + cname, 'w+')

		f.write(fileinfo['body'])
		
class MainHandler (tornado.web.RequestHandler):
    def get(self):
    	global PrintFinishedDate
    	
    	seconds = 0
    	
    	try:
    		seconds = (PrintFinishedDate - datetime.datetime.now()).total_seconds()
    	
    	except:
    		seconds = None
    	
        self.render("index.html", printFinishedSeconds = seconds)

application = tornado.web.Application([
	(r'/', MainHandler),
	(r'/upload/', UploadHandler) ],
    
    template_path=os.path.join(os.path.dirname(__file__), "templates"),
    static_path=os.path.join(os.path.dirname(__file__), "static"),
    
    debug=True)

if __name__ == "__main__":
	http_server = tornado.httpserver.HTTPServer(application)
	http_server.listen(8888)
	tornado.ioloop.IOLoop.instance().start()



