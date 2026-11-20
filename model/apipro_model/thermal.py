"""Modello a tempo termico (gradi giorno) per le fasi di fioritura F1, F3, F5.

Schema (documentato in docs/PREVISIONI.md):
1. gradi giorno giornalieri = max(Tmedia - Tbase, 0), Tmedia = (Tmax + Tmin) / 2, accumulati dal 1° gennaio;
2. calibrazione inversa: la soglia di ogni fase è la mediana dei gradi giorno accumulati, negli anni
   1991-2020 e nei punti della zona di calibrazione, alla data che la letteratura indica per quella fase;
3. previsione: dati osservati + previsione a 16 giorni, poi si prosegue con il meteo di ciascuno
   degli anni 1991-2020 ("anni analoghi"): si ottengono 30 date possibili, da cui data attesa (mediana)
   e margine (10°-90° percentile).
La quota entra in modo diretto: ogni punto usa la propria temperatura (più fresca in quota).
"""
from __future__ import annotations

import calendar
from dataclasses import dataclass
from datetime import date, timedelta

import numpy as np
import pandas as pd

PHASES = ("F1", "F3", "F5")
CAL_YEARS = range(1991, 2021)


def tmean(df: pd.DataFrame) -> pd.Series:
    """Serie giornaliera della temperatura media (indice = data) per un singolo punto."""
    s = (df["tmax"] + df["tmin"]) / 2.0
    s.index = pd.to_datetime(df["date"])
    return s.sort_index()


def year_gdd(t: pd.Series, year: int, base: float) -> np.ndarray:
    """Gradi giorno giornalieri dell'anno (lunghezza 365/366, NaN dove manca il dato)."""
    days = pd.date_range(f"{year}-01-01", f"{year}-12-31", freq="D")
    v = t.reindex(days).to_numpy(dtype=float)
    return np.where(np.isnan(v), np.nan, np.maximum(v - base, 0.0))


def first_crossing(cum: np.ndarray, thr: float) -> int | None:
    """Giorno dell'anno (1 = 1° gennaio) in cui l'accumulo raggiunge la soglia."""
    idx = np.flatnonzero(cum >= thr)
    return int(idx[0]) + 1 if idx.size else None


def doy(d: date) -> int:
    return d.timetuple().tm_yday


def target_doys(window: dict, year: int, reference_dates: dict | None = None) -> dict[str, int]:
    """Date di letteratura per F1 (inizio finestra), F5 (fine finestra), F3 (metà).

    Se la specie ha reference_dates (es. {F1: "04-25"}) forniti dal partner scientifico, si usano quelli.
    """
    if reference_dates:
        out = {}
        for ph, mmdd in reference_dates.items():
            m, d = (int(x) for x in mmdd.split("-"))
            out[ph] = doy(date(year, m, d))
        if "F3" not in out and {"F1", "F5"} <= out.keys():
            out["F3"] = round((out["F1"] + out["F5"]) / 2)
        return out
    sm, em = window["start_month"], window["end_month"]
    f1 = doy(date(year, sm, 1))
    f5 = doy(date(year, em, calendar.monthrange(year, em)[1]))
    return {"F1": f1, "F3": round((f1 + f5) / 2), "F5": f5}


@dataclass
class Calibration:
    species_id: str
    base: float
    thresholds: dict[str, float]          # gradi giorno per F1/F3/F5
    spread: dict[str, tuple[float, float]]  # 10°-90° percentile dei valori usati
    n_samples: int
    points: list[str]


def calibrate(species: dict, temps: dict[str, pd.Series], points: list[dict]) -> Calibration | None:
    zones = species.get("calibration_zones") or ["pianura", "collina"]
    cal_points = [p for p in points if p["zone"] in zones and p["id"] in temps]
    base = float(species.get("base_temp_c", 5))
    samples: dict[str, list[float]] = {ph: [] for ph in PHASES}
    for p in cal_points:
        t = temps[p["id"]]
        for y in CAL_YEARS:
            g = year_gdd(t, y, base)
            if np.isnan(g).sum() > 5:
                continue
            cum = np.nancumsum(g)
            for ph, d in target_doys(species["literature_window"], y, species.get("reference_dates")).items():
                samples[ph].append(float(cum[d - 1]))
    if not samples["F1"]:
        return None
    thr = {ph: float(np.median(v)) for ph, v in samples.items()}
    spr = {ph: (float(np.percentile(v, 10)), float(np.percentile(v, 90))) for ph, v in samples.items()}
    return Calibration(species["id"], base, thr, spr, len(samples["F1"]), [p["id"] for p in cal_points])


def forecast_point(t: pd.Series, season: int, known_until: date, cal: Calibration,
                   analog_years=CAL_YEARS) -> dict[str, dict | None]:
    """Date previste (giorno dell'anno) per F1/F3/F5 in un punto.

    t contiene osservato (+ previsione) fino a known_until compreso. Oltre si usano gli anni analoghi.
    """
    days = pd.date_range(f"{season}-01-01", f"{season}-12-31", freq="D")
    n = len(days)
    obs = year_gdd(t[t.index <= pd.Timestamp(known_until)], season, cal.base)
    k = 0 if known_until < date(season, 1, 1) else min(n, doy(known_until) if known_until.year == season else n)
    head = np.nan_to_num(obs[:k], nan=0.0)
    results: dict[str, list[int | None]] = {ph: [] for ph in PHASES}
    for a in analog_years:
        if a == season:
            continue
        ga = year_gdd(t, a, cal.base)
        if np.isnan(ga).sum() > 5:
            continue
        ga = np.nan_to_num(ga, nan=0.0)
        tail = ga[k:n] if len(ga) >= n else np.concatenate([ga, ga[-1:]])[k:n]
        cum = np.cumsum(np.concatenate([head, tail]))
        for ph in PHASES:
            results[ph].append(first_crossing(cum, cal.thresholds[ph]))
    out: dict[str, dict | None] = {}
    for ph, vals in results.items():
        got = [v for v in vals if v is not None]
        if not got or len(got) < 0.5 * len(vals):
            out[ph] = None
            continue
        out[ph] = {
            "p10": int(np.percentile(got, 10)),
            "p50": int(round(float(np.median(got)))),
            "p90": int(np.percentile(got, 90)),
            "n": len(got),
            "fixed": k > 0 and first_crossing(np.cumsum(head), cal.thresholds[ph]) is not None,
        }
    return out


def observed_dates(t: pd.Series, year: int, cal: Calibration) -> dict[str, int | None]:
    """Date raggiunte con il meteo reale dell'intero anno (riferimento della verifica a ritroso)."""
    g = year_gdd(t, year, cal.base)
    if np.isnan(g).sum() > 5:
        return {ph: None for ph in PHASES}
    cum = np.nancumsum(g)
    return {ph: first_crossing(cum, cal.thresholds[ph]) for ph in PHASES}


def calendar_dates(species: dict, season: int) -> dict[str, dict]:
    """Specie 'solo calendario': finestra di letteratura, senza margine statistico."""
    out = {}
    for ph, d in target_doys(species["literature_window"], season, species.get("reference_dates")).items():
        out[ph] = {"p10": d, "p50": d, "p90": d, "n": 0, "fixed": False}
    return out


def phase_today(pred: dict[str, dict | None], today_doy: int) -> str | None:
    """Fase attesa oggi, dalle date mediane: F0, F1 (inizio/aumento), F3, F4, F5."""
    if not pred.get("F1") or not pred.get("F5"):
        return None
    f1, f5 = pred["F1"]["p50"], pred["F5"]["p50"]
    f3 = pred["F3"]["p50"] if pred.get("F3") else round((f1 + f5) / 2)
    if today_doy < f1:
        return "F0"
    if today_doy < f3 - 2:
        return "F1"
    if today_doy <= f3 + 2:
        return "F3"
    if today_doy <= f5:
        return "F4"
    return "F5"


def doy_to_date(season: int, d: int) -> date:
    return date(season, 1, 1) + timedelta(days=d - 1)
