import datetime
from flask import Flask, json, request, jsonify, render_template, redirect, url_for
from flask_caching import Cache
import pandas as pd
import numpy as np
import requests
import pickle
from sklearn.metrics import mean_absolute_error, mean_absolute_percentage_error, mean_squared_error

app = Flask(__name__)

app.config['CACHE_TYPE'] = 'SimpleCache' 
app.config['CACHE_DEFAULT_TIMEOUT'] = 300  
cache = Cache(app)

# URL API Data
current_year = datetime.datetime.now().year
start_year = current_year - 2
end_year = current_year
API_URL = f"http://10.10.2.70:3008/api/energy-emission/energy?start_year={start_year}&end_year={current_year}&start_month=01&end_month=12&is_emission=false"

# Load model Prophet
with open('models/prophet_model.pkl', 'rb') as f:
    model = pickle.load(f)

def replace_nan_with_null(obj):
    if isinstance(obj, float) and np.isnan(obj):
        return None
    elif isinstance(obj, dict):
        return {k: replace_nan_with_null(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [replace_nan_with_null(v) for v in obj]
    return obj

@app.route('/')
def home_page():
    return redirect(url_for('forecast_page'))

@app.route('/forecast')
def forecast_page():
    return render_template('forecast.html')

@app.route('/data')
def data_page():
    return render_template('data.html')

# Route untuk mengambil data aktual
@app.route('/actual_data')
def get_actual_data():
    response = requests.get(API_URL)
    if response.status_code == 200:
        api_data = response.json()
        trend_data = api_data.get("data", {}).get("trendData", [])
        
        all_data = [entry for entry in trend_data if entry["line"] == "All"]

        extracted_data = []
        for entry in all_data:
            for item in entry["data"]:
                extracted_data.append({
                    "ds": f"{item['year']}-{item['month']}-01",  
                    "y": item["values"]["indexEnergy"]
                })

        df = pd.DataFrame(extracted_data)
        df["ds"] = pd.to_datetime(df["ds"])
        
        if df.isnull().values.any():
            print("Ada data NaN, menghapus data tersebut...")
            df = df.dropna()
            
        return jsonify(df.to_dict(orient='records'))
    else:
        return jsonify({"error": "Gagal mengambil data dari API"}), 500

# Route untuk melakukan forecasting secara dinamis
@app.route('/forecast_data')
@cache.cached(timeout=3600)
def get_forecast_data():
    start_date = f"{start_year}-01-01"
    end_date = f"{end_year + 1}-12-01"

    future = model.make_future_dataframe(periods=12, freq='M')
    forecast = model.predict(future)
    forecast_filtered = forecast[(forecast['ds'] >= start_date) & (forecast['ds'] <= end_date)]

    forecast_data = forecast_filtered[['ds', 'yhat', 'yhat_upper', 'yhat_lower']].to_dict(orient='records')
    return jsonify(forecast_data)

# Route Summary Data
@app.route('/summary_data')
def summary_data():
    try:
        actual_response = requests.get("http://127.0.0.1:5000/actual_data")
        forecast_response = requests.get("http://127.0.0.1:5000/forecast_data")

        if actual_response.status_code != 200 or forecast_response.status_code != 200:
            return jsonify({"error": "Gagal mengambil data"}), 500

        actual_data = actual_response.json()
        forecast_data = forecast_response.json()

        if not actual_data or not forecast_data:
            return jsonify({"error": "Data kosong dari API"}), 500

        actual_df = pd.DataFrame(actual_data)
        forecast_df = pd.DataFrame(forecast_data)

        summary_actual = {
            "min": round(actual_df["y"].min(), 2),
            "max": round(actual_df["y"].max(), 2),
            "average": round(actual_df["y"].mean(), 2)
        }

        summary_forecast = {
            "min": round(forecast_df["yhat"].min(), 2),
            "max": round(forecast_df["yhat"].max(), 2),
            "average": round(forecast_df["yhat"].mean(), 2)
        }

        return jsonify({"summary_actual": summary_actual, "summary_forecast": summary_forecast})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Route Model evaluation
@app.route('/model_evaluation')
def model_evaluation():
    try:
        actual_response = requests.get("http://127.0.0.1:5000/actual_data")
        forecast_response = requests.get("http://127.0.0.1:5000/forecast_data")

        if actual_response.status_code != 200 or forecast_response.status_code != 200:
            return jsonify({"error": "Gagal mengambil data"}), 500

        actual_data = actual_response.json()
        forecast_data = forecast_response.json()

        if not actual_data or not forecast_data:
            return jsonify({"error": "Data kosong dari API"}), 500

        actual_df = pd.DataFrame(actual_data)
        forecast_df = pd.DataFrame(forecast_data)

        merged_df = pd.merge(actual_df, forecast_df, on="ds", how="inner")

        mae = mean_absolute_error(merged_df["y"], merged_df["yhat"])
        mape = mean_absolute_percentage_error(merged_df["y"], merged_df["yhat"])
        rmse = np.sqrt(mean_squared_error(merged_df["y"], merged_df["yhat"]))

        evaluation = {
            "MAE": round(mae, 2),
            "MAPE": round(mape * 100, 2),
            "RMSE": round(rmse, 2)
        }

        return jsonify(evaluation)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Route Compare Data
@app.route('/compare_data')
def get_comparison_data():
    actual_response = requests.get("http://127.0.0.1:5000/actual_data")
    forecast_response = requests.get("http://127.0.0.1:5000/forecast_data")

    if actual_response.status_code != 200 or forecast_response.status_code != 200:
        return jsonify({"error": "Gagal mengambil data actual atau forecast"}), 500

    actual_data = pd.DataFrame(actual_response.json())
    forecast_data = pd.DataFrame(forecast_response.json())

    actual_data["ds"] = pd.to_datetime(actual_data["ds"]).dt.strftime("%b %Y")
    forecast_data["ds"] = pd.to_datetime(forecast_data["ds"]).dt.strftime("%b %Y")

    merged_df = pd.merge(forecast_data, actual_data, on="ds", how="left", suffixes=("_forecast", "_actual"))
    merged_df["yhat"] = merged_df["yhat"].apply(lambda x: round(x, 2) if pd.notnull(x) else None)
    merged_df["y_actual"] = merged_df["y"].apply(lambda x: round(x, 2) if pd.notnull(x) else None)

    comparison_data = merged_df[["ds", "yhat", "y_actual"]].to_dict(orient="records")

    return jsonify(comparison_data)

@app.route('/clear_cache')
def clear_cache():
    cache.clear()
    return "Cache berhasil dibersihkan!", 200

if __name__ == "__main__":
    app.run(debug=True)
