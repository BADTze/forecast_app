class Config:
    APPLICATION_ROOT = '/forecast-web'
    SECRET_KEY = 'your-secret-key'
    CACHE_TYPE = 'SimpleCache'
    CACHE_DEFAULT_TIMEOUT = 300

class DevelopmentConfig(Config):
    DEBUG = True

class ProductionConfig(Config):
    DEBUG = False
