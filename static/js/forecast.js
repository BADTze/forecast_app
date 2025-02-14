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
            line: { color: "red"},
            marker: { color: "red", symbol: "circle" }
          },
          {
            x: labels,
            y: actualValues,
            mode: "lines+markers",
            name: "Actual",
            line: { color: "blue" },
            marker: { color: "blue", symbol: "square" }
          },
          {
            x: labels,
            y: upperValues,
            mode: "lines",
            name: "Upper Bound",
            line: { color: "orange", dash: "dot" }
          },
          {
            x: labels,
            y: lowerValues,
            mode: "lines",
            name: "Lower Bound",
            line: { color: "orange", dash: "dot" }
          },
        ];
  
        const layout = {
          title: {
            text: "Energy Forecast using Prophet",
            font: { size: 24, color: "#000000" },
            xanchor: "center",
            yanchor: "top"
          },
          xaxis: {
            title: { text: "Date", font: { size: 18, color: "#000000" } },
            tickangle: -45,
            tickfont: { size: 12, color: "#000000" }
          },
          yaxis: {
            title: { text: "Energy (GJ)", font: { size: 18, color: "#000000" } },
            tickfont: { size: 12, color: "#000000" }
          },
          plot_bgcolor: "#ffffff",
          paper_bgcolor: "#f0f0f0",
          margin: { l: 60, r: 30, t: 70, b: 100 },
          template: "plotly_white"
        };
  
        Plotly.newPlot("forecastPlot", plotData, layout);
      }
    });
  });
  