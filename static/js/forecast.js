document.addEventListener("DOMContentLoaded", async function () {
  function fetchForecast(periods) {
    fetch(`/dynamic_forecast?periods=${periods}`)
      .then((response) => response.json())
      .then((data) => {
        updateUI(data);
      })
      .catch((error) => console.error("Error fetching forecast:", error));
  }

  try {
    const evaluationResponse = await fetch("/model_evaluation");
    const evaluationData = await evaluationResponse.json();

    const modelEvaluationElement = document.getElementById("modelEvaluation");
    modelEvaluationElement.innerHTML = `
      <li>MAPE: ${evaluationData.MAPE.toFixed(2)}%</li>
      <li>MAE: ${evaluationData.MAE.toFixed(2)}</li>
      <li>RMSE: ${evaluationData.RMSE.toFixed(2)}</li>
    `;

    // Fetch Summary Forecast Data
    const forecastResponse = await fetch("/summary_forecast");
    const forecastData = await forecastResponse.json();

    document.getElementById("forecastMin").textContent = forecastData.min.toFixed(2);
    document.getElementById("forecastMax").textContent = forecastData.max.toFixed(2);
    document.getElementById("forecastAvg").textContent = forecastData.avg.toFixed(2);

    // Fetch Summary Actual Data
    const actualResponse = await fetch("/summary_actual");
    const actualData = await actualResponse.json();

    document.getElementById("actualMin").textContent = actualData.min.toFixed(2);
    document.getElementById("actualMax").textContent = actualData.max.toFixed(2);
    document.getElementById("actualAvg").textContent = actualData.avg.toFixed(2);
  } catch (error) {
    console.error("Error fetching data:", error);
  }

  function updateUI(data) {
    function formatDate(dateStr) {
      const date = new Date(dateStr);
      return `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;
    }

    // Extract data for plotting and tables
    const labels = data.map((item) => formatDate(item.ds));
    const forecastValues = data.map((item) => item.yhat.toFixed(2));
    const upperValues = data.map((item) => item.yhat_upper.toFixed(2));
    const lowerValues = data.map((item) => item.yhat_lower.toFixed(2));
    const actualValues = data.map((item) => item.actual !== "-" ? item.actual.toFixed(2) : null);

    // **Populate Forecast Table**
    const forecastTableBody = document.getElementById("forecastTableBody");
    if (forecastTableBody) {
      forecastTableBody.innerHTML = "";
      data.forEach((item) => {
        let row = document.createElement("tr");
        row.innerHTML = `<td>${formatDate(item.ds)}</td>
                          <td>${item.yhat.toFixed(2)}</td>
                          <td>${item.yhat_upper.toFixed(2)}</td>
                          <td>${item.yhat_lower.toFixed(2)}</td>`;
        forecastTableBody.appendChild(row);
      });
    }

    // **Populate Actual vs Forecast Table**
    const comparisonTableBody = document.getElementById("comparisonTableBody");
    if (comparisonTableBody) {
      comparisonTableBody.innerHTML = "";
      data.forEach((item) => {
        let actualValue = item.actual !== "-" ? item.actual.toFixed(2) : "-";
        let row = document.createElement("tr");
        row.innerHTML = `<td>${formatDate(item.ds)}</td>
                          <td>${item.yhat.toFixed(2)}</td>
                          <td>${actualValue}</td>`;
        comparisonTableBody.appendChild(row);
      });
    }

    // **Render ECharts Chart**
    const forecastPlot = document.getElementById("forecastPlot");
    if (forecastPlot) {
      let chart = echarts.init(forecastPlot);
      let option = {
        title: {
          text: "Energy Forecast vs Actual",
          left: "center",
          textStyle: { color: "#f4f4f4", fontSize: 20 },
        },
        tooltip: { trigger: "axis" },
        legend: {
          data: ["Forecast", "Actual", "Upper Bound", "Lower Bound"],
          top: 30,
          textStyle: { color: "#f4f4f4" },
        },
        xAxis: {
          type: "category",
          data: labels,
          axisLabel: { rotate: -45, color: "#f4f4f4" },
        },
        yAxis: {
          type: "value",
          axisLabel: { color: "#f4f4f4" },
        },
        series: [
          {
            name: "Forecast",
            type: "line",
            data: forecastValues,
            color: "#ff4d4d",
            smooth: true,
          },
          {
            name: "Actual",
            type: "line",
            data: actualValues,
            color: "#4d79ff",
            smooth: true,
          },
          {
            name: "Upper Bound",
            type: "line",
            data: upperValues,
            color: "#ffcc00",
          },
          {
            name: "Lower Bound",
            type: "line",
            data: lowerValues,
            color: "#ffcc00",
          },
        ],
      };
      chart.setOption(option);
    }
  }

  document
    .getElementById("forecastForm")
    .addEventListener("submit", function (event) {
      event.preventDefault();
      let periods = document.getElementById("periods").value;
      fetchForecast(periods);
    });

  fetchForecast(12);
});
