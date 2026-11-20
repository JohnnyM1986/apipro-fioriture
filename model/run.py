"""Riga di comando del modello di previsione ApiPRO.

  python model/run.py fetch-history   # scarica lo storico ERA5-Land 1991-2025 (riprende da dove si era fermato)
  python model/run.py calibrate       # soglie in gradi giorno per specie -> model/output/calibration.json
  python model/run.py hindcast        # verifica a ritroso 2024-2025 -> model/output/hindcast.json/.md
  python model/run.py forecast        # previsioni della stagione -> app/public/data/predictions.json

Pensato per girare su GitHub Actions (cartella .github/workflows).
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

import numpy as np
import pandas as pd
import yaml

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "model"))

from apipro_model import openmeteo, thermal  # noqa: E402

MODEL_VERSION = "0.2.0"
HISTORY = ROOT / "model" / "data" / "history.csv.gz"
ELEVATIONS = ROOT / "model" / "data" / "elevations.json"
OUT = ROOT / "model" / "output"
APP_DATA = ROOT / "app" / "public" / "data"
HIST_START, HIST_END = date(1991, 1, 1), date(2025, 12, 31)
HINDCAST_YEARS = (2024, 2025)
ISSUE_DATES = ("01-15", "03-01", "04-01", "05-01")


def load_config():
    species = yaml.safe_load((ROOT / "config" / "species.yaml").read_text())["species"]
    points = yaml.safe_load((ROOT / "config" / "points.yaml").read_text())["points"]
    return species, points


def load_history() -> pd.DataFrame:
    if HISTORY.exists():
        df = pd.read_csv(HISTORY, parse_dates=["date"])
        df["date"] = df["date"].dt.date
        return df
    return pd.DataFrame(columns=["point_id", "date", "tmax", "tmin"])


def load_elevations() -> dict:
    return json.loads(ELEVATIONS.read_text()) if ELEVATIONS.exists() else {}


def temps_by_point(df: pd.DataFrame) -> dict[str, pd.Series]:
    return {pid: thermal.tmean(g) for pid, g in df.groupby("point_id")}


# ---------------------------------------------------------------- storico
def cmd_fetch_history(_args) -> None:
    _, points = load_config()
    hist = load_history()
    elev = load_elevations()
    have = hist.groupby("point_id")["date"].agg(["min", "max", "count"]) if len(hist) else pd.DataFrame()
    expected = (HIST_END - HIST_START).days + 1
    done = 0
    for p in points:
        if p["id"] in have.index and have.loc[p["id"], "count"] >= expected - 10:
            continue
        try:
            df, e = openmeteo.fetch_archive(p, HIST_START, HIST_END)
        except openmeteo.RateLimited as exc:
            print(f"Limite Open-Meteo raggiunto dopo {done} punti: riprendo alla prossima esecuzione. {exc}")
            break
        except Exception as exc:  # rete instabile: salvo quanto scaricato e riprendo alla prossima esecuzione
            print(f"Errore di rete su {p['id']} dopo {done} punti: {exc}")
            break
        hist = pd.concat([hist[hist.point_id != p["id"]], df], ignore_index=True)
        elev[p["id"]] = e
        HISTORY.parent.mkdir(parents=True, exist_ok=True)
        hist.to_csv(HISTORY, index=False, float_format="%.1f", compression="gzip")
        ELEVATIONS.write_text(json.dumps(elev, indent=1))
        done += 1
        print(f"{p['id']}: {len(df)} giorni, quota {e} m", flush=True)
        time.sleep(3)
    missing = [p["id"] for p in points if p["id"] not in set(hist.point_id)]
    print(f"Storico: {hist.point_id.nunique()} punti su {len(points)}; mancano: {missing or 'nessuno'}")


# ---------------------------------------------------------------- calibrazione
def calibrations(species, points, temps) -> dict[str, thermal.Calibration]:
    cals = {}
    for s in species:
        if s.get("model") != "thermal_time" or not s.get("literature_window"):
            continue
        c = thermal.calibrate(s, temps, points)
        if c:
            cals[s["id"]] = c
    return cals


def cmd_calibrate(_args) -> None:
    species, points = load_config()
    temps = temps_by_point(load_history())
    cals = calibrations(species, points, temps)
    OUT.mkdir(parents=True, exist_ok=True)
    data = {sid: {"base_temp_c": c.base, "thresholds_gdd": {k: round(v, 1) for k, v in c.thresholds.items()},
                  "spread_p10_p90": {k: [round(a, 1), round(b, 1)] for k, (a, b) in c.spread.items()},
                  "n_samples": c.n_samples, "calibration_points": c.points}
            for sid, c in cals.items()}
    (OUT / "calibration.json").write_text(json.dumps(data, indent=1, ensure_ascii=False))
    for sid, d in data.items():
        print(sid, d["thresholds_gdd"], "campioni", d["n_samples"])


# ---------------------------------------------------------------- verifica a ritroso
def cmd_hindcast(_args) -> None:
    species, points = load_config()
    temps = temps_by_point(load_history())
    elev = load_elevations()
    cals = calibrations(species, points, temps)
    rows = []
    for sid, cal in cals.items():
        for p in points:
            t = temps.get(p["id"])
            if t is None:
                continue
            for y in HINDCAST_YEARS:
                final = thermal.observed_dates(t, y, cal)
                for ph in thermal.PHASES:
                    if final.get(ph) is None:
                        continue
                    f = {"p50": final[ph]}
                    for iss in ISSUE_DATES:
                        m, d = (int(x) for x in iss.split("-"))
                        issue = date(y, m, d)
                        if thermal.doy(issue) >= f["p50"]:
                            continue
                        fc = thermal.forecast_point(t, y, issue, cal)
                        if not fc.get(ph):
                            continue
                        rows.append({"species": sid, "point": p["id"], "zone": p["zone"],
                                     "elevation": elev.get(p["id"]), "year": y, "phase": ph,
                                     "issue": iss, "final_doy": f["p50"], "pred_doy": fc[ph]["p50"],
                                     "p10": fc[ph]["p10"], "p90": fc[ph]["p90"]})
    df = pd.DataFrame(rows)
    OUT.mkdir(parents=True, exist_ok=True)
    if df.empty:
        print("Nessun dato per la verifica a ritroso.")
        return
    df["err"] = df.pred_doy - df.final_doy
    df["inside"] = (df.final_doy >= df.p10) & (df.final_doy <= df.p90)
    summary = (df.groupby(["species", "phase", "issue"])
                 .agg(mae_giorni=("err", lambda e: float(np.mean(np.abs(e)))),
                      bias_giorni=("err", "mean"), entro_margine=("inside", "mean"), n=("err", "size"))
                 .reset_index())
    # differenza tra le due stagioni (data finale reale, pianura e collina)
    pc = df[(df.issue == ISSUE_DATES[0]) & df.zone.isin(["pianura", "collina"])]
    years = (pc.groupby(["species", "phase", "year"]).final_doy.median().unstack("year").reset_index())
    # gradiente di quota (giorni ogni 100 m) sulla data finale di F1
    grad = []
    for (sid, y), g in df[(df.phase == "F1") & (df.issue == ISSUE_DATES[0])].dropna(subset=["elevation"]).groupby(["species", "year"]):
        if g.elevation.nunique() > 3:
            slope = np.polyfit(g.elevation.astype(float), g.final_doy.astype(float), 1)[0] * 100
            grad.append({"species": sid, "year": int(y), "giorni_per_100m": round(float(slope), 2), "n_punti": len(g)})
    out = {"generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
           "model_version": MODEL_VERSION, "issue_dates": ISSUE_DATES,
           "summary": summary.round(2).to_dict(orient="records"),
           "season_medians": years.round(0).to_dict(orient="records"),
           "elevation_gradient_F1": grad}
    (OUT / "hindcast.json").write_text(json.dumps(out, indent=1, ensure_ascii=False, default=float))
    df.to_csv(OUT / "hindcast_rows.csv", index=False)
    md = ["# Verifica a ritroso 2024-2025", "",
          f"Modello {MODEL_VERSION}. Errore = data prevista alla data di emissione − data calcolata a fine stagione "
          "con il meteo reale (giorni). Margine = 10°-90° percentile degli anni analoghi.", "",
          "| Specie | Fase | Emissione | Errore medio (gg) | Scostamento medio (gg) | Entro il margine | N |",
          "|---|---|---|---|---|---|---|"]
    for r in summary.itertuples():
        md.append(f"| {r.species} | {r.phase} | {r.issue} | {r.mae_giorni:.1f} | {r.bias_giorni:+.1f} | {r.entro_margine:.0%} | {r.n} |")
    md += ["", "## Gradiente di quota (inizio fioritura F1)", "", "| Specie | Anno | Giorni ogni 100 m | Punti |", "|---|---|---|---|"]
    md += [f"| {g['species']} | {g['year']} | {g['giorni_per_100m']} | {g['n_punti']} |" for g in grad]
    (OUT / "hindcast.md").write_text("\n".join(md) + "\n")
    print("\n".join(md))


# ---------------------------------------------------------------- previsione
def season_for(today: date) -> int:
    return today.year + 1 if today.month >= 11 else today.year


def current_year_temps(points, today: date) -> pd.DataFrame:
    """Anno in corso: archivio ERA5-Land (con qualche giorno di ritardo) + ultimi 92 giorni e previsione a 16 giorni."""
    rec = openmeteo.fetch_recent_and_forecast_multi(points)
    try:
        arch = openmeteo.fetch_archive_multi(points, date(today.year, 1, 1), today - timedelta(days=1))
    except Exception as exc:  # archivio non disponibile: uso solo la parte recente
        print(f"archivio anno in corso non disponibile: {exc}")
        arch = rec.iloc[0:0]
    key = set(zip(arch.point_id, arch.date))
    extra = rec[[k not in key for k in zip(rec.point_id, rec.date)]]
    return pd.concat([arch, extra], ignore_index=True)


def cmd_forecast(args) -> None:
    species, points = load_config()
    today = date.fromisoformat(args.today) if args.today else date.today()
    season = season_for(today)
    hist = load_history()
    if not args.offline:
        cur = current_year_temps(points, today)
        hist = pd.concat([hist[pd.to_datetime(hist.date).dt.year < today.year], cur], ignore_index=True)
    temps = temps_by_point(hist)
    elev = load_elevations()
    cals = calibrations(species, points, temps)
    known_until = max((t.index.max().date() for t in temps.values()), default=today)
    if args.offline:
        known_until = min(known_until, today)
    preds: dict = {}
    for p in points:
        t = temps.get(p["id"])
        if t is None:
            continue
        preds[p["id"]] = {}
        for s in species:
            if not s.get("literature_window"):
                continue
            zones = s.get("calibration_zones")
            if zones and p["zone"] not in zones:
                continue
            if s["id"] in cals:
                pr = thermal.forecast_point(t, season, known_until, cals[s["id"]])
            elif s.get("model") == "calendar":
                pr = thermal.calendar_dates(s, season)
            else:
                continue
            today_doy = thermal.doy(today) if today.year == season else 0
            preds[p["id"]][s["id"]] = {**{k: v for k, v in pr.items()}, "phase_today": thermal.phase_today(pr, today_doy)}
    out = {
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "model_version": MODEL_VERSION, "season": season, "issued": today.isoformat(),
        "known_until": known_until.isoformat(),
        "sources": ["Open-Meteo (ERA5-Land, Copernicus; previsioni a 16 giorni) – CC BY 4.0",
                    "Finestre di fioritura da letteratura: config/species.yaml"],
        "species": {s["id"]: {"model": ("thermal_time" if s["id"] in cals else "calendar"),
                              "window": s.get("literature_window"),
                              "thresholds_gdd": ({k: round(v) for k, v in cals[s["id"]].thresholds.items()}
                                                 if s["id"] in cals else None)}
                    for s in species if s.get("literature_window")},
        "points": [{**{k: p[k] for k in ("id", "name", "zone", "lat", "lon")}, "elevation": elev.get(p["id"])}
                   for p in points if p["id"] in preds],
        "predictions": preds,
    }
    APP_DATA.mkdir(parents=True, exist_ok=True)
    (APP_DATA / "predictions.json").write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")))
    print(f"Previsioni stagione {season}: {len(preds)} punti, dati noti fino al {known_until}")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("fetch-history").set_defaults(func=cmd_fetch_history)
    sub.add_parser("calibrate").set_defaults(func=cmd_calibrate)
    sub.add_parser("hindcast").set_defaults(func=cmd_hindcast)
    f = sub.add_parser("forecast")
    f.add_argument("--today", help="data di emissione (AAAA-MM-GG), per prove")
    f.add_argument("--offline", action="store_true", help="usa solo lo storico già scaricato")
    f.set_defaults(func=cmd_forecast)
    args = ap.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
