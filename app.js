/**
 * iDengue Surveillance Dashboard - Interactive Logic
 */

let appData = null;
let currentSort = { column: 'cum', order: 'desc' };
let currentSearch = '';
let weeklyChart = null;
let dailyChart = null;

document.addEventListener('DOMContentLoaded', async () => {
  await initData();
  initUI();
  renderHeader();
  renderKPIs();
  renderTable();
  initCharts();
  setupEventListeners();
});

async function initData() {
  // 1. Try window.IDENGUE_DATA (from data.js)
  if (window.IDENGUE_DATA && window.IDENGUE_DATA.latest) {
    appData = window.IDENGUE_DATA;
    return;
  }

  // 2. Fallback fetch latest.json
  try {
    const res = await fetch('data/latest.json');
    if (res.ok) {
      const latest = await res.json();
      appData = {
        latest: latest,
        dates: [latest.report_date],
        daily_matrix: { [latest.report_date]: {} },
        weeks: [`${latest.epid_year}-W${String(latest.epid_week).padStart(2, '0')}`],
        weekly_matrix: {
          [`${latest.epid_year}-W${String(latest.epid_week).padStart(2, '0')}`]: {
            label: latest.epid_week_label,
            year: latest.epid_year,
            week: latest.epid_week,
            states: {}
          }
        }
      };
      // Populate matrix
      latest.states.forEach(s => {
        appData.daily_matrix[latest.report_date][s.state] = s.daily_cases;
        appData.weekly_matrix[`${latest.epid_year}-W${String(latest.epid_week).padStart(2, '0')}`].states[s.state] = s.daily_cases;
      });
      appData.daily_matrix[latest.report_date]['MALAYSIA'] = latest.total.daily_cases;
      appData.weekly_matrix[`${latest.epid_year}-W${String(latest.epid_week).padStart(2, '0')}`].states['MALAYSIA'] = latest.total.daily_cases;
    }
  } catch (err) {
    console.error('Error fetching data:', err);
  }
}

function initUI() {
  if (!appData || !appData.latest) return;
  const select = document.getElementById('state-filter-select');
  select.innerHTML = '<option value="MALAYSIA">Semua Negeri (MALAYSIA - Total)</option>';

  const states = [...appData.latest.states].sort((a, b) => a.state.localeCompare(b.state));
  states.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.state;
    opt.textContent = s.state;
    select.appendChild(opt);
  });
}

function renderHeader() {
  if (!appData || !appData.latest) return;
  const lat = appData.latest;

  document.getElementById('hdr-report-date').textContent = lat.report_date_raw || lat.report_date;
  document.getElementById('hdr-cum-period').textContent = `Kumulatif: ${lat.cumulative_start_raw || lat.cumulative_start_date} hingga ${lat.cumulative_end_raw || lat.cumulative_end_date}`;
  document.getElementById('hdr-epid-week').textContent = lat.epid_week_label || `ME ${lat.epid_week}/${lat.epid_year}`;
  document.getElementById('hdr-epid-dates').textContent = `Takwim ME: ${lat.epid_week_start} hingga ${lat.epid_week_end}`;
  document.getElementById('th-report-date').textContent = lat.report_date_raw || lat.report_date;

  if (lat.scraped_at) {
    const dt = new Date(lat.scraped_at);
    document.getElementById('scraped-timestamp-note').textContent = `Status ingestion: ${dt.toLocaleString('en-MY')}`;
  }
}

function renderKPIs() {
  if (!appData || !appData.latest) return;
  const lat = appData.latest;
  const total = lat.total;

  document.getElementById('kpi-daily-total').textContent = Number(total.daily_cases).toLocaleString();
  document.getElementById('kpi-cum-total').textContent = Number(total.cumulative_cases).toLocaleString();
  document.getElementById('kpi-cum-sub').textContent = `Dari ${lat.cumulative_start_raw || '4 Jan 2026'}`;

  // Top state by cumulative
  const sortedByCum = [...lat.states].sort((a, b) => b.cumulative_cases - a.cumulative_cases);
  const top = sortedByCum[0];
  if (top) {
    const pct = ((top.cumulative_cases / total.cumulative_cases) * 100).toFixed(1);
    document.getElementById('kpi-top-state').textContent = top.state;
    document.getElementById('kpi-top-cases').textContent = `${Number(top.cumulative_cases).toLocaleString()} kes`;
    document.getElementById('kpi-top-percent').textContent = `${pct}% daripada jumlah Malaysia`;
  }

  document.getElementById('kpi-ew-short').textContent = `ME ${lat.epid_week} (${lat.epid_year})`;
  document.getElementById('kpi-states-count').textContent = `${lat.states.length} Negeri / Wilayah`;
}

function renderTable() {
  if (!appData || !appData.latest) return;
  const tbody = document.getElementById('table-body');
  const lat = appData.latest;
  const totalCum = lat.total.cumulative_cases || 1;

  let rows = [...lat.states];

  // Apply search
  if (currentSearch.trim() !== '') {
    const q = currentSearch.toLowerCase();
    rows = rows.filter(r => r.state.toLowerCase().includes(q));
  }

  // Apply sort
  rows.sort((a, b) => {
    let vA = a[currentSort.column === 'cum' ? 'cumulative_cases' : currentSort.column === 'daily' ? 'daily_cases' : 'state'];
    let vB = b[currentSort.column === 'cum' ? 'cumulative_cases' : currentSort.column === 'daily' ? 'daily_cases' : 'state'];

    if (typeof vA === 'string') {
      return currentSort.order === 'asc' ? vA.localeCompare(vB) : vB.localeCompare(vA);
    }
    return currentSort.order === 'asc' ? vA - vB : vB - vA;
  });

  // Find max cumulative for the relative bar
  const maxCum = Math.max(...lat.states.map(s => s.cumulative_cases), 1);

  tbody.innerHTML = '';
  rows.forEach((row, idx) => {
    const tr = document.createElement('tr');
    const pct = ((row.cumulative_cases / totalCum) * 100).toFixed(2);
    const barWidth = Math.max(2, (row.cumulative_cases / maxCum) * 100).toFixed(1);

    let rankClass = '';
    if (idx === 0) rankClass = 'rank-1';
    else if (idx === 1) rankClass = 'rank-2';
    else if (idx === 2) rankClass = 'rank-3';

    tr.innerHTML = `
      <td class="col-rank">
        <span class="rank-top ${rankClass}">${idx + 1}</span>
      </td>
      <td class="col-state">${row.state}</td>
      <td class="col-daily">
        <span class="daily-pill ${row.daily_cases > 0 ? 'has-cases' : 'zero'}">
          ${Number(row.daily_cases).toLocaleString()}
        </span>
      </td>
      <td class="col-cum">${Number(row.cumulative_cases).toLocaleString()}</td>
      <td class="col-share">${pct}%</td>
      <td class="col-bar">
        <div class="burden-bar-bg">
          <div class="burden-bar-fill" style="width: ${barWidth}%;"></div>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Update total footer row
  document.getElementById('tf-daily-total').innerHTML = `<strong>${Number(lat.total.daily_cases).toLocaleString()}</strong>`;
  document.getElementById('tf-cum-total').innerHTML = `<strong>${Number(lat.total.cumulative_cases).toLocaleString()}</strong>`;
}

function sortTable(column) {
  if (currentSort.column === column) {
    currentSort.order = currentSort.order === 'asc' ? 'desc' : 'asc';
  } else {
    currentSort.column = column;
    currentSort.order = column === 'state' ? 'asc' : 'desc';
  }

  // Update indicators
  ['state', 'daily', 'cum'].forEach(c => {
    const el = document.getElementById(`sort-${c}`);
    if (el) {
      if (c === currentSort.column) {
        el.className = `sort-indicator active-${currentSort.order}`;
        el.textContent = currentSort.order === 'asc' ? '▲' : '▼';
      } else {
        el.className = 'sort-indicator';
        el.textContent = '';
      }
    }
  });

  renderTable();
}

function initCharts() {
  if (typeof Chart === 'undefined' || !appData) return;
  updateCharts('MALAYSIA');
}

function updateCharts(selectedState) {
  if (typeof Chart === 'undefined' || !appData) return;

  document.getElementById('weekly-chart-tag').textContent = selectedState;
  document.getElementById('daily-chart-tag').textContent = selectedState;

  // 1. Weekly Epid Trend Chart
  const weekLabels = [];
  const weekValues = [];

  const weekKeys = appData.weeks || [];
  weekKeys.forEach(wk => {
    const wkObj = appData.weekly_matrix[wk];
    if (wkObj) {
      weekLabels.push(wkObj.label || wk);
      if (selectedState === 'MALAYSIA') {
        let sum = 0;
        if (wkObj.states['MALAYSIA'] !== undefined) {
          sum = wkObj.states['MALAYSIA'];
        } else {
          Object.entries(wkObj.states).forEach(([k, v]) => {
            if (k !== 'MALAYSIA') sum += Number(v);
          });
        }
        weekValues.push(sum);
      } else {
        weekValues.push(wkObj.states[selectedState] || 0);
      }
    }
  });

  const ctxWeekly = document.getElementById('weeklyTrendChart').getContext('2d');
  if (weeklyChart) weeklyChart.destroy();

  weeklyChart = new Chart(ctxWeekly, {
    type: 'bar',
    data: {
      labels: weekLabels,
      datasets: [{
        label: `Kes Mingguan (${selectedState})`,
        data: weekValues,
        backgroundColor: 'rgba(6, 182, 212, 0.65)',
        borderColor: '#06B6D4',
        borderWidth: 1.5,
        borderRadius: 6,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#94A3B8', font: { family: 'Plus Jakarta Sans', size: 12 } } },
        tooltip: {
          backgroundColor: '#1E293B',
          titleColor: '#F8FAFC',
          bodyColor: '#67E8F9',
          borderColor: '#334155',
          borderWidth: 1,
          padding: 10,
        }
      },
      scales: {
        x: {
          ticks: { color: '#64748B', font: { family: 'Plus Jakarta Sans', size: 11 } },
          grid: { color: 'rgba(255, 255, 255, 0.05)' }
        },
        y: {
          beginAtZero: true,
          ticks: { color: '#64748B', font: { family: 'JetBrains Mono', size: 11 } },
          grid: { color: 'rgba(255, 255, 255, 0.05)' }
        }
      }
    }
  });

  // 2. Daily Trend Chart
  const dailyLabels = [];
  const dailyValues = [];

  const dateKeys = appData.dates || [];
  dateKeys.forEach(dt => {
    dailyLabels.push(dt);
    const dayObj = appData.daily_matrix[dt] || {};
    if (selectedState === 'MALAYSIA') {
      dailyValues.push(dayObj['MALAYSIA'] !== undefined ? dayObj['MALAYSIA'] : 0);
    } else {
      dailyValues.push(dayObj[selectedState] || 0);
    }
  });

  const ctxDaily = document.getElementById('dailyTrendChart').getContext('2d');
  if (dailyChart) dailyChart.destroy();

  dailyChart = new Chart(ctxDaily, {
    type: 'line',
    data: {
      labels: dailyLabels,
      datasets: [{
        label: `Kes Harian (${selectedState})`,
        data: dailyValues,
        borderColor: '#EF4444',
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        borderWidth: 2.5,
        fill: true,
        tension: 0.35,
        pointBackgroundColor: '#EF4444',
        pointRadius: 4,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#94A3B8', font: { family: 'Plus Jakarta Sans', size: 12 } } },
        tooltip: {
          backgroundColor: '#1E293B',
          titleColor: '#F8FAFC',
          bodyColor: '#F87171',
          borderColor: '#334155',
          borderWidth: 1,
          padding: 10,
        }
      },
      scales: {
        x: {
          ticks: { color: '#64748B', font: { family: 'Plus Jakarta Sans', size: 11 } },
          grid: { color: 'rgba(255, 255, 255, 0.05)' }
        },
        y: {
          beginAtZero: true,
          ticks: { color: '#64748B', font: { family: 'JetBrains Mono', size: 11 } },
          grid: { color: 'rgba(255, 255, 255, 0.05)' }
        }
      }
    }
  });
}

function setupEventListeners() {
  // State filter change
  const select = document.getElementById('state-filter-select');
  select.addEventListener('change', (e) => {
    updateCharts(e.target.value);
  });

  // Table search
  const searchInput = document.getElementById('table-search');
  searchInput.addEventListener('input', (e) => {
    currentSearch = e.target.value;
    renderTable();
  });

  // Export CSV
  document.getElementById('btn-export-csv').addEventListener('click', () => {
    window.location.href = 'data/latest.csv';
  });

  // Export JSON
  document.getElementById('btn-export-json').addEventListener('click', () => {
    window.location.href = 'data/latest.json';
  });
}
