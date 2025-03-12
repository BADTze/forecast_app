from flask import Flask, request, jsonify, render_template, redirect, url_for
from flask_caching import Cache
import pandas as pd
import numpy as np
import requests
import pickle
from sklearn.metrics import mean_absolute_error, mean_squared_error

app = Flask(__name__)

app.config['CACHE_TYPE'] = 'SimpleCache'  # Menggunakan cache berbasis memori
app.config['CACHE_DEFAULT_TIMEOUT'] = 300  # Waktu kedaluwarsa cache dalam detik (5 menit)
cache = Cache(app)
# URL API Data
API_URL = "http://10.10.2.70:3008/api/energy-emission/energy?start_year=2023&end_year=2024&start_month=01&end_month=12&is_emission=false"

# Load model Prophet
with open('models/prophet_model.pkl', 'rb') as f:
    model = pickle.load(f)

# Function untuk mengambil data dari API
def fetch_api_data():
    response = requests.get(API_URL)
    if response.status_code == 200:
        api_data = response.json()
        trend_data = api_data.get("data", {}).get("trendData", [])
        
        # Filter hanya line "All"
        all_data = [entry for entry in trend_data if entry["line"] == "All"]

        # Ambil hanya kolom month, year, dan indexEnergy
        extracted_data = []
        for entry in all_data:
            for item in entry["data"]:
                extracted_data.append({
                    "ds": f"{item['year']}-{item['month']}-01",  
                    "y": item["values"]["indexEnergy"]
                })

        df = pd.DataFrame(extracted_data)
        df["ds"] = pd.to_datetime(df["ds"])
        return df
    else:
        return None

# Ambil data dari API
df = fetch_api_data()
if df is None:
    raise ValueError("Gagal mengambil data dari API!")

# Prediksi Data Menggunakan Prophet
future = df[['ds']].copy()
forecast = model.predict(future)
merged_df = df.merge(forecast[['ds', 'yhat']], on='ds', how='inner')

# Evaluasi model
mae = mean_absolute_error(merged_df['y'], merged_df['yhat'])
rmse = np.sqrt(mean_squared_error(merged_df['y'], merged_df['yhat']))
mape = np.mean(np.abs((merged_df['y'] - merged_df['yhat']) / merged_df['y'])) * 100

@app.route('/')
def home_page():
    return redirect(url_for('forecast_page'))

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

@app.route('/forecast_data')
@cache.cached()  
def get_forecast_data():
    forecast_data = forecast[['ds', 'yhat', 'yhat_upper', 'yhat_lower']].copy()
    forecast_data['actual'] = df['y']
    return jsonify(forecast_data.to_dict(orient='records'))


@app.route('/dynamic_forecast')
@cache.cached(query_string=True)
def dynamic_forecast():
    periods = request.args.get('periods', default=12, type=int)

    # Forecast future dates
    future = model.make_future_dataframe(periods=periods, freq='M')
    future = future[future["ds"] >= df["ds"].min()]
    
    # Predict future data
    forecast = model.predict(future)

    # Merge with actual data
    merged_data = forecast[['ds', 'yhat', 'yhat_upper', 'yhat_lower']]
    merged_data = merged_data.merge(df[['ds', 'y']], on='ds', how='left')
    merged_data['actual'] = merged_data['y'].where(merged_data['ds'] <= df['ds'].max(), None)
    merged_data.drop(columns=['y'], inplace=True)

    # Convert NaN in actual to "-"
    merged_data['actual'].fillna("-", inplace=True)

    return jsonify(merged_data.to_dict(orient='records'))

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

@app.route('/growth_data')
def get_growth_data():
    df["Year"] = df["ds"].dt.year
    yearly_data = df.groupby("Year")["y"].sum().reset_index()
    yearly_data["Growth (%)"] = yearly_data["y"].pct_change() * 100
    yearly_data["Growth (%)"] = yearly_data["Growth (%)"].fillna("-")

    return jsonify(yearly_data.to_dict(orient="records"))

@app.route('/clear_cache')
def clear_cache():
    cache.clear()
    return "Cache berhasil dibersihkan!", 200

if __name__ == "__main__":
    app.run(debug=True)
