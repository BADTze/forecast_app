from flask import Flask, render_template

app = Flask(__name__)

@app.route('/')
def home():
    return render_template('forecast.html')

@app.route('/forecast')
def forecast():
    return render_template('forecast.html')

@app.route('/data')
def data():
    return render_template('data.html')

@app.route('/about')
def about():
    return render_template('about.html')

if __name__ == '__main__':
    app.run(debug=True)
