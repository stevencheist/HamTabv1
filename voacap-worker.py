#!/usr/bin/env python3
"""
VOACAP prediction worker — long-running process communicating via JSON over stdin/stdout.

Reads one JSON object per line from stdin, writes one JSON response per line to stdout.
Reuses a single PredictionEngine instance to avoid per-request startup cost.

Actions:
  ping     → { ok: true, engine: "dvoacap" }
  predict  → per-frequency reliability, SNR, mode, MUF

Requires: dvoacap-python (pip install dvoacap)
"""

import sys
import json
import traceback

# Flush stdout after every write to prevent buffering deadlocks with Node.js
def respond(obj):
    sys.stdout.write(json.dumps(obj) + "\n")
    sys.stdout.flush()

def init_engine():
    """Try to import and create the VOACAP PredictionEngine."""
    try:
        from dvoacap import PredictionEngine
        engine = PredictionEngine()
        return engine
    except ImportError:
        respond({"ok": False, "error": "dvoacap-python not installed"})
        sys.exit(1)
    except Exception as e:
        respond({"ok": False, "error": f"Failed to initialize PredictionEngine: {e}"})
        sys.exit(1)

engine = init_engine()

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
    power = params.get("power", 100)
    min_angle_deg = params.get("min_angle_deg", 3.0)
    long_path = params.get("long_path", False)
    required_snr = params.get("required_snr", 73)  # dB — SSB default
    bandwidth_hz = params.get("bandwidth_hz", 2700)  # SSB default
    frequencies = params.get("frequencies", [3.7, 7.15, 10.12, 14.15, 18.1, 21.2, 24.93, 28.5])

    predictions = []
    circuit_muf = 0
    distance_km = 0
    azimuth_deg = 0

    for freq in frequencies:
        try:
            result = engine.predict(
                tx_lat=tx_lat,
                tx_lon=tx_lon,
                rx_lat=rx_lat,
                rx_lon=rx_lon,
                freq_mhz=freq,
                ssn=ssn,
                month=month,
                power_watts=power,
                min_angle_deg=min_angle_deg,
                long_path=long_path,
                required_snr=required_snr,
                bandwidth_hz=bandwidth_hz,
            )

            # Extract fields from dvoacap result
            snr = result.get("snr_db", 0)
            rel = result.get("reliability", 0)
            mode_desc = result.get("mode", "")
            hop_count = result.get("hop_count", 0)
            power_dbw = result.get("power_dbw", 0)

            # Capture circuit-level data from the first frequency
            if not circuit_muf and result.get("muf"):
                circuit_muf = result["muf"]
            if not distance_km and result.get("distance_km"):
                distance_km = result["distance_km"]
            if not azimuth_deg and result.get("azimuth_deg"):
                azimuth_deg = result["azimuth_deg"]

            predictions.append({
                "freq": freq,
                "snr_db": round(snr, 1),
                "reliability": round(rel),
                "mode": mode_desc,
                "hop_count": hop_count,
                "power_dbw": round(power_dbw, 1),
            })
        except Exception as e:
            predictions.append({
                "freq": freq,
                "snr_db": 0,
                "reliability": 0,
                "mode": "",
                "hop_count": 0,
                "power_dbw": 0,
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
