import tornado
import tornado.httpserver
import tornado.ioloop
import tornado.web
import tornado.websocket
import os


class UploadHandler (tornado.web.RequestHandler):
	def post(self):
		print('PRINT FILE RECIEVED\n')

class MainHandler (tornado.web.RequestHandler):
    def get(self):
        self.render("index.html")

application = tornado.web.Application([
	(r'/', MainHandler),
	(r'/upload/', UploadHandler)

],
        template_path=os.path.join(os.path.dirname(__file__), "templates"),
        static_path=os.path.join(os.path.dirname(__file__), "static"),
        debug=True
)

if __name__ == "__main__":
	http_server = tornado.httpserver.HTTPServer(application)
	http_server.listen(8888)
	tornado.ioloop.IOLoop.instance().start()



