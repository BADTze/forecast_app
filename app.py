from flask import Flask, jsonify, render_template
import pandas as pd
import pickle
import os

app = Flask(__name__)

# Tentukan path absolut ke file model dan data
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "models", "prophet_model.pkl")
DATA_PATH = os.path.join(BASE_DIR, "data", "SARIMA_data.csv")

# Muat model Prophet menggunakan pickle
try:
    with open(MODEL_PATH, "rb") as f:
        model = pickle.load(f)
except FileNotFoundError:
    print(f"Error: Model tidak ditemukan di {MODEL_PATH}")
    exit(1)

# Fungsi untuk membuat prediksi
def forecast_energy():
    try:
        # Buat data future
        future = model.make_future_dataframe(periods=12, freq='M')
        future["Overhaul"] = 0  # Default tidak ada event
        future["Holidays"] = 0
        future["Off"] = 0
        
        # Prediksi menggunakan model
        forecast = model.predict(future)

        # Periksa apakah file data historis ada
        if not os.path.exists(DATA_PATH):
            print(f"Warning: File {DATA_PATH} tidak ditemukan. Forecast hanya berisi prediksi.")
            forecast["actual_value"] = None
        else:
            # Ambil data historis untuk perbandingan
            df_actual = pd.read_csv(DATA_PATH)
            df_actual.rename(columns={'Month': 'ds', 'Energy (GJ)': 'y'}, inplace=True)
            df_actual["ds"] = pd.to_datetime(df_actual["ds"], format='%b-%y')
            
            # Gabungkan actual dan forecast berdasarkan tanggal (ds)
            forecast = forecast[["ds", "yhat", "yhat_lower", "yhat_upper"]].merge(
                df_actual[["ds", "y"]],
                on="ds",
                how="left"
            ).rename(columns={"y": "actual_value"})

        # Format tanggal agar bisa ditampilkan
        forecast["ds"] = forecast["ds"].dt.strftime("%Y-%m-%d")

        return forecast.to_dict(orient="records")

    except Exception as e:
        print(f"Error dalam proses forecasting: {e}")
        return []

@app.route('/api/forecast', methods=['GET'])
def get_forecast():
    forecast_data = forecast_energy()
    return jsonify(forecast_data)

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

if __name__ == '__main__':
    app.run(debug=True)
