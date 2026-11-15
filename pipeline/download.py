# Step 2: download every cutout (8 at a time, with retries; rerun to fetch any that failed)
# and record each one's wavelength at the target pixel.
import concurrent.futures
import json
import os
import shutil
import threading
import time
import urllib.request

import astropy.units as u
import numpy as np
from astropy.coordinates import SkyCoord
from astropy.io import fits
from astropy.wcs import WCS

from config import load_target
from raw_cache import raw_filename, source_release

T = load_target()
RA, DEC = T["ra"], T["dec"]

COORD = SkyCoord(RA * u.deg, DEC * u.deg, frame="icrs")
OUT = "cutouts"
os.makedirs(OUT, exist_ok=True)
rows = json.load(open("query.json"))

# Reuse numbered legacy files only when the previous manifest proves their source.
legacy = {}
if os.path.exists("cutouts.json"):
    for old in json.load(open("cutouts.json")):
        if old.get("uri") and old.get("file") and "error" not in old:
            legacy[raw_filename(old["uri"], old.get("release"))] = old["file"]
file_locks = {raw_filename(row["uri"], row.get("release")): threading.Lock() for row in rows}


def fetch(row, attempts=5):
    name = raw_filename(row["uri"], row.get("release"))
    # Duplicate query rows share the same file and cannot race on its .part file.
    with file_locks[name]:
        return fetch_locked(row, name, attempts)


def fetch_locked(row, name, attempts):
    raw_path = os.path.join(OUT, name)
    previous = legacy.get(name)
    if not os.path.exists(raw_path) and previous and os.path.isfile(previous):
        shutil.copyfile(previous, raw_path + ".part")
        os.replace(raw_path + ".part", raw_path)
    for attempt in range(attempts):
        try:
            if not os.path.exists(raw_path):
                with urllib.request.urlopen(row["uri"], timeout=120) as resp:
                    with open(raw_path + ".part", "wb") as f:
                        shutil.copyfileobj(resp, f, length=1024 * 1024)
                os.replace(raw_path + ".part", raw_path)
            with fits.open(raw_path) as hdul:
                header = hdul["IMAGE"].header
                x, y = WCS(header).world_to_pixel(COORD)
                spectral = WCS(header, fobj=hdul, key="W")
                spectral.sip = None
                wl, bw = spectral.pixel_to_world(x, y)
                return {
                    **row,
                    "file": raw_path,
                    "release": source_release(row["uri"], row.get("release")),
                    "version": hdul[0].header.get("VERSION", ""),
                    "wavelength_um": float(wl.to(u.um).value),
                    "bandwidth_um": float(bw.to(u.um).value),
                    "shape": list(hdul["IMAGE"].data.shape),
                    "bytes": os.path.getsize(raw_path),
                }
        except Exception as e:  # transient IRSA errors: back off and retry
            if os.path.exists(raw_path) and attempt >= 1:
                os.remove(raw_path)  # maybe a truncated file
            last = repr(e)
            time.sleep(2 * (attempt + 1))
    return {**row, "error": last}


t = time.time()
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as ex:
    results = list(ex.map(fetch, rows))
ok = [r for r in results if "error" not in r]
bad = [r for r in results if "error" in r]
print(f"downloaded {len(ok)}/{len(results)} in {time.time() - t:.0f}s, "
      f"{sum(r['bytes'] for r in ok) / 1e6:.1f} MB")
for r in bad:
    print("FAILED", r["uri"][-80:], r["error"][:120])
shapes = {tuple(r["shape"]) for r in ok}
print("image shapes:", shapes)
for band in sorted({r["band"] for r in ok}):
    wls = [r["wavelength_um"] for r in ok if r["band"] == band]
    print(f"{band}: wavelength at target {min(wls):.3f}–{max(wls):.3f} µm (median {np.median(wls):.3f})")
json.dump(results, open("cutouts.json", "w"), indent=1)
