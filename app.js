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
let currentComparisonMetric = 'cumulative'; // 'cumulative' | 'daily' | 'ir'
let currentComparisonScale = 'linear'; // 'linear' | 'logarithmic'
let currentComparisonZoom = 'all'; // 'all' | number (e.g. 500, 1500, 5000, 12000)
let currentLang = 'ms'; // 'ms' | 'en'
let selectedComparisonStates = new Set(); // Multi-state selection for comparison mode
let weeklyChart = null;
let dailyChart = null;
let stateComparisonChart = null;

// Official Population Data (DOSM / KKM Demographic Baseline Estimates)
const STATE_POPULATION = {
  'SELANGOR': 7214000,
  'JOHOR': 4101000,
  'SABAH': 3594000,
  'PERAK': 2544000,
  'SARAWAK': 2509000,
  'KEDAH': 2194000,
  'KELANTAN': 1860000,
  'WILAYAH PERSEKUTUAN': 2088000,
  'PULAU PINANG': 1774000,
  'PAHANG': 1632000,
  'NEGERI SEMBILAN': 1222000,
  'TERENGGANU': 1211000,
  'MELAKA': 1032000,
  'PERLIS': 293000,
  'WILAYAH PERSEKUTUAN LABUAN': 100000,
  'MALAYSIA': 33568000
};

function getIncidenceRate(cases, stateName) {
  const pop = STATE_POPULATION[stateName] || 1;
  return (cases / pop) * 100000;
}

// Translations Dictionary (Bahasa Melayu & English)
const TRANSLATIONS = {
  ms: {
    live_badge: 'PENGAWASAN LANGSUNG',
    source_link: 'Sumber: iDengue (MYSA / CPRC KKM) ↗',
    main_title: 'Malaysia Dengue Count Dashboard',
    subtitle: 'Bilangan Kes Harian & Mingguan Mengikut Minggu Epidemiologi (ME)',
    header_note: 'Halaman Rasmi iDengue hanya melaporkan jumlah kes harian dan kumulatif. Halaman ini mengambil data yang dilaporkan oleh iDengue, dan memetakan tren kes harian.',
    hdr_report_date_lbl: 'TARIKH LAPORAN IDENGUE',
    hdr_epid_week_lbl: 'MINGGU EPIDEMIOLOGI',
    hdr_last_updated_lbl: 'KEMASKINI TERAKHIR (WORKFLOW)',
    hdr_cum_prefix: 'Kumulatif:',
    hdr_cum_to: 'hingga',
    hdr_epid_prefix: 'Takwim ME:',
    hdr_last_updated_time_sub: 'Waktu Malaysia (MYT / UTC+8)',
    kpi_daily_title: 'KES HARIAN (MALAYSIA)',
    kpi_daily_badge: 'Hari Ini',
    kpi_daily_desc: 'Jumlah kes baharu dilaporkan',
    kpi_cum_title: 'JUMLAH KES TERKUMPUL',
    kpi_cum_sub: 'Dari 4 Jan 2026',
    kpi_top_title: 'NEGERI TERTINGGI (KUMULATIF)',
    kpi_top_pct_suffix: 'daripada jumlah Malaysia',
    kpi_ir_title: 'KADAR INSIDEN KEBANGSAAN',
    kpi_ir_badge: 'Per 100k',
    kpi_ir_desc: 'kes per 100k penduduk (YTD) • <a href="https://open.dosm.gov.my/" target="_blank" rel="noopener noreferrer" class="source-link">Sumber: DOSM ↗</a>',
    controls_title: '📊 Dashboard Interaktif Denggi Kebangsaan & Negeri',
    btn_download_csv: '📥 Muat Turun CSV',
    btn_download_json: '📦 Muat Turun JSON',
    btn_print: '🖨️ Cetak / PDF',
    graph_mode_label: 'MOD GRAF:',
    mode_total_btn: 'Jumlah Keseluruhan (Total)',
    mode_compare_btn: 'Perbandingan Antara Negeri (State Comparison)',
    single_state_lbl: 'Penapis Negeri Tunggal:',
    all_states_opt: 'Semua Negeri (MALAYSIA)',
    multi_state_heading: 'PILIH NEGERI UNTUK DIBANDINGKAN (MULTI-SELECTION):',
    multi_state_sub: 'Klik mana-mana negeri di bawah untuk memilih negeri yang ingin dibandingkan dalam graf dan carta ranking.',
    selected_states_suffix: 'daripada 15 Negeri Dipilih',
    quick_presets_lbl: 'Pilihan Pantas:',
    preset_top3: 'Top 3',
    preset_top5: 'Top 5',
    preset_bot3: 'Bottom 3',
    preset_bot5: 'Bottom 5',
    preset_all: 'Pilih Semua (15)',
    preset_reset: 'Reset (1)',
    weekly_title_total: 'Jumlah Keseluruhan Mingguan (Malaysia)',
    weekly_title_state: 'Trend Mingguan ({state})',
    weekly_title_compare: 'Trend Mingguan Mengikut {count} Negeri Pilihan',
    weekly_subtitle: 'Jumlah kes denggi mingguan berdasarkan Takwim Minggu Epid Malaysia',
    daily_title_total: 'Jumlah Keseluruhan Harian (Malaysia)',
    daily_title_state: 'Trend Harian ({state})',
    daily_title_compare: 'Trend Harian Mengikut {count} Negeri Pilihan',
    daily_subtitle: 'Pergerakan kes denggi harian dari tarikh ke tarikh',
    state_chart_title: 'Perbandingan Kes Antara 15 Negeri di Malaysia',
    state_chart_subtitle: 'Perbandingan langsung beban kes denggi mengikut setiap negeri (disusun mengikut jumlah kes)',
    metric_cum: 'Kes Terkumpul',
    metric_daily: 'Kes Harian',
    metric_ir: 'Kadar Insiden (100k)',
    scale_linear: 'Skala Normal',
    scale_log: 'Skala Log (10, 100...)',
    zoom_label: '🔍 Kawalan Zoom (Truncate X-Axis):',
    zoom_all: 'Semua (0 - Maks)',
    zoom_max_lbl: 'Had Maks:',
    zoom_reset: 'Reset',
    table_badge: 'JADUAL UTAMA',
    table_title: 'Maklumat Denggi Terkini Mengikut Negeri',
    table_subtitle: 'Disusun mengikut <strong>Jumlah Kes Terkumpul (Urutan Menurun / Highest on Top)</strong>',
    search_placeholder: 'Cari negeri (cth: Perak, Selangor)...',
    th_rank: '#',
    th_state: 'NEGERI',
    th_daily: 'KES HARIAN PADA {date}',
    th_cum: 'JUMLAH KES TERKUMPUL',
    th_ir: 'KADAR INSIDEN (PER 100K)',
    th_share: '% SUMBANGAN',
    th_burden: 'BEBAN KES',
    total_row_label: 'MALAYSIA (JUMLAH KESELURUHAN)',
    table_source_note: '* Sumber Kes: Bilik Gerakan Denggi Kebangsaan CPRC, Kementerian Kesihatan Malaysia (KKM) melalui portal iDengue MYSA.',
    table_pop_source_note: '* Sumber Anggaran Penduduk (Kadar Insiden): Jabatan Perangkaan Malaysia (DOSM) - <a href="https://open.dosm.gov.my/" target="_blank" rel="noopener noreferrer" class="source-link">OpenDOSM / Anggaran Penduduk Mengikut Negeri ↗</a>.',
    table_auto_update_note: 'Auto-ingestion terakhir dijalankan pada: {date} (MYT).',
    footer_tagline: 'Automated Daily Ingestion & Epidemiological Pipeline',
    footer_repo: 'Public Data Repository:'
  },
  en: {
    live_badge: 'LIVE SURVEILLANCE',
    source_link: 'Source: iDengue (MYSA / CPRC MOH) ↗',
    main_title: 'Malaysia Dengue Count Dashboard',
    subtitle: 'Daily & Weekly Dengue Cases by Epidemiological Week (EW)',
    header_note: 'The official iDengue portal only reports daily and cumulative cases. This platform automatically ingests reported iDengue data and visualizes daily trends.',
    hdr_report_date_lbl: 'IDENGUE REPORT DATE',
    hdr_epid_week_lbl: 'EPIDEMIOLOGICAL WEEK',
    hdr_last_updated_lbl: 'LAST UPDATED (WORKFLOW)',
    hdr_cum_prefix: 'Cumulative:',
    hdr_cum_to: 'to',
    hdr_epid_prefix: 'EW Calendar:',
    hdr_last_updated_time_sub: 'Malaysia Time (MYT / UTC+8)',
    kpi_daily_title: 'DAILY CASES (MALAYSIA)',
    kpi_daily_badge: 'Today',
    kpi_daily_desc: 'New cases reported today',
    kpi_cum_title: 'CUMULATIVE CASES',
    kpi_cum_sub: 'Since 4 Jan 2026',
    kpi_top_title: 'HIGHEST BURDEN STATE',
    kpi_top_pct_suffix: 'of national total',
    kpi_ir_title: 'NATIONAL INCIDENCE RATE',
    kpi_ir_badge: 'Per 100k',
    kpi_ir_desc: 'cases per 100k population (YTD) • <a href="https://open.dosm.gov.my/" target="_blank" rel="noopener noreferrer" class="source-link">Source: DOSM ↗</a>',
    controls_title: '📊 Interactive National & State Dengue Surveillance',
    btn_download_csv: '📥 Download CSV',
    btn_download_json: '📦 Download JSON',
    btn_print: '🖨️ Print / PDF',
    graph_mode_label: 'GRAPH MODE:',
    mode_total_btn: 'National Total',
    mode_compare_btn: 'State-by-State Comparison',
    single_state_lbl: 'Single State Filter:',
    all_states_opt: 'All States (MALAYSIA)',
    multi_state_heading: 'SELECT STATES TO COMPARE (MULTI-SELECTION):',
    multi_state_sub: 'Click any state chip below to include or exclude states in the comparison charts and ranking.',
    selected_states_suffix: 'of 15 States Selected',
    quick_presets_lbl: 'Quick Presets:',
    preset_top3: 'Top 3',
    preset_top5: 'Top 5',
    preset_bot3: 'Bottom 3',
    preset_bot5: 'Bottom 5',
    preset_all: 'Select All (15)',
    preset_reset: 'Reset (1)',
    weekly_title_total: 'Weekly Total Cases (Malaysia)',
    weekly_title_state: 'Weekly Trend ({state})',
    weekly_title_compare: 'Weekly Trend Across {count} Selected States',
    weekly_subtitle: 'Weekly dengue case counts aligned with Malaysia Epidemiological Calendar',
    daily_title_total: 'Daily Total Cases (Malaysia)',
    daily_title_state: 'Daily Trend ({state})',
    daily_title_compare: 'Daily Trend Across {count} Selected States',
    daily_subtitle: 'Daily case trajectory over time',
    state_chart_title: 'Dengue Case Comparison Across 15 Malaysian States',
    state_chart_subtitle: 'Direct state burden comparison (sorted by total cases)',
    metric_cum: 'Cumulative Cases',
    metric_daily: 'Daily Cases',
    metric_ir: 'Incidence Rate (100k)',
    scale_linear: 'Normal Scale',
    scale_log: 'Log Scale (10, 100...)',
    zoom_label: '🔍 Zoom Controls (Truncate X-Axis):',
    zoom_all: 'All (0 - Max)',
    zoom_max_lbl: 'Max Limit:',
    zoom_reset: 'Reset',
    table_badge: 'MAIN SURVEILLANCE TABLE',
    table_title: 'Latest State-Level Dengue Surveillance Data',
    table_subtitle: 'Sorted by <strong>Cumulative Cases (Descending / Highest on Top)</strong>',
    search_placeholder: 'Search state (e.g. Perak, Selangor)...',
    th_rank: '#',
    th_state: 'STATE',
    th_daily: 'DAILY CASES ON {date}',
    th_cum: 'CUMULATIVE CASES',
    th_ir: 'INCIDENCE RATE (PER 100K)',
    th_share: '% SHARE',
    th_burden: 'CASE BURDEN',
    total_row_label: 'MALAYSIA (NATIONAL TOTAL)',
    table_source_note: '* Case Data Source: National CPRC Dengue Operations Room, Ministry of Health Malaysia (MOH) via MYSA iDengue portal.',
    table_pop_source_note: '* Population Baseline Data (Incidence Rate): Department of Statistics Malaysia (DOSM) - <a href="https://open.dosm.gov.my/" target="_blank" rel="noopener noreferrer" class="source-link">OpenDOSM / State Population Estimates ↗</a>.',
    table_auto_update_note: 'Last automated ingestion run: {date} (MYT).',
    footer_tagline: 'Automated Daily Ingestion & Epidemiological Pipeline',
    footer_repo: 'Public Data Repository:'
  }
};

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
  initLanguage();
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

function initLanguage() {
  const savedLang = localStorage.getItem('idengue_lang') || 'ms';
  setLanguage(savedLang, false);
}

function setLanguage(lang, reRender = true) {
  currentLang = lang;
  document.documentElement.setAttribute('data-lang', lang);
  localStorage.setItem('idengue_lang', lang);

  const msOpt = document.getElementById('lang-opt-ms');
  const enOpt = document.getElementById('lang-opt-en');
  if (msOpt && enOpt) {
    msOpt.classList.toggle('active', lang === 'ms');
    enOpt.classList.toggle('active', lang === 'en');
  }

  applyStaticTranslations();

  if (reRender && appData && appData.latest) {
    renderHeader();
    renderKPIs();
    renderStateChips();
    renderTable();
    const selectedState = document.getElementById('state-filter-select')?.value || 'MALAYSIA';
    updateCharts(selectedState);
    renderStateComparisonChart();
  }
}

function applyStaticTranslations() {
  const t = TRANSLATIONS[currentLang] || TRANSLATIONS.ms;

  const setTxt = (id, txt) => {
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
  };
  const setHtml = (id, html) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
  };

  setTxt('lbl-live-badge', t.live_badge);
  setTxt('lbl-source-link', t.source_link);
  setTxt('lbl-main-title', t.main_title);
  setTxt('lbl-subtitle', t.subtitle);
  setTxt('lbl-header-note', t.header_note);
  setTxt('lbl-hdr-report-date', t.hdr_report_date_lbl);
  setTxt('lbl-hdr-epid-week', t.hdr_epid_week_lbl);
  setTxt('lbl-hdr-last-updated', t.hdr_last_updated_lbl);

  setTxt('lbl-kpi-daily-title', t.kpi_daily_title);
  setTxt('kpi-daily-badge', t.kpi_daily_badge);
  setTxt('lbl-kpi-daily-desc', t.kpi_daily_desc);
  setTxt('lbl-kpi-cum-title', t.kpi_cum_title);
  setTxt('lbl-kpi-top-title', t.kpi_top_title);
  setTxt('lbl-kpi-ir-title', t.kpi_ir_title);
  setTxt('kpi-ir-badge', t.kpi_ir_badge);
  setHtml('lbl-kpi-ir-desc', t.kpi_ir_desc);

  setTxt('lbl-controls-title', t.controls_title);
  setTxt('lbl-btn-csv', t.btn_download_csv);
  setTxt('lbl-btn-json', t.btn_download_json);
  setTxt('lbl-btn-print', t.btn_print);

  setTxt('lbl-graph-mode', t.graph_mode_label);
  setTxt('lbl-mode-total', t.mode_total_btn);
  setTxt('lbl-mode-compare', t.mode_compare_btn);
  setTxt('lbl-single-state', t.single_state_lbl);

  setTxt('lbl-multi-state-heading', t.multi_state_heading);
  setTxt('lbl-multi-state-sub', t.multi_state_sub);
  setTxt('lbl-quick-presets', t.quick_presets_lbl);
  setTxt('btn-preset-top3', t.preset_top3);
  setTxt('btn-preset-top5', t.preset_top5);
  setTxt('btn-preset-bot3', t.preset_bot3);
  setTxt('btn-preset-bot5', t.preset_bot5);
  setTxt('btn-preset-all', t.preset_all);
  setTxt('btn-preset-clear', t.preset_reset);

  setTxt('lbl-state-chart-title', t.state_chart_title);
  setTxt('lbl-state-chart-subtitle', t.state_chart_subtitle);
  setTxt('btn-metric-cum', t.metric_cum);
  setTxt('btn-metric-daily', t.metric_daily);
  setTxt('btn-metric-ir', t.metric_ir);
  setTxt('btn-scale-linear', t.scale_linear);
  setTxt('btn-scale-log', t.scale_log);
  setTxt('lbl-zoom-heading', t.zoom_label);
  setTxt('btn-zoom-all', t.zoom_all);
  setTxt('lbl-zoom-max', t.zoom_max_lbl);
  setTxt('btn-zoom-reset', t.zoom_reset);

  setTxt('lbl-table-badge', t.table_badge);
  setTxt('lbl-table-title', t.table_title);
  setHtml('lbl-table-subtitle', t.table_subtitle);
  const searchInput = document.getElementById('table-search');
  if (searchInput) searchInput.placeholder = t.search_placeholder;

  setTxt('th-col-state', t.th_state);
  setTxt('th-col-cum', t.th_cum);
  setTxt('th-col-ir', t.th_ir);
  setTxt('th-col-share', t.th_share);
  setTxt('th-col-burden', t.th_burden);
  setTxt('tf-total-label', t.total_row_label);
  setHtml('lbl-table-source-note', t.table_source_note);
  setHtml('lbl-table-pop-source-note', t.table_pop_source_note);
  setTxt('lbl-footer-tagline', t.footer_tagline);
  setTxt('lbl-footer-repo', t.footer_repo);
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
  const t = TRANSLATIONS[currentLang] || TRANSLATIONS.ms;

  document.getElementById('hdr-report-date').textContent = lat.report_date_raw || lat.report_date;
  document.getElementById('hdr-cum-period').textContent = `${t.hdr_cum_prefix} ${lat.cumulative_start_raw || lat.cumulative_start_date} ${t.hdr_cum_to} ${lat.cumulative_end_raw || lat.cumulative_end_date}`;
  document.getElementById('hdr-epid-week').textContent = lat.epid_week_label || `ME ${lat.epid_week}/${lat.epid_year}`;
  document.getElementById('hdr-epid-dates').textContent = `${t.hdr_epid_prefix} ${lat.epid_week_start} ${t.hdr_cum_to} ${lat.epid_week_end}`;
  const thReportDate = document.getElementById('th-report-date');
  if (thReportDate) thReportDate.textContent = lat.report_date_raw || lat.report_date;

  const thDaily = document.getElementById('th-col-daily');
  if (thDaily) {
    thDaily.textContent = t.th_daily.replace('{date}', lat.report_date_raw || lat.report_date);
  }

  if (lat.scraped_at) {
    let dateStr = String(lat.scraped_at).trim();
    if (!dateStr.includes('Z') && !dateStr.includes('+') && !dateStr.slice(10).includes('-')) {
      dateStr += 'Z';
    }
    const dt = new Date(dateStr);

    const dateFormatted = dt.toLocaleDateString(currentLang === 'en' ? 'en-MY' : 'ms-MY', {
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
    if (timeElem) timeElem.textContent = t.hdr_last_updated_time_sub;

    const noteElem = document.getElementById('scraped-timestamp-note');
    if (noteElem) noteElem.textContent = t.table_auto_update_note.replace('{date}', `${fullFormatted} (MYT)`);
  }
}

function renderKPIs() {
  if (!appData || !appData.latest) return;
  const lat = appData.latest;
  const total = lat.total;
  const t = TRANSLATIONS[currentLang] || TRANSLATIONS.ms;

  document.getElementById('kpi-daily-total').textContent = Number(total.daily_cases).toLocaleString();
  document.getElementById('kpi-cum-total').textContent = Number(total.cumulative_cases).toLocaleString();
  document.getElementById('kpi-cum-sub').textContent = `${currentLang === 'en' ? 'Since' : 'Dari'} ${lat.cumulative_start_raw || '4 Jan 2026'}`;

  const sortedByCum = [...lat.states].sort((a, b) => b.cumulative_cases - a.cumulative_cases);
  const top = sortedByCum[0];
  if (top) {
    const pct = ((top.cumulative_cases / total.cumulative_cases) * 100).toFixed(1);
    document.getElementById('kpi-top-state').textContent = top.state;
    document.getElementById('kpi-top-cases').textContent = `${Number(top.cumulative_cases).toLocaleString()} kes`;
    document.getElementById('kpi-top-percent').textContent = `${pct}% ${t.kpi_top_pct_suffix}`;
  }

  // National Incidence Rate (per 100k)
  const nationalIR = getIncidenceRate(total.cumulative_cases, 'MALAYSIA');
  const nationalIRElem = document.getElementById('kpi-national-ir');
  if (nationalIRElem) {
    nationalIRElem.textContent = nationalIR.toFixed(1);
  }
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
    let vA = currentSort.column === 'cum' ? a.cumulative_cases :
             currentSort.column === 'daily' ? a.daily_cases :
             currentSort.column === 'ir' ? getIncidenceRate(a.cumulative_cases, a.state) : a.state;
    let vB = currentSort.column === 'cum' ? b.cumulative_cases :
             currentSort.column === 'daily' ? b.daily_cases :
             currentSort.column === 'ir' ? getIncidenceRate(b.cumulative_cases, b.state) : b.state;

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
    const ir = getIncidenceRate(row.cumulative_cases, row.state);

    let irClass = ir >= 400 ? 'critical-ir' : ir >= 250 ? 'high-ir' : '';

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
      <td class="col-ir">
        <span class="ir-pill ${irClass}">${ir.toFixed(1)}</span>
      </td>
      <td class="col-share">${pct}%</td>
      <td class="col-bar">
        <div class="burden-bar-bg">
          <div class="burden-bar-fill" style="width: ${barWidth}%;"></div>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  const nationalIR = getIncidenceRate(lat.total.cumulative_cases, 'MALAYSIA');
  document.getElementById('tf-daily-total').innerHTML = `<strong>${Number(lat.total.daily_cases).toLocaleString()}</strong>`;
  document.getElementById('tf-cum-total').innerHTML = `<strong>${Number(lat.total.cumulative_cases).toLocaleString()}</strong>`;
  const tfIr = document.getElementById('tf-ir-total');
  if (tfIr) tfIr.innerHTML = `<strong>${nationalIR.toFixed(1)}</strong>`;
}

function sortTable(column) {
  if (currentSort.column === column) {
    currentSort.order = currentSort.order === 'asc' ? 'desc' : 'asc';
  } else {
    currentSort.column = column;
    currentSort.order = column === 'state' ? 'asc' : 'desc';
  }

  ['state', 'daily', 'cum', 'ir'].forEach(c => {
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
    const t = TRANSLATIONS[currentLang] || TRANSLATIONS.ms;
    countBadge.textContent = `${selectedComparisonStates.size} ${t.selected_states_suffix}`;
  }

  // Update active state on preset buttons
  const isTop3 = selectedComparisonStates.size === 3 && states.slice(0, 3).every(s => selectedComparisonStates.has(s.state));
  const isTop5 = selectedComparisonStates.size === 5 && states.slice(0, 5).every(s => selectedComparisonStates.has(s.state));
  const isBot3 = selectedComparisonStates.size === 3 && states.slice(-3).every(s => selectedComparisonStates.has(s.state));
  const isBot5 = selectedComparisonStates.size === 5 && states.slice(-5).every(s => selectedComparisonStates.has(s.state));
  const isAll = selectedComparisonStates.size === states.length;

  document.getElementById('btn-preset-top3')?.classList.toggle('active', isTop3);
  document.getElementById('btn-preset-top5')?.classList.toggle('active', isTop5);
  document.getElementById('btn-preset-bot3')?.classList.toggle('active', isBot3);
  document.getElementById('btn-preset-bot5')?.classList.toggle('active', isBot5);
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
  } else if (preset === 'bot3') {
    selectedComparisonStates = new Set(sorted.slice(-3).map(s => s.state));
  } else if (preset === 'bot5') {
    selectedComparisonStates = new Set(sorted.slice(-5).map(s => s.state));
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
  document.getElementById('btn-metric-ir').classList.toggle('active', metric === 'ir');
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
    if (display) display.textContent = currentLang === 'en' ? 'All (Max)' : 'Semua (Maks)';
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
    if (display) display.textContent = currentLang === 'en' ? 'All (Max)' : 'Semua (Maks)';
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
  const t = TRANSLATIONS[currentLang] || TRANSLATIONS.ms;

  // Update header badges and titles
  const weeklyTag = document.getElementById('weekly-chart-tag');
  const dailyTag = document.getElementById('daily-chart-tag');
  const weeklyTitle = document.getElementById('weekly-chart-title');
  const dailyTitle = document.getElementById('daily-chart-title');

  if (isCompareMode) {
    const count = selectedComparisonStates ? selectedComparisonStates.size : 0;
    const tagText = currentLang === 'en' ? `COMPARISON (${count} STATES)` : `PERBANDINGAN (${count} NEGERI)`;
    weeklyTag.textContent = tagText;
    dailyTag.textContent = tagText;
    weeklyTitle.textContent = t.weekly_title_compare.replace('{count}', count);
    dailyTitle.textContent = t.daily_title_compare.replace('{count}', count);
  } else {
    const totalTag = currentLang === 'en' ? 'NATIONAL TOTAL' : 'JUMLAH KESELURUHAN';
    weeklyTag.textContent = selectedState === 'MALAYSIA' ? totalTag : selectedState;
    dailyTag.textContent = selectedState === 'MALAYSIA' ? totalTag : selectedState;
    weeklyTitle.textContent = selectedState === 'MALAYSIA' ? t.weekly_title_total : t.weekly_title_state.replace('{state}', selectedState);
    dailyTitle.textContent = selectedState === 'MALAYSIA' ? t.daily_title_total : t.daily_title_state.replace('{state}', selectedState);
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
  const t = TRANSLATIONS[currentLang] || TRANSLATIONS.ms;

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
      label: selectedState === 'MALAYSIA' ? t.weekly_title_total : `${t.metric_cum} (${selectedState})`,
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
  const t = TRANSLATIONS[currentLang] || TRANSLATIONS.ms;

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
      label: selectedState === 'MALAYSIA' ? t.daily_title_total : `${t.metric_daily} (${selectedState})`,
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
  const t = TRANSLATIONS[currentLang] || TRANSLATIONS.ms;

  if (stateComparisonChart) stateComparisonChart.destroy();

  const isIR = (currentComparisonMetric === 'ir');
  const isCum = (currentComparisonMetric === 'cumulative');

  // Filter to selected comparison states if in comparison mode and not all selected
  let statesToRender = [...appData.latest.states];
  if (currentGraphMode === 'comparison' && selectedComparisonStates && selectedComparisonStates.size > 0 && selectedComparisonStates.size < 15) {
    statesToRender = statesToRender.filter(s => selectedComparisonStates.has(s.state));
  }

  // Sort states descending by selected metric
  const sortedStates = statesToRender.sort((a, b) => {
    if (isIR) {
      return getIncidenceRate(b.cumulative_cases, b.state) - getIncidenceRate(a.cumulative_cases, a.state);
    }
    if (isCum) {
      return b.cumulative_cases - a.cumulative_cases;
    }
    return b.daily_cases - a.daily_cases;
  });

  const labels = sortedStates.map(s => s.state);
  const rawValues = sortedStates.map(s => {
    if (isIR) {
      return Number(getIncidenceRate(s.cumulative_cases, s.state).toFixed(1));
    }
    return isCum ? s.cumulative_cases : s.daily_cases;
  });
  const colors = sortedStates.map(s => STATE_COLORS[s.state] || '#06B6D4');

  const maxVal = Math.max(...rawValues, 10);
  const slider = document.getElementById('zoom-range-slider');
  if (slider) {
    slider.max = Math.ceil(maxVal);
    if (currentComparisonZoom === 'all') {
      slider.value = Math.ceil(maxVal);
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
    // Logarithmic scale with custom marks
    xScaleConfig.type = 'logarithmic';
    xScaleConfig.min = isIR ? 1 : 1;
    if (isZoomed) {
      xScaleConfig.max = zoomMax;
    }
    const logTickValues = isIR
      ? [1, 5, 10, 25, 50, 100, 200, 400, 600, 1000]
      : [10, 50, 100, 200, 400, 1000, 2500, 5000, 10000, 20000, 30000];

    const filteredLogTicks = logTickValues.filter(v => v <= (isZoomed ? zoomMax * 1.05 : maxVal * 1.5));

    xScaleConfig.afterBuildTicks = (scale) => {
      scale.ticks = filteredLogTicks.map(v => ({
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
        return isIR ? Number(value).toFixed(0) : Number(value).toLocaleString();
      }
    };
  }

  const datasetLabel = isIR
    ? `${t.metric_ir} (${currentLang === 'en' ? 'cases per 100k population' : 'kes / 100k penduduk'})`
    : isCum
    ? (currentLang === 'en' ? 'Cumulative Cases (YTD)' : 'Jumlah Kes Terkumpul (YTD)')
    : (currentLang === 'en' ? 'Daily Cases' : 'Jumlah Kes Harian Terkini');

  stateComparisonChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: datasetLabel,
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
              const actualVal = rawValues[context.dataIndex];
              const stateName = sortedStates[context.dataIndex].state;

              if (isIR) {
                const cumCases = sortedStates[context.dataIndex].cumulative_cases;
                const pop = STATE_POPULATION[stateName] || 1;
                const lines = [
                  `${actualVal} ${currentLang === 'en' ? 'cases / 100k population' : 'kes per 100k penduduk'}`,
                  `(${Number(cumCases).toLocaleString()} ${currentLang === 'en' ? 'cases' : 'kes'} / ${Number(pop).toLocaleString()} ${currentLang === 'en' ? 'pop.' : 'penduduk'})`
                ];
                if (isZoomed && actualVal > zoomMax) {
                  lines.push(`✂️ ${currentLang === 'en' ? `Truncated at ${zoomMax}` : `Terpotong pada ${zoomMax}`}`);
                }
                return lines;
              }

              const totalVal = isCum ? appData.latest.total.cumulative_cases : appData.latest.total.daily_cases;
              const pct = totalVal > 0 ? ((actualVal / totalVal) * 100).toFixed(2) : 0;

              if (isZoomed && actualVal > zoomMax) {
                return [
                  `${Number(actualVal).toLocaleString()} ${currentLang === 'en' ? 'cases' : 'kes'} (${pct}% ${currentLang === 'en' ? 'of Malaysia' : 'dari Malaysia'})`,
                  `✂️ ${currentLang === 'en' ? `Exceeds zoom limit (Truncated at ${Number(zoomMax).toLocaleString()})` : `Melebihi had zoom (Terpotong pada ${Number(zoomMax).toLocaleString()})`}`
                ];
              }
              return `${Number(actualVal).toLocaleString()} ${currentLang === 'en' ? 'cases' : 'kes'} (${pct}% ${currentLang === 'en' ? 'of Malaysia' : 'dari Malaysia'})`;
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

  const langToggleBtn = document.getElementById('lang-toggle-btn');
  if (langToggleBtn) {
    langToggleBtn.addEventListener('click', () => {
      const newLang = currentLang === 'ms' ? 'en' : 'ms';
      setLanguage(newLang, true);
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
