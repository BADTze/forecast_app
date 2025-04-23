from waitress import serve
from wsgi import application

if __name__ == "__main__":
    serve(application, host="0.0.0.0", port=5000, threads=4)
