import os
import re
import ssl
import json
import csv
from datetime import datetime, timedelta, timezone
import urllib.request
import urllib.error

MYT = timezone(timedelta(hours=8))
IDENGUE_URL = "https://idengue.mysa.gov.my/index.php"
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
DAILY_DIR = os.path.join(DATA_DIR, "daily")
HISTORICAL_CSV = os.path.join(DATA_DIR, "historical_dengue_cases.csv")
LATEST_CSV = os.path.join(DATA_DIR, "latest.csv")
LATEST_JSON = os.path.join(DATA_DIR, "latest.json")
DASHBOARD_DATA_JS = os.path.join(BASE_DIR, "data.js")


def get_epid_week(date_str: str) -> dict:
    """
    Calculate Epidemiological Week following standard Malaysian Epid calendar:
    2025: EW 1 starts 2024-12-29, EW 53 ends 2026-01-03 (53 weeks)
    2026: EW 1 starts 2026-01-04, EW 52 ends 2027-01-02 (52 weeks)
    """
    if not date_str:
        return {"year": None, "week": None, "start": "", "end": "", "label": ""}

    try:
        dt = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        return {"year": None, "week": None, "start": "", "end": "", "label": ""}

    ew_2025_start = datetime(2024, 12, 29).date()
    ew_2026_start = datetime(2026, 1, 4).date()
    ew_2027_start = datetime(2027, 1, 3).date()

    if dt >= ew_2026_start and dt < ew_2027_start:
        days = (dt - ew_2026_start).days
        w = (days // 7) + 1
        ws = ew_2026_start + timedelta(days=(w - 1) * 7)
        we = ws + timedelta(days=6)
        label = f"ME {w:02d}/{2026} ({ws.strftime('%d/%m')} - {we.strftime('%d/%m')})"
        return {"year": 2026, "week": w, "start": ws.strftime("%Y-%m-%d"), "end": we.strftime("%Y-%m-%d"), "label": label}
    elif dt >= ew_2025_start and dt < ew_2026_start:
        days = (dt - ew_2025_start).days
        w = (days // 7) + 1
        ws = ew_2025_start + timedelta(days=(w - 1) * 7)
        we = ws + timedelta(days=6)
        label = f"ME {w:02d}/{2025} ({ws.strftime('%d/%m')} - {we.strftime('%d/%m')})"
        return {"year": 2025, "week": w, "start": ws.strftime("%Y-%m-%d"), "end": we.strftime("%Y-%m-%d"), "label": label}
    elif dt >= ew_2027_start:
        days = (dt - ew_2027_start).days
        w = (days // 7) + 1
        ws = ew_2027_start + timedelta(days=(w - 1) * 7)
        we = ws + timedelta(days=6)
        label = f"ME {w:02d}/{2027} ({ws.strftime('%d/%m')} - {we.strftime('%d/%m')})"
        return {"year": 2027, "week": w, "start": ws.strftime("%Y-%m-%d"), "end": we.strftime("%Y-%m-%d"), "label": label}

    return {"year": dt.year, "week": 1, "start": date_str, "end": date_str, "label": f"ME 01/{dt.year}"}


def fetch_html(url: str, timeout: int = 30) -> str:
    """Fetch raw HTML from iDengue, handling SSL certs and headers."""
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/124.0.0.0 Safari/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,ms;q=0.8",
    }

    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, context=ctx, timeout=timeout) as response:
        return response.read().decode("utf-8", errors="ignore")


def parse_date_str(date_str: str) -> str:
    """Convert '31 Aug 2026' or '4 Jan 2026' into 'YYYY-MM-DD'."""
    if not date_str:
        return ""
    clean = " ".join(date_str.strip().split())
    month_map = {
        "jan": "Jan", "feb": "Feb", "mac": "Mar", "mar": "Mar", "apr": "Apr",
        "mei": "May", "may": "May", "jun": "Jun", "jul": "Jul", "ogo": "Aug",
        "ogos": "Aug", "aug": "Aug", "sep": "Sep", "sept": "Sep", "okt": "Oct",
        "oct": "Oct", "nov": "Nov", "dis": "Dec", "dec": "Dec"
    }
    parts = clean.split()
    if len(parts) == 3:
        day, month, year = parts
        month_norm = month_map.get(month.lower(), month)
        clean = f"{day} {month_norm} {year}"
        for fmt in ("%d %b %Y", "%d %B %Y"):
            try:
                dt = datetime.strptime(clean, fmt)
                return dt.strftime("%Y-%m-%d")
            except ValueError:
                continue
    return clean


def parse_idengue(html: str) -> dict:
    """Parse report dates, state records, and national total from HTML."""
    # 1. Extract Report Date
    date_match = re.search(
        r"KES\s+HARIAN.*?PADA.*?<span[^>]*>\s*([0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4})",
        html,
        re.IGNORECASE | re.DOTALL,
    )
    raw_report_date = date_match.group(1).strip() if date_match else None
    iso_report_date = parse_date_str(raw_report_date) if raw_report_date else datetime.now().strftime("%Y-%m-%d")

    # 2. Extract Cumulative Date Range
    cum_match = re.search(
        r"JUMLAH\s+KES\s+TERKUMPUL.*?DARI\s*<span[^>]*>\s*([0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4})\s*</span>\s*HINGGA.*?<span[^>]*>\s*([0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4})\s*</span>",
        html,
        re.IGNORECASE | re.DOTALL,
    )
    raw_cum_from = cum_match.group(1).strip() if cum_match else None
    raw_cum_to = cum_match.group(2).strip() if cum_match else None
    iso_cum_from = parse_date_str(raw_cum_from) if raw_cum_from else ""
    iso_cum_to = parse_date_str(raw_cum_to) if raw_cum_to else ""

    # 3. Extract State Records
    state_pattern = re.compile(
        r"<td>([A-Z\s]+)</td>\s*<td[^>]*>([0-9,]+)</td>\s*<td[^>]*>([0-9,]+)</td>",
        re.IGNORECASE,
    )
    state_matches = state_pattern.findall(html)

    records = []
    for state_name, daily, cumulative in state_matches:
        cleaned_state = state_name.strip()
        if not cleaned_state or cleaned_state.upper() == "NEGERI":
            continue
        try:
            daily_int = int(daily.replace(",", "").strip())
            cum_int = int(cumulative.replace(",", "").strip())
        except ValueError:
            continue

        records.append({
            "state": cleaned_state,
            "daily_cases": daily_int,
            "cumulative_cases": cum_int,
        })

    # Sort state records by cumulative cases descending (highest on top)
    records.sort(key=lambda x: x["cumulative_cases"], reverse=True)

    # 4. Extract Total Malaysia
    total_match = re.search(
        r"MALAYSIA.*?<td[^>]*>.*?<strong>([0-9,]+)</strong>.*?<td[^>]*>.*?<strong>([0-9,]+)</strong>",
        html,
        re.DOTALL | re.IGNORECASE,
    )
    if total_match:
        total_daily = int(total_match.group(1).replace(",", "").strip())
        total_cum = int(total_match.group(2).replace(",", "").strip())
    else:
        total_daily = sum(r["daily_cases"] for r in records)
        total_cum = sum(r["cumulative_cases"] for r in records)

    ew_info = get_epid_week(iso_report_date)

    return {
        "report_date": iso_report_date,
        "report_date_raw": raw_report_date,
        "epid_year": ew_info["year"],
        "epid_week": ew_info["week"],
        "epid_week_label": ew_info["label"],
        "epid_week_start": ew_info["start"],
        "epid_week_end": ew_info["end"],
        "cumulative_start_date": iso_cum_from,
        "cumulative_start_raw": raw_cum_from,
        "cumulative_end_date": iso_cum_to,
        "cumulative_end_raw": raw_cum_to,
        "scraped_at": datetime.now(MYT).isoformat(),
        "states": records,
        "total": {
            "state": "MALAYSIA",
            "daily_cases": total_daily,
            "cumulative_cases": total_cum,
        },
    }


def save_data(data: dict):
    """Save latest snapshot, daily file, and append to historical CSV."""
    os.makedirs(DAILY_DIR, exist_ok=True)

    report_date = data["report_date"]
    scraped_at = data["scraped_at"]
    cum_start = data["cumulative_start_date"]
    cum_end = data["cumulative_end_date"]
    ew_year = data["epid_year"]
    ew_week = data["epid_week"]
    ew_label = data["epid_week_label"]

    fieldnames = [
        "date",
        "epid_year",
        "epid_week",
        "epid_week_label",
        "state",
        "daily_cases",
        "cumulative_cases",
        "cumulative_start_date",
        "cumulative_end_date",
        "scraped_at",
    ]

    all_rows = []
    for s in data["states"]:
        all_rows.append({
            "date": report_date,
            "epid_year": ew_year,
            "epid_week": ew_week,
            "epid_week_label": ew_label,
            "state": s["state"],
            "daily_cases": s["daily_cases"],
            "cumulative_cases": s["cumulative_cases"],
            "cumulative_start_date": cum_start,
            "cumulative_end_date": cum_end,
            "scraped_at": scraped_at,
        })
    # Add Malaysia total row
    all_rows.append({
        "date": report_date,
        "epid_year": ew_year,
        "epid_week": ew_week,
        "epid_week_label": ew_label,
        "state": data["total"]["state"],
        "daily_cases": data["total"]["daily_cases"],
        "cumulative_cases": data["total"]["cumulative_cases"],
        "cumulative_start_date": cum_start,
        "cumulative_end_date": cum_end,
        "scraped_at": scraped_at,
    })

    # 1. Save Latest CSV
    with open(LATEST_CSV, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(all_rows)

    # 2. Save Latest JSON
    with open(LATEST_JSON, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    # 3. Save Daily Snapshot CSV
    daily_csv_path = os.path.join(DAILY_DIR, f"{report_date}.csv")
    with open(daily_csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(all_rows)

    # 4. Append to Historical CSV (Idempotent update)
    existing_rows = []
    if os.path.exists(HISTORICAL_CSV):
        with open(HISTORICAL_CSV, "r", newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row.get("date") != report_date:
                    # Enrich old row with epid week if missing
                    if not row.get("epid_week"):
                        ew = get_epid_week(row.get("date"))
                        row["epid_year"] = ew["year"]
                        row["epid_week"] = ew["week"]
                        row["epid_week_label"] = ew["label"]
                    existing_rows.append(row)

    updated_historical = existing_rows + all_rows
    updated_historical.sort(key=lambda x: (x["date"], x["state"] == "MALAYSIA", -int(x.get("cumulative_cases") or 0)))

    with open(HISTORICAL_CSV, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(updated_historical)

    # 5. Build weekly and daily trend aggregations for dashboard data.js
    build_dashboard_dataset(updated_historical, data)


def build_dashboard_dataset(historical_rows: list, latest_data: dict):
    """Aggregate historical rows into daily and epid-weekly trends for frontend charts."""
    # Daily trend per state and total
    daily_map = {} # date -> {state: daily_cases}
    weekly_map = {} # (epid_year, epid_week) -> {state: sum_daily_cases, "label": ...}

    for row in historical_rows:
        d = row["date"]
        st = row["state"]
        daily_c = int(row["daily_cases"])
        cum_c = int(row["cumulative_cases"])
        y = row.get("epid_year") or ""
        w = row.get("epid_week") or ""
        w_lbl = row.get("epid_week_label") or f"ME {w}/{y}"

        if d not in daily_map:
            daily_map[d] = {}
        daily_map[d][st] = daily_c

        wk_key = f"{y}-W{int(w):02d}" if (y and w) else "Unknown"
        if wk_key not in weekly_map:
            weekly_map[wk_key] = {"label": w_lbl, "year": y, "week": w, "states": {}, "totals": {}}
        
        if st not in weekly_map[wk_key]["states"]:
            weekly_map[wk_key]["states"][st] = 0
        weekly_map[wk_key]["states"][st] += daily_c

    # Convert to sorted lists
    sorted_dates = sorted(daily_map.keys())
    sorted_weeks = sorted(weekly_map.keys())

    bundle = {
        "latest": latest_data,
        "dates": sorted_dates,
        "daily_matrix": daily_map,
        "weeks": sorted_weeks,
        "weekly_matrix": weekly_map,
    }

    # Write as data.js for zero-CORS direct local browser execution (double-click index.html works out of the box!)
    js_content = f"window.IDENGUE_DATA = {json.dumps(bundle, indent=2, ensure_ascii=False)};"
    with open(DASHBOARD_DATA_JS, "w", encoding="utf-8") as f:
        f.write(js_content)


def main():
    print("=" * 65)
    print("iDengue Daily Statistics Scraper & Dashboard Engine")
    print(f"Target URL: {IDENGUE_URL}")
    print("=" * 65)

    print("\n[1/3] Fetching live HTML from iDengue...")
    html = fetch_html(IDENGUE_URL)
    print(f"-> Retrieved {len(html)} bytes.")

    print("\n[2/3] Parsing table & Epidemiological Week...")
    data = parse_idengue(html)

    print(f"-> Report Date      : {data['report_date']} ({data['report_date_raw']})")
    print(f"-> Epid Week        : {data['epid_week_label']}")
    print(f"-> Cumulative Period: {data['cumulative_start_date']} to {data['cumulative_end_date']}")
    print(f"-> States Extracted : {len(data['states'])} (Sorted by Cumulative Descending)")

    print("\n[3/3] Saving data & building dashboard dataset...")
    save_data(data)
    print(f"-> Latest CSV       : {LATEST_CSV}")
    print(f"-> Latest JSON      : {LATEST_JSON}")
    print(f"-> Historical CSV   : {HISTORICAL_CSV}")
    print(f"-> Dashboard Data JS: {DASHBOARD_DATA_JS}")

    # Display clean sorted table
    print("\n" + "=" * 65)
    print(f"DENGUE CASES - {data['report_date_raw']} | {data['epid_week_label']}")
    print(f"Sorted by Cumulative Cases (Highest on Top)")
    print("=" * 65)
    print(f"{'#':<3} | {'NEGERI':<28} | {'KES HARIAN':<12} | {'KES TERKUMPUL':<15}")
    print("-" * 65)
    for idx, s in enumerate(data["states"], 1):
        print(f"{idx:<3} | {s['state']:<28} | {s['daily_cases']:<12} | {s['cumulative_cases']:<15}")
    print("-" * 65)
    tot = data["total"]
    print(f"TOTAL | {tot['state']:<26} | {tot['daily_cases']:<12} | {tot['cumulative_cases']:<15}")
    print("=" * 65)


if __name__ == "__main__":
    main()
