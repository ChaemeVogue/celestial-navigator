# Step 1: ask IRSA which SPHEREx images cover the target, per detector (same query as the IRSA notebook).
# If IRSA's query (TAP) service is down, falls back to its image-search (SIA) service, which
# lists the same Data Release 1 images; the quick releases (QR) are only in TAP.
import io
import json
import time
import urllib.parse
import urllib.request

from astropy.io.votable import parse_single_table
from astroquery.ipac.irsa import Irsa

from config import BANDS, REQUEST_SIZE, load_target

T = load_target()
RA, DEC = T["ra"], T["dec"]
CUTOUT = f"?center={RA},{DEC}d&size={REQUEST_SIZE}"
SIA_URL = "https://irsa.ipac.caltech.edu/SIA"


def from_tap():
    rows = []
    for band in BANDS:
        query = f"""
        SELECT
            'https://irsa.ipac.caltech.edu/' || a.uri || '{CUTOUT}' AS uri,
            p.time_bounds_lower
        FROM spherex.artifact a
        JOIN spherex.plane p ON a.planeid = p.planeid
        WHERE 1 = CONTAINS(POINT('ICRS', {RA}, {DEC}), p.poly)
                AND p.energy_bandpassname = '{band}'
        ORDER BY p.time_bounds_lower
        """
        t = time.time()
        res = Irsa.query_tap(query).to_table()
        print(f"{band}: {len(res)} images in {time.time() - t:.1f}s", flush=True)
        for r in res:
            rows.append({"band": band, "uri": str(r["uri"]), "mjd": float(r["time_bounds_lower"])})
    return rows


def from_sia():
    params = {
        "COLLECTION": "spherex_dr1",
        "POS": f"circle {RA} {DEC} 0.001",
        "RESPONSEFORMAT": "VOTable",
    }
    t = time.time()
    with urllib.request.urlopen(f"{SIA_URL}?{urllib.parse.urlencode(params)}", timeout=300) as r:
        table = parse_single_table(io.BytesIO(r.read()))
    col = {f.name: i for i, f in enumerate(table.fields)}  # columns by name, not position
    rows = []
    for rec in table.array:
        band = str(rec[col["energy_bandpassname"]])
        if band in BANDS:
            rows.append({
                "band": band,
                "uri": str(rec[col["access_url"]]) + CUTOUT,
                "mjd": float(rec[col["t_min"]]),
            })
    rows.sort(key=lambda r: (r["band"], r["mjd"]))
    for band in BANDS:
        print(f"{band}: {sum(r['band'] == band for r in rows)} images (SIA)", flush=True)
    print(f"SIA answered in {time.time() - t:.1f}s")
    return rows


try:
    rows = from_tap()
except Exception as e:  # IRSA's TAP service has gone down for hours at a time (HTTP 502)
    print(f"TAP query failed ({type(e).__name__}: {str(e)[:80]}); using SIA instead", flush=True)
    rows = from_sia()

with open("query.json", "w") as f:
    json.dump(rows, f, indent=1)
print(f"saved {len(rows)} rows")
