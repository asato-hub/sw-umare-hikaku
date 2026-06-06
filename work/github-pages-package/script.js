const abilities = ["器用", "敏捷", "筋力", "生命力", "知力", "精神力"];
const kinds = [
  { key: "min", label: "最小" },
  { key: "avg", label: "平均" },
  { key: "max", label: "最大" },
];
const chartMaxValue = 30;

const tableHead = document.querySelector("#tableHead");
const tableBody = document.querySelector("#tableBody");
const summary = document.querySelector("#summary");
const filterInput = document.querySelector("#raceFilter");
const raceSelect = document.querySelector("#raceSelect");
const diceConfigBox = document.querySelector("#diceConfig");
const raceInfo = document.querySelector("#raceInfo");
const chartCanvas = document.querySelector("#raceChart");

let raceData = [];
let raceChart = null;

const centerDotPlugin = {
  id: "centerDot",
  afterDraw(chart) {
    const scale = chart.scales.r;
    if (!scale) return;

    const { ctx } = chart;
    ctx.save();
    ctx.beginPath();
    ctx.arc(scale.xCenter, scale.yCenter, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#000000";
    ctx.fill();
    ctx.restore();
  },
};

function formatNumber(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

function showError(message) {
  summary.innerHTML = `
    <div class="metric error-message">
      <strong>読み込みエラー</strong>
      <span>${message}</span>
    </div>
  `;
  tableBody.innerHTML = `<tr><td colspan="21">${message}</td></tr>`;
  raceInfo.innerHTML = `<p class="error-text">${message}</p>`;
}

function getDiceConfig(data) {
  return data.meta?.diceConfig || data.metadata?.diceConfig || data.metadata?.ruleDiceConfig || {};
}

function getAverageTotal(race) {
  return abilities.reduce((sum, ability) => sum + race.stats.avg[ability], 0);
}

function getLargestSpread(race) {
  return abilities
    .map((ability) => ({
      ability,
      spread: race.stats.max[ability] - race.stats.min[ability],
    }))
    .sort((left, right) => right.spread - left.spread)[0];
}

function renderDiceConfig(diceConfig) {
  const lines = ["1d", "2d"].map((dice) => {
    const values = diceConfig[dice];
    if (!values) return `${dice} = 設定なし`;
    return `${dice} = 最小${formatNumber(values.min)} / 平均${formatNumber(values.avg)} / 最大${formatNumber(values.max)}`;
  });

  diceConfigBox.innerHTML = `
    <strong>現在のダイス設定</strong>
    <span>${lines.join("<br>")}</span>
  `;
}

function renderRaceOptions() {
  raceSelect.innerHTML = raceData
    .map((race, index) => `<option value="${index}">${race.raceName}</option>`)
    .join("");
}

function buildChartData(race) {
  return {
    labels: abilities,
    datasets: [
      {
        label: "最小",
        data: abilities.map((ability) => race.stats.min[ability]),
        borderColor: "#3b6ea8",
        backgroundColor: "rgba(59, 110, 168, 0.08)",
        pointBackgroundColor: "#3b6ea8",
        pointRadius: 0,
        pointHoverRadius: 0,
        borderWidth: 2,
      },
      {
        label: "平均",
        data: abilities.map((ability) => race.stats.avg[ability]),
        borderColor: "#2f7d6d",
        backgroundColor: "rgba(47, 125, 109, 0.12)",
        pointBackgroundColor: "#2f7d6d",
        pointRadius: 0,
        pointHoverRadius: 0,
        borderWidth: 3,
      },
      {
        label: "最大",
        data: abilities.map((ability) => race.stats.max[ability]),
        borderColor: "#b65f2a",
        backgroundColor: "rgba(182, 95, 42, 0.08)",
        pointBackgroundColor: "#b65f2a",
        pointRadius: 0,
        pointHoverRadius: 0,
        borderWidth: 2,
      },
    ],
  };
}

function fadePreviousChartImage() {
  if (!raceChart || !chartCanvas.parentElement) return;

  const parentRect = chartCanvas.parentElement.getBoundingClientRect();
  const canvasRect = chartCanvas.getBoundingClientRect();
  const image = document.createElement("img");
  image.className = "chart-fade-image";
  image.alt = "";
  image.src = chartCanvas.toDataURL("image/png");
  image.style.left = `${canvasRect.left - parentRect.left}px`;
  image.style.top = `${canvasRect.top - parentRect.top}px`;
  image.style.width = `${canvasRect.width}px`;
  image.style.height = `${canvasRect.height}px`;

  chartCanvas.parentElement.appendChild(image);
  requestAnimationFrame(() => image.classList.add("is-fading"));
  window.setTimeout(() => image.remove(), 1000);
}

function renderChart(race) {
  if (!window.Chart) {
    raceInfo.innerHTML = `
      <p class="error-text">Chart.js が読み込まれていません。vendor/chart.umd.min.js が存在するか確認してください。</p>
    `;
    return;
  }

  const chartData = buildChartData(race);

  if (raceChart) {
    fadePreviousChartImage();
    raceChart.data = chartData;
    raceChart.options.scales.r.min = 0;
    raceChart.options.scales.r.max = chartMaxValue;
    raceChart.options.plugins.title.text = `${race.raceName}の能力値`;
    raceChart.update("none");
    return;
  }

  raceChart = new window.Chart(chartCanvas, {
    type: "radar",
    data: chartData,
    plugins: [centerDotPlugin],
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: {
          position: "bottom",
        },
        title: {
          display: true,
          text: `${race.raceName}の能力値`,
        },
      },
      scales: {
        r: {
          beginAtZero: true,
          min: 0,
          max: chartMaxValue,
          ticks: {
            stepSize: 5,
          },
          pointLabels: {
            font: {
              size: 14,
            },
          },
        },
      },
    },
  });
}

function renderRaceInfo(race) {
  const largestSpread = getLargestSpread(race);

  raceInfo.innerHTML = `
    <h2>${race.raceName}</h2>
    <dl>
      <div><dt>出典</dt><dd>${race.source || "未記載"}</dd></div>
      <div><dt>生まれ数</dt><dd>${race.birthCount}</dd></div>
      <div><dt>平均値合計</dt><dd>${formatNumber(getAverageTotal(race))}</dd></div>
      <div><dt>差が大きい能力</dt><dd>${largestSpread.ability}（差 ${formatNumber(largestSpread.spread)}）</dd></div>
    </dl>
  `;
}

function renderSelectedRace() {
  const race = raceData[Number(raceSelect.value)] || raceData[0];
  if (!race) return;

  renderChart(race);
  renderRaceInfo(race);
}

function renderHead() {
  const firstRow = document.createElement("tr");
  firstRow.innerHTML = `
    <th rowspan="2">種族</th>
    <th rowspan="2">出典</th>
    <th rowspan="2">生まれ数</th>
    ${kinds.map((kind) => `<th colspan="${abilities.length}">${kind.label}</th>`).join("")}
  `;

  const secondRow = document.createElement("tr");
  secondRow.innerHTML = kinds
    .flatMap(() => abilities)
    .map((ability) => `<th>${ability}</th>`)
    .join("");

  tableHead.replaceChildren(firstRow, secondRow);
}

function renderSummary(races) {
  if (races.length === 0) {
    summary.innerHTML = `
      <div class="metric">
        <strong>0</strong>
        <span>表示中の種族</span>
      </div>
    `;
    return;
  }

  const birthTotal = races.reduce((sum, race) => sum + race.birthCount, 0);
  const avgBirthCount = birthTotal / races.length;
  const avgValues = races.flatMap((race) => abilities.map((ability) => race.stats.avg[ability]));
  const maxAvg = Math.max(...avgValues);
  const minAvg = Math.min(...avgValues);

  summary.innerHTML = `
    <div class="metric"><strong>${races.length}</strong><span>表示中の種族</span></div>
    <div class="metric"><strong>${birthTotal}</strong><span>表示中の生まれ合計</span></div>
    <div class="metric"><strong>${formatNumber(avgBirthCount)}</strong><span>1種族あたりの生まれ数</span></div>
    <div class="metric"><strong>${formatNumber(minAvg)} - ${formatNumber(maxAvg)}</strong><span>平均値の範囲</span></div>
  `;
}

function renderRows() {
  const keyword = filterInput.value.trim().toLowerCase();
  const filtered = raceData.filter((race) => race.raceName.toLowerCase().includes(keyword));

  const rows = filtered.map((race) => {
    const statCells = kinds
      .flatMap((kind) => abilities.map((ability) => `<td>${formatNumber(race.stats[kind.key][ability])}</td>`))
      .join("");

    return `
      <tr>
        <td>${race.raceName}</td>
        <td class="source">${race.source}</td>
        <td class="count">${race.birthCount}</td>
        ${statCells}
      </tr>
    `;
  });

  tableBody.innerHTML = rows.join("");
  renderSummary(filtered);
}

function loadData() {
  if (!window.RACE_STATS || !Array.isArray(window.RACE_STATS.races)) {
    throw new Error("集計データ data/race-stats.js が読み込まれていません。index.html からの読み込み順を確認してください。");
  }

  raceData = window.RACE_STATS.races;
  renderDiceConfig(getDiceConfig(window.RACE_STATS));
  renderRaceOptions();
  renderHead();
  renderRows();
  renderSelectedRace();
}

filterInput.addEventListener("input", renderRows);
raceSelect.addEventListener("change", renderSelectedRace);

try {
  loadData();
} catch (error) {
  renderHead();
  showError(error.message);
}
