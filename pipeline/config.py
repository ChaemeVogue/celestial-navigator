# Shared settings for the SPHEREx pipeline. Every step takes a target id from the
# app's targets.json, e.g. `python pipeline/query.py m45`, and works inside
# pipeline/data/<id>/ (git-ignored: raw cutouts are ~4 MB each).
import json
import os
import sys

PIPELINE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(PIPELINE)
TARGETS_JSON = os.path.join(REPO, "src", "api", "mock", "targets.json")
DATA = os.path.join(PIPELINE, "data")

BANDS = ["SPHEREx-D1", "SPHEREx-D3", "SPHEREx-D6"]  # shortest, middle and longest detector
COLOURS = {  # matches the app's colour key (src/api/mock/colourKey.json)
    "SPHEREx-D1": (0x5A, 0xA0, 0xFF),
    "SPHEREx-D3": (0xF4, 0xEF, 0xE2),
    "SPHEREx-D6": (0xFF, 0xB0, 0x00),
}

FIELD_DEG = 0.1  # the square field shown in the app
# Cutouts are requested larger than the field so that, once rotated north-up,
# the corners are still covered. 0.1 leaves empty corners.
REQUEST_SIZE = float(os.environ.get("REQUEST_SIZE", "0.15"))

PASS_GAP_DAYS = 30  # exposures closer together than this belong to the same pass

# Per-target stretch overrides: (asinh strength, percentile mapped to white).
# Bright, frame-filling objects wash out with the default.
STRETCH = {"default": (10, 99.7), "m1": (2, 99.95)}


def load_target():
    """Read the target id from argv, return its targets.json entry, and cd into its data folder."""
    if len(sys.argv) < 2:
        sys.exit(f"usage: python {sys.argv[0]} <target id>   (an id from {TARGETS_JSON})")
    tid = sys.argv[1]
    targets = {t["id"]: t for t in json.load(open(TARGETS_JSON))}
    if tid not in targets:
        sys.exit(f"unknown target {tid!r}; known: {', '.join(targets)}")
    work = os.path.join(DATA, tid)
    os.makedirs(work, exist_ok=True)
    os.chdir(work)
    return targets[tid]
