# 🦟 Malaysia Dengue Count Dashboard & Surveillance

[![Live Dashboard](https://img.shields.io/badge/🌐_Live_Dashboard-Visit_Website-06B6D4?style=for-the-badge)](https://MohdAzmiSuliman.github.io/dailycaseden_iden/)
[![Daily Ingestion & Dashboard Update](https://github.com/MohdAzmiSuliman/dailycaseden_iden/actions/workflows/daily_scrape.yml/badge.svg)](https://github.com/MohdAzmiSuliman/dailycaseden_iden/actions/workflows/daily_scrape.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Zero-Dependency](https://img.shields.io/badge/Python-Standard%20Lib-brightgreen.svg)](scraper.py)

> 🔗 **Live Surveillance Dashboard**: [https://MohdAzmiSuliman.github.io/dailycaseden_iden/](https://MohdAzmiSuliman.github.io/dailycaseden_iden/)

Automated daily scraper, historical time-series generator, and interactive surveillance dashboard for dengue fever cases in Malaysia, sourced directly from official **[iDengue MYSA](https://idengue.mysa.gov.my/)** / **CPRC KKM**.

> ℹ️ *Halaman Rasmi iDengue hanya melaporkan jumlah kes harian dan kumulatif. Halaman ini mengambil data yang dilaporkan oleh iDengue, dan memetakan tren kes harian.*

---

## 🌟 Key Features

1. **Daily Automated Ingestion**:
   - Fetches live statistics from iDengue (handling SSL certs and dynamic reporting changes).
   - Extracts daily cases, cumulative cases, report date, and cumulative period.
   - Automatically maps dates to official **Malaysian Epidemiological Weeks (Minggu Epidemiologi / ME 2025–2026)**.

2. **Structured Historical Datasets**:
   - **`data/latest.csv`** & **`data/latest.json`**: Current snapshot.
   - **`data/historical_dengue_cases.csv`**: Master time-series database (idempotent, prevents duplicate runs on the same date).
   - **`data/daily/YYYY-MM-DD.csv`**: Individual daily snapshot archives.

3. **Modern Static Dashboard (`index.html`)**:
   - **Main Table Sorted by Cumulative Descending** (highest cases on top, e.g. Selangor, WP Kuala Lumpur, Johor...).
   - **Daily Trend Chart**: Tracks daily cases across all days.
   - **Weekly Epid Trend Chart**: Aggregates cases by Epidemiological Week (Ahad – Sabtu).
   - **State Filter Dropdown**: View trends for All Malaysia or drill down into specific states (Perak, Selangor, Sabah, etc.).
   - **100% Client-Side / Zero-CORS**: Works immediately on local double-click and on GitHub Pages.

---

## 📊 Today's Extracted Baseline (31 Aug 2026 / ME 35)

| # | Negeri | Kes Harian (31 Aug 2026) | Jumlah Kes Terkumpul (YTD) | % Sumbangan |
| -: | :--- | :---: | :---: | :---: |
| 1 | **SELANGOR** | 94 | 27,371 | 42.83% |
| 2 | **WILAYAH PERSEKUTUAN** | 36 | 11,109 | 17.38% |
| 3 | **JOHOR** | 76 | 10,014 | 15.67% |
| 4 | **NEGERI SEMBILAN** | 13 | 4,038 | 6.32% |
| 5 | **SABAH** | 11 | 3,951 | 6.18% |
| 6 | **PERAK** | 0 | 1,942 | 3.04% |
| 7 | **KELANTAN** | 13 | 1,416 | 2.22% |
| 8 | **PULAU PINANG** | 4 | 998 | 1.56% |
| 9 | **PAHANG** | 0 | 732 | 1.15% |
| 10 | **SARAWAK** | 4 | 696 | 1.09% |
| 11 | **KEDAH** | 2 | 655 | 1.02% |
| 12 | **MELAKA** | 4 | 527 | 0.82% |
| 13 | **TERENGGANU** | 3 | 266 | 0.42% |
| 14 | **PERLIS** | 0 | 172 | 0.27% |
| 15 | **WILAYAH PERSEKUTUAN LABUAN** | 0 | 15 | 0.02% |
| ★ | **MALAYSIA (TOTAL)** | **260** | **63,902** | **100.0%** |

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

### Automatic Daily Run
A GitHub Actions workflow is located at `.github/workflows/daily_scrape.yml`.
- Runs automatically everyday at **02:00 UTC (10:00 AM MYT)**.
- Commits and pushes any updated data files to your repository.
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
