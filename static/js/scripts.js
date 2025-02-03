document.addEventListener("DOMContentLoaded", function () {
    var ctx1 = document.getElementById('forecastChart').getContext('2d');
    new Chart(ctx1, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            datasets: [{
                label: 'Forecast Data',
                data: [100, 90, 85, 95, 80, 85, 90, 95, 100, 110, 120, 115],
                borderColor: '#e91e63',
                backgroundColor: 'rgba(233, 30, 99, 0.1)',
                tension: 0.3
            }]
        }
    });
});
