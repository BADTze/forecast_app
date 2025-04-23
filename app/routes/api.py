import datetime
from flask import Blueprint, jsonify
from app import cache, logger
import pandas as pd
import numpy as np
import requests
from app.models.forecast_models import ForecastModel
from sklearn.metrics import mean_absolute_error, root_mean_squared_error

api_bp = Blueprint('api', __name__)
current_year = datetime.datetime.now().year
start_year = current_year - 2
API_URL = f"" # Isi API untuk data actual

model_manager = ForecastModel()
model_manager.load_models()

def replace_nan_with_null(obj):
    if isinstance(obj, float) and np.isnan(obj):
        return None
    elif isinstance(obj, dict):
        return {k: replace_nan_with_null(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [replace_nan_with_null(v) for v in obj]
    return obj

def handle_nulls(data):
    if isinstance(data, float) and np.isnan(data):
        return None
    elif isinstance(data, dict):
        return {k: handle_nulls(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [handle_nulls(v) for v in data]
    return data

@cache.memoize(timeout=3600)
def fetch_api_data():
    try:
        response = requests.get(API_URL, timeout=120)
        response.raise_for_status()
        data = response.json()
        trend_data = data.get("data", {}).get("trendData", [])
        all_data = next((item for item in trend_data if item.get("line") == "All"), None)
        return all_data.get("data", []) if all_data else None
    except Exception as e:
        logger.error(f"API request failed: {e}")
        return None

def process_forecast_data(raw_data):
    if not raw_data:
        return None
    clean_data = []
    for item in raw_data:
        try:
            val = item.get("values", {}).get("indexEnergy")
            if val is None: continue
            clean_data.append({
                "ds": datetime.datetime(year=int(item['year']), month=int(item['month']), day=1),
                "y": float(val)
            })
        except Exception as e:
            logger.warning(f"Invalid item: {e}")
            continue
    return clean_data if clean_data else None

@api_bp.route('/raw_data')
def get_raw_data():
    raw_data = fetch_api_data()
    if raw_data is None:
        return jsonify({"error": "Failed to fetch data"}), 500
    return jsonify(handle_nulls(raw_data))

@api_bp.route('/actual_data')
def get_actual_data():
    raw_data = fetch_api_data()
    clean_data = process_forecast_data(raw_data) if raw_data else None
    if clean_data is None:
        return jsonify({"error": "No valid data available"}), 404
    return jsonify(handle_nulls(clean_data))

@api_bp.route('/prophet_forecast')
@cache.cached(timeout=3600)
def get_prophet_forecast():
    try:
        future = model_manager.prophet.make_future_dataframe(periods=12, freq='M')
        forecast = model_manager.prophet.predict(future)
        display_start_date = f"{start_year}-01-01"
        display_end_date = f"{current_year + 1}-12-31"
        forecast_filtered = forecast[
            (forecast['ds'] >= display_start_date) & (forecast['ds'] <= display_end_date)
        ]
        result = forecast_filtered[['ds', 'yhat', 'yhat_upper', 'yhat_lower']].to_dict(orient='records')
        return jsonify(replace_nan_with_null(result))
    except Exception as e:
        logger.error(f"Prophet forecast error: {e}")
        return jsonify({"error": str(e)}), 500

@api_bp.route('/sarimax_forecast')
@cache.cached(timeout=3600)
def get_sarimax_forecast():
    try:
        actual_data = get_actual_data().get_json()
        if 'error' in actual_data:
            return jsonify(actual_data), 400
        df = pd.DataFrame(actual_data)
        df.set_index('ds', inplace=True)
        forecast = model_manager.sarimax.get_forecast(steps=12)
        result = pd.DataFrame({
            'ds': forecast.predicted_mean.index,
            'yhat': forecast.predicted_mean.values,
            'yhat_lower': forecast.conf_int().iloc[:, 0],
            'yhat_upper': forecast.conf_int().iloc[:, 1]
        })
        return jsonify({
            "model": "sarimax",
            "forecast": handle_nulls(result.to_dict('records'))
        })
    except Exception as e:
        logger.error(f"SARIMAX forecast failed: {e}")
        return jsonify({"error": str(e)}), 500

@api_bp.route('/evaluate_model/<model_name>')
def evaluate_model(model_name):
    try:
        actual_data = get_actual_data().get_json()
        if 'error' in actual_data:
            return jsonify(actual_data), 400

        df_actual = pd.DataFrame(actual_data)
        df_actual['ds'] = pd.to_datetime(df_actual['ds'])
        df_actual.set_index('ds', inplace=False)

        if model_name.lower() == 'prophet':
            future = model_manager.prophet.make_future_dataframe(periods=12, freq='M')
            forecast = model_manager.prophet.predict(future)
            forecast_df = forecast[['ds', 'yhat']]
        elif model_name.lower() == 'sarimax':
            forecast_result = model_manager.sarimax.get_forecast(steps=12)
            forecast_df = pd.DataFrame({
                'ds': forecast_result.predicted_mean.index,
                'yhat': forecast_result.predicted_mean.values
            })
        else:
            return jsonify({"error": "Model not supported"}), 400

        forecast_df['ds'] = pd.to_datetime(forecast_df['ds'])

        # Gabungkan dengan data aktual yang ada
        merged = pd.merge(df_actual, forecast_df, on='ds', how='inner')

        y_true = merged['y']
        y_pred = merged['yhat']

        mae = mean_absolute_error(y_true, y_pred)
        rmse = root_mean_squared_error(y_true, y_pred)
        mape = np.mean(np.abs((y_true - y_pred) / y_true)) * 100

        return jsonify({
            "model": model_name,
            "mae": round(mae, 3),
            "rmse": round(rmse, 3),
            "mape": round(mape, 3)
        })
    except Exception as e:
        logger.error(f"Evaluation error: {e}")
        return jsonify({"error": str(e)}), 500

@api_bp.route('/summary_data/<data_type>', defaults={'model_name': None})
@api_bp.route('/summary_data/<data_type>/<model_name>')
def summary_data(data_type, model_name):
    try:
        if data_type == 'actual':
            actual_data = get_actual_data().get_json()
            if 'error' in actual_data:
                return jsonify(actual_data), 400
            df = pd.DataFrame(actual_data)
            values = df['y'].dropna()

        elif data_type == 'forecast':
            if model_name is None:
                return jsonify({"error": "Model name required for forecast"}), 400
            
            if model_name.lower() == 'prophet':
                future = model_manager.prophet.make_future_dataframe(periods=12, freq='M')
                forecast = model_manager.prophet.predict(future)
                display_start_date = f"{start_year}-01-01"
                display_end_date = f"{current_year + 1}-12-31"
                forecast_filtered = forecast[
                    (forecast['ds'] >= display_start_date) & (forecast['ds'] <= display_end_date)
                ]
                values = forecast_filtered['yhat'].dropna()

            elif model_name.lower() == 'sarimax':
                forecast_result = model_manager.sarimax.get_forecast(steps=12)
                values = pd.Series(forecast_result.predicted_mean.values)
            else:
                return jsonify({"error": "Invalid model name"}), 400

        else:
            return jsonify({"error": "Invalid data_type"}), 400

        summary = {
            "min": round(values.min(), 2),
            "max": round(values.max(), 2),
            "avg": round(values.mean(), 2)
        }

        return jsonify(summary)

    except Exception as e:
        logger.error(f"Summary data error: {e}")
        return jsonify({"error": str(e)}), 500
    
@api_bp.route('/clear_cache')
def clear_cache():
    try:
        cache.clear()
        return "Cache berhasil dibersihkan!", 200
    except Exception as e:
        logger.error(f"Cache clearing error: {e}")
        return "Gagal membersihkan cache.", 500

@api_bp.route('/model_list')
def model_list():
    models = []
    if model_manager.prophet is not None:
        models.append("prophet")
    if model_manager.sarimax is not None:
        models.append("sarimax")
    return jsonify({"models": models})
