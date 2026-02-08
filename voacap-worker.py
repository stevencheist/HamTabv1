#!/usr/bin/env python3
"""
VOACAP prediction worker — long-running process communicating via JSON over stdin/stdout.

Reads one JSON object per line from stdin, writes one JSON response per line to stdout.
Reuses a single PredictionEngine instance to avoid per-request startup cost.

Actions:
  ping     → { ok: true, engine: "dvoacap" }
  predict  → per-frequency reliability, SNR, mode, MUF

Requires: dvoacap-python (pip install -e . from https://github.com/skyelaird/dvoacap-python)
"""

import sys
import json
import math
import traceback

# Flush stdout after every write to prevent buffering deadlocks with Node.js
def respond(obj):
    sys.stdout.write(json.dumps(obj) + "\n")
    sys.stdout.flush()

def init_engine():
    """Try to import and create the VOACAP PredictionEngine."""
    try:
        import numpy as np
        from dvoacap.prediction_engine import PredictionEngine
        from dvoacap.path_geometry import GeoPoint
        engine = PredictionEngine()
        return engine, np, GeoPoint
    except ImportError as e:
        respond({"ok": False, "error": f"dvoacap-python not installed: {e}"})
        sys.exit(1)
    except Exception as e:
        respond({"ok": False, "error": f"Failed to initialize PredictionEngine: {e}"})
        sys.exit(1)

engine, np, GeoPoint = init_engine()

def handle_ping(req):
    return {"ok": True, "engine": "dvoacap", "id": req.get("id")}

def run_single_predict(tx_lat, tx_lon, rx_lat, rx_lon, ssn, month, utc_hour,
                       power, min_angle_deg, long_path, required_snr,
                       bandwidth_hz, frequencies):
    """Run one VOACAP prediction and return extracted results dict."""
    engine.params.ssn = float(ssn)
    engine.params.month = int(month)
    engine.params.tx_location = GeoPoint.from_degrees(tx_lat, tx_lon)
    engine.params.tx_power = float(power)
    engine.params.min_angle = np.deg2rad(float(min_angle_deg))
    engine.params.long_path = bool(long_path)
    engine.params.required_snr = float(required_snr)
    engine.params.bandwidth_hz = float(bandwidth_hz)

    rx_location = GeoPoint.from_degrees(rx_lat, rx_lon)
    utc_fraction = float(utc_hour) / 24.0  # convert hour (0-23) to fraction (0.0-1.0)

    engine.predict(
        rx_location=rx_location,
        utc_time=utc_fraction,
        frequencies=frequencies,
    )

    # Extract path geometry
    distance_km = 0
    circuit_muf = 0

    try:
        if hasattr(engine, 'path') and engine.path is not None:
            distance_km = float(engine.path.dist) if hasattr(engine.path, 'dist') else 0
    except Exception:
        pass

    try:
        if hasattr(engine, 'muf_calculator') and engine.muf_calculator is not None:
            muf_obj = engine.muf_calculator
            if hasattr(muf_obj, 'muf'):
                circuit_muf = float(muf_obj.muf)
    except Exception:
        pass

    # Extract per-frequency results
    predictions = []
    for i, freq in enumerate(frequencies):
        try:
            if i < len(engine.predictions) and engine.predictions[i] is not None:
                pred = engine.predictions[i]

                snr = 0.0
                rel = 0.0
                if hasattr(pred, 'signal') and pred.signal is not None:
                    snr = float(pred.signal.snr_db) if hasattr(pred.signal, 'snr_db') else 0.0
                    rel = float(pred.signal.reliability) if hasattr(pred.signal, 'reliability') else 0.0
                    if rel <= 1.0:
                        rel = rel * 100.0

                mode_desc = ""
                if hasattr(pred, 'method') and pred.method:
                    mode_desc = str(pred.method)
                elif hasattr(pred, 'get_mode_name'):
                    try:
                        mode_desc = pred.get_mode_name(distance_km)
                    except Exception:
                        pass

                hop_count = int(pred.hop_count) if hasattr(pred, 'hop_count') else 0

                predictions.append({
                    "freq": freq,
                    "snr_db": round(snr, 1),
                    "reliability": round(rel),
                    "mode": mode_desc,
                    "hop_count": hop_count,
                })
            else:
                predictions.append({
                    "freq": freq, "snr_db": 0, "reliability": 0, "mode": "", "hop_count": 0,
                })
        except Exception as e:
            predictions.append({
                "freq": freq, "snr_db": 0, "reliability": 0, "mode": "", "hop_count": 0,
                "error": str(e),
            })

    return {"muf": circuit_muf, "predictions": predictions}


def handle_predict(req):
    """Run VOACAP prediction for a single hour/target."""
    params = req.get("params", {})
    try:
        result = run_single_predict(
            params.get("tx_lat", 0), params.get("tx_lon", 0),
            params.get("rx_lat", 0), params.get("rx_lon", 0),
            params.get("ssn", 50), params.get("month", 1),
            params.get("utc_hour", 12), params.get("power", 100),
            params.get("min_angle_deg", 3.0), params.get("long_path", False),
            params.get("required_snr", 73), params.get("bandwidth_hz", 2700),
            params.get("frequencies", [3.7, 7.15, 10.12, 14.15, 18.1, 21.2, 24.93, 28.5]),
        )
        result["ok"] = True
        result["id"] = req.get("id")
        result["muf"] = round(result["muf"], 1) if result["muf"] else 0
        return result
    except Exception as e:
        return {"ok": False, "id": req.get("id"), "error": f"Prediction failed: {e}"}


def handle_predict_matrix(req):
    """Batch predict: all 24 hours × multiple targets in a single call.

    Returns the full matrix directly — avoids 144 separate IPC round-trips.
    params.targets = [{ name, lat, lon }, ...]
    Shared params: tx_lat, tx_lon, ssn, month, power, min_angle_deg, long_path,
                   required_snr, bandwidth_hz, frequencies
    """
    params = req.get("params", {})
    tx_lat = params.get("tx_lat", 0)
    tx_lon = params.get("tx_lon", 0)
    ssn = params.get("ssn", 50)
    month = params.get("month", 1)
    power = params.get("power", 100)
    min_angle_deg = params.get("min_angle_deg", 3.0)
    long_path = params.get("long_path", False)
    required_snr = params.get("required_snr", 73)
    bandwidth_hz = params.get("bandwidth_hz", 2700)
    frequencies = params.get("frequencies", [3.7, 7.15, 10.12, 14.15, 18.1, 21.2, 24.93, 28.5])
    targets = params.get("targets", [])
    band_names = params.get("band_names", ["80m", "40m", "30m", "20m", "17m", "15m", "12m", "10m"])

    if not targets:
        return {"ok": False, "id": req.get("id"), "error": "No targets provided"}

    matrix = []

    for hour in range(24):
        # Accumulate per-band totals across targets for averaging
        band_totals = {bn: {"rel_sum": 0, "snr_max": 0, "mode": "", "count": 0} for bn in band_names}
        max_muf = 0

        for target in targets:
            try:
                result = run_single_predict(
                    tx_lat, tx_lon,
                    target.get("lat", 0), target.get("lon", 0),
                    ssn, month, hour, power,
                    min_angle_deg, long_path, required_snr, bandwidth_hz,
                    frequencies,
                )
                muf = result.get("muf", 0)
                if muf > max_muf:
                    max_muf = muf

                for i, pred in enumerate(result.get("predictions", [])):
                    if i < len(band_names):
                        bn = band_names[i]
                        rel = pred.get("reliability", 0)
                        snr = pred.get("snr_db", 0)
                        band_totals[bn]["rel_sum"] += rel
                        band_totals[bn]["count"] += 1
                        if snr > band_totals[bn]["snr_max"]:
                            band_totals[bn]["snr_max"] = snr
                        if not band_totals[bn]["mode"] and pred.get("mode", ""):
                            band_totals[bn]["mode"] = pred["mode"]
            except Exception as e:
                pass  # skip failed targets, continue with others

        # Average reliability across targets (single target in spot mode = no change)
        band_avg = {}
        for bn in band_names:
            t = band_totals[bn]
            count = t["count"] if t["count"] > 0 else 1
            band_avg[bn] = {
                "rel": round(t["rel_sum"] / count),
                "snr": round(t["snr_max"], 1),
                "mode": t["mode"],
            }

        matrix.append({
            "hour": hour,
            "bands": band_avg,
            "muf": round(max_muf, 1),
        })

    return {
        "ok": True,
        "id": req.get("id"),
        "matrix": matrix,
    }


# --- Main loop ---

HANDLERS = {
    "ping": handle_ping,
    "predict": handle_predict,
    "predict_matrix": handle_predict_matrix,
}

for line in sys.stdin:
    line = line.strip()
    if not line:
        continue

    try:
        req = json.loads(line)
    except json.JSONDecodeError as e:
        respond({"ok": False, "error": f"Invalid JSON: {e}"})
        continue

    action = req.get("action", "")
    handler = HANDLERS.get(action)

    if not handler:
        respond({"ok": False, "error": f"Unknown action: {action}", "id": req.get("id")})
        continue

    try:
        result = handler(req)
        respond(result)
    except Exception:
        respond({
            "ok": False,
            "error": traceback.format_exc(),
            "id": req.get("id"),
        })
