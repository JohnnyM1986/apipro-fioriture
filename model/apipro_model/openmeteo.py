"""Scarico delle temperature giornaliere da Open-Meteo (dati ERA5-Land e previsioni).

Fonte: Open-Meteo (https://open-meteo.com), dati con licenza CC BY 4.0, piano gratuito per uso
non commerciale [DA VERIFICARE formalmente per ApiPRO]. Nessuna chiave API.

Ogni funzione restituisce un DataFrame con colonne: point_id, date, tmax, tmin.
"""
from __future__ import annotations

import time
from datetime import date

import pandas as pd
import requests

ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive"
FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
DAILY = "temperature_2m_max,temperature_2m_min"
TIMEZONE = "Europe/Rome"


class RateLimited(RuntimeError):
    """Limite di richieste del piano gratuito raggiunto (riprovare più tardi)."""


def _get(url: str, params: dict, retries: int = 4) -> dict:
    for attempt in range(retries):
        r = requests.get(url, params=params, timeout=120)
        if r.status_code == 429:
            text = r.text.lower()
            if "daily" in text or "hourly" in text:
                raise RateLimited(r.text)
            time.sleep(65)  # limite al minuto: aspetto e riprovo
            continue
        if r.status_code >= 500:
            time.sleep(10 * (attempt + 1))
            continue
        r.raise_for_status()
        return r.json()
    raise RuntimeError(f"Open-Meteo non risponde: {url} {params}")


def _to_frame(point_id: str, payload: dict) -> tuple[pd.DataFrame, float | None]:
    d = payload["daily"]
    df = pd.DataFrame({
        "point_id": point_id,
        "date": pd.to_datetime(d["time"]).date,
        "tmax": d["temperature_2m_max"],
        "tmin": d["temperature_2m_min"],
    })
    return df.dropna(subset=["tmax", "tmin"]), payload.get("elevation")


def fetch_archive(point: dict, start: date, end: date) -> tuple[pd.DataFrame, float | None]:
    """Storico giornaliero ERA5-Land per un punto."""
    params = {
        "latitude": point["lat"], "longitude": point["lon"],
        "start_date": start.isoformat(), "end_date": end.isoformat(),
        "daily": DAILY, "timezone": TIMEZONE, "models": "era5_land",
    }
    return _to_frame(point["id"], _get(ARCHIVE_URL, params))


def fetch_recent_and_forecast(point: dict, past_days: int = 92, forecast_days: int = 16) -> pd.DataFrame:
    """Ultimi giorni (che l'archivio pubblica con qualche giorno di ritardo) + previsione a 16 giorni."""
    params = {
        "latitude": point["lat"], "longitude": point["lon"],
        "daily": DAILY, "timezone": TIMEZONE,
        "past_days": past_days, "forecast_days": forecast_days,
    }
    df, _ = _to_frame(point["id"], _get(FORECAST_URL, params))
    return df
