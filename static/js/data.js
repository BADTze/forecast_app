async function fetchModelEvaluation() {
  try {
    const response = await fetch("/model_evaluation");
    const data = await response.json();
    return data.MAPE;
  } catch (error) {
    console.error("Error fetching model evaluation:", error);
    return null;
  }
}

async function updateModelAccuracy() {
  const mape = await fetchModelEvaluation();
  if (mape !== null) {
    const accuracy = (100 - mape).toFixed(2);

    const modelAccuracyElement = document.getElementById("model-accuracy");
    if (modelAccuracyElement) {
      modelAccuracyElement.textContent = `Akurasi: ${accuracy}%`;
    }
  }
}

async function fetchForecastData() {
  try {
    const response = await fetch("/dynamic_forecast");
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching forecast data:", error);
    return null;
  }
}

async function updateForecastTable() {
  const forecastData = await fetchForecastData();
  if (forecastData) {
    const tableBody = document.querySelector("#forecast-table");
    tableBody.innerHTML = "";

    const currentYear = new Date().getFullYear(); 

    const filteredData = forecastData.filter(item => {
      const date = new Date(item.ds);
      return date.getFullYear() >= currentYear; 
    });

    filteredData.forEach((item) => {
      const row = document.createElement("tr");

      const date = new Date(item.ds);
      const formattedDate = date.toLocaleDateString("en-GB", { month: "short", year: "numeric" });

      // Kolom DATE
      const dateCell = document.createElement("td");
      dateCell.textContent = formattedDate;
      row.appendChild(dateCell);

      // Kolom Model 1 (yhat)
      const model1Cell = document.createElement("td");
      model1Cell.textContent = item.yhat.toFixed(2);
      row.appendChild(model1Cell);

      // Kolom Model 2 (jika ada)
      const model2Cell = document.createElement("td");
      model2Cell.textContent = "-";
      row.appendChild(model2Cell);

      tableBody.appendChild(row);
    });
  }
}


async function fetchChartData() {
  const forecastData = await fetchForecastData();
  if (forecastData) {
    let labels = [];
    let model_1 = [];
    let model_2 = [];

    const currentYear = new Date().getFullYear(); 

    // Filter hanya data dari tahun berjalan ke atas
    const filteredData = forecastData.filter(item => {
      const date = new Date(item.ds);
      return date.getFullYear() >= currentYear;
    });

    filteredData.forEach((item) => {
      const date = new Date(item.ds);
      const formattedDate = date.toLocaleDateString("en-GB", { month: "short", year: "numeric" });

      labels.push(formattedDate);
      model_1.push(item.yhat.toFixed(2));
      model_2.push(null);
    });

    let chart = echarts.init(document.getElementById("compa-forecast"));
    let option = {
      title: { text: "Forecast Comparison", left: "center", textStyle: { color: "#21130d", fontSize: 20 } },
      tooltip: { trigger: "axis" },
      legend: { data: ["Prophet", "SARIMA"], top: 30, textStyle: { color: "#21130d" } },
      xAxis: { type: "category", data: labels, axisLabel: { rotate: -45, color: "#21130d" } },
      yAxis: { type: "value", axisLabel: { color: "#21130d" } },
      series: [
        { name: "Prophet", type: "line", data: model_1, color: "#ff4d4d", smooth: true },
        { name: "SARIMA", type: "line", data: model_2, color: "#4d79ff", smooth: true, showSymbol: false, lineStyle: { opacity: 0 } }
      ]
    };
    chart.setOption(option);
  }
}



document.addEventListener("DOMContentLoaded", () => {
  updateModelAccuracy();
  updateForecastTable();
  fetchChartData();
});
