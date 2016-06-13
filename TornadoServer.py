import tornado
import tornado.httpserver
import tornado.ioloop
import tornado.web
import tornado.websocket


class UploadHandler(tornado.web.RequestHandler):
	def post(self):
		print('PRINT FILE RECIEVED\n')

class IndexPageHandler(tornado.web.RequestHandler):
    def get(self):
        self.render("index.html")

application = tornado.web.Application([
	(r'/', IndexPageHandler),
	(r'/upload/', UploadHandler)

], debug=True)

if __name__ == "__main__":
	http_server = tornado.httpserver.HTTPServer(application)
	http_server.listen(8888)
	tornado.ioloop.IOLoop.instance().start()
