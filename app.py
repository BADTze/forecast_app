from flask import Flask, jsonify, render_template
import pandas as pd
import pickle

app = Flask(__name__)

# Load model
with open('models/prophet_model.pkl', 'rb') as f:
    model = pickle.load(f)

df = pd.read_csv('data/forecast_data.csv')

# Konversi format 'MMM-YY' ke datetime
df['Month'] = pd.to_datetime(df['Month'], format='%b-%y', errors='coerce')
# Hapus nilai yang tidak valid
df = df.dropna(subset=['Month'])
# Ubah nama kolom agar sesuai dengan model Prophet
df = df.rename(columns={'Month': 'ds', 'Energy (GJ)': 'y'})

# Prepare regressors
df['Overhaul'] = df['Remark'].apply(lambda x: 1 if x == 'OH' else 0)
df['Holidays'] = df['Remark'].apply(lambda x: 1 if x in ['Lebaran', 'Natal'] else 0)
df['Off'] = df['Remark'].apply(lambda x: 1 if x == 'OFF' else 0)


@app.route('/forecast')
def forecast():
    future = model.make_future_dataframe(periods=12, freq='MS')
    future['Overhaul'] = 0
    future['Holidays'] = 0
    future['Off'] = 0
    forecast = model.predict(future)

    forecast_data = forecast[['ds', 'yhat', 'yhat_upper', 'yhat_lower']].tail(12).to_dict(orient='records')
    actual_data = df[['ds', 'y']].tail(12).to_dict(orient='records')
    return render_template('forecast.html', forecast_data=forecast_data, actual_data=actual_data)

@app.route('/forecast_data')
def forecast_data():
    future = model.make_future_dataframe(periods=12, freq='MS')
    future['Overhaul'] = 0
    future['Holidays'] = 0
    future['Off'] = 0
    forecast = model.predict(future)

    forecast_data = forecast[['ds', 'yhat', 'yhat_upper', 'yhat_lower']].tail(12).to_dict(orient='records')
    return jsonify(forecast_data)

@app.route('/actual_data')
def actual_data():
    actual_data = df[['ds', 'y']].tail(12).to_dict(orient='records')
    return jsonify(actual_data)

@app.route('/')
def home():
    return render_template('base.html')

@app.route('/data')
def data():
    return render_template('data.html')

@app.route('/about')
def about():
    return render_template('about.html')

if __name__ == '__main__':
    app.run(debug=True)
