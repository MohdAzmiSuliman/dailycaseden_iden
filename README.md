# 🦟 iDengue Daily Cases Surveillance & Automation Engine

Automated daily scraper, historical time-series generator, and interactive surveillance dashboard for dengue fever cases across all 15 Malaysian states, sourced officially from CPRC Kementerian Kesihatan Malaysia (KKM) & Agensi Angkasa Malaysia (MYSA) via [iDengue](https://idengue.mysa.gov.my/index.php).

---

## ✨ Features

1. **Robust Web Scraper (`scraper.py`)**:
   - Fetches live data from iDengue's statistics page.
   - Robustly parses the official HTML table structure with regex and fallback extractors.
   - Extracts daily cases, cumulative cases, report date, and cumulative period.
   - Automatically maps dates to official **Malaysian Epidemiological Weeks (Minggu Epidemiologi / ME 2025–2026)**.

2. **Structured Historical Datasets**:
   - **`data/latest.csv`** & **`data/latest.json`**: Current snapshot.
   - **`data/historical_dengue_cases.csv`**: Master time-series database (idempotent, prevents duplicate runs on the same date).
   - **`data/daily/YYYY-MM-DD.csv`**: Individual daily snapshot archives.

3. **Modern Static Dashboard (`index.html` & `app.js`)**:
   - **2x2 Balanced Grid Layout**:
     - *Row 1*: N/A Dates (Unreleased Bulletins) | Weekly Total Cases (Epidemiological Weeks).
     - *Row 2*: Daily Total Cases | Daily Cases 14-Day Moving Average & 7-Day Projection.
     - *Row 3*: Dengue Case Comparison Across 15 Malaysian States (Interactive horizontal ranking with Linear/Log scale and zoom controls).
   - **14-Day Moving Average & 7-Day Projection**:
     - Displays 7 days prior observed moving average.
     - Projects the next 7 days forward using a 28-day baseline trend regression.
   - **Quick Comparison Presets (Default: Perak $\pm 2$)**:
     - Multi-state comparison mode defaults to **Perak ($\pm 2$)** (`NEGERI SEMBILAN`, `SABAH`, `PERAK`, `KELANTAN`, `PULAU PINANG`).
   - **High-Contrast Alternating Color Palette**:
     - Rank-alternating palette so adjacent/neighboring rank states never share similar hues (e.g. Sabah is Forest Emerald Green `#059669`, while Pulau Pinang is Electric Sky Blue `#0284C7`).
   - **Main Table Sorted by Cumulative Descending**:
     - Highest cases on top (Selangor, WP Kuala Lumpur, Johor...).
   - **100% Client-Side / Zero-CORS**: Works immediately on local double-click and on GitHub Pages.

---

## 📊 Latest Extracted Baseline (01 Nov 2026 / ME 44)

| # | Negeri | Kes Harian (01 Nov 2026) | Jumlah Kes Terkumpul (YTD) | % Sumbangan |
| -: | :--- | :---: | :---: | :---: |
| 1 | **SELANGOR** | 63 | 33,400 | 41.82% |
| 2 | **WILAYAH PERSEKUTUAN** | 21 | 13,306 | 16.66% |
| 3 | **JOHOR** | 42 | 13,068 | 16.36% |
| 4 | **NEGERI SEMBILAN** | 14 | 5,297 | 6.63% |
| 5 | **SABAH** | 13 | 4,713 | 5.90% |
| 6 | **PERAK** | 14 | 2,595 | 3.25% |
| 7 | **KELANTAN** | 2 | 1,927 | 2.41% |
| 8 | **PULAU PINANG** | 6 | 1,320 | 1.65% |
| 9 | **SARAWAK** | 6 | 999 | 1.25% |
| 10 | **PAHANG** | 6 | 957 | 1.20% |
| 11 | **KEDAH** | 0 | 759 | 0.95% |
| 12 | **MELAKA** | 0 | 699 | 0.88% |
| 13 | **TERENGGANU** | 0 | 617 | 0.77% |
| 14 | **PERLIS** | 0 | 199 | 0.25% |
| 15 | **WILAYAH PERSEKUTUAN LABUAN** | 0 | 17 | 0.02% |
| ★ | **MALAYSIA (TOTAL)** | **187** | **79,873** | **100.0%** |

---

## 🗓️ Epidemiological Calendar Mapping (ME 2025–2026)

The scraper embeds the exact Malaysian Epidemiological Weeks calendar (Sunday to Saturday cycle):
- **2026**: Week 1 (04/01/2026 – 10/01/2026) through Week 52 (27/12/2026 – 02/01/2027).
- **2025**: Week 1 (29/12/2024 – 04/01/2025) through Week 53 (28/12/2025 – 03/01/2026).

---

## 🚀 How to Run Locally

### 1. Run Scraper
```bash
python scraper.py
```
This will:
- Connect to iDengue and scrape the live table.
- Save data to `data/` and generate `data.js`.
- Print a formatted summary to your terminal.

### 2. View Dashboard
Simply double-click `index.html` in your file explorer, or start a local server:
```bash
python -m http.server 8000
```
Then open `http://localhost:8000` in your browser.

---

## ⚡ Free Daily Cloud Automation (GitHub Actions & Pages)

### Automatic Daily Runs (Twice Per Day)
A GitHub Actions workflow is located at `.github/workflows/daily_scrape.yml`.
- **Morning Check**: **00:15 UTC (8:15 AM MYT)**
- **Afternoon Check**: **05:15 UTC (1:15 PM MYT)** (post-midday release)
- Cron expression: `15 0,5 * * *`
- Commits and pushes any updated data files to your repository automatically.
- Costs **$0.00 / RM 0.00** (Free on public repositories).

### Host Live Dashboard on GitHub Pages (Free)
1. Go to your GitHub repository: `https://github.com/MohdAzmiSuliman/dailycaseden_iden`
2. Click **Settings** > **Pages** (on the left menu).
3. Under **Build and deployment > Source**, select **Deploy from a branch**.
4. Choose Branch: `main` and Folder: `/ (root)`. Click **Save**.
5. Your live dashboard will be accessible at:
   `https://MohdAzmiSuliman.github.io/dailycaseden_iden/`

---

## 📝 License & Attribution
- Data source: CPRC Kementerian Kesihatan Malaysia (KKM) & Agensi Angkasa Malaysia (MYSA) melalui [iDengue](https://idengue.mysa.gov.my/index.php).
