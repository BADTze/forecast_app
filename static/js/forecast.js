// forecast.js
document.addEventListener("DOMContentLoaded", function () {
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
  
      // Populate Forecast Table
      const forecastTableBody = safeQuerySelector("forecastTableBody");
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
  
      // Populate Actual vs Forecast Table
      const comparisonTableBody = safeQuerySelector("comparisonTableBody");
      if (comparisonTableBody) {
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
      }
  
      // Render Plotly Chart
      const forecastPlot = safeQuerySelector("forecastPlot");
      if (forecastPlot) {
        const plotData = [
          {
            x: labels,
            y: forecastValues,
            mode: "lines+markers",
            name: "Forecast",
            line: { color: "red", dash: "dash" },
          },
          {
            x: labels,
            y: actualValues,
            mode: "lines+markers",
            name: "Actual",
            line: { color: "blue" },
          },
          {
            x: labels,
            y: upperValues,
            mode: "lines",
            name: "Upper Bound",
            line: { color: "gray", dash: "dot" },
          },
          {
            x: labels,
            y: lowerValues,
            mode: "lines",
            name: "Lower Bound",
            line: { color: "gray", dash: "dot" },
          },
        ];
  
        Plotly.newPlot("forecastPlot", plotData, {
          title: "Forecast vs Actual Data",
          xaxis: { title: "Date" },
          yaxis: { title: "Energy (GJ)" },
          template: "plotly_dark",
        });
      }
    });
  });
  