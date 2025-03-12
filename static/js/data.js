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
    const response = await fetch("/forecast_data");
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

    forecastData.forEach((item) => {
      const row = document.createElement("tr");

      // Kolom DATE
      const dateCell = document.createElement("td");
      dateCell.textContent = item.ds; 
      row.appendChild(dateCell);

      // Kolom Model 1
      const model1Cell = document.createElement("td");
      model1Cell.textContent = item.yhat.toFixed(2); 
      row.appendChild(model1Cell);

      // Kolom Model 2 (placeholder atau data jika tersedia)
      const model2Cell = document.createElement("td");
      model2Cell.textContent = "-"; 
      row.appendChild(model2Cell);

      // Tambahkan baris ke tabel
      tableBody.appendChild(row);
    });
  }
}


document.addEventListener("DOMContentLoaded", () => {
  updateModelAccuracy(); 
  updateForecastTable(); 
});