from flask import Flask, request, jsonify, render_template
import pickle
import pandas as pd
import numpy as np
import plotly.graph_objects as go

app = Flask(__name__)

# Muat model SARIMA menggunakan pickle
model_path = 'models/sarima_model.pkl'
with open(model_path, 'rb') as pkl:
    sarima_model = pickle.load(pkl)

@app.route('/')
def home():
    return render_template('base.html')

@app.route('/data')
def data():
    return render_template('data.html')

@app.route('/forecast')
def forecast():
    return render_template('forecast.html')

@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/predict', methods=['POST'])
def predict():
    data = request.get_json(force=True)
    forecast_period = data.get('forecast_period', 12)
    exog_forecast = pd.DataFrame({
        'Overhaul': [0] * forecast_period,
        'Holidays': [0] * forecast_period
    }, index=pd.date_range(start='2025-01-01', periods=forecast_period, freq='M'))
    
    predictions = sarima_model.get_forecast(steps=forecast_period, exog=exog_forecast)
    pred_ci = predictions.conf_int()
    pred_ci['forecast'] = predictions.predicted_mean
    
    response = {
        'dates': pred_ci.index.strftime('%Y-%m-%d').tolist(),
        'forecast': pred_ci['forecast'].tolist(),
        'lower_ci': pred_ci.iloc[:, 0].tolist(),
        'upper_ci': pred_ci.iloc[:, 1].tolist()
    }
    
    return jsonify(response)

if __name__ == '__main__':
    app.run(debug=True)
