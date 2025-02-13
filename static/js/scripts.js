document.addEventListener("DOMContentLoaded", function () {
  function fetchData(url, callback) {
    fetch(url)
      .then(response => response.json())
      .then(data => callback(data))
      .catch(error => console.error(`Error fetching ${url}:`, error));
  }

  // Fetch Actual Data
  fetchData("/actual_data", (data) => {
    let actualTable = document.getElementById("actualDataTableBody");
    actualTable.innerHTML = "";
    data.forEach((item) => {
      let row = document.createElement("tr");
      row.innerHTML = `<td>${new Date(item.ds).toLocaleDateString()}</td>
                       <td>${item.y.toFixed(2)}</td>`;
      actualTable.appendChild(row);
    });
  });

  // Fetch Model Evaluation
  fetchData("/model_evaluation", (data) => {
    let evaluationList = document.getElementById("modelEvaluation");
    evaluationList.innerHTML = `
      <li>MAPE: ${data.MAPE}%</li>
      <li>MAE: ${data.MAE}</li>
      <li>RMSE: ${data.RMSE}</li>`;
  });

  // Fetch Summary Forecast Data
  fetchData("/summary_forecast", (data) => {
    document.getElementById("forecastMin").textContent = data.min;
    document.getElementById("forecastMax").textContent = data.max;
    document.getElementById("forecastAvg").textContent = data.avg;
  });

  // Fetch Summary Actual Data
  fetchData("/summary_actual", (data) => {
    document.getElementById("actualMin").textContent = data.min;
    document.getElementById("actualMax").textContent = data.max;
    document.getElementById("actualAvg").textContent = data.avg;
  });

  // Fetch Forecast Data
  fetchData("/forecast_data", (data) => {
    function formatDate(dateStr) {
      const date = new Date(dateStr);
      return `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;
    }

    const labels = data.map((item) => formatDate(item.ds));
    const forecastValues = data.map((item) => item.yhat);
    const upperValues = data.map((item) => item.yhat_upper);
    const lowerValues = data.map((item) => item.yhat_lower);
    const actualValues = data.map((item) => item.actual || null);

    const forecastTableBody = document.getElementById("forecastTableBody");
    forecastTableBody.innerHTML = "";
    data.forEach((item) => {
      let row = document.createElement("tr");
      row.innerHTML = `<td>${formatDate(item.ds)}</td>
                       <td>${item.yhat.toFixed(2)}</td>
                       <td>${item.yhat_upper.toFixed(2)}</td>
                       <td>${item.yhat_lower.toFixed(2)}</td>`;
      forecastTableBody.appendChild(row);
    });

    const comparisonTableBody = document.getElementById("comparisonTableBody");
    comparisonTableBody.innerHTML = "";
    data.forEach((item) => {
      if (item.actual !== null) {
        let row = document.createElement("tr");
        row.innerHTML = `<td>${formatDate(item.ds)}</td>
                         <td>${item.yhat.toFixed(2)}</td>
                         <td>${item.actual.toFixed(2)}</td>`;
        comparisonTableBody.appendChild(row);
      }
    });

    const plotData = [
      { x: labels, y: forecastValues, mode: "lines+markers", name: "Forecast", line: { color: "red", dash: "dash" } },
      { x: labels, y: actualValues, mode: "lines+markers", name: "Actual", line: { color: "blue" } },
      { x: labels, y: upperValues, mode: "lines", name: "Upper Bound", line: { color: "gray", dash: "dot" } },
      { x: labels, y: lowerValues, mode: "lines", name: "Lower Bound", line: { color: "gray", dash: "dot" } }
    ];

    Plotly.newPlot("forecastPlot", plotData, {
      title: "Forecast vs Actual Data",
      xaxis: { title: "Date" },
      yaxis: { title: "Energy (GJ)" },
      template: "plotly_dark"
    });
  });
});
