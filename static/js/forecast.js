document.addEventListener("DOMContentLoaded", function () {
  function fetchForecast(periods) {
    fetch(`/dynamic_forecast?periods=${periods}`)
      .then((response) => response.json())
      .then((data) => {
        updateUI(data);
      })
      .catch((error) => console.error("Error fetching forecast:", error));
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
            // lineStyle: { type: "dashed" },
          },
          {
            name: "Lower Bound",
            type: "line",
            data: lowerValues,
            color: "#ffcc00",
            // lineStyle: { type: "dashed" },
          },
        ],
      };
      chart.setOption(option);
    }
  }

  // Event Listener untuk submit periode forecast
  document
    .getElementById("forecastForm")
    .addEventListener("submit", function (event) {
      event.preventDefault();
      let periods = document.getElementById("periods").value;
      fetchForecast(periods);
    });

  // Fetch default (12 bulan)
  fetchForecast(12);
});
