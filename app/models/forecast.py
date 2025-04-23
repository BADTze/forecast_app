import os
import pickle
import logging

logger = logging.getLogger(__name__)

class ForecastModel:
    def __init__(self):
        self.prophet = None
        self.sarimax = None
        self.load_models()

    def load_models(self):
        base_path = os.path.dirname(__file__)
        try:
            with open(os.path.join(base_path, 'prophet_model.pkl'), 'rb') as f:
                self.prophet = pickle.load(f)
        except Exception as e:
            logger.error(f"Error loading Prophet model: {e}")
        try:
            with open(os.path.join(base_path, 'sarimax_model.pkl'), 'rb') as f:
                self.sarimax = pickle.load(f)
        except Exception as e:
            logger.error(f"Error loading SARIMAX model: {e}")
