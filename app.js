/**
 * iDengue Surveillance Dashboard - Interactive Logic
 * Features:
 * - Malaysia Total Mode vs State-by-State Comparison Mode
 * - Epidemiological Weekly Trend & Daily Trend
 * - Full 15-State Comparison Ranking Chart (Daily & Cumulative)
 * - Main Table Sorted by Cumulative Descending
 */

let appData = null;
let currentSort = { column: 'cum', order: 'desc' };
let currentSearch = '';
let currentGraphMode = 'total'; // 'total' | 'comparison'
let currentComparisonMetric = 'cumulative'; // 'cumulative' | 'daily'
let currentComparisonScale = 'linear'; // 'linear' | 'logarithmic'
let currentComparisonZoom = 'all'; // 'all' | number (e.g. 500, 1500, 5000, 12000)
let selectedComparisonStates = new Set(); // Multi-state selection for comparison mode
let weeklyChart = null;
let dailyChart = null;
let stateComparisonChart = null;

// Palette for 15 states + Malaysia total
const STATE_COLORS = {
  'SELANGOR': '#EF4444',
  'WILAYAH PERSEKUTUAN': '#F59E0B',
  'JOHOR': '#06B6D4',
  'NEGERI SEMBILAN': '#8B5CF6',
  'SABAH': '#10B981',
  'PERAK': '#3B82F6',
  'KELANTAN': '#EC4899',
  'PULAU PINANG': '#14B8A6',
  'PAHANG': '#F97316',
  'SARAWAK': '#84CC16',
  'KEDAH': '#6366F1',
  'MELAKA': '#EAB308',
  'TERENGGANU': '#A855F7',
  'PERLIS': '#94A3B8',
  'WILAYAH PERSEKUTUAN LABUAN': '#2DD4BF',
  'MALAYSIA': '#06B6D4',
};

const DEFAULT_COLOR_PALETTE = [
  '#EF4444', '#F59E0B', '#06B6D4', '#8B5CF6', '#10B981',
  '#3B82F6', '#EC4899', '#14B8A6', '#F97316', '#84CC16',
  '#6366F1', '#EAB308', '#A855F7', '#94A3B8', '#2DD4BF'
];

document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  await initData();
  initUI();
  renderHeader();
  renderKPIs();
  renderTable();
  initCharts();
  setupEventListeners();
});

function initTheme() {
  const currentTheme = localStorage.getItem('idengue_theme') || 'light';
  setTheme(currentTheme, false);
}

function setTheme(theme, reRenderCharts = true) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('idengue_theme', theme);

  const lightOpt = document.getElementById('theme-opt-light');
  const darkOpt = document.getElementById('theme-opt-dark');
  if (lightOpt && darkOpt) {
    lightOpt.classList.toggle('active', theme === 'light');
    darkOpt.classList.toggle('active', theme === 'dark');
  }

  if (reRenderCharts) {
    const selectedState = document.getElementById('state-filter-select')?.value || 'MALAYSIA';
    updateCharts(selectedState);
    renderStateComparisonChart();
  }
}

function getChartThemeColors() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  return {
    isDark: isDark,
    ticks: isDark ? '#64748B' : '#475569',
    stateTicks: isDark ? '#F8FAFC' : '#0F172A',
    grid: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
    border: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    legend: isDark ? '#94A3B8' : '#475569',
    tooltipBg: isDark ? '#1E293B' : '#FFFFFF',
    tooltipTitle: isDark ? '#F8FAFC' : '#0F172A',
    tooltipBody: isDark ? '#67E8F9' : '#0284C7',
    tooltipDailyBody: isDark ? '#F87171' : '#DC2626',
    tooltipBorder: isDark ? '#334155' : '#CBD5E1',
    singleWeeklyBarBg: isDark ? 'rgba(6, 182, 212, 0.65)' : 'rgba(2, 132, 199, 0.7)',
    singleWeeklyBorder: isDark ? '#06B6D4' : '#0284C7',
    singleDailyLineBg: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(220, 38, 38, 0.12)',
    singleDailyBorder: isDark ? '#EF4444' : '#DC2626',
  };
}

async function initData() {
  if (window.IDENGUE_DATA && window.IDENGUE_DATA.latest) {
    appData = window.IDENGUE_DATA;
    return;
  }

  try {
    const res = await fetch(`data/latest.json?v=${Date.now()}`, { cache: 'no-store' });
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
  if (select) {
    select.innerHTML = '<option value="MALAYSIA">Semua Negeri (MALAYSIA)</option>';
    const states = [...appData.latest.states].sort((a, b) => a.state.localeCompare(b.state));
    states.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.state;
      opt.textContent = s.state;
      select.appendChild(opt);
    });
  }

  initComparisonStates();
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
    let dateStr = String(lat.scraped_at).trim();
    // If it's a naive UTC timestamp from GitHub Actions (e.g. 2026-09-02T03:20:28.687456 without timezone suffix), append 'Z'
    if (!dateStr.includes('Z') && !dateStr.includes('+') && !dateStr.slice(10).includes('-')) {
      dateStr += 'Z';
    }
    const dt = new Date(dateStr);

    const dateFormatted = dt.toLocaleDateString('en-GB', {
      timeZone: 'Asia/Kuala_Lumpur',
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
    const timeFormatted = dt.toLocaleTimeString('en-US', {
      timeZone: 'Asia/Kuala_Lumpur',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
    const fullFormatted = `${dateFormatted} • ${timeFormatted}`;

    const dateElem = document.getElementById('hdr-last-updated-date');
    if (dateElem) dateElem.textContent = fullFormatted;

    const timeElem = document.getElementById('hdr-last-updated-time');
    if (timeElem) timeElem.textContent = `Waktu Malaysia (MYT / UTC+8)`;

    const noteElem = document.getElementById('scraped-timestamp-note');
    if (noteElem) noteElem.textContent = `Auto-ingestion terakhir dijalankan pada: ${fullFormatted} (MYT).`;
  }
}

function renderKPIs() {
  if (!appData || !appData.latest) return;
  const lat = appData.latest;
  const total = lat.total;

  document.getElementById('kpi-daily-total').textContent = Number(total.daily_cases).toLocaleString();
  document.getElementById('kpi-cum-total').textContent = Number(total.cumulative_cases).toLocaleString();
  document.getElementById('kpi-cum-sub').textContent = `Dari ${lat.cumulative_start_raw || '4 Jan 2026'}`;

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

  if (currentSearch.trim() !== '') {
    const q = currentSearch.toLowerCase();
    rows = rows.filter(r => r.state.toLowerCase().includes(q));
  }

  rows.sort((a, b) => {
    let vA = a[currentSort.column === 'cum' ? 'cumulative_cases' : currentSort.column === 'daily' ? 'daily_cases' : 'state'];
    let vB = b[currentSort.column === 'cum' ? 'cumulative_cases' : currentSort.column === 'daily' ? 'daily_cases' : 'state'];

    if (typeof vA === 'string') {
      return currentSort.order === 'asc' ? vA.localeCompare(vB) : vB.localeCompare(vA);
    }
    return currentSort.order === 'asc' ? vA - vB : vB - vA;
  });

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

function initComparisonStates() {
  if (!appData || !appData.latest || !appData.latest.states) return;
  const sorted = [...appData.latest.states].sort((a, b) => b.cumulative_cases - a.cumulative_cases);
  // Default to Top 5 states for clear, readable comparison
  selectedComparisonStates = new Set(sorted.slice(0, 5).map(s => s.state));
  renderStateChips();
}

function renderStateChips() {
  const container = document.getElementById('state-chips-container');
  if (!container || !appData || !appData.latest) return;

  const states = [...appData.latest.states].sort((a, b) => b.cumulative_cases - a.cumulative_cases);
  container.innerHTML = '';

  states.forEach(s => {
    const isSelected = selectedComparisonStates.has(s.state);
    const color = STATE_COLORS[s.state] || '#06B6D4';

    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = `state-chip ${isSelected ? 'active' : ''}`;
    chip.dataset.state = s.state;
    chip.style.setProperty('--chip-color', color);
    chip.onclick = () => toggleStateSelection(s.state);

    chip.innerHTML = `
      <span class="chip-dot" style="background-color: ${color}"></span>
      <span class="chip-name">${s.state}</span>
      <span class="chip-count">(${Number(s.cumulative_cases).toLocaleString()})</span>
      <span class="chip-check">${isSelected ? '✓' : '+'}</span>
    `;
    container.appendChild(chip);
  });

  const countBadge = document.getElementById('selected-states-count-badge');
  if (countBadge) {
    countBadge.textContent = `${selectedComparisonStates.size} daripada ${states.length} Negeri Dipilih`;
  }

  // Update active state on preset buttons
  const isTop3 = selectedComparisonStates.size === 3 && states.slice(0, 3).every(s => selectedComparisonStates.has(s.state));
  const isTop5 = selectedComparisonStates.size === 5 && states.slice(0, 5).every(s => selectedComparisonStates.has(s.state));
  const isAll = selectedComparisonStates.size === states.length;

  document.getElementById('btn-preset-top3')?.classList.toggle('active', isTop3);
  document.getElementById('btn-preset-top5')?.classList.toggle('active', isTop5);
  document.getElementById('btn-preset-all')?.classList.toggle('active', isAll);
  document.getElementById('btn-preset-clear')?.classList.toggle('active', selectedComparisonStates.size === 1);
}

function toggleStateSelection(stateName) {
  if (selectedComparisonStates.has(stateName)) {
    if (selectedComparisonStates.size <= 1) {
      // Keep at least 1 state selected
      return;
    }
    selectedComparisonStates.delete(stateName);
  } else {
    selectedComparisonStates.add(stateName);
  }
  renderStateChips();
  updateCharts('MALAYSIA');
  renderStateComparisonChart();
}

function applyStatePreset(preset) {
  if (!appData || !appData.latest) return;
  const sorted = [...appData.latest.states].sort((a, b) => b.cumulative_cases - a.cumulative_cases);

  if (preset === 'top3') {
    selectedComparisonStates = new Set(sorted.slice(0, 3).map(s => s.state));
  } else if (preset === 'top5') {
    selectedComparisonStates = new Set(sorted.slice(0, 5).map(s => s.state));
  } else if (preset === 'all') {
    selectedComparisonStates = new Set(sorted.map(s => s.state));
  } else if (preset === 'clear') {
    // Keep top 1 state
    selectedComparisonStates = new Set([sorted[0].state]);
  }
  renderStateChips();
  updateCharts('MALAYSIA');
  renderStateComparisonChart();
}

function setGraphMode(mode) {
  currentGraphMode = mode;
  document.getElementById('btn-mode-total').classList.toggle('active', mode === 'total');
  document.getElementById('btn-mode-compare').classList.toggle('active', mode === 'comparison');

  const multiPanel = document.getElementById('multi-state-filter-panel');
  const singleWrapper = document.getElementById('single-state-wrapper');

  if (mode === 'comparison') {
    if (multiPanel) multiPanel.style.display = 'block';
    if (singleWrapper) singleWrapper.style.display = 'none';
    if (!selectedComparisonStates || selectedComparisonStates.size === 0) {
      initComparisonStates();
    }
    renderStateChips();
  } else {
    if (multiPanel) multiPanel.style.display = 'none';
    if (singleWrapper) singleWrapper.style.display = 'flex';
  }

  const selectedState = document.getElementById('state-filter-select').value;
  updateCharts(selectedState);
  renderStateComparisonChart();
}

function setComparisonMetric(metric) {
  currentComparisonMetric = metric;
  document.getElementById('btn-metric-cum').classList.toggle('active', metric === 'cumulative');
  document.getElementById('btn-metric-daily').classList.toggle('active', metric === 'daily');
  renderStateComparisonChart();
}

function setComparisonScale(scaleType) {
  currentComparisonScale = scaleType;
  document.getElementById('btn-scale-linear')?.classList.toggle('active', scaleType === 'linear');
  document.getElementById('btn-scale-log')?.classList.toggle('active', scaleType === 'logarithmic');
  renderStateComparisonChart();
}

function applyComparisonZoom(zoomVal) {
  currentComparisonZoom = zoomVal;

  const presets = ['all', '500', '1500', '5000', '12000'];
  presets.forEach(p => {
    const btn = document.getElementById(`btn-zoom-${p}`);
    if (btn) {
      btn.classList.toggle('active', String(zoomVal) === p);
    }
  });

  const display = document.getElementById('zoom-range-display');
  const slider = document.getElementById('zoom-range-slider');

  if (zoomVal === 'all') {
    if (display) display.textContent = 'Semua (Maks)';
    if (slider) slider.value = slider.max || 30000;
  } else {
    const num = Number(zoomVal);
    if (display) display.textContent = `0 - ${num.toLocaleString()}`;
    if (slider) slider.value = num;
  }

  renderStateComparisonChart();
}

function onZoomSliderChange(val) {
  const num = Number(val);
  const slider = document.getElementById('zoom-range-slider');
  const maxLimit = slider ? Number(slider.max) : 30000;

  const presets = ['all', '500', '1500', '5000', '12000'];
  presets.forEach(p => {
    const btn = document.getElementById(`btn-zoom-${p}`);
    if (btn) {
      btn.classList.toggle('active', p !== 'all' && Number(p) === num);
    }
  });

  const display = document.getElementById('zoom-range-display');
  if (num >= maxLimit) {
    currentComparisonZoom = 'all';
    if (display) display.textContent = 'Semua (Maks)';
    document.getElementById('btn-zoom-all')?.classList.add('active');
  } else {
    currentComparisonZoom = num;
    if (display) display.textContent = `0 - ${num.toLocaleString()}`;
    document.getElementById('btn-zoom-all')?.classList.remove('active');
  }

  renderStateComparisonChart();
}

function initCharts() {
  if (typeof Chart === 'undefined' || !appData) return;
  updateCharts('MALAYSIA');
  renderStateComparisonChart();
}

function updateCharts(selectedState) {
  if (typeof Chart === 'undefined' || !appData) return;

  const isCompareMode = (currentGraphMode === 'comparison');

  // Update header badges and titles
  const weeklyTag = document.getElementById('weekly-chart-tag');
  const dailyTag = document.getElementById('daily-chart-tag');
  const weeklyTitle = document.getElementById('weekly-chart-title');
  const dailyTitle = document.getElementById('daily-chart-title');

  if (isCompareMode) {
    const count = selectedComparisonStates ? selectedComparisonStates.size : 0;
    weeklyTag.textContent = `PERBANDINGAN (${count} NEGERI)`;
    dailyTag.textContent = `PERBANDINGAN (${count} NEGERI)`;
    weeklyTitle.textContent = `Trend Mingguan Mengikut ${count} Negeri Pilihan`;
    dailyTitle.textContent = `Trend Harian Mengikut ${count} Negeri Pilihan`;
  } else {
    weeklyTag.textContent = selectedState === 'MALAYSIA' ? 'JUMLAH KESELURUHAN (TOTAL)' : selectedState;
    dailyTag.textContent = selectedState === 'MALAYSIA' ? 'JUMLAH KESELURUHAN (TOTAL)' : selectedState;
    weeklyTitle.textContent = selectedState === 'MALAYSIA' ? 'Jumlah Keseluruhan Mingguan (Malaysia)' : `Trend Mingguan (${selectedState})`;
    dailyTitle.textContent = selectedState === 'MALAYSIA' ? 'Jumlah Keseluruhan Harian (Malaysia)' : `Trend Harian (${selectedState})`;
  }

  // 1. Weekly Chart
  renderWeeklyChart(selectedState, isCompareMode);

  // 2. Daily Chart
  renderDailyChart(selectedState, isCompareMode);
}

function renderWeeklyChart(selectedState, isCompareMode) {
  const weekKeys = appData.weeks || [];
  const weekLabels = weekKeys.map(wk => appData.weekly_matrix[wk]?.label || wk);
  const ctxWeekly = document.getElementById('weeklyTrendChart').getContext('2d');

  if (weeklyChart) weeklyChart.destroy();

  let datasets = [];

  if (isCompareMode) {
    // Multi-state stacked bar chart for selected comparison states
    const states = appData.latest.states
      .map(s => s.state)
      .filter(st => selectedComparisonStates.has(st));

    datasets = states.map(st => {
      const color = STATE_COLORS[st] || '#06B6D4';
      const data = weekKeys.map(wk => appData.weekly_matrix[wk]?.states[st] || 0);
      return {
        label: st,
        data: data,
        backgroundColor: color,
        borderWidth: 0,
        stack: 'weekly_stack'
      };
    });
  } else {
    // Single total or single state bar chart
    const values = weekKeys.map(wk => {
      const wkObj = appData.weekly_matrix[wk];
      if (!wkObj) return 0;
      if (selectedState === 'MALAYSIA') {
        if (wkObj.states['MALAYSIA'] !== undefined) return wkObj.states['MALAYSIA'];
        let sum = 0;
        Object.entries(wkObj.states).forEach(([k, v]) => { if (k !== 'MALAYSIA') sum += Number(v); });
        return sum;
      }
      return wkObj.states[selectedState] || 0;
    });

    datasets = [{
      label: selectedState === 'MALAYSIA' ? 'Jumlah Kes Mingguan (Malaysia)' : `Kes Mingguan (${selectedState})`,
      data: values,
      backgroundColor: 'rgba(6, 182, 212, 0.65)',
      borderColor: '#06B6D4',
      borderWidth: 1.5,
      borderRadius: 6,
    }];
  }

  const tc = getChartThemeColors();

  weeklyChart = new Chart(ctxWeekly, {
    type: 'bar',
    data: { labels: weekLabels, datasets: datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: isCompareMode,
          position: 'top',
          labels: { color: tc.legend, boxWidth: 12, font: { family: 'Plus Jakarta Sans', size: 11 } }
        },
        tooltip: {
          backgroundColor: tc.tooltipBg,
          titleColor: tc.tooltipTitle,
          bodyColor: tc.tooltipBody,
          borderColor: tc.tooltipBorder,
          borderWidth: 1,
          padding: 10,
        }
      },
      scales: {
        x: {
          stacked: isCompareMode,
          ticks: { color: tc.ticks, font: { family: 'Plus Jakarta Sans', size: 11 } },
          grid: { color: tc.grid },
          border: { color: tc.border }
        },
        y: {
          position: 'left',
          stacked: isCompareMode,
          beginAtZero: true,
          ticks: { color: tc.ticks, font: { family: 'JetBrains Mono', size: 11 } },
          grid: { color: tc.grid },
          border: { color: tc.border }
        },
        y1: {
          position: 'right',
          stacked: isCompareMode,
          beginAtZero: true,
          ticks: { color: tc.ticks, font: { family: 'JetBrains Mono', size: 11 } },
          grid: { drawOnChartArea: false, color: tc.grid },
          border: { color: tc.border },
          afterDataLimits: (scale) => {
            const y = scale.chart.scales.y;
            if (y) {
              scale.min = y.min;
              scale.max = y.max;
            }
          },
          afterBuildTicks: (scale) => {
            const y = scale.chart.scales.y;
            if (y && y.ticks && y.ticks.length > 0) {
              scale.ticks = y.ticks.map(t => ({ ...t }));
            }
          }
        }
      }
    }
  });
}

function renderDailyChart(selectedState, isCompareMode) {
  const dateKeys = appData.dates || [];
  const ctxDaily = document.getElementById('dailyTrendChart').getContext('2d');

  if (dailyChart) dailyChart.destroy();

  let datasets = [];

  if (isCompareMode) {
    // Multi-line chart for selected states
    const states = appData.latest.states
      .map(s => s.state)
      .filter(st => selectedComparisonStates.has(st));

    datasets = states.map(st => {
      const color = STATE_COLORS[st] || '#EF4444';
      const data = dateKeys.map(dt => appData.daily_matrix[dt]?.[st] || 0);
      return {
        label: st,
        data: data,
        borderColor: color,
        backgroundColor: color,
        borderWidth: 2.5,
        pointRadius: 4,
        tension: 0.3,
        fill: false
      };
    });
  } else {
    // Single total or single state line/area chart
    const values = dateKeys.map(dt => {
      const dayObj = appData.daily_matrix[dt] || {};
      if (selectedState === 'MALAYSIA') {
        return dayObj['MALAYSIA'] !== undefined ? dayObj['MALAYSIA'] : 0;
      }
      return dayObj[selectedState] || 0;
    });

    datasets = [{
      label: selectedState === 'MALAYSIA' ? 'Jumlah Kes Harian (Malaysia)' : `Kes Harian (${selectedState})`,
      data: values,
      borderColor: '#EF4444',
      backgroundColor: 'rgba(239, 68, 68, 0.15)',
      borderWidth: 2.5,
      fill: true,
      tension: 0.35,
      pointBackgroundColor: '#EF4444',
      pointRadius: 5,
    }];
  }

  const tc = getChartThemeColors();

  dailyChart = new Chart(ctxDaily, {
    type: 'line',
    data: { labels: dateKeys, datasets: datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: isCompareMode,
          position: 'top',
          labels: { color: tc.legend, boxWidth: 12, font: { family: 'Plus Jakarta Sans', size: 11 } }
        },
        tooltip: {
          backgroundColor: tc.tooltipBg,
          titleColor: tc.tooltipTitle,
          bodyColor: tc.tooltipDailyBody,
          borderColor: tc.tooltipBorder,
          borderWidth: 1,
          padding: 10,
        }
      },
      scales: {
        x: {
          ticks: { color: tc.ticks, font: { family: 'Plus Jakarta Sans', size: 11 } },
          grid: { color: tc.grid },
          border: { color: tc.border }
        },
        y: {
          position: 'left',
          beginAtZero: true,
          ticks: { color: tc.ticks, font: { family: 'JetBrains Mono', size: 11 } },
          grid: { color: tc.grid },
          border: { color: tc.border }
        },
        y1: {
          position: 'right',
          beginAtZero: true,
          ticks: { color: tc.ticks, font: { family: 'JetBrains Mono', size: 11 } },
          grid: { drawOnChartArea: false, color: tc.grid },
          border: { color: tc.border },
          afterDataLimits: (scale) => {
            const y = scale.chart.scales.y;
            if (y) {
              scale.min = y.min;
              scale.max = y.max;
            }
          },
          afterBuildTicks: (scale) => {
            const y = scale.chart.scales.y;
            if (y && y.ticks && y.ticks.length > 0) {
              scale.ticks = y.ticks.map(t => ({ ...t }));
            }
          }
        }
      }
    }
  });
}

function renderStateComparisonChart() {
  if (typeof Chart === 'undefined' || !appData || !appData.latest) return;
  const ctx = document.getElementById('stateComparisonChart').getContext('2d');

  if (stateComparisonChart) stateComparisonChart.destroy();

  const isCum = (currentComparisonMetric === 'cumulative');
  const metricKey = isCum ? 'cumulative_cases' : 'daily_cases';

  // Filter to selected comparison states if in comparison mode and not all selected
  let statesToRender = [...appData.latest.states];
  if (currentGraphMode === 'comparison' && selectedComparisonStates && selectedComparisonStates.size > 0 && selectedComparisonStates.size < 15) {
    statesToRender = statesToRender.filter(s => selectedComparisonStates.has(s.state));
  }

  // Sort states descending by selected metric
  const sortedStates = statesToRender.sort((a, b) => b[metricKey] - a[metricKey]);

  const labels = sortedStates.map(s => s.state);
  const rawValues = sortedStates.map(s => s[metricKey]);
  const colors = sortedStates.map(s => STATE_COLORS[s.state] || '#06B6D4');

  const maxVal = Math.max(...rawValues, 100);
  const slider = document.getElementById('zoom-range-slider');
  if (slider) {
    slider.max = maxVal;
    if (currentComparisonZoom === 'all') {
      slider.value = maxVal;
    }
  }

  const isLog = (currentComparisonScale === 'logarithmic');
  const isZoomed = (currentComparisonZoom !== 'all');
  const zoomMax = isZoomed ? Number(currentComparisonZoom) : maxVal;

  const tc = getChartThemeColors();

  // Configure X Scale
  let xScaleConfig = {
    grid: { color: tc.grid },
    border: { color: tc.border }
  };

  if (isLog) {
    // Logarithmic scale with custom marks (10, 50, 100, 200, 400, 1000, 2500, 5000, 10000, 30000)
    xScaleConfig.type = 'logarithmic';
    xScaleConfig.min = 1;
    if (isZoomed) {
      xScaleConfig.max = zoomMax;
    }
    const logTickValues = [10, 50, 100, 200, 400, 1000, 2500, 5000, 10000, 20000, 30000]
      .filter(v => v <= (isZoomed ? zoomMax * 1.05 : maxVal * 1.5));

    xScaleConfig.afterBuildTicks = (scale) => {
      scale.ticks = logTickValues.map(v => ({
        value: v,
        label: v >= 1000 ? `${v / 1000}k` : String(v)
      }));
    };
    xScaleConfig.ticks = {
      color: tc.ticks,
      font: { family: 'JetBrains Mono', size: 11 },
      callback: function(value) {
        return value >= 1000 ? `${value / 1000}k` : value;
      }
    };
  } else {
    // Normal Linear scale (with zoom/truncation support)
    xScaleConfig.type = 'linear';
    xScaleConfig.beginAtZero = true;
    xScaleConfig.min = 0;
    if (isZoomed) {
      xScaleConfig.max = zoomMax;
    }
    xScaleConfig.ticks = {
      color: tc.ticks,
      font: { family: 'JetBrains Mono', size: 11 },
      callback: function(value) {
        return Number(value).toLocaleString();
      }
    };
  }

  stateComparisonChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: isCum ? 'Jumlah Kes Terkumpul (YTD)' : 'Jumlah Kes Harian Terkini',
        data: rawValues,
        backgroundColor: colors.map(c => c + 'CC'),
        borderColor: colors,
        borderWidth: 1.5,
        borderRadius: 4,
        clip: true // Cleanly truncate/cut off bar lengths at the max zoom boundary
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: tc.tooltipBg,
          titleColor: tc.tooltipTitle,
          bodyColor: tc.tooltipBody,
          borderColor: tc.tooltipBorder,
          borderWidth: 1,
          padding: 10,
          callbacks: {
            label: function(context) {
              const totalVal = isCum ? appData.latest.total.cumulative_cases : appData.latest.total.daily_cases;
              const actualVal = rawValues[context.dataIndex];
              const pct = totalVal > 0 ? ((actualVal / totalVal) * 100).toFixed(2) : 0;

              if (isZoomed && actualVal > zoomMax) {
                return [
                  `${Number(actualVal).toLocaleString()} kes (${pct}% dari Malaysia)`,
                  `✂️ Melebihi had zoom (Terpotong pada ${Number(zoomMax).toLocaleString()})`
                ];
              }
              return `${Number(actualVal).toLocaleString()} kes (${pct}% dari Malaysia)`;
            }
          }
        }
      },
      scales: {
        x: xScaleConfig,
        y: {
          ticks: { color: tc.stateTicks, font: { family: 'Plus Jakarta Sans', size: 11, weight: '600' } },
          grid: { display: false },
          border: { color: tc.border }
        }
      }
    }
  });
}

function setupEventListeners() {
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
      const newTheme = currentTheme === 'light' ? 'dark' : 'light';
      setTheme(newTheme, true);
    });
  }

  const select = document.getElementById('state-filter-select');
  if (select) {
    select.addEventListener('change', (e) => {
      updateCharts(e.target.value);
    });
  }

  const searchInput = document.getElementById('table-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentSearch = e.target.value;
      renderTable();
    });
  }

  const btnCsv = document.getElementById('btn-export-csv');
  if (btnCsv) {
    btnCsv.addEventListener('click', () => {
      window.location.href = 'data/latest.csv';
    });
  }

  const btnJson = document.getElementById('btn-export-json');
  if (btnJson) {
    btnJson.addEventListener('click', () => {
      window.location.href = 'data/latest.json';
    });
  }
}
