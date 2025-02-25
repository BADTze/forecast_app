// data.js
document.addEventListener("DOMContentLoaded", function () {
  fetchData("/raw_data", (data) => {
    let tableBody = document.getElementById("actualDataTableBody");
    let tableHead = document.querySelector("#actualDataTable thead tr");

    if (data.length > 0) {
        tableHead.innerHTML = "";

        let headers = ["Month", "Energy (GJ)", "Remark"]; 

        headers.forEach((key) => {
            let th = document.createElement("th");
            th.textContent = key;
            tableHead.appendChild(th);
        });

        // Isi tabel dengan data mentah
        tableBody.innerHTML = "";
        data.forEach((row) => {
            let tr = document.createElement("tr");
            headers.forEach((key) => {
                let td = document.createElement("td");
                if (key === "Energy (GJ)" && !isNaN(row[key])) {
                  td.textContent = parseFloat(row[key]).toFixed(2);
              } else {
                  td.textContent = row[key] !== undefined ? row[key] : "-";
              }
                tr.appendChild(td);
            });
            tableBody.appendChild(tr);
        });
    }
});

fetchData("/growth_data", (data) => {
  let tableBody = document.getElementById("growthTableBody");
  tableBody.innerHTML = "";

  data.forEach((item) => {
      let row = document.createElement("tr");

      let yearCell = document.createElement("td");
      yearCell.textContent = item.Year;

      let energyCell = document.createElement("td");
      energyCell.textContent = parseFloat(item.Energy).toFixed(2);

      let growthCell = document.createElement("td");
      growthCell.textContent = item["Growth (%)"] !== "-" ? parseFloat(item["Growth (%)"]).toFixed(2) + "%" : "-";

      row.appendChild(yearCell);
      row.appendChild(energyCell);
      row.appendChild(growthCell);

      tableBody.appendChild(row);
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
