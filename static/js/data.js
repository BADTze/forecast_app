// data.js
document.addEventListener("DOMContentLoaded", function () {
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
  
    fetchData("/model_evaluation", (data) => {
      let evaluationList = document.getElementById("modelEvaluation");
      evaluationList.innerHTML = `
          <li>MAPE: ${data.MAPE.toFixed(2)}%</li>
          <li>MAE: ${data.MAE.toFixed(2)}</li>
          <li>RMSE: ${data.RMSE.toFixed(2)}</li>`;
    });
  
    fetchData("/summary_forecast", (data) => {
      document.getElementById("forecastMin").textContent = data.min.toFixed(2);
      document.getElementById("forecastMax").textContent = data.max.toFixed(2);
      document.getElementById("forecastAvg").textContent = data.avg.toFixed(2);
    });
  
    fetchData("/summary_actual", (data) => {
      document.getElementById("actualMin").textContent = data.min.toFixed(2);
      document.getElementById("actualMax").textContent = data.max.toFixed(2);
      document.getElementById("actualAvg").textContent = data.avg.toFixed(2);
    });
  });
  