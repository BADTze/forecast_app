from flask import Flask, jsonify, render_template
import pandas as pd
import pickle
import plotly as go
import numpy as np
from sklearn.metrics import mean_absolute_error, mean_squared_error

app = Flask(__name__)

# Load model
with open('models/prophet_model.pkl', 'rb') as f:
    model = pickle.load(f)

# Load data
df = pd.read_csv('data/forecast_data.csv')

# Konversi kolom 'Month' dengan format MMM-YY ke datetime
df['Month'] = pd.to_datetime(df['Month'], format='%b-%y', errors='coerce')
df = df.dropna(subset=['Month'])
df = df.rename(columns={'Month': 'ds', 'Energy (GJ)': 'y'})

# Buat fitur tambahan (regressors)
df['Overhaul'] = df['Remark'].apply(lambda x: 1 if x == 'OH' else 0)
df['Holidays'] = df['Remark'].apply(lambda x: 1 if x in ['Lebaran', 'Natal'] else 0)
df['Off'] = df['Remark'].apply(lambda x: 1 if x == 'OFF' else 0)

# Buat future dataframe (untuk mendapatkan forecast penuh, termasuk periode training)
future = model.make_future_dataframe(periods=12, freq='MS')
# Set nilai regressors default untuk future
future['Overhaul'] = 0
future['Holidays'] = 0
future['Off'] = 0

# Lakukan forecast penuh
forecast_full = model.predict(future)

# --- Evaluasi Model ---
# Menggabungkan data aktual dengan prediksi training
merged_df = pd.merge(df, forecast_full[['ds', 'yhat']], on='ds', how='inner')
mae = mean_absolute_error(merged_df['y'], merged_df['yhat'])
rmse = np.sqrt(mean_squared_error(merged_df['y'], merged_df['yhat']))
mape = np.mean(np.abs((merged_df['y'] - merged_df['yhat']) / merged_df['y'])) * 100

# --- Summary Data Forecast ---
# Menggunakan prediksi untuk periode forecast (12 periode terakhir)
forecast_future = forecast_full.tail(12)
forecast_summary = {
    "min": round(forecast_future['yhat'].min(), 2),
    "max": round(forecast_future['yhat'].max(), 2),
    "average": round(forecast_future['yhat'].mean(), 2)
}

# --- Summary Data Actual ---
actual_summary = {
    "min": round(df['y'].min(), 2),
    "max": round(df['y'].max(), 2),
    "average": round(df['y'].mean(), 2)
}

# ------------------------- ROUTES -------------------------

@app.route('/')
def home():
    return render_template('base.html')

@app.route('/data')
def data():
    return render_template('data.html')

@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/forecast')
def forecast():
    # Buat future dataframe baru untuk forecast 12 bulan ke depan
    future = model.make_future_dataframe(periods=12, freq='MS')
    future['Overhaul'] = 0
    future['Holidays'] = 0
    future['Off'] = 0
    forecast = model.predict(future)

    forecast_data = forecast[['ds', 'yhat', 'yhat_upper', 'yhat_lower']].tail(12).to_dict(orient='records')
    actual_data = df[['ds', 'y']].tail(12).to_dict(orient='records')
    return render_template('forecast.html', forecast_data=forecast_data, actual_data=actual_data)

@app.route('/forecast_data')
def forecast_data_route():
    future = model.make_future_dataframe(periods=12, freq='MS')
    future['Overhaul'] = 0
    future['Holidays'] = 0
    future['Off'] = 0
    forecast = model.predict(future)
    forecast_data = forecast[['ds', 'yhat', 'yhat_upper', 'yhat_lower']].tail(12).to_dict(orient='records')
    return jsonify(forecast_data)

@app.route('/actual_data')
def actual_data_route():
    actual_data = df[['ds', 'y']].tail(12).to_dict(orient='records')
    return jsonify(actual_data)

# Endpoint baru untuk evaluasi model
@app.route('/model_evaluation')
def model_evaluation():
    evaluation = {
        "MAPE": round(mape, 2),
        "MAE": round(mae, 2),
        "RMSE": round(rmse, 2)
    }
    return jsonify(evaluation)

@app.route('/summary_forecast')
def summary_forecast():
    forecast_data = model.predict(model.make_future_dataframe(periods=12, freq='MS'))
    min_val = forecast_data['yhat'].min()
    max_val = forecast_data['yhat'].max()
    avg_val = forecast_data['yhat'].mean()

    return jsonify({"min": round(min_val, 2), "max": round(max_val, 2), "avg": round(avg_val, 2)})


@app.route('/summary_actual')
def summary_actual():
    min_val = df['y'].min()
    max_val = df['y'].max()
    avg_val = df['y'].mean()

    return jsonify({"min": round(min_val, 2), "max": round(max_val, 2), "avg": round(avg_val, 2)})

@app.route('/plot_forecast')
def plot_forecast():
    future = model.make_future_dataframe(periods=12, freq='MS')
    future['Overhaul'] = 0
    future['Holidays'] = 0
    future['Off'] = 0
    forecast = model.predict(future)

    # Plotly figure
    fig = go.Figure()

    # Plot actual data
    fig.add_trace(go.Scatter(
        x=df['ds'], y=df['y'],
        mode='lines+markers',
        name='Actual Data',
        line=dict(color='blue')
    ))

    # Plot forecasted data
    fig.add_trace(go.Scatter(
        x=forecast['ds'], y=forecast['yhat'],
        mode='lines',
        name='Forecast',
        line=dict(color='red', dash='dash')
    ))

    # Plot upper bound
    fig.add_trace(go.Scatter(
        x=forecast['ds'], y=forecast['yhat_upper'],
        mode='lines',
        name='Upper Bound',
        line=dict(color='gray', dash='dot')
    ))

    # Plot lower bound
    fig.add_trace(go.Scatter(
        x=forecast['ds'], y=forecast['yhat_lower'],
        mode='lines',
        name='Lower Bound',
        line=dict(color='gray', dash='dot')
    ))

    fig.update_layout(
        title="Forecast vs Actual Data",
        xaxis_title="Date",
        yaxis_title="Energy (GJ)",
        template="plotly_dark"
    )

    # Convert figure to JSON
    plot_json = pio.to_json(fig)

    return jsonify(plot_json)


if __name__ == '__main__':
    app.run(debug=True)
