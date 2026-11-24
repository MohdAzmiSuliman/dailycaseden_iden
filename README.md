# 🦟 Malaysia Dengue Count Dashboard (iDengue Surveillance)

🌐 **Live Dashboard:** **[https://MohdAzmiSuliman.github.io/dailycaseden_iden/](https://MohdAzmiSuliman.github.io/dailycaseden_iden/)**

> Jump to: **[Part 1: For Readers (About This Site)](#for-readers)** · **[Part 2: For Myself (How I Built It / Vibe-Coding Notes)](#for-myself)**

---

<a id="for-readers"></a>
## 📖 Part 1: For Readers — About This Dashboard

### Why This Site Exists

The official Malaysian dengue portal, [iDengue](https://idengue.mysa.gov.my/index.php) (by CPRC Kementerian Kesihatan Malaysia & Agensi Angkasa Malaysia / MYSA), only displays a **single-day snapshot** — today's daily case count and the year-to-date cumulative count. Once a new day is published, previous daily figures disappear from the main view.

**The intent of this dashboard** is to bridge that gap by automatically archiving daily iDengue snapshots and turning them into an open, easy-to-read **epidemiological trend dashboard** for public health practitioners, researchers, students, and the general public. Instead of seeing isolated daily numbers, you can see whether cases are rising, plateauing, or falling across Malaysia and within each state.

### What You Can Do on the Website

- **Track Short- & Medium-Term Trends (2x2 Overview)**:
  - **Weekly Total Cases**: Grouped cleanly by official Malaysian **Epidemiological Weeks (Minggu Epidemiologi / ME, Sunday–Saturday)**.
  - **Daily Total Cases**: Track day-to-day fluctuations across the latest reporting window.
  - **14-Day Moving Average & 7-Day Projection**: Smooths out weekend/holiday reporting noise using a 14-day rolling average (showing the last 7 observed days) and projects a **7-day forward trajectory** based on the underlying 28-day trend.
  - **Unreleased Bulletins (N/A Dates)**: Transparently flags dates when official iDengue bulletins were not released.
- **Compare States Fairly**:
  - Toggle between **Malaysia Total** and **Multi-State Comparison** (defaults to **Perak ±2** neighboring-rank states: *Negeri Sembilan, Sabah, Perak, Kelantan, Pulau Pinang*, with quick presets and custom state chips).
  - Uses a high-contrast alternating color palette so states with similar rankings are immediately distinguishable.
  - Explore the full **15-State Ranking Bar Chart** with toggles for **Cumulative Cases**, **Daily Cases**, and **Incidence Rate per 100,000 population** (adjusted using DOSM population baselines), plus **Linear / Logarithmic scales** and an interactive **X-axis zoom slider** so lower-burden states aren't overshadowed by Selangor.
- **Browse Historical Snapshots & Customize Your View**:
  - Step backward and forward day-by-day in the main surveillance table.
  - Switch seamlessly between **Bahasa Melayu (BM)** and **English (EN)**, and toggle between **Light** and **Dark** themes.

### 📊 Latest Archived Snapshot (21 Nov 2026 / ME 46)

*Archive coverage: 83 days (31 Aug 2026 – 21 Nov 2026, ME 35 – ME 46)*

| # | Negeri | Kes Harian (21 Nov 2026) | Jumlah Kes Terkumpul (YTD) | % Sumbangan |
| -: | :--- | :---: | :---: | :---: |
| 1 | **SELANGOR** | 109 | 35,451 | 41.76% |
| 2 | **WILAYAH PERSEKUTUAN** | 35 | 14,016 | 16.51% |
| 3 | **JOHOR** | 62 | 13,916 | 16.39% |
| 4 | **NEGERI SEMBILAN** | 20 | 5,672 | 6.68% |
| 5 | **SABAH** | 4 | 4,995 | 5.88% |
| 6 | **PERAK** | 5 | 2,735 | 3.22% |
| 7 | **KELANTAN** | 1 | 2,010 | 2.37% |
| 8 | **PULAU PINANG** | 11 | 1,479 | 1.74% |
| 9 | **SARAWAK** | 5 | 1,109 | 1.31% |
| 10 | **PAHANG** | 5 | 1,040 | 1.23% |
| 11 | **KEDAH** | 5 | 799 | 0.94% |
| 12 | **MELAKA** | 2 | 733 | 0.86% |
| 13 | **TERENGGANU** | 2 | 719 | 0.85% |
| 14 | **PERLIS** | 0 | 199 | 0.23% |
| 15 | **WILAYAH PERSEKUTUAN LABUAN** | 1 | 21 | 0.02% |
| ★ | **MALAYSIA (TOTAL)** | **267** | **84,894** | **100.0%** |

### Data Sources & Transparency Note

- **Primary Case Data**: CPRC Kementerian Kesihatan Malaysia (KKM) & Agensi Angkasa Malaysia (MYSA) via [iDengue](https://idengue.mysa.gov.my/index.php).
- **Population Denominator (Incidence Rate)**: Department of Statistics Malaysia (DOSM / OpenDOSM) baseline estimates.
- **Handling Missing Days**: When iDengue skips publishing a daily bulletin, the dashboard flags the date under *N/A Dates* and calculates the missing daily delta retrospectively from the cumulative total difference so weekly totals remain accurate.
- **Disclaimer**: This is an independent, automated surveillance mirror built for visual trend analysis. Always refer to official KKM / CPRC releases for formal public health reporting.

---

<a id="for-myself"></a>
## 🛠️ Part 2: For Myself — Builder's & Vibe-Coding Notes

### How I Built This (Vibe Coding with Antigravity)

This entire project — scraper, historical pipeline, frontend dashboard, and cloud automation — was **vibe-coded iteratively using Google Antigravity**. Instead of designing a bloated full-stack app upfront, I started with a working minimal scraper + static HTML page and shaped every feature directly from inspecting the live dashboard day by day.

**My Vibe-Coding Loop in Antigravity:**
1. **`pull remote`** to sync the latest GitHub Actions scraped data into my local workspace.
2. **Spin up a quick local server** (`python -m http.server 8000`) and inspect the live dashboard in the browser.
3. **Critique & iterate in plain English** — whenever something looked off or felt clunky, I described what I wanted changed:
   - *Pain point:* Selangor's numbers dwarfed smaller states like Perlis and Labuan → *Vibe-coded:* Linear/Log scale toggle + interactive X-axis zoom & truncation slider.
   - *Pain point:* iDengue occasionally skips publishing a day → *Vibe-coded:* Retrospective gap resolver (`cumulative_curr - daily_curr - cumulative_prev`) + dedicated *N/A Dates* panel.
   - *Pain point:* Comparing Perak with similar-rank states showed Sabah and Pulau Pinang in nearly identical green shades → *Vibe-coded:* Perak (±2) as the default quick preset + a rank-alternating high-contrast light/dark color palette.
   - *Pain point:* Daily curves were noisy and needed short-term direction → *Vibe-coded:* Strict 2x2 CSS grid layout + 14-day moving average chart showing 7 observed days and a 7-day forward projection using a 28-day baseline trend regression.
4. **Verify locally, update docs, and `push remote`** so GitHub Pages updates automatically.

**Design Philosophy:**
- **Zero frameworks, zero build step, $0 / RM 0 hosting**: Standard-library Python (`urllib`, `re`, `csv`, `json`) + vanilla HTML/CSS/JS + Chart.js CDN + GitHub Actions + GitHub Pages.

### Project Architecture & File Map

| File / Folder | Role |
| :--- | :--- |
| `scraper.py` | Pure stdlib Python scraper. Fetches iDengue HTML, extracts state & Malaysia totals, maps Malaysian Epidemiological Weeks (ME 2025–2026), resolves missing-day gaps retrospectively, enforces MYT (UTC+8) timestamps, updates CSV/JSON, and compiles `data.js`. |
| `index.html` | Single-page dashboard markup with cache-busting headers, early theme/language initialization (`localStorage`), KPI cards, 2x2 chart grid, full-width 15-state bar chart, and date-navigable table. |
| `style.css` | Theme variables (`[data-theme="light" \| "dark"]`), explicit CSS `grid-template-areas` for the strict 2x2 plot arrangement (collapsing to 1 column only below `768px`), and responsive card/control styling. |
| `app.js` | All chart rendering (Chart.js 4.4.1), BM/EN `TRANSLATIONS` dictionary, `STATE_COLORS_LIGHT` & `STATE_COLORS_DARK` rank-alternating palettes, DOSM incidence rate calculator, 28-day trend regression for the 7-day 14D MA projection, and multi-state preset/chip logic. |
| `data.js` | Auto-generated JS bundle (`window.IDENGUE_DATA`) so the dashboard loads with **zero CORS errors** on `file://`, `localhost`, and GitHub Pages. |
| `data/latest.json` & `data/latest.csv` | Latest single-day snapshot. |
| `data/historical_dengue_cases.csv` | Idempotent master time-series database (prevents duplicate rows for the same date; tags `data_source` as `idengue_official` or `retrospective_calculation`). |
| `data/daily/YYYY-MM-DD.csv` | Archived individual daily CSV snapshots. |
| `.github/workflows/daily_scrape.yml` | Twice-daily GitHub Actions cron workflow that runs `scraper.py` and auto-commits new data. |

### Key Implementation Details & Gotchas to Remember

- **Epidemiological Week Calendar (Sun–Sat)**:
  - **2025**: ME 01 starts `2024-12-29` → ME 53 ends `2026-01-03` (53 weeks).
  - **2026**: ME 01 starts `2026-01-04` → ME 52 ends `2027-01-02` (52 weeks).
  - *(Reminder: update `ew_2027_start` / calendar logic before 2027 if needed — `2027-01-03` is already pre-wired in `scraper.py`.)*
- **Retrospective Gap Calculation**:
  - When a date gap (≥ 2 days) occurs between the last stored date and the new iDengue report, `resolve_gaps()` computes `cum_before_curr = cum_curr - daily_curr` and distributes `cum_before_curr - cum_prev` across missing dates tagged as `retrospective_calculation`.
- **14-Day MA & 7-Day Projection Math**:
  - The smoothed curve always uses a 14-day moving average window; the 7-day forward projection estimates the daily trend slope from the trailing 28 days of baseline data and rolls the 14-day window forward day by day.
- **Cache Busting on GitHub Pages**:
  - `data.js` and `app.js` are dynamically injected with `?v=Date.now()` in `index.html`.
  - When making major CSS layout edits to `style.css`, bump the query version string (`style.css?v=...`) in `index.html` so browsers don't hold onto old grid rules.
- **Temporal Dead Zone Watchout in `app.js`**:
  - Always initialize `const tc = getChartThemeColors();` at the top of any `render*Chart()` function before calling `getStateColor(state, tc.isDark)`.

### Local Development & Manual Commands

```bash
# 1. Sync latest automated data from GitHub
git pull origin main

# 2. Run scraper manually once (fetches live iDengue & rebuilds data/ + data.js)
python scraper.py

# 3. Preview dashboard locally at http://localhost:8000
python -m http.server 8000
```

### Automation & Deployment Setup (GitHub Actions + Pages)

- **Workflow**: `.github/workflows/daily_scrape.yml`
  - **Schedule**: `cron: '15 0,5 * * *'` (runs twice daily at **00:15 UTC / 8:15 AM MYT** and **05:15 UTC / 1:15 PM MYT**, offset to `:15` to avoid GitHub runner top-of-the-hour queues).
  - **Manual trigger**: Supported via `workflow_dispatch` in the GitHub Actions tab.
  - **Commit behavior**: Only commits & pushes `data/` and `data.js` if `git diff --staged` detects new data.
- **GitHub Pages**:
  - Repository: `https://github.com/MohdAzmiSuliman/dailycaseden_iden`
  - Configured under **Settings → Pages → Deploy from a branch (`main`, `/ (root)`)**.
  - Live URL: `https://MohdAzmiSuliman.github.io/dailycaseden_iden/`
