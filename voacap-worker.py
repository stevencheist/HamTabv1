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

def handle_predict(req):
    """Run VOACAP prediction for the given parameters."""
    params = req.get("params", {})

    tx_lat = params.get("tx_lat", 0)
    tx_lon = params.get("tx_lon", 0)
    rx_lat = params.get("rx_lat", 0)
    rx_lon = params.get("rx_lon", 0)
    ssn = params.get("ssn", 50)
    month = params.get("month", 1)
    utc_hour = params.get("utc_hour", 12)
    power = params.get("power", 100)
    min_angle_deg = params.get("min_angle_deg", 3.0)
    long_path = params.get("long_path", False)
    required_snr = params.get("required_snr", 73)  # dB — SSB default
    bandwidth_hz = params.get("bandwidth_hz", 2700)  # SSB default
    frequencies = params.get("frequencies", [3.7, 7.15, 10.12, 14.15, 18.1, 21.2, 24.93, 28.5])

    # Configure engine parameters
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

    # Run prediction for all frequencies at once
    try:
        engine.predict(
            rx_location=rx_location,
            utc_time=utc_fraction,
            frequencies=frequencies,
        )
    except Exception as e:
        return {
            "ok": False,
            "id": req.get("id"),
            "error": f"Prediction failed: {e}",
        }

    # Extract path geometry
    distance_km = 0
    azimuth_deg = 0
    circuit_muf = 0

    try:
        if hasattr(engine, 'path') and engine.path is not None:
            distance_km = float(engine.path.dist) if hasattr(engine.path, 'dist') else 0
            azimuth_deg = float(np.rad2deg(engine.path.azim_tr)) if hasattr(engine.path, 'azim_tr') else 0
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

                # Signal info
                snr = 0.0
                rel = 0.0
                if hasattr(pred, 'signal') and pred.signal is not None:
                    snr = float(pred.signal.snr_db) if hasattr(pred.signal, 'snr_db') else 0.0
                    rel = float(pred.signal.reliability) if hasattr(pred.signal, 'reliability') else 0.0
                    # Reliability from dvoacap is 0.0-1.0, convert to percentage
                    if rel <= 1.0:
                        rel = rel * 100.0

                # Mode description
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
                    "freq": freq,
                    "snr_db": 0,
                    "reliability": 0,
                    "mode": "",
                    "hop_count": 0,
                })
        except Exception as e:
            predictions.append({
                "freq": freq,
                "snr_db": 0,
                "reliability": 0,
                "mode": "",
                "hop_count": 0,
                "error": str(e),
            })

    return {
        "ok": True,
        "id": req.get("id"),
        "muf": round(circuit_muf, 1) if circuit_muf else 0,
        "distance_km": round(distance_km),
        "azimuth_deg": round(azimuth_deg, 1),
        "predictions": predictions,
    }

# --- Main loop ---

HANDLERS = {
    "ping": handle_ping,
    "predict": handle_predict,
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
