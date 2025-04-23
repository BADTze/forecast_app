from werkzeug.middleware.dispatcher import DispatcherMiddleware
from app import create_app

application = DispatcherMiddleware(None, {
    '/forecast-web': create_app()
})
