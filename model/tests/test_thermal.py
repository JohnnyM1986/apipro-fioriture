"""Prove del modello a gradi giorno con temperature sintetiche (nessuna rete necessaria)."""
import sys
from datetime import date
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from apipro_model import thermal  # noqa: E402

ROBINIA = {"id": "robinia", "model": "thermal_time", "base_temp_c": 5,
           "literature_window": {"start_month": 4, "end_month": 5}}


def synthetic(offset=0.0, start=1991, end=2026, seed=1):
    days = pd.date_range(f"{start}-01-01", f"{end}-12-31", freq="D")
    rng = np.random.default_rng(seed)
    doy = days.dayofyear.to_numpy()
    tm = 13 - 10 * np.cos(2 * np.pi * (doy - 15) / 365) + rng.normal(0, 2, len(days)) + offset
    return pd.DataFrame({"date": days.date, "tmax": tm + 5, "tmin": tm - 5})


def test_gdd_non_negativo_e_cumulato():
    t = thermal.tmean(synthetic())
    g = thermal.year_gdd(t, 2000, 5)
    assert len(g) == 366 and (g >= 0).all()
    assert thermal.first_crossing(np.cumsum(g), 1e9) is None


def test_target_doys_finestra_e_date_partner():
    d = thermal.target_doys({"start_month": 4, "end_month": 5}, 2025)
    assert d["F1"] == thermal.doy(date(2025, 4, 1)) and d["F5"] == thermal.doy(date(2025, 5, 31))
    assert d["F1"] < d["F3"] < d["F5"]
    r = thermal.target_doys({}, 2025, {"F1": "04-25", "F5": "05-20"})
    assert r["F1"] == thermal.doy(date(2025, 4, 25)) and "F3" in r


def test_calibrazione_riproduce_le_date_di_letteratura():
    temps = {"a": thermal.tmean(synthetic())}
    pts = [{"id": "a", "zone": "pianura"}]
    cal = thermal.calibrate(ROBINIA, temps, pts)
    assert cal and cal.thresholds["F1"] < cal.thresholds["F3"] < cal.thresholds["F5"]
    fc = thermal.forecast_point(temps["a"], 2027, date(2026, 11, 20), cal)
    target = thermal.target_doys(ROBINIA["literature_window"], 2027)
    for ph in thermal.PHASES:
        assert abs(fc[ph]["p50"] - target[ph]) <= 4, (ph, fc[ph], target[ph])
        assert fc[ph]["p10"] <= fc[ph]["p50"] <= fc[ph]["p90"]


def test_punto_piu_freddo_fiorisce_dopo():
    warm = thermal.tmean(synthetic())
    cold = thermal.tmean(synthetic(offset=-3))
    cal = thermal.calibrate(ROBINIA, {"a": warm}, [{"id": "a", "zone": "pianura"}])
    f_warm = thermal.forecast_point(warm, 2027, date(2026, 11, 20), cal)
    f_cold = thermal.forecast_point(cold, 2027, date(2026, 11, 20), cal)
    assert f_cold["F1"]["p50"] > f_warm["F1"]["p50"] + 5


def test_dati_osservati_fissano_la_data():
    t = thermal.tmean(synthetic())
    cal = thermal.calibrate(ROBINIA, {"a": t}, [{"id": "a", "zone": "pianura"}])
    obs = thermal.observed_dates(t, 2025, cal)
    fc = thermal.forecast_point(t, 2025, date(2025, 12, 31), cal)
    assert fc["F1"]["p50"] == obs["F1"] and fc["F1"]["fixed"]


def test_fase_di_oggi():
    pred = {"F1": {"p50": 100}, "F3": {"p50": 115}, "F5": {"p50": 130}}
    assert [thermal.phase_today(pred, d) for d in (90, 105, 115, 125, 140)] == ["F0", "F1", "F3", "F4", "F5"]
