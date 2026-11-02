/**
 * iDengue Surveillance Dashboard - Interactive Logic
 * Features:
 * - Malaysia Total Mode vs State-by-State Comparison Mode
 * - Epidemiological Weekly Trend & Daily Trend
 * - Full 15-State Comparison Ranking Chart (Daily & Cumulative)
 * - Main Table Sorted by Cumulative Descending
 */

let appData = null;
let selectedTableDate = null;
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
let dailyMovingAvgChart = null;
let currentDailyMARange = '7proj'; // '7proj' | 30 | 'all'
let currentDailyMAMode = 'combo'; // 'combo' | 'line'
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
    hdr_last_available_lbl: 'DATA TERAKHIR IDENGUE TERSEDIA',
    hdr_available_status_latest: 'Status: Data Rasmi Terkini',
    hdr_available_status_lag: 'Status: Tertunda {days} hari (belum dikemaskini)',
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
    preset_perak: 'Perak (±2)',
    preset_bot3: 'Bottom 3',
    preset_bot5: 'Bottom 5',
    preset_all: 'Pilih Semua (15)',
    preset_reset: 'Reset (1)',
    weekly_title_total: 'Jumlah Keseluruhan Mingguan (Malaysia)',
    weekly_title_state: 'Trend Mingguan ({state})',
    weekly_title_compare: 'Trend Mingguan Mengikut {count} Negeri Pilihan',
    weekly_subtitle: 'Jumlah kes denggi mingguan berdasarkan Takwim Minggu Epid Malaysia',
    weekly_panel_note: '* Jumlah kes mingguan diselaraskan dengan Takwim Minggu Epidemiologi rasmi CPRC KKM (Ahad – Sabtu).',
    daily_panel_note: '* Trajektori kes harian dilaporkan iDengue sepanjang sela 14 hari kalendar terkini.',
    daily_title_total: 'Jumlah Keseluruhan Harian (Malaysia)',
    daily_title_state: 'Trend Harian ({state})',
    daily_title_compare: 'Trend Harian Mengikut {count} Negeri Pilihan',
    daily_subtitle: 'Pergerakan kes denggi harian dari tarikh ke tarikh',
    daily_ma_title_total: 'Trend Purata Bergerak 14 Hari & Unjuran 7 Hari (Malaysia)',
    daily_ma_title_state: 'Trend Purata Bergerak 14 Hari & Unjuran 7 Hari ({state})',
    daily_ma_title_compare: 'Unjuran Purata Bergerak 14 Hari Mengikut {count} Negeri Pilihan',
    daily_ma_subtitle: '7 hari sebelum berserta unjuran trajektori purata 14 hari (berasaskan tren 28 hari)',
    daily_ma_note: '* Purata bergerak 14 hari (7 hari sebelum) berserta unjuran trajektori 7 hari berasaskan tren data 28 hari.',
    daily_ma_legend_daily: 'Kes Harian (Sebenar)',
    daily_ma_legend_daily_proj: 'Unjuran Kes Harian',
    daily_ma_legend_ma: 'Purata 14 Hari (Sebenar)',
    daily_ma_legend_ma_proj: 'Unjuran Purata 14 Hari',
    btn_range_7proj: '7H + 7H Unjuran',
    btn_range_30: '30 Hari',
    btn_range_all: 'Semua',
    btn_mode_combo: 'Bar + Purata',
    btn_mode_line: 'Garis + Purata',
    na_panel_title: 'Tarikh N/A (Tiada Buletin)',
    na_panel_subtitle: 'Buletin rasmi tidak diterbitkan iDengue',
    na_badge_dates: '{count} Tarikh N/A',
    na_retro_tag: 'Retrospektif',
    na_view_table: 'Lihat Jadual ↗',
    na_cases_count: '{count} kes',
    na_panel_note: '* Buletin rasmi iDengue tidak diterbitkan bagi tarikh-tarikh ini. Nilai dijana secara retrospektif daripada perbezaan kes kumulatif.',
    na_empty_msg: 'Tiada tarikh N/A dikesan.',
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
    table_date_label: '📅 Tarikh Laporan:',
    table_date_prev: 'Hari Sebelumnya (A day before)',
    table_date_next: 'Hari Selepasnya (A day after)',
    table_date_latest_tag: '(Terkini)',
    table_title: 'Maklumat Denggi Mengikut Negeri',
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
    hdr_last_available_lbl: 'LAST AVAILABLE DATA IDENGUE',
    hdr_available_status_latest: 'Status: Latest Official Data',
    hdr_available_status_lag: 'Status: Delayed by {days} days (not updated yet)',
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
    preset_perak: 'Perak (±2)',
    preset_bot3: 'Bottom 3',
    preset_bot5: 'Bottom 5',
    preset_all: 'Select All (15)',
    preset_reset: 'Reset (1)',
    weekly_title_total: 'Weekly Total Cases (Malaysia)',
    weekly_title_state: 'Weekly Trend ({state})',
    weekly_title_compare: 'Weekly Trend Across {count} Selected States',
    weekly_subtitle: 'Weekly dengue case counts aligned with Malaysia Epidemiological Calendar',
    weekly_panel_note: '* Weekly cases aggregated by official MOH CPRC Epidemiological Weeks (Sunday – Saturday).',
    daily_panel_note: '* Trajectory of daily cases reported by iDengue over the latest 14 calendar days.',
    daily_title_total: 'Daily Total Cases (Malaysia)',
    daily_title_state: 'Daily Trend ({state})',
    daily_title_compare: 'Daily Trend Across {count} Selected States',
    daily_subtitle: 'Daily case trajectory over time',
    daily_ma_title_total: '14-Day Moving Average & 7-Day Projection (Malaysia Total)',
    daily_ma_title_state: '14-Day Moving Average & 7-Day Projection ({state})',
    daily_ma_title_compare: '14-Day Moving Average & 7-Day Projection Across {count} Selected States',
    daily_ma_subtitle: '7 days before with 7-day projected trajectory for 14-day MA (based on 28-day baseline)',
    daily_ma_note: '* 14-day moving average (7 days before) with 7-day forward trajectory calculated from 28-day baseline data.',
    daily_ma_legend_daily: 'Daily Cases (Observed)',
    daily_ma_legend_daily_proj: 'Projected Daily Cases',
    daily_ma_legend_ma: '14-Day MA (Observed)',
    daily_ma_legend_ma_proj: 'Projected 14-Day MA',
    btn_range_7proj: '7D + 7D Proj',
    btn_range_30: '30 Days',
    btn_range_all: 'All',
    btn_mode_combo: 'Bar + MA',
    btn_mode_line: 'Line + MA',
    na_panel_title: 'N/A Dates (Unreleased)',
    na_panel_subtitle: 'Official iDengue bulletins unreleased for these dates',
    na_badge_dates: '{count} N/A Dates',
    na_retro_tag: 'Retrospective',
    na_view_table: 'View Table ↗',
    na_cases_count: '{count} cases',
    na_panel_note: '* Official iDengue bulletins were unreleased for these dates. Figures were calculated retrospectively from cumulative case deltas.',
    na_empty_msg: 'No N/A dates recorded.',
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
    table_date_label: '📅 Report Date:',
    table_date_prev: 'Previous Day (A day before)',
    table_date_next: 'Next Day (A day after)',
    table_date_latest_tag: '(Latest)',
    table_title: 'State-Level Dengue Surveillance Data',
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

// Vibrant, high-contrast palette for 15 states + Malaysia total
// Sequenced so adjacent rank states never share similar hues
const STATE_COLORS_LIGHT = {
  'SELANGOR': '#DC2626',                   // Vivid Crimson Red
  'WILAYAH PERSEKUTUAN': '#EA580C',        // Flame Orange
  'JOHOR': '#2563EB',                      // Royal Blue
  'NEGERI SEMBILAN': '#7C3AED',            // Deep Violet / Purple
  'SABAH': '#059669',                      // Forest Emerald Green
  'PERAK': '#0F172A',                      // Jet Black / Obsidian
  'KELANTAN': '#E11D48',                   // Vivid Rose / Ruby Red
  'PULAU PINANG': '#0284C7',               // Electric Sky Blue (distinct from Sabah green)
  'SARAWAK': '#D97706',                    // Warm Amber-Gold
  'PAHANG': '#C2410C',                     // Rust Orange
  'KEDAH': '#4F46E5',                      // Deep Indigo
  'MELAKA': '#C026D3',                     // Vibrant Magenta / Fuchsia
  'TERENGGANU': '#0D9488',                 // Dark Teal
  'PERLIS': '#475569',                     // Slate Steel
  'WILAYAH PERSEKUTUAN LABUAN': '#65A30D', // Olive-Lime
  'MALAYSIA': '#0284C7',
};

const STATE_COLORS_DARK = {
  'SELANGOR': '#F87171',                   // Bright Red
  'WILAYAH PERSEKUTUAN': '#FB923C',        // Bright Orange
  'JOHOR': '#60A5FA',                      // Sky Blue
  'NEGERI SEMBILAN': '#A78BFA',            // Bright Violet
  'SABAH': '#34D399',                      // Mint Emerald Green
  'PERAK': '#F8FAFC',                      // Pure Platinum White
  'KELANTAN': '#FB7185',                   // Bright Rose
  'PULAU PINANG': '#38BDF8',               // Vibrant Cyan-Blue
  'SARAWAK': '#FBBF24',                    // Amber Gold
  'PAHANG': '#FB923C',                     // Tangerine
  'KEDAH': '#818CF8',                      // Periwinkle Indigo
  'MELAKA': '#F472B6',                     // Neon Pink-Magenta
  'TERENGGANU': '#2DD4BF',                 // Bright Teal
  'PERLIS': '#94A3B8',                     // Light Slate
  'WILAYAH PERSEKUTUAN LABUAN': '#A3E635', // Electric Lime
  'MALAYSIA': '#38BDF8',
};

const STATE_COLORS = STATE_COLORS_LIGHT;

const DEFAULT_COLOR_PALETTE = [
  '#EF4444', '#F59E0B', '#06B6D4', '#8B5CF6', '#10B981',
  '#000000', '#EC4899', '#14B8A6', '#F97316', '#84CC16',
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
  setTxt('lbl-hdr-epid-week', t.hdr_epid_week_lbl);
  setTxt('lbl-hdr-report-date', t.hdr_report_date_lbl);
  setTxt('lbl-hdr-last-updated', t.hdr_last_updated_lbl);
  setTxt('lbl-hdr-last-available', t.hdr_last_available_lbl);

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
  setTxt('btn-preset-perak', t.preset_perak);
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

  setTxt('daily-ma-chart-subtitle', t.daily_ma_subtitle);
  setTxt('btn-ma-range-7proj', t.btn_range_7proj);
  setTxt('btn-ma-range-30', t.btn_range_30);
  setTxt('btn-ma-range-all', t.btn_range_all);
  setTxt('btn-ma-mode-combo', t.btn_mode_combo);
  setTxt('btn-ma-mode-line', t.btn_mode_line);
  setHtml('lbl-daily-ma-note', t.daily_ma_note);
  setHtml('lbl-weekly-panel-note', t.weekly_panel_note);
  setHtml('lbl-daily-panel-note', t.daily_panel_note);

  setTxt('lbl-table-badge', t.table_badge);
  setTxt('lbl-na-panel-title', t.na_panel_title);
  setTxt('lbl-na-panel-subtitle', t.na_panel_subtitle);
  setHtml('lbl-na-panel-note', t.na_panel_note);
  setTxt('lbl-table-date-select', t.table_date_label);
  setTxt('lbl-table-title', t.table_title);
  setHtml('lbl-table-subtitle', t.table_subtitle);
  const searchInput = document.getElementById('table-search');
  if (searchInput) searchInput.placeholder = t.search_placeholder;
  populateTableDateSelector();

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

function getStateColor(stateName, isDark = false) {
  const palette = isDark ? STATE_COLORS_DARK : STATE_COLORS_LIGHT;
  return palette[stateName] || (isDark ? '#38BDF8' : '#0284C7');
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

function formatDisplayDate(isoDate) {
  if (!isoDate) return '';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  const [y, m, d] = parts;
  const monthNamesMs = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogo', 'Sep', 'Okt', 'Nov', 'Dis'];
  const monthNamesEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthIdx = parseInt(m, 10) - 1;
  const monthName = (currentLang === 'en' ? monthNamesEn : monthNamesMs)[monthIdx] || m;
  return `${parseInt(d, 10)} ${monthName} ${y}`;
}

function getTableSnapshot() {
  if (!appData) return null;
  const date = selectedTableDate || (appData.latest ? appData.latest.report_date : null);
  if (appData.history_by_date && appData.history_by_date[date]) {
    return appData.history_by_date[date];
  }
  return appData.latest;
}

function updateDateNavButtons() {
  const btnPrev = document.getElementById('btn-date-prev');
  const btnNext = document.getElementById('btn-date-next');
  if (!btnPrev && !btnNext) return;

  const dates = appData && appData.dates ? appData.dates : [];
  if (dates.length === 0) {
    if (btnPrev) btnPrev.disabled = true;
    if (btnNext) btnNext.disabled = true;
    return;
  }

  const currentDate = selectedTableDate || dates[dates.length - 1];
  const idx = dates.indexOf(currentDate);

  // dates is sorted ascending: [2026-08-31, ..., 2026-09-28]
  // Previous day (earlier date): idx > 0
  // Next day (later date): idx < dates.length - 1
  if (btnPrev) {
    btnPrev.disabled = idx <= 0;
  }
  if (btnNext) {
    btnNext.disabled = idx === -1 || idx >= dates.length - 1;
  }
}

function stepTableDate(direction) {
  const dates = appData && appData.dates ? appData.dates : [];
  if (dates.length === 0) return;

  const currentDate = selectedTableDate || dates[dates.length - 1];
  const idx = dates.indexOf(currentDate);
  if (idx === -1) return;

  const nextIdx = idx + direction;
  if (nextIdx >= 0 && nextIdx < dates.length) {
    selectedTableDate = dates[nextIdx];
    const select = document.getElementById('table-date-select');
    if (select) {
      select.value = selectedTableDate;
    }
    updateDateNavButtons();
    renderTable();
  }
}

function populateTableDateSelector() {
  const select = document.getElementById('table-date-select');
  if (!select || !appData) return;

  const dates = appData.dates ? [...appData.dates].reverse() : (appData.latest ? [appData.latest.report_date] : []);
  if (dates.length === 0) return;

  if (!selectedTableDate || !dates.includes(selectedTableDate)) {
    selectedTableDate = dates[0];
  }

  const latestDate = dates[0];
  const t = TRANSLATIONS[currentLang] || TRANSLATIONS.ms;
  const savedSelection = selectedTableDate;

  select.innerHTML = '';
  dates.forEach(d => {
    const opt = document.createElement('option');
    opt.value = d;
    const formatted = formatDisplayDate(d);
    opt.textContent = d === latestDate ? `${formatted} ${t.table_date_latest_tag}` : formatted;
    if (d === savedSelection) {
      opt.selected = true;
    }
    select.appendChild(opt);
  });

  // Update prev / next button titles and disabled states
  const btnPrev = document.getElementById('btn-date-prev');
  if (btnPrev) {
    btnPrev.title = t.table_date_prev;
    btnPrev.setAttribute('aria-label', t.table_date_prev);
  }
  const btnNext = document.getElementById('btn-date-next');
  if (btnNext) {
    btnNext.title = t.table_date_next;
    btnNext.setAttribute('aria-label', t.table_date_next);
  }

  updateDateNavButtons();
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

  populateTableDateSelector();
  initComparisonStates();
}

function renderHeader() {
  if (!appData || !appData.latest) return;
  const lat = appData.latest;
  const t = TRANSLATIONS[currentLang] || TRANSLATIONS.ms;

  // 1. EPIDEMIOLOGICAL WEEK
  document.getElementById('hdr-epid-week').textContent = lat.epid_week_label || `ME ${lat.epid_week}/${lat.epid_year}`;
  document.getElementById('hdr-epid-dates').textContent = `${t.hdr_epid_prefix} ${lat.epid_week_start} ${t.hdr_cum_to} ${lat.epid_week_end}`;

  // 2. IDENGUE REPORT DATE
  document.getElementById('hdr-report-date').textContent = lat.report_date_raw || lat.report_date;
  document.getElementById('hdr-cum-period').textContent = `${t.hdr_cum_prefix} ${lat.cumulative_start_raw || lat.cumulative_start_date} ${t.hdr_cum_to} ${lat.cumulative_end_raw || lat.cumulative_end_date}`;

  // 3. LAST UPDATED (WORKFLOW)
  let workflowDateObj = null;
  if (lat.scraped_at) {
    let dateStr = String(lat.scraped_at).trim();
    if (!dateStr.includes('Z') && !dateStr.includes('+') && !dateStr.slice(10).includes('-')) {
      dateStr += 'Z';
    }
    const dt = new Date(dateStr);
    workflowDateObj = dt;

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

  // 4. LAST AVAILABLE DATA IDENGUE
  const availDateElem = document.getElementById('hdr-last-available-date');
  const availStatusElem = document.getElementById('hdr-last-available-status');
  if (availDateElem) {
    availDateElem.textContent = lat.report_date_raw || lat.report_date;
  }
  if (availStatusElem) {
    let lagDays = 0;
    if (workflowDateObj && lat.report_date) {
      try {
        const wfIso = workflowDateObj.toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' }); // YYYY-MM-DD
        const dWf = new Date(wfIso + 'T00:00:00');
        const dRep = new Date(lat.report_date + 'T00:00:00');
        lagDays = Math.max(0, Math.round((dWf - dRep) / (1000 * 60 * 60 * 24)));
      } catch (e) {
        lagDays = 0;
      }
    }
    if (lagDays <= 1) {
      availStatusElem.textContent = t.hdr_available_status_latest;
    } else {
      availStatusElem.textContent = t.hdr_available_status_lag.replace('{days}', lagDays);
    }
  }

  const thReportDate = document.getElementById('th-report-date');
  if (thReportDate) thReportDate.textContent = lat.report_date_raw || lat.report_date;

  const thDaily = document.getElementById('th-col-daily');
  if (thDaily) {
    thDaily.textContent = t.th_daily.replace('{date}', lat.report_date_raw || lat.report_date);
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
  if (!appData) return;
  const snapshot = getTableSnapshot();
  if (!snapshot || !snapshot.states) return;

  const tbody = document.getElementById('table-body');
  const totalCum = (snapshot.total && snapshot.total.cumulative_cases) ? snapshot.total.cumulative_cases : 1;
  const totalDaily = (snapshot.total && snapshot.total.daily_cases != null) ? snapshot.total.daily_cases : 0;
  const t = TRANSLATIONS[currentLang] || TRANSLATIONS.ms;

  // Update table header column for daily cases with the selected date
  const thDaily = document.getElementById('th-col-daily');
  if (thDaily) {
    const displayDate = snapshot.report_date_raw || formatDisplayDate(snapshot.report_date);
    thDaily.textContent = t.th_daily.replace('{date}', displayDate);
  }

  let rows = [...snapshot.states];

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

  const maxCum = Math.max(...snapshot.states.map(s => s.cumulative_cases), 1);

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

  const nationalIR = getIncidenceRate(totalCum, 'MALAYSIA');
  document.getElementById('tf-daily-total').innerHTML = `<strong>${Number(totalDaily).toLocaleString()}</strong>`;
  document.getElementById('tf-cum-total').innerHTML = `<strong>${Number(totalCum).toLocaleString()}</strong>`;
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
  // Default to Perak (±2) preset
  const idx = sorted.findIndex(s => s.state === 'PERAK');
  if (idx !== -1) {
    const start = Math.max(0, idx - 2);
    const end = Math.min(sorted.length, idx + 3);
    selectedComparisonStates = new Set(sorted.slice(start, end).map(s => s.state));
  } else {
    selectedComparisonStates = new Set(['PERAK']);
  }
  renderStateChips();
}

function renderStateChips() {
  const container = document.getElementById('state-chips-container');
  if (!container || !appData || !appData.latest) return;

  const states = [...appData.latest.states].sort((a, b) => b.cumulative_cases - a.cumulative_cases);
  container.innerHTML = '';

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  states.forEach(s => {
    const isSelected = selectedComparisonStates.has(s.state);
    const color = getStateColor(s.state, isDark);

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

  // Calculate Perak ±2 slice (Perak + 2 states above + 2 states below based on cumulative ranking)
  const perakIdx = states.findIndex(s => s.state === 'PERAK');
  const perakSlice = perakIdx !== -1
    ? states.slice(Math.max(0, perakIdx - 2), Math.min(states.length, perakIdx + 3)).map(s => s.state)
    : [];
  const isPerakPreset = perakSlice.length > 0
    && selectedComparisonStates.size === perakSlice.length
    && perakSlice.every(st => selectedComparisonStates.has(st));

  // Update active state on preset buttons
  const isTop3 = selectedComparisonStates.size === 3 && states.slice(0, 3).every(s => selectedComparisonStates.has(s.state));
  const isTop5 = selectedComparisonStates.size === 5 && states.slice(0, 5).every(s => selectedComparisonStates.has(s.state));
  const isBot3 = selectedComparisonStates.size === 3 && states.slice(-3).every(s => selectedComparisonStates.has(s.state));
  const isBot5 = selectedComparisonStates.size === 5 && states.slice(-5).every(s => selectedComparisonStates.has(s.state));
  const isAll = selectedComparisonStates.size === states.length;

  document.getElementById('btn-preset-top3')?.classList.toggle('active', isTop3);
  document.getElementById('btn-preset-top5')?.classList.toggle('active', isTop5);
  document.getElementById('btn-preset-perak')?.classList.toggle('active', isPerakPreset);
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
  } else if (preset === 'perak') {
    const idx = sorted.findIndex(s => s.state === 'PERAK');
    if (idx !== -1) {
      const start = Math.max(0, idx - 2);
      const end = Math.min(sorted.length, idx + 3);
      selectedComparisonStates = new Set(sorted.slice(start, end).map(s => s.state));
    } else {
      selectedComparisonStates = new Set(['PERAK']);
    }
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
  const dailyMATag = document.getElementById('daily-ma-chart-tag');
  const dailyMATitle = document.getElementById('daily-ma-chart-title');

  if (isCompareMode) {
    const count = selectedComparisonStates ? selectedComparisonStates.size : 0;
    const tagText = currentLang === 'en' ? `COMPARISON (${count} STATES)` : `PERBANDINGAN (${count} NEGERI)`;
    weeklyTag.textContent = tagText;
    dailyTag.textContent = tagText;
    weeklyTitle.textContent = t.weekly_title_compare.replace('{count}', count);
    dailyTitle.textContent = t.daily_title_compare.replace('{count}', count);
    if (dailyMATag) dailyMATag.textContent = tagText;
    if (dailyMATitle) dailyMATitle.textContent = t.daily_ma_title_compare.replace('{count}', count);
  } else {
    const totalTag = currentLang === 'en' ? 'NATIONAL TOTAL' : 'JUMLAH KESELURUHAN';
    weeklyTag.textContent = selectedState === 'MALAYSIA' ? totalTag : selectedState;
    dailyTag.textContent = selectedState === 'MALAYSIA' ? totalTag : selectedState;
    weeklyTitle.textContent = selectedState === 'MALAYSIA' ? t.weekly_title_total : t.weekly_title_state.replace('{state}', selectedState);
    dailyTitle.textContent = selectedState === 'MALAYSIA' ? t.daily_title_total : t.daily_title_state.replace('{state}', selectedState);
    if (dailyMATag) dailyMATag.textContent = selectedState === 'MALAYSIA' ? totalTag : selectedState;
    if (dailyMATitle) dailyMATitle.textContent = selectedState === 'MALAYSIA' ? t.daily_ma_title_total : t.daily_ma_title_state.replace('{state}', selectedState);
  }

  // 1. Weekly Chart
  renderWeeklyChart(selectedState, isCompareMode);

  // 2. Daily Chart
  renderDailyChart(selectedState, isCompareMode);

  // 3. Daily Moving Average Chart (14-Day MA)
  renderDailyMovingAvgChart(selectedState, isCompareMode);

  // 3. NA Dates List
  renderNADatesList();
}

function renderWeeklyChart(selectedState, isCompareMode) {
  const weekKeys = appData.weeks || [];
  const weekLabels = weekKeys.map(wk => appData.weekly_matrix[wk]?.label || wk);
  const ctxWeekly = document.getElementById('weeklyTrendChart').getContext('2d');
  const t = TRANSLATIONS[currentLang] || TRANSLATIONS.ms;

  if (weeklyChart) weeklyChart.destroy();

  const tc = getChartThemeColors();
  let datasets = [];

  if (isCompareMode) {
    // Multi-state line chart for selected comparison states
    const states = appData.latest.states
      .map(s => s.state)
      .filter(st => selectedComparisonStates.has(st));

    datasets = states.map(st => {
      const color = getStateColor(st, tc.isDark);
      const data = weekKeys.map(wk => appData.weekly_matrix[wk]?.states[st] || 0);
      return {
        label: st,
        data: data,
        borderColor: color,
        backgroundColor: color,
        borderWidth: 2.5,
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.3,
        fill: false
      };
    });
  } else {
    // Single total or single state bar chart (Histogram: contiguous bars, no gaps)
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
      backgroundColor: 'rgba(6, 182, 212, 0.75)',
      borderColor: '#06B6D4',
      borderWidth: 1,
      borderRadius: 0, // Contiguous histogram rectangular bars
      categoryPercentage: 1.0,
      barPercentage: 1.0,
    }];
  }

  weeklyChart = new Chart(ctxWeekly, {
    type: isCompareMode ? 'line' : 'bar',
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
          offset: !isCompareMode ? false : true,
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

function renderDailyChart(selectedState, isCompareMode) {
  // Show continuous 14-day daily trend with strict 1-day calendar intervals
  const allDates = appData.dates || [];
  let dateKeys = [];
  if (allDates.length > 0) {
    const latestDateStr = allDates[allDates.length - 1];
    const [y, m, d] = latestDateStr.split('-').map(Number);
    const endDate = new Date(Date.UTC(y, m - 1, d));
    for (let i = 13; i >= 0; i--) {
      const dt = new Date(endDate);
      dt.setUTCDate(endDate.getUTCDate() - i);
      dateKeys.push(dt.toISOString().slice(0, 10));
    }
  }
  const retroDates = new Set(appData.retrospective_dates || []);
  const displayLabels = dateKeys.map(d => retroDates.has(d) ? `${d} *` : d);
  const ctxDaily = document.getElementById('dailyTrendChart').getContext('2d');
  const t = TRANSLATIONS[currentLang] || TRANSLATIONS.ms;

  if (dailyChart) dailyChart.destroy();

  const tc = getChartThemeColors();
  let datasets = [];

  if (isCompareMode) {
    // Multi-line chart for selected states (14 days)
    const states = appData.latest.states
      .map(s => s.state)
      .filter(st => selectedComparisonStates.has(st));

    datasets = states.map(st => {
      const color = getStateColor(st, tc.isDark);
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
    // Single total or single state line/area chart (14 days)
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

  dailyChart = new Chart(ctxDaily, {
    type: 'line',
    data: { labels: displayLabels, datasets: datasets },
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
          callbacks: {
            title: (items) => {
              if (!items || !items.length) return '';
              const idx = items[0].dataIndex;
              const dt = dateKeys[idx];
              if (retroDates.has(dt)) {
                return currentLang === 'en'
                  ? `${dt} * (Retrospectively Calculated)`
                  : `${dt} * (Dikira Secara Retrospektif)`;
              }
              return dt;
            },
            footer: (items) => {
              if (!items || !items.length) return '';
              const idx = items[0].dataIndex;
              const dt = dateKeys[idx];
              if (retroDates.has(dt)) {
                return currentLang === 'en'
                  ? 'ℹ️ Data was calculated retrospectively from cumulative delta (official iDengue bulletin not published for this date).'
                  : 'ℹ️ Data dikira secara retrospektif daripada perbezaan kumulatif (buletin rasmi iDengue tidak diterbitkan bagi tarikh ini).';
              }
              return '';
            }
          }
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

  renderNADatesList();
}

function setDailyMARange(range) {
  currentDailyMARange = range;
  document.getElementById('btn-ma-range-7proj')?.classList.toggle('active', range === '7proj');
  document.getElementById('btn-ma-range-30')?.classList.toggle('active', range === 30 || range === '30');
  document.getElementById('btn-ma-range-all')?.classList.toggle('active', range === 'all');
  const selectedState = document.getElementById('state-filter-select')?.value || 'MALAYSIA';
  renderDailyMovingAvgChart(selectedState, currentGraphMode === 'comparison');
}

function setDailyMAMode(mode) {
  currentDailyMAMode = mode;
  document.getElementById('btn-ma-mode-combo')?.classList.toggle('active', mode === 'combo');
  document.getElementById('btn-ma-mode-line')?.classList.toggle('active', mode === 'line');
  const selectedState = document.getElementById('state-filter-select')?.value || 'MALAYSIA';
  renderDailyMovingAvgChart(selectedState, currentGraphMode === 'comparison');
}

window.setDailyMARange = setDailyMARange;
window.setDailyMAMode = setDailyMAMode;
window.renderDailyMovingAvgChart = renderDailyMovingAvgChart;

function renderDailyMovingAvgChart(selectedState, isCompareMode) {
  const canvasEl = document.getElementById('dailyMovingAvgChart');
  if (!canvasEl) return;
  const ctx = canvasEl.getContext('2d');
  if (dailyMovingAvgChart) dailyMovingAvgChart.destroy();

  if (!appData || !appData.dates || appData.dates.length === 0) return;
  const allDates = appData.dates;
  const retroDates = new Set(appData.retrospective_dates || []);
  const t = TRANSLATIONS[currentLang] || TRANSLATIONS.ms;
  const tc = getChartThemeColors();

  // Helper to extract daily cases for any date & state
  const getDailyVal = (dt, state) => {
    const dayObj = appData.daily_matrix[dt] || {};
    if (state === 'MALAYSIA') {
      return dayObj['MALAYSIA'] !== undefined ? dayObj['MALAYSIA'] : 0;
    }
    return dayObj[state] !== undefined ? dayObj[state] : 0;
  };

  // 14-day rolling average lookup from allDates
  const calcMA14ForDate = (dt, state) => {
    const idx = allDates.indexOf(dt);
    if (idx === -1) return 0;
    let sum = 0, count = 0;
    for (let i = 0; i < 14; i++) {
      const pIdx = idx - i;
      if (pIdx >= 0) {
        sum += Number(getDailyVal(allDates[pIdx], state)) || 0;
        count++;
      }
    }
    return count > 0 ? +(sum / count).toFixed(1) : 0;
  };

  let datasets = [];
  let displayLabels = [];
  const is7ProjMode = (currentDailyMARange === '7proj');

  if (is7ProjMode) {
    // 7 days before + 7 days projection
    const pastDates = allDates.slice(-7);
    const latestDateStr = allDates[allDates.length - 1];
    const [y, m, d] = latestDateStr.split('-').map(Number);
    const latestDate = new Date(Date.UTC(y, m - 1, d));
    const futureDates = [];
    for (let k = 1; k <= 7; k++) {
      const fDate = new Date(latestDate);
      fDate.setUTCDate(latestDate.getUTCDate() + k);
      futureDates.push(fDate.toISOString().slice(0, 10));
    }
    const allWindowDates = [...pastDates, ...futureDates];
    const futureSet = new Set(futureDates);

    displayLabels = allWindowDates.map(dt => {
      if (futureSet.has(dt)) {
        return currentLang === 'en' ? `${dt} (Proj)` : `${dt} (Unjuran)`;
      }
      return retroDates.has(dt) ? `${dt} *` : dt;
    });

    const computeStateSeries = (st) => {
      // Consider 28 days of historical data for robust baseline trend projection
      const trendWindowDays = Math.min(28, allDates.length);
      const trendDates = allDates.slice(-trendWindowDays);
      const trendDaily = trendDates.map(dt => getDailyVal(dt, st));
      const N = trendWindowDays;

      let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
      for (let i = 0; i < N; i++) {
        sumX += i;
        sumY += trendDaily[i];
        sumXY += i * trendDaily[i];
        sumXX += i * i;
      }
      const slope = (N * sumXY - sumX * sumY) / (N * sumXX - sumX * sumX);
      const intercept = (sumY - slope * sumX) / N;

      // Project next 7 days daily cases using the 28-day baseline trend
      const futureDaily = [];
      for (let k = 0; k < 7; k++) {
        futureDaily.push(Math.max(0, Math.round(intercept + slope * (N + k))));
      }

      // Past 7 observed days for display on chart
      const recentDaily = pastDates.map(dt => getDailyVal(dt, st));
      const obsMA = pastDates.map(dt => calcMA14ForDate(dt, st));

      // Calculate future 14-day moving average using 14-day rolling window
      const projMA = [];
      for (let k = 1; k <= 7; k++) {
        let sum = 0;
        const pastNeeded = 14 - k;
        for (let i = 0; i < pastNeeded; i++) {
          sum += Number(getDailyVal(allDates[allDates.length - 1 - i], st)) || 0;
        }
        for (let f = 0; f < k; f++) {
          sum += futureDaily[f];
        }
        projMA.push(+(sum / 14).toFixed(1));
      }

      return { recentDaily, futureDaily, obsMA, projMA };
    };

    if (isCompareMode) {
      // Comparison Mode: Multi-state observed line + projected line
      const states = appData.latest.states
        .map(s => s.state)
        .filter(st => selectedComparisonStates.has(st));

      states.forEach(st => {
        const color = getStateColor(st, tc.isDark);
        const { obsMA, projMA } = computeStateSeries(st);

        // Observed line
        datasets.push({
          type: 'line',
          label: `${st} (14D MA)`,
          data: [...obsMA, ...Array(7).fill(null)],
          borderColor: color,
          backgroundColor: color,
          borderWidth: 2.5,
          pointRadius: 3,
          pointHoverRadius: 6,
          tension: 0.3,
          fill: false,
          order: 1
        });

        // Projected line (connected seamlessly at day 7)
        datasets.push({
          type: 'line',
          label: `${st} (${currentLang === 'en' ? 'Projected' : 'Unjuran'})`,
          data: [...Array(6).fill(null), obsMA[obsMA.length - 1], ...projMA],
          borderColor: color,
          backgroundColor: color,
          borderWidth: 2.2,
          borderDash: [5, 4],
          pointRadius: 3,
          pointStyle: 'rectRot',
          pointHoverRadius: 6,
          tension: 0.3,
          fill: false,
          order: 1
        });
      });
    } else {
      // Single state or MALAYSIA Total
      const stateLabel = selectedState === 'MALAYSIA' ? (currentLang === 'en' ? 'Malaysia' : 'Malaysia') : selectedState;
      const { recentDaily, futureDaily, obsMA, projMA } = computeStateSeries(selectedState);
      const maColor = tc.isDark ? '#38BDF8' : '#0284C7';
      const projColor = tc.isDark ? '#FBBF24' : '#D97706';

      // 1. Observed 14D MA (Solid)
      datasets.push({
        type: 'line',
        label: `${t.daily_ma_legend_ma} (${stateLabel})`,
        data: [...obsMA, ...Array(7).fill(null)],
        borderColor: maColor,
        backgroundColor: tc.isDark ? 'rgba(56, 189, 248, 0.1)' : 'rgba(2, 132, 199, 0.08)',
        borderWidth: 3,
        tension: 0.3,
        pointRadius: 3.5,
        pointHoverRadius: 6,
        pointBackgroundColor: maColor,
        fill: false,
        order: 1
      });

      // 2. Projected 14D MA (Dashed, connected at index 6)
      datasets.push({
        type: 'line',
        label: `${t.daily_ma_legend_ma_proj} (${stateLabel})`,
        data: [...Array(6).fill(null), obsMA[obsMA.length - 1], ...projMA],
        borderColor: projColor,
        backgroundColor: tc.isDark ? 'rgba(251, 191, 36, 0.1)' : 'rgba(217, 119, 6, 0.08)',
        borderWidth: 2.5,
        borderDash: [5, 4],
        tension: 0.3,
        pointRadius: 3.5,
        pointStyle: 'rectRot',
        pointHoverRadius: 6,
        pointBackgroundColor: projColor,
        fill: false,
        order: 1
      });

      if (currentDailyMAMode === 'combo') {
        // Daily Observed Bars
        datasets.push({
          type: 'bar',
          label: `${t.daily_ma_legend_daily} (${stateLabel})`,
          data: [...recentDaily, ...Array(7).fill(null)],
          backgroundColor: tc.isDark ? 'rgba(239, 68, 68, 0.45)' : 'rgba(239, 68, 68, 0.3)',
          borderColor: tc.isDark ? 'rgba(248, 113, 113, 0.8)' : 'rgba(220, 38, 38, 0.6)',
          borderWidth: 1,
          borderRadius: 2,
          categoryPercentage: 0.8,
          barPercentage: 0.88,
          order: 2
        });
        // Daily Projected Bars
        datasets.push({
          type: 'bar',
          label: `${t.daily_ma_legend_daily_proj} (${stateLabel})`,
          data: [...Array(7).fill(null), ...futureDaily],
          backgroundColor: tc.isDark ? 'rgba(245, 158, 11, 0.18)' : 'rgba(217, 119, 6, 0.12)',
          borderColor: tc.isDark ? 'rgba(251, 191, 36, 0.75)' : 'rgba(217, 119, 6, 0.65)',
          borderWidth: 1,
          borderRadius: 2,
          categoryPercentage: 0.8,
          barPercentage: 0.88,
          order: 2
        });
      } else {
        // Line mode
        datasets.push({
          type: 'line',
          label: `${t.daily_ma_legend_daily} (${stateLabel})`,
          data: [...recentDaily, ...Array(7).fill(null)],
          borderColor: tc.isDark ? 'rgba(248, 113, 113, 0.65)' : 'rgba(220, 38, 38, 0.55)',
          backgroundColor: tc.isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.06)',
          borderWidth: 1.5,
          tension: 0.25,
          pointRadius: 3,
          pointHoverRadius: 5,
          pointBackgroundColor: '#EF4444',
          fill: true,
          order: 2
        });
        datasets.push({
          type: 'line',
          label: `${t.daily_ma_legend_daily_proj} (${stateLabel})`,
          data: [...Array(6).fill(null), recentDaily[recentDaily.length - 1], ...futureDaily],
          borderColor: tc.isDark ? 'rgba(251, 191, 36, 0.65)' : 'rgba(217, 119, 6, 0.55)',
          backgroundColor: tc.isDark ? 'rgba(245, 158, 11, 0.08)' : 'rgba(217, 119, 6, 0.05)',
          borderWidth: 1.5,
          borderDash: [3, 3],
          tension: 0.25,
          pointRadius: 3,
          pointHoverRadius: 5,
          pointBackgroundColor: '#F59E0B',
          fill: true,
          order: 2
        });
      }
    }
  } else {
    // 30 days or all historical mode
    let dateKeys = [];
    if (currentDailyMARange === 30 || currentDailyMARange === '30') {
      dateKeys = allDates.slice(-30);
    } else {
      dateKeys = [...allDates];
    }
    displayLabels = dateKeys.map(d => retroDates.has(d) ? `${d} *` : d);

    if (isCompareMode) {
      const states = appData.latest.states
        .map(s => s.state)
        .filter(st => selectedComparisonStates.has(st));

      datasets = states.map(st => {
        const color = getStateColor(st, tc.isDark);
        const maData = dateKeys.map(dt => calcMA14ForDate(dt, st));
        return {
          type: 'line',
          label: `${st} (14D MA)`,
          data: maData,
          borderColor: color,
          backgroundColor: color,
          borderWidth: 2.5,
          pointRadius: dateKeys.length > 35 ? 1.5 : 3,
          pointHoverRadius: 6,
          tension: 0.35,
          fill: false
        };
      });
    } else {
      const stateLabel = selectedState === 'MALAYSIA' ? (currentLang === 'en' ? 'Malaysia' : 'Malaysia') : selectedState;
      const dailyValues = dateKeys.map(dt => getDailyVal(dt, selectedState));
      const maValues = dateKeys.map(dt => calcMA14ForDate(dt, selectedState));
      const maColor = tc.isDark ? '#38BDF8' : '#0284C7';

      datasets = [
        {
          type: 'line',
          label: `${t.daily_ma_legend_ma} (${stateLabel})`,
          data: maValues,
          borderColor: maColor,
          backgroundColor: tc.isDark ? 'rgba(56, 189, 248, 0.1)' : 'rgba(2, 132, 199, 0.08)',
          borderWidth: 3,
          tension: 0.35,
          pointRadius: dateKeys.length > 35 ? 1.5 : 3.5,
          pointHoverRadius: 6,
          pointBackgroundColor: maColor,
          fill: false,
          order: 1
        },
        currentDailyMAMode === 'combo' ? {
          type: 'bar',
          label: `${t.daily_ma_legend_daily} (${stateLabel})`,
          data: dailyValues,
          backgroundColor: tc.isDark ? 'rgba(239, 68, 68, 0.4)' : 'rgba(239, 68, 68, 0.28)',
          borderColor: tc.isDark ? 'rgba(248, 113, 113, 0.7)' : 'rgba(220, 38, 38, 0.55)',
          borderWidth: 1,
          borderRadius: 2,
          categoryPercentage: 0.82,
          barPercentage: 0.9,
          order: 2
        } : {
          type: 'line',
          label: `${t.daily_ma_legend_daily} (${stateLabel})`,
          data: dailyValues,
          borderColor: tc.isDark ? 'rgba(248, 113, 113, 0.65)' : 'rgba(220, 38, 38, 0.55)',
          backgroundColor: tc.isDark ? 'rgba(239, 68, 68, 0.12)' : 'rgba(239, 68, 68, 0.08)',
          borderWidth: 1.5,
          borderDash: [3, 2],
          tension: 0.25,
          pointRadius: dateKeys.length > 35 ? 1.5 : 3,
          pointHoverRadius: 5,
          pointBackgroundColor: '#EF4444',
          fill: true,
          order: 2
        }
      ];
    }
  }

  dailyMovingAvgChart = new Chart(ctx, {
    type: 'bar',
    data: { labels: displayLabels, datasets: datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            color: tc.legend,
            boxWidth: 12,
            font: { family: 'Plus Jakarta Sans', size: 10.5, weight: '600' }
          }
        },
        tooltip: {
          backgroundColor: tc.tooltipBg,
          titleColor: tc.tooltipTitle,
          bodyColor: tc.tooltipBody,
          borderColor: tc.tooltipBorder,
          borderWidth: 1,
          padding: 10,
          callbacks: {
            title: (items) => {
              if (!items || !items.length) return '';
              const idx = items[0].dataIndex;
              return displayLabels[idx] || '';
            },
            label: (item) => {
              const label = item.dataset.label || '';
              if (item.raw == null) return null;
              const val = Number(item.raw).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 });
              return ` ${label}: ${val} ${currentLang === 'en' ? 'cases' : 'kes'}`;
            },
            footer: (items) => {
              if (!items || !items.length) return '';
              const idx = items[0].dataIndex;
              if (is7ProjMode && idx >= 7) {
                return currentLang === 'en'
                  ? '🔮 7-day projected 14-day MA based on 28-day baseline trend & trailing 14-day window.'
                  : '🔮 Unjuran purata 14 hari bagi 7 hari seterusnya berasaskan tren 28 hari & kitaran 14 hari.';
              }
              return '';
            }
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: tc.ticks,
            font: { family: 'Plus Jakarta Sans', size: 10 },
            maxRotation: 45,
            minRotation: 0,
            maxTicksLimit: 14,
            autoSkip: true
          },
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

function renderNADatesList() {
  const container = document.getElementById('na-dates-container');
  if (!container || !appData) return;
  const t = TRANSLATIONS[currentLang] || TRANSLATIONS.ms;

  const retroDates = appData.retrospective_dates || [];
  const countBadge = document.getElementById('lbl-na-count-badge');
  if (countBadge) {
    countBadge.textContent = t.na_badge_dates.replace('{count}', retroDates.length);
  }

  container.innerHTML = '';
  if (retroDates.length === 0) {
    container.innerHTML = `<div style="color: var(--text-muted); font-size: 12px; padding: 12px 0;">${t.na_empty_msg}</div>`;
    return;
  }

  // Show newest NA dates first
  const sortedDates = [...retroDates].sort().reverse();
  const dayNamesMs = ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'];
  const dayNamesEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  sortedDates.forEach(d => {
    const card = document.createElement('div');
    card.className = 'na-date-card';
    card.title = currentLang === 'en' ? `Click to view data for ${d} in table` : `Klik untuk melihat data ${d} dalam jadual`;

    const dtObj = new Date(d + 'T00:00:00');
    const dayOfWeek = (currentLang === 'en' ? dayNamesEn : dayNamesMs)[dtObj.getDay()] || '';
    const formattedDate = formatDisplayDate(d);

    const nationalDaily = appData.daily_matrix[d]?.['MALAYSIA'] ?? 0;
    const casesText = t.na_cases_count.replace('{count}', Number(nationalDaily).toLocaleString());

    card.innerHTML = `
      <div class="na-date-top">
        <span class="na-date-title">🗓️ ${formattedDate} <span style="font-weight: 500; font-size: 11px; color: var(--text-muted);">(${dayOfWeek})</span></span>
        <span class="na-badge">${t.na_retro_tag}</span>
      </div>
      <div class="na-date-bottom">
        <span>🇲🇾 ${casesText}</span>
        <span class="na-tag-link">${t.na_view_table}</span>
      </div>
    `;

    card.addEventListener('click', () => {
      selectedTableDate = d;
      const select = document.getElementById('table-date-select');
      if (select) select.value = d;
      updateDateNavButtons();
      renderTable();
      const tbl = document.getElementById('dengue-table');
      if (tbl) tbl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    container.appendChild(card);
  });
}

function renderStateComparisonChart() {
  if (typeof Chart === 'undefined' || !appData || !appData.latest) return;
  const ctx = document.getElementById('stateComparisonChart').getContext('2d');
  const t = TRANSLATIONS[currentLang] || TRANSLATIONS.ms;
  const tc = getChartThemeColors();

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
  const colors = sortedStates.map(s => getStateColor(s.state, tc.isDark));

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

  const tableDateSelect = document.getElementById('table-date-select');
  if (tableDateSelect) {
    tableDateSelect.addEventListener('change', (e) => {
      selectedTableDate = e.target.value;
      updateDateNavButtons();
      renderTable();
    });
  }

  const btnDatePrev = document.getElementById('btn-date-prev');
  if (btnDatePrev) {
    btnDatePrev.addEventListener('click', () => {
      stepTableDate(-1);
    });
  }

  const btnDateNext = document.getElementById('btn-date-next');
  if (btnDateNext) {
    btnDateNext.addEventListener('click', () => {
      stepTableDate(1);
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
