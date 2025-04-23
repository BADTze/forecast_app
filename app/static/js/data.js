document.addEventListener("DOMContentLoaded", function () {
  const currentYear = new Date().getFullYear();
  const year2 = currentYear - 1;
  const year1 = currentYear - 2;

  const formatNumber = (num) =>
    typeof num === "number"
      ? new Intl.NumberFormat("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(num)
      : "-";

  const formatDateLabel = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short" });
  };

  // Fetch forecast & chart
  Promise.all([
    fetch("/forecast-web/api/prophet_forecast").then((res) => res.json()),
    fetch("/forecast-web/api/sarimax_forecast").then((res) => res.json()),
  ]).then(([prophetData, sarimaRes]) => {
    const sarimaData = sarimaRes.forecast;

    const filteredProphet = prophetData.filter(
      (d) => new Date(d.ds).getFullYear() === currentYear
    );
    const filteredSarima = sarimaData.filter(
      (d) => new Date(d.ds).getFullYear() === currentYear
    );

    const combined = filteredProphet.map((p) => {
      const date = formatDateLabel(p.ds);
      const sMatch = filteredSarima.find((s) => formatDateLabel(s.ds) === date);
      return { date, prophet: p.yhat, sarima: sMatch?.yhat ?? null };
    });

    updateForecastTable(combined);
    updateComparisonChart(combined);
  });

  function updateForecastTable(data) {
    const tbody = document.getElementById("forecast-table");
    tbody.innerHTML = data
      .map(
        (row) => `
      <tr>
        <td>${row.date}</td>
        <td>${formatNumber(row.prophet)}</td>
        <td>${formatNumber(row.sarima)}</td>
      </tr>`
      )
      .join("");
  }

  function updateComparisonChart(data) {
    const chart = echarts.init(document.getElementById("compa-forecast"));
    chart.setOption({
      title: {
        text: `Comparison Forecast Value - ${currentYear}`,
        left: "center",
        textStyle: { color: "#21130d", fontSize: 18 },
      },
      tooltip: { trigger: "axis" },
      legend: {
        data: ["Prophet", "SARIMA"],
        top: 30,
        textStyle: { color: "#21130d" },
      },
      xAxis: {
        type: "category",
        data: data.map((d) => d.date),
        axisLabel: { rotate: -45, color: "#21130d" },
      },
      yAxis: { type: "value", axisLabel: { color: "#21130d" } },
      series: [
        {
          name: "Prophet",
          type: "line",
          data: data.map((d) => d.prophet),
          color: "#4caf50",
          smooth: true,
        },
        {
          name: "SARIMA",
          type: "line",
          data: data.map((d) => d.sarima),
          color: "#2196f3",
          smooth: true,
        },
      ],
    });
  }

  // Akurasi Model Dinamis
  fetch("/forecast-web/api/model_list")
    .then((res) => res.json())
    .then((data) => {
      const list = document.getElementById("model-accuracy-list");
      list.innerHTML = "";
      data.models.forEach((model) => {
        const id = `model-accuracy-${model}`;
        list.innerHTML += `
          <li class="d-flex list-group-item justify-content-between">
            <span><b>${model.toUpperCase()}</b></span>
            <span id="${id}" class="badge">MAPE: Loading...</span>
          </li>`;
        fetchModelAccuracy(model, id);
      });
    });

  function fetchModelAccuracy(modelName, elementId) {
    fetch(`/forecast-web/api/evaluate_model/${modelName}`)
      .then((res) => res.json())
      .then((data) => {
        document.getElementById(elementId).textContent = data?.mape
          ? `MAPE: ${data.mape.toFixed(2)}%`
          : "MAPE: -";
      })
      .catch(() => {
        document.getElementById(elementId).textContent = "MAPE: -";
      });
  }

  // Growth Table
  fetch("/forecast-web/api/raw_data")
    .then((res) => res.json())
    .then((data) => calculateGrowthTable(data));

  function calculateGrowthTable(rawData) {
    const dataPrev = rawData.filter((d) => Number(d.year) === year1);
    const dataCurr = rawData.filter((d) => Number(d.year) === year2);

    const aggregate = (data) => {
      const sum = {};
      data.forEach((d) => {
        for (const [k, v] of Object.entries(d.values)) {
          sum[k] = (sum[k] || 0) + v;
        }
      });
      return sum;
    };

    const sumPrev = aggregate(dataPrev);
    const sumCurr = aggregate(dataCurr);

    // Header tahun dinamis
    document.getElementById("growth-table-header").innerHTML = `
      <tr>
        <th scope="col">Category</th>
        <th scope="col">${year1}</th>
        <th scope="col">${year2}</th>
        <th scope="col">Growth</th>
      </tr>`;

    const tbody = document.getElementById("growth-table");
    tbody.innerHTML = Object.keys(sumPrev)
      .map((k) => {
        const valPrev = sumPrev[k];
        const valCurr = sumCurr[k] || 0;
        const growth =
          valPrev !== 0 ? ((valCurr - valPrev) / valPrev) * 100 : 0;
        const arrow = growth >= 0 ? "🔺" : "🔻";
        const color = growth >= 0 ? "text-danger" : "text-success";
        return `
        <tr>
          <td><b>${k}</b></td>
          <td>${valPrev.toFixed(2)}</td>
          <td>${valCurr.toFixed(2)}</td>
          <td class="${color}"><b>${growth.toFixed(2)}% ${arrow}</b></td>
        </tr>`;
      })
      .join("");
  }
});
