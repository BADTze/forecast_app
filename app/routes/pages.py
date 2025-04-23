from flask import Blueprint, render_template, redirect, url_for

pages_bp = Blueprint('pages', __name__)

@pages_bp.route('/')
def home():
    return redirect(url_for('pages.forecast_page'))

@pages_bp.route('/forecast')
def forecast_page():
    return render_template('forecast.html')

@pages_bp.route('/data')
def data_page():
    return render_template('data.html')
