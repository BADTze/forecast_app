from flask import Flask, jsonify, render_template
import pandas as pd
import pickle
import numpy as np
from sklearn.metrics import mean_absolute_error, mean_squared_error

app = Flask(__name__)

# Load model Prophet
with open('models/prophet_model.pkl', 'rb') as f:
    model = pickle.load(f)

# Load data CSV
df = pd.read_csv('data/forecast_data.csv')
df['Month'] = pd.to_datetime(df['Month'], format='%b-%y', errors='coerce')
df.dropna(subset=['Month'], inplace=True)
df.rename(columns={'Month': 'ds', 'Energy (GJ)': 'y'}, inplace=True)

# Tambahkan kolom regressors jika belum ada
for reg in ['Overhaul', 'Holidays', 'Off']:
    if reg not in df.columns:
        df[reg] = 0

# Buat prediksi pada data aktual
future = df[['ds']].copy()
for reg in ['Overhaul', 'Holidays', 'Off']:
    future[reg] = df[reg]  

forecast = model.predict(future)
merged_df = df.merge(forecast[['ds', 'yhat']], on='ds', how='inner')

# Evaluasi model
mae = mean_absolute_error(merged_df['y'], merged_df['yhat'])
rmse = np.sqrt(mean_squared_error(merged_df['y'], merged_df['yhat']))
mape = np.mean(np.abs((merged_df['y'] - merged_df['yhat']) / merged_df['y'])) * 100

# ROUTES
@app.route('/')
def home_page():
    return render_template('base.html')

@app.route('/forecast')
def forecast_page():
    return render_template('forecast.html')

@app.route('/data')
def data_page():
    return render_template('data.html')

@app.route('/about')
def about_page():
    return render_template('about.html')

@app.route('/actual_data')
def get_actual_data():
    actual_data = merged_df[['ds', 'y']].to_dict(orient='records')
    return jsonify(actual_data)

@app.route('/model_evaluation')
def get_model_evaluation():
    evaluation = {
        "MAPE": mape,
        "MAE": mae,
        "RMSE": rmse
    }
    return jsonify(evaluation)

@app.route('/summary_forecast')
def get_summary_forecast():
    summary_forecast = {
        "min": merged_df['yhat'].min(),
        "max": merged_df['yhat'].max(),
        "avg": merged_df['yhat'].mean()
    }
    return jsonify(summary_forecast)

@app.route('/summary_actual')
def get_summary_actual():
    summary_actual = {
        "min": df['y'].min(),
        "max": df['y'].max(),
        "avg": df['y'].mean()
    }
    return jsonify(summary_actual)

if __name__ == '__main__':
    app.run(debug=True)
