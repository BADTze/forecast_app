from werkzeug.middleware.dispatcher import DispatcherMiddleware
from werkzeug.serving import run_simple
from app import create_app
from config import DevelopmentConfig

app = create_app(DevelopmentConfig)

application = DispatcherMiddleware(None, {
    '/forecast-web': app
})

if __name__ == '__main__':
    run_simple('localhost', 5000, application, use_reloader=True, use_debugger=True)
