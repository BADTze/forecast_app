document.addEventListener("DOMContentLoaded", function () {
  // Ambil MAPE Prophet dari API
  fetch("/model_evaluation")
    .then((response) => response.json())
    .then((data) => {
      if (data.MAPE) {
        document.getElementById("model-accuracy").innerText =
          "Akurasi: " + (100 - data.MAPE).toFixed(2) + "%";
      }
    })
    .catch((error) => console.error("Gagal mengambil MAPE:", error));

  // Ambil data forecast
  fetch("/forecast_data")
    .then((response) => response.json())
    .then((forecastData) => {
      let tableBody = document.getElementById("forecast-table");
      let dates = [];
      let prophetValues = [];

      forecastData.forEach((entry) => {
        let date = new Date(entry.ds);
        let formattedDate = date.toLocaleString("en-US", {
          month: "short",
          year: "numeric",
        });

        let row = `<tr>
                      <td>${formattedDate}</td>
                      <td>${entry.yhat.toFixed(2)}</td>
                      <td>-</td>  
                   </tr>`;
        tableBody.innerHTML += row;

        dates.push(formattedDate);
        prophetValues.push(entry.yhat.toFixed(2));
      });

      // Plot grafik menggunakan ECharts
      let chart = echarts.init(document.getElementById("compa-forecast"));
      let options = {
        title: { text: "Perbandingan Forecast Prophet vs Actual" },
        tooltip: { trigger: "axis" },
        legend: { data: ["Prophet"] },
        xAxis: { type: "category", data: dates },
        yAxis: { type: "value" },
        series: [
          {
            name: "Prophet",
            type: "line",
            data: prophetValues,
            smooth: true,
          },
        ],
      };
      chart.setOption(options);
    })
    .catch((error) => console.error("Gagal mengambil data forecast:", error));
});
