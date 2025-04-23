document.addEventListener("DOMContentLoaded", function () {
  const BASE_API = "/forecast-web/api";

  const btnProphet = document.getElementById("btnProphet");
  const btnSarimax = document.getElementById("btnSarimax");

  let currentModel = "prophet";

  const formatNumber = (num) => {
    return typeof num === "number"
      ? new Intl.NumberFormat("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(num)
      : "-";
  };

  function toggleLoading(show) {
    const spinner = document.getElementById("loadingSpinner");
    if (spinner) {
      spinner.style.display = show ? "block" : "none";
    }
  }

  btnProphet.addEventListener("click", () => {
    currentModel = "prophet";
    fetchAndRenderData();
    updateEvaluation(currentModel);
    updateSummary(currentModel);
  });

  btnSarimax.addEventListener("click", () => {
    currentModel = "sarimax";
    fetchAndRenderData();
    updateEvaluation(currentModel);
    updateSummary(currentModel);
  });

  function fetchAndRenderData() {
    toggleLoading(true);
    const forecastURL = `${BASE_API}/${currentModel}_forecast`;
    const actualURL = `${BASE_API}/actual_data`;

    Promise.all([
      fetch(forecastURL).then((res) => res.json()),
      fetch(actualURL).then((res) => res.json()),
    ])
      .then(([forecastResponse, actualData]) => {
        const forecastData = forecastResponse.forecast || forecastResponse;
        if (!Array.isArray(forecastData)) {
          console.error("forecastData bukan array:", forecastData);
          return;
        }
        updateChart(forecastData, actualData);
        updateForecastTable(forecastData);
        updateComparisonTable(forecastData, actualData);
      })
      .catch((err) => {
        console.error("Error fetching data:", err);
      })
      .finally(() => toggleLoading(false));
  }

  function updateChart(forecastData, actualData) {
    const forecastPlot = document.getElementById("forecastPlot");
    if (!forecastPlot) return;

    let chart = echarts.init(forecastPlot);
    const monthYearFormat = (ds) =>
      new Date(ds).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
      });

    const labels = forecastData.map((d) => monthYearFormat(d.ds));
    const forecastValues = forecastData.map((d) => d.yhat);
    const upperValues = forecastData.map((d) => d.yhat_upper);
    const lowerValues = forecastData.map((d) => d.yhat_lower);

    const actualMap = new Map(actualData.map((d) => [monthYearFormat(d.ds), d.y]));
    const actualValues = labels.map((label) => actualMap.get(label) ?? null);

    let option = {
      title: {
        text: `Energy Forecast vs Actual (${currentModel.toUpperCase()})`,
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
      animationDuration: 1000,
      animationEasing: "cubicOut",
    };

    chart.setOption(option);
  }

  function updateEvaluation(model) {
    fetch(`${BASE_API}/evaluate_model/${model}`)
      .then((res) => res.json())
      .then((data) => {
        const ul = document.getElementById("model_Evaluation");
        if (!ul) return;
        ul.innerHTML = "";
        if (data.error) {
          ul.innerHTML = `<li class="text-danger">${data.error}</li>`;
        } else {
          ul.innerHTML = `
            <li>MAPE: ${formatNumber(data.mape)}%</li>
            <li>MAE: ${formatNumber(data.mae)}</li>
            <li>RMSE: ${formatNumber(data.rmse)}</li>
          `;
        }
      })
      .catch((err) => {
        console.error("Error fetching evaluation:", err);
      });
  }

  function updateSummary(model) {
    // Forecast summary
    fetch(`${BASE_API}/summary_data/forecast/${model}`)
      .then((res) => res.json())
      .then((data) => {
        const forecastMin = document.getElementById("forecastMin");
        const forecastMax = document.getElementById("forecastMax");
        const forecastAvg = document.getElementById("forecastAvg");

        if (forecastMin) forecastMin.textContent = formatNumber(data.min);
        if (forecastMax) forecastMax.textContent = formatNumber(data.max);
        if (forecastAvg) forecastAvg.textContent = formatNumber(data.avg);
      })
      .catch((err) => console.error("Error fetching forecast summary:", err));

    // Actual summary
    fetch(`${BASE_API}/summary_data/actual`)
      .then((res) => res.json())
      .then((data) => {
        const actualMin = document.getElementById("actualMin");
        const actualMax = document.getElementById("actualMax");
        const actualAvg = document.getElementById("actualAvg");

        if (actualMin) actualMin.textContent = formatNumber(data.min);
        if (actualMax) actualMax.textContent = formatNumber(data.max);
        if (actualAvg) actualAvg.textContent = formatNumber(data.avg);
      })
      .catch((err) => console.error("Error fetching actual summary:", err));
  }

  function updateForecastTable(data) {
    const tbody = document.getElementById("forecastTableBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    const formatDate = (ds) =>
      new Date(ds).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
      });

    data.forEach((item) => {
      const row = `
        <tr>
          <td>${formatDate(item.ds)}</td>
          <td>${formatNumber(item.yhat)}</td>
          <td>${formatNumber(item.yhat_upper)}</td>
          <td>${formatNumber(item.yhat_lower)}</td>
        </tr>`;
      tbody.innerHTML += row;
    });
  }

  function updateComparisonTable(forecastData, actualData) {
    const tbody = document.getElementById("comparisonTableBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    const formatDate = (ds) =>
      new Date(ds).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
      });

    const actualMap = new Map(actualData.map((d) => [formatDate(d.ds), d.y]));

    forecastData.forEach((item) => {
      const formattedDate = formatDate(item.ds);
      const forecastVal = formatNumber(item.yhat);
      const actualVal = actualMap.has(formattedDate)
        ? formatNumber(actualMap.get(formattedDate))
        : "-";

      const row = `
        <tr>
          <td>${formattedDate}</td>
          <td>${forecastVal}</td>
          <td>${actualVal}</td>
        </tr>`;
      tbody.innerHTML += row;
    });
  }

  // Load default on start
  fetchAndRenderData();
  updateEvaluation(currentModel);
  updateSummary(currentModel);
});
