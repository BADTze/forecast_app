document.addEventListener("DOMContentLoaded", function () {
  fetchForecastData();
  fetchSummaryData();
  fetchModelEvaluation();
});

async function fetchForecastData() {
  try {
      const actualResponse = await fetch("/actual_data");
      const forecastResponse = await fetch("/forecast_data");

      const actualData = await actualResponse.json();
      const forecastData = await forecastResponse.json();

      if (!actualData || !forecastData) {
          console.error("Gagal mengambil data actual atau forecast.");
          return;
      }

      plotForecastChart(actualData, forecastData);
      populateForecastTable(forecastData);
  } catch (error) {
      console.error("Error mengambil data:", error);
  }
}

async function fetchSummaryData() {
  try {
      const response = await fetch("/summary_data");
      const data = await response.json();

      if (!data) {
          console.error("Gagal mengambil summary data.");
          return;
      }

      document.getElementById("forecastMin").innerText = data.summary_forecast?.min || "-";
      document.getElementById("forecastMax").innerText = data.summary_forecast?.max || "-";
      document.getElementById("forecastAvg").innerText = data.summary_forecast?.average || "-";

      document.getElementById("actualMin").innerText = data.summary_actual?.min || "-";
      document.getElementById("actualMax").innerText = data.summary_actual?.max || "-";
      document.getElementById("actualAvg").innerText = data.summary_actual?.average || "-";
  } catch (error) {
      console.error("Error mengambil summary data:", error);
  }
}

async function fetchModelEvaluation() {
  try {
      const response = await fetch("/model_evaluation");
      const data = await response.json();

      if (!data) {
          console.error("Gagal mengambil model evaluation.");
          return;
      }

      const evalList = document.getElementById("modelEvaluation");
      evalList.innerHTML = `
          <li>MAE: ${data.MAE.toFixed(4)}</li>
          <li>MAPE: ${data.MAPE.toFixed(4)}%</li>
          <li>RMSE: ${data.RMSE.toFixed(4)}</li>
      `;
  } catch (error) {
      console.error("Error mengambil model evaluation:", error);
  }
}

function plotForecastChart(actualData, forecastData) {
  let chartDom = document.getElementById("forecastPlot");
  let myChart = echarts.init(chartDom);

  let actualSeries = actualData.map(d => [d.ds, d.y]);
  let yhatSeries = forecastData.map(d => [d.ds, d.yhat]);
  let yhatUpperSeries = forecastData.map(d => [d.ds, d.yhat_upper]);
  let yhatLowerSeries = forecastData.map(d => [d.ds, d.yhat_lower]);

  let option = {
      title: { text: "Forecast vs Actual Data", left: "center", textStyle: { color: "#fff" } },
      tooltip: { trigger: "axis" },
      legend: { data: ["Actual", "Forecast", "Upper Bound", "Lower Bound"], textStyle: { color: "#fff" } },
      xAxis: { type: "time", axisLabel: { color: "#fff" } },
      yAxis: { type: "value", axisLabel: { color: "#fff" } },
      series: [
          { name: "Actual", type: "line", data: actualSeries, color: "#ffcc00" },
          { name: "Forecast", type: "line", data: yhatSeries, color: "#3498db", lineStyle: { type: "dashed" } },
          { name: "Upper Bound", type: "line", data: yhatUpperSeries, color: "#2ecc71", lineStyle: { type: "dotted" } },
          { name: "Lower Bound", type: "line", data: yhatLowerSeries, color: "#e74c3c", lineStyle: { type: "dotted" } }
      ]
  };

  myChart.setOption(option);
}

function populateForecastTable(forecastData) {
  let tableBody = document.getElementById("forecastTableBody");
  tableBody.innerHTML = "";

  forecastData.forEach(item => {
      let row = document.createElement("tr");
      row.innerHTML = `
          <td>${new Date(item.ds).toLocaleDateString()}</td>
          <td>${item.yhat.toFixed(4)}</td>
          <td>${item.yhat_upper.toFixed(4)}</td>
          <td>${item.yhat_lower.toFixed(4)}</td>
      `;
      tableBody.appendChild(row);
  });
}
