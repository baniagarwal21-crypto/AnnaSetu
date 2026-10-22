import argparse
import json
import sys
import warnings
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score

warnings.filterwarnings("ignore")

HERE = Path(__file__).resolve().parent
ATTENDANCE_FILE = HERE / "Mess_attendance_dataset_fixed.csv"
CALENDAR_FILE = HERE / "Holidays_final_fixed.csv"
MODEL_FILE = HERE / "mess_model.joblib"
METRICS_FILE = HERE / "metrics.json"

TARGETS = ["breakfast", "lunch", "dinner"]
PLAIN_LABELS = {"Sunday (Weekly Holiday)", "First Saturday", "Third Saturday"}
CAP = 30  # days, cap for "days since / until closure"

FEATURES = [
    "dow", "is_sunday", "is_first_sat", "is_third_sat", "is_public_holiday",
    "holiday_run_len", "holiday_run_pos", "days_since_closed", "days_to_next_closed",
]


# ----------------------------------------------------------------------------
# Loading and checking data
# ----------------------------------------------------------------------------
def load_attendance(path=ATTENDANCE_FILE):
    df = pd.read_csv(path)
    need = ["date", "holiday", "consecutive_holiday_days", "mess_status", *TARGETS]
    miss = [c for c in need if c not in df.columns]
    if miss:
        raise ValueError(f"Attendance file is missing columns: {miss}")
    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df = df.dropna(subset=["date"]).copy()
    for c in TARGETS:
        df[c] = pd.to_numeric(df[c], errors="coerce")
    df["holiday"] = df["holiday"].fillna("").astype(str).str.strip()
    df["mess_status"] = df["mess_status"].fillna("").astype(str).str.strip().str.title()
    if df["date"].duplicated().any():
        raise ValueError("Attendance file has duplicate dates.")
    return df.sort_values("date").reset_index(drop=True)


def load_calendar(path=CALENDAR_FILE):
    df = pd.read_csv(path)
    need = ["date", "holiday", "consecutive_holiday_days", "mess_status"]
    miss = [c for c in need if c not in df.columns]
    if miss:
        raise ValueError(f"Calendar file is missing columns: {miss}")
    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df = df.dropna(subset=["date"]).copy()
    if df["date"].duplicated().any():
        d = df.loc[df["date"].duplicated(keep=False), "date"].dt.strftime("%Y-%m-%d").unique()
        raise ValueError("Duplicate dates in calendar: " + ", ".join(d[:10]))
    df["holiday"] = df["holiday"].fillna("").astype(str).str.strip()
    df["mess_status"] = df["mess_status"].fillna("").astype(str).str.strip().str.title()
    if "verified" not in df.columns:
        df["verified"] = "Review"
    full = pd.date_range(df["date"].min(), df["date"].max())
    gaps = full.difference(df["date"])
    if len(gaps):
        raise ValueError(f"Calendar has {len(gaps)} missing dates, first: {gaps[0].date()}")
    return df.sort_values("date").reset_index(drop=True)


def _runs(flags):
    """Length of each run of consecutive True values, given to every day in the run."""
    out = np.zeros(len(flags), dtype=int)
    i = 0
    while i < len(flags):
        if flags[i]:
            j = i
            while j < len(flags) and flags[j]:
                j += 1
            out[i:j] = j - i
            i = j
        else:
            i += 1
    return out


def merged_calendar(att, cal):
    """Calendar used for features. For past dates the attendance file wins."""
    c = cal.set_index("date").copy()
    a = att.set_index("date")
    common = c.index.intersection(a.index)
    for col in ["holiday", "mess_status"]:
        c.loc[common, col] = a.loc[common, col]
    return c.reset_index()


def check_data(att, cal):
    """Return (errors, warnings). Errors stop training."""
    errors, warns = [], []
    a = att.set_index("date")
    c = cal.set_index("date")
    common = a.index.intersection(c.index)
    if len(common) < len(a):
        errors.append(f"{len(a) - len(common)} attendance dates are missing from the calendar.")
    bad = common[a.loc[common, "mess_status"].values != c.loc[common, "mess_status"].values]
    if len(bad):
        errors.append("Open/closed differs between files on: "
                      + ", ".join(d.strftime("%Y-%m-%d") for d in bad[:8]))
    # attendance sanity
    closed_with_food = att[(att["mess_status"] == "Closed") & (att[TARGETS].fillna(0).sum(axis=1) > 0)]
    open_no_food = att[(att["mess_status"] == "Open") & (att[TARGETS].fillna(0).sum(axis=1) == 0)]
    if len(closed_with_food):
        errors.append(f"{len(closed_with_food)} closed days have meals recorded.")
    if len(open_no_food):
        warns.append(f"{len(open_no_food)} open days have zero meals (closed by mistake?).")
    # streak column should follow the rule: length of each closed block / holiday run
    m = merged_calendar(att, cal)
    closed = (m["mess_status"] == "Closed").values
    hol = (m["holiday"] != "").values & ~closed
    rule = np.where(closed, _runs(closed), _runs(hol))
    given = m["consecutive_holiday_days"].values
    diff = np.where(rule != given)[0]
    # closures touching the first or last date continue outside the file: ignore those
    diff = [i for i in diff if not (closed[i] and given[i] > rule[i])]
    if diff:
        warns.append(f"consecutive_holiday_days differs from the rule on {len(diff)} dates, "
                     f"first {m['date'][diff[0]].date()}. The model does not use this column.")
    n_review = int((cal["verified"].astype(str).str.lower() == "review").sum())
    if n_review:
        warns.append(f"{n_review} calendar rows are still marked 'Review'. Check them against "
                     f"your academic calendar before relying on forecasts for those dates.")
    return errors, warns


# ----------------------------------------------------------------------------
# Features
# ----------------------------------------------------------------------------
def make_features(cal):
    """Features for every date of the calendar (needs the whole calendar for look-ahead)."""
    cal = cal.sort_values("date").reset_index(drop=True)
    d = cal["date"]
    closed = (cal["mess_status"] == "Closed").values
    label = cal["holiday"].fillna("")
    hol_open = (label != "").values & ~closed

    def public(s):
        parts = [p.strip() for p in s.split("/") if p.strip()]
        return int(any(p not in PLAIN_LABELS for p in parts))

    run_len = _runs(hol_open)
    run_pos = np.zeros(len(cal), dtype=int)
    for i in range(len(cal)):
        if hol_open[i]:
            run_pos[i] = run_pos[i - 1] + 1 if i > 0 and hol_open[i - 1] else 1

    since = np.full(len(cal), CAP)
    last = None
    for i in range(len(cal)):
        if closed[i]:
            last = i
        since[i] = min(CAP, i - last) if last is not None else CAP
    until = np.full(len(cal), CAP)
    nxt = None
    for i in range(len(cal) - 1, -1, -1):
        if closed[i]:
            nxt = i
        until[i] = min(CAP, nxt - i) if nxt is not None else CAP

    f = pd.DataFrame({
        "date": d,
        "dow": d.dt.dayofweek,
        "is_sunday": (d.dt.dayofweek == 6).astype(int),
        "is_first_sat": ((d.dt.dayofweek == 5) & (d.dt.day <= 7)).astype(int),
        "is_third_sat": ((d.dt.dayofweek == 5) & d.dt.day.between(15, 21)).astype(int),
        "is_public_holiday": label.map(public).values,
        "holiday_run_len": run_len,
        "holiday_run_pos": run_pos,
        "days_since_closed": since,
        "days_to_next_closed": until,
    })
    return f.set_index("date")


# ----------------------------------------------------------------------------
# Training and evaluation
# ----------------------------------------------------------------------------
def new_model():
    return RandomForestRegressor(n_estimators=300, min_samples_leaf=2, random_state=42, n_jobs=-1)


def evaluate(X, y, dates):
    """Expanding-window test, one month at a time, open days only."""
    months = dates.dt.to_period("M")
    rows = []
    for m in sorted(months.unique()):
        test = (months == m).values
        train = (dates < m.start_time).values
        if test.sum() < 5 or train.sum() < 30:
            continue
        rf = new_model().fit(X[train], y[train])
        pred = rf.predict(X[test])
        base = (
            pd.DataFrame(y[train], columns=TARGETS)
            .groupby(X.loc[train, "dow"].values).mean()
            .reindex(X.loc[test, "dow"].values).values
        )
        base = np.where(np.isnan(base), y[train].mean(axis=0), base)
        rows.append(pd.DataFrame({
            "month": str(m), "date": dates[test].values,
            **{f"act_{t}": y[test][:, i] for i, t in enumerate(TARGETS)},
            **{f"rf_{t}": pred[:, i] for i, t in enumerate(TARGETS)},
            **{f"base_{t}": base[:, i] for i, t in enumerate(TARGETS)},
        }))
    return pd.concat(rows, ignore_index=True)


def summarise(res):
    out = {"model": {}, "baseline": {}}
    for t in TARGETS:
        a = res[f"act_{t}"].values
        for key, col in (("model", "rf"), ("baseline", "base")):
            p = res[f"{col}_{t}"].values
            out[key][t] = {
                "mae": round(float(mean_absolute_error(a, p)), 2),
                "mape_pct": round(float(np.mean(np.abs(a - p) / a) * 100), 2),
                "r2": round(float(r2_score(a, p)), 4),
            }
    return out


def train(verbose=True):
    att = load_attendance()
    cal = load_calendar()
    errors, warns = check_data(att, cal)
    for w in warns:
        print("WARNING:", w)
    if errors:
        for e in errors:
            print("ERROR:", e)
        raise SystemExit("Fix the errors above, then run train again.")

    feats = make_features(merged_calendar(att, cal))
    rows = att[(att["mess_status"] == "Open")].dropna(subset=TARGETS).copy()
    X = feats.loc[rows["date"], FEATURES].reset_index(drop=True)
    y = rows[TARGETS].to_numpy(dtype=float)
    dates = rows["date"].reset_index(drop=True)
    if len(rows) < 60:
        raise SystemExit("Need at least 60 open days of attendance to train.")

    res = evaluate(X, y, dates)
    summary = summarise(res)
    resid = {t: (res[f"act_{t}"] - res[f"rf_{t}"]).values for t in TARGETS}
    upper = {t: round(max(0.0, float(np.percentile(resid[t], 90))), 1) for t in TARGETS}
    lower = {t: round(min(0.0, float(np.percentile(resid[t], 10))), 1) for t in TARGETS}

    if verbose:
        print(f"\nTrained on {len(rows)} open days "
              f"({rows['date'].min().date()} to {rows['date'].max().date()}).")
        print(f"Tested on {len(res)} open days, month by month, each month predicted "
              f"using only earlier months.\n")
        print(f"{'':10s}{'MAE':>8s}{'MAPE %':>9s}{'R2':>8s}   | baseline (weekday average)")
        for t in TARGETS:
            m, b = summary["model"][t], summary["baseline"][t]
            print(f"{t.capitalize():10s}{m['mae']:8.1f}{m['mape_pct']:9.1f}{m['r2']:8.3f}"
                  f"   | MAE {b['mae']:.1f}, MAPE {b['mape_pct']:.1f}%, R2 {b['r2']:.3f}")
        mm = res.groupby("month").apply(lambda g: pd.Series({
            "open_days": len(g),
            "model_MAE_lunch": mean_absolute_error(g["act_lunch"], g["rf_lunch"]),
            "baseline_MAE_lunch": mean_absolute_error(g["act_lunch"], g["base_lunch"])})).round(1)
        print("\nLunch error by month:\n" + mm.to_string())
        print(f"\nForecast band (90% of past errors): upper +{upper['lunch']}, "
              f"lower {lower['lunch']} meals for lunch.")

    model = new_model().fit(X, y)
    importance = dict(sorted(zip(FEATURES, map(float, model.feature_importances_)),
                             key=lambda kv: -kv[1]))
    bundle = {"model": model, "features": FEATURES, "upper": upper, "lower": lower,
              "trained_from": str(rows["date"].min().date()),
              "trained_to": str(rows["date"].max().date()), "n_open_days": int(len(rows))}
    joblib.dump(bundle, MODEL_FILE)
    METRICS_FILE.write_text(json.dumps({
        "summary": summary, "upper_margin": upper, "lower_margin": lower,
        "trained_from": bundle["trained_from"], "trained_to": bundle["trained_to"],
        "n_open_days": bundle["n_open_days"], "feature_importance": importance,
        "note": "Tested month by month on open days. One year of data only."}, indent=2))
    if verbose:
        print(f"\nSaved {MODEL_FILE.name} and {METRICS_FILE.name}")
    return bundle


# ----------------------------------------------------------------------------
# Prediction
# ----------------------------------------------------------------------------
class Predictor:
    def __init__(self):
        if not MODEL_FILE.exists():
            raise FileNotFoundError("No saved model. Run: python mess_model.py train")
        self.bundle = joblib.load(MODEL_FILE)
        att = load_attendance()
        self.cal = merged_calendar(att, load_calendar())
        self.verified = load_calendar().set_index("date")["verified"]
        self.feats = make_features(self.cal).copy()
        self.info = self.cal.set_index("date")

    def predict(self, date):
        d = pd.Timestamp(date).normalize()
        if d not in self.info.index:
            lo, hi = self.info.index.min().date(), self.info.index.max().date()
            raise KeyError(f"{d.date()} is not in the calendar ({lo} to {hi}). "
                           f"Add the date to the holiday file first.")
        row = self.info.loc[d]
        out = {"date": d.strftime("%Y-%m-%d"), "day": d.strftime("%A"),
               "holiday": row["holiday"] or None, "mess_status": row["mess_status"],
               "calendar_verified": str(self.verified.loc[d]).lower() != "review"}
        if row["mess_status"] == "Closed":
            zero = {t: 0 for t in TARGETS}
            return {**out, "closed": True, "meals": zero, "upper": zero, "lower": zero}
        x = self.feats.loc[[d], self.bundle["features"]]
        p = self.bundle["model"].predict(x)[0]
        meals = {t: max(0, int(round(v))) for t, v in zip(TARGETS, p)}
        up = {t: max(0, int(round(meals[t] + self.bundle["upper"][t]))) for t in TARGETS}
        lo = {t: max(0, int(round(meals[t] + self.bundle["lower"][t]))) for t in TARGETS}
        return {**out, "closed": False, "meals": meals, "upper": up, "lower": lo}

    def forecast(self, start, end):
        days = pd.date_range(start, end)
        return [self.predict(d) for d in days]


def print_prediction(r):
    print("\n" + "-" * 44)
    print(f"{r['date']} ({r['day']})")
    print("Holiday:", r["holiday"] or "none")
    print("Mess status:", r["mess_status"])
    if not r["calendar_verified"]:
        print("Note: this calendar row is still marked 'Review'.")
    if r["closed"]:
        print("Mess is closed: 0 meals.")
    else:
        for t in TARGETS:
            print(f"{t.capitalize():10s}{r['meals'][t]:5d}   (range {r['lower'][t]} to {r['upper'][t]})")
        print("Cook for the upper value if running short is worse than leftovers.")
    print("-" * 44)


def main():
    ap = argparse.ArgumentParser(description="Mess attendance model")
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("train")
    p1 = sub.add_parser("predict"); p1.add_argument("date", nargs="?")
    p2 = sub.add_parser("range"); p2.add_argument("start"); p2.add_argument("end")
    p2.add_argument("--out", default="forecast.csv")
    args = ap.parse_args()

    if args.cmd == "train":
        train()
        return
    pred = Predictor()
    if args.cmd == "predict":
        if args.date:
            print_prediction(pred.predict(args.date))
            return
        print("Enter a date (YYYY-MM-DD), or 'exit'.")
        while True:
            s = input("\nDate: ").strip()
            if s.lower() in ("exit", "quit"):
                break
            try:
                print_prediction(pred.predict(pd.to_datetime(s, format="%Y-%m-%d")))
            except (ValueError, KeyError) as e:
                print("Error:", e)
    else:
        rows = pred.forecast(args.start, args.end)
        flat = [{"date": r["date"], "day": r["day"], "holiday": r["holiday"],
                 "mess_status": r["mess_status"],
                 **{t: r["meals"][t] for t in TARGETS},
                 **{f"{t}_upper": r["upper"][t] for t in TARGETS},
                 **{f"{t}_lower": r["lower"][t] for t in TARGETS}} for r in rows]
        pd.DataFrame(flat).to_csv(args.out, index=False)
        print(f"Wrote {len(flat)} days to {args.out}")


if __name__ == "__main__":
    try:
        main()
    except (FileNotFoundError, ValueError, KeyError) as e:
        sys.exit(f"Error: {e}")
