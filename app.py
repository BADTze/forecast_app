from flask import Flask, request, jsonify, render_template, redirect, url_for
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

@app.route('/raw_data')
def get_raw_data():
    df = pd.read_csv("data/forecast_data.csv", usecols=["Month", "Energy (GJ)", "Remark"])
    # Mengganti NaN dengan None agar JSON valid
    df = df.where(pd.notna(df), None)

    raw_data = df.to_dict(orient="records") 
    return jsonify(raw_data)

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

@app.route('/forecast_data')
def get_forecast_data():
    forecast_data = forecast[['ds', 'yhat', 'yhat_upper', 'yhat_lower']].copy()
    forecast_data['actual'] = df['y']
    return jsonify(forecast_data.to_dict(orient='records'))

@app.route('/dynamic_forecast')
def dynamic_forecast():
    periods = request.args.get('periods', default=12, type=int)

    # Forecast future dates
    future = model.make_future_dataframe(periods=periods, freq='M')

    # Add regressors if needed
    for reg in ['Overhaul', 'Holidays', 'Off']:
        if reg in df.columns:
            future[reg] = 0  

    # Predict future data
    forecast = model.predict(future)

    # Merge with actual data
    merged_data = forecast[['ds', 'yhat', 'yhat_upper', 'yhat_lower']]
    merged_data = merged_data.merge(df[['ds', 'y']], on='ds', how='left')
    merged_data['actual'] = merged_data['y'].where(merged_data['ds'] <= '2024-12-31', None)
    merged_data.drop(columns=['y'], inplace=True)

    # Convert NaN in actual to "-"
    merged_data['actual'].fillna("-", inplace=True)

    return jsonify(merged_data.to_dict(orient='records'))

@app.route('/growth_data')
def get_growth_data():
    df = pd.read_csv("data/forecast_data.csv")
    df.rename(columns={"Month": "Date", "Energy (GJ)": "Energy"}, inplace=True)

    df["Date"] = pd.to_datetime(df["Date"], format="%b-%y")
    df["Year"] = df["Date"].dt.year
    yearly_data = df.groupby("Year")["Energy"].sum().reset_index()

    yearly_data["Growth (%)"] = yearly_data["Energy"].pct_change() * 100
    yearly_data["Growth (%)"] = yearly_data["Growth (%)"].fillna("-")

    return jsonify(yearly_data.to_dict(orient="records"))

if __name__ == "__main__":
    app.run(debug=True)
