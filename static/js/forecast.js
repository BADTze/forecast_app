document.addEventListener("DOMContentLoaded", function () {
    // Ambil data forecast & actual secara bersamaan
    Promise.all([fetch("/forecast_data"), fetch("/actual_data")])
      .then(([forecastRes, actualRes]) => Promise.all([forecastRes.json(), actualRes.json()]))
      .then(([forecastData, actualData]) => {
        // Format tanggal untuk forecast
        let labels = forecastData.map(item =>
          new Date(item.ds).toLocaleString("en-US", { month: "short", year: "numeric" })
        );
  
        // Simpan actual data dalam Map agar mudah dicocokkan
        let actualMap = new Map(
          actualData.map(item => [
            new Date(item.ds).toLocaleString("en-US", { month: "short", year: "numeric" }),
            parseFloat(item.y.toFixed(2))
          ])
        );
  
        // Ambil nilai forecast dan actual berdasarkan tanggal yang cocok
        let forecastValues = forecastData.map(item => parseFloat(item.yhat.toFixed(2)));
        let actualValues = labels.map(date => actualMap.get(date) ?? null);
        let upperValues = forecastData.map(item => parseFloat(item.yhat_upper.toFixed(2)));
        let lowerValues = forecastData.map(item => parseFloat(item.yhat_lower.toFixed(2)));
  
        // Render Chart
        const forecastPlot = document.getElementById("forecastPlot");
        if (forecastPlot) {
          let chart = echarts.init(forecastPlot);
          let option = {
            title: { text: "Energy Forecast vs Actual", left: "center", textStyle: { color: "#f4f4f4", fontSize: 20 } },
            tooltip: { trigger: "axis" },
            legend: { data: ["Forecast", "Actual", "Upper Bound", "Lower Bound"], top: 30, textStyle: { color: "#f4f4f4" } },
            xAxis: { type: "category", data: labels, axisLabel: { rotate: -45, color: "#f4f4f4" } },
            yAxis: { type: "value", axisLabel: { color: "#f4f4f4" } },
            series: [
              { name: "Forecast", type: "line", data: forecastValues, color: "#ff4d4d", smooth: true },
              { name: "Actual", type: "line", data: actualValues, color: "#4d79ff", smooth: true },
              { name: "Upper Bound", type: "line", data: upperValues, color: "#ffcc00" },
              { name: "Lower Bound", type: "line", data: lowerValues, color: "#ffcc00" },
            ],
          };
          chart.setOption(option);
        }
  
        // Hitung & Tampilkan Summary Data
        let forecastMin = Math.min(...forecastValues).toFixed(2);
        let forecastMax = Math.max(...forecastValues).toFixed(2);
        let forecastAvg = (forecastValues.reduce((a, b) => a + b, 0) / forecastValues.length).toFixed(2);
        document.getElementById("forecastMin").textContent = forecastMin;
        document.getElementById("forecastMax").textContent = forecastMax;
        document.getElementById("forecastAvg").textContent = forecastAvg;
  
        let actualValidValues = actualValues.filter(v => v !== null); // Hanya nilai yang valid
        let actualMin = actualValidValues.length ? Math.min(...actualValidValues).toFixed(2) : "-";
        let actualMax = actualValidValues.length ? Math.max(...actualValidValues).toFixed(2) : "-";
        let actualAvg = actualValidValues.length
          ? (actualValidValues.reduce((a, b) => a + b, 0) / actualValidValues.length).toFixed(2)
          : "-";
        document.getElementById("actualMin").textContent = actualMin;
        document.getElementById("actualMax").textContent = actualMax;
        document.getElementById("actualAvg").textContent = actualAvg;
  
        // Isi Tabel Forecast dengan Format Tanggal & Angka
        let tableBody = document.getElementById("forecastTableBody");
        tableBody.innerHTML = ""; // Kosongkan tabel sebelum diisi
        forecastData.forEach((item, index) => {
          let formattedDate = labels[index];
          let row = `<tr>
            <td>${formattedDate}</td>
            <td>${forecastValues[index]}</td>
            <td>${upperValues[index]}</td>
            <td>${lowerValues[index]}</td>
          </tr>`;
          tableBody.innerHTML += row;
        });
  
        // Isi Tabel Perbandingan Forecast vs Actual
        let comparisonTableBody = document.getElementById("comparisonTableBody");
        if (comparisonTableBody) {
          comparisonTableBody.innerHTML = ""; // Kosongkan tabel
          labels.forEach((date, index) => {
            let row = `<tr>
              <td>${date}</td>
              <td>${forecastValues[index]}</td>
              <td>${actualValues[index] !== null ? actualValues[index] : "-"}</td>
            </tr>`;
            comparisonTableBody.innerHTML += row;
          });
        }
  
        // Ambil data Model Evaluation & Bulatkan
        fetch("/model_evaluation")
          .then(response => response.json())
          .then(modelEval => {
            let modelEvaluationEl = document.getElementById("modelEvaluation");
            modelEvaluationEl.innerHTML = `
              <li>MAE: ${modelEval.MAE.toFixed(2)}</li>
              <li>MAPE: ${modelEval.MAPE.toFixed(2)}%</li>
              <li>RMSE: ${modelEval.RMSE.toFixed(2)}</li>
            `;
          })
          .catch(error => console.error("Error mengambil data model evaluation:", error));
  
      })
      .catch(error => console.error("Error mengambil data forecast/actual:", error));
  });
  