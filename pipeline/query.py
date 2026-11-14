# Step 1: ask IRSA which SPHEREx images cover the target, per detector (same query as the IRSA notebook).
import json
import time

from astroquery.ipac.irsa import Irsa

from config import BANDS, REQUEST_SIZE, load_target

T = load_target()
RA, DEC = T["ra"], T["dec"]

rows = []
for band in BANDS:
    query = f"""
    SELECT
        'https://irsa.ipac.caltech.edu/' || a.uri || '?center={RA},{DEC}d&size={REQUEST_SIZE}' AS uri,
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

with open("query.json", "w") as f:
    json.dump(rows, f, indent=1)
print(f"saved {len(rows)} rows")
