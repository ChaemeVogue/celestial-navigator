# Scout a spot before processing it: what SPHEREx has there and what might surprise us.
# Takes about a second per spot and downloads no images.
#
#   python pipeline/scout.py rdra barnard              targets from targets.json
#   python pipeline/scout.py --at 270 66.56 "North ecliptic pole"
#   python pipeline/scout.py --at 270 66.56 NEP --at 266.42 -29.01 "Galactic centre"
import json
import math
import sys
import warnings

import astropy.units as u
from astropy.coordinates import GeocentricTrueEcliptic, SkyCoord, get_body, solar_system_ephemeris
from astropy.time import Time

from config import BANDS, PASS_GAP_DAYS, REQUEST_SIZE, TARGETS_JSON
from irsa import sia_images
from passes import group_passes, is_short

warnings.simplefilter("ignore")
solar_system_ephemeris.set("builtin")

MB_PER_CUTOUT = 3.9  # measured: a 0.15° cutout with all seven FITS layers
ALL_DETECTORS = [f"SPHEREx-D{i}" for i in range(1, 7)]
NEAR_PLANET_DEG = 1.0
LONG_VISIT_DAYS = 70  # passes we've processed last 1 to 8 weeks


def tangent_offsets(ra0, dec0, ra, dec):
    """Gnomonic projection of (ra, dec) onto the plane touching the sky at (ra0, dec0), degrees."""
    r = math.radians
    d0, d, da = r(dec0), r(dec), r(ra - ra0)
    cosc = math.sin(d0) * math.sin(d) + math.cos(d0) * math.cos(d) * math.cos(da)
    xi = math.cos(d) * math.sin(da) / cosc
    eta = (math.cos(d0) * math.sin(d) - math.sin(d0) * math.cos(d) * math.cos(da)) / cosc
    return math.degrees(xi), math.degrees(eta)


def distance_to_edge(ra0, dec0, s_region):
    """How far (degrees) the spot is from the nearest edge of an image footprint polygon."""
    nums = [float(x) for x in s_region.split()[2:]]  # "POLYGON ICRS ra1 dec1 ra2 dec2 ..."
    pts = [tangent_offsets(ra0, dec0, nums[i], nums[i + 1]) for i in range(0, len(nums), 2)]
    best = math.inf
    for (x1, y1), (x2, y2) in zip(pts, pts[1:] + pts[:1]):
        dx, dy = x2 - x1, y2 - y1
        t = max(0.0, min(1.0, -(x1 * dx + y1 * dy) / (dx * dx + dy * dy or 1)))
        best = min(best, math.hypot(x1 + t * dx, y1 + t * dy))
    return best


def scout(name, ra, dec):
    here = SkyCoord(ra * u.deg, dec * u.deg)
    ecl = here.transform_to(GeocentricTrueEcliptic()).lat.deg
    gal = here.galactic.b.deg
    images = sia_images(ra, dec)
    ours = [im for im in images if im["band"] in BANDS]
    notes = []

    print(f"\n{name}  RA {ra:.5f}  Dec {dec:+.5f}")
    print(f"  Ecliptic latitude {ecl:+6.1f}°   Galactic latitude {gal:+6.1f}°")
    counts = "  ".join(f"D{b[-1]} {sum(im['band'] == b for im in images)}" for b in ALL_DETECTORS)
    print(f"  Images (Data Release 1): {counts}")
    print(f"  Using D1/D3/D6: {len(ours)} cutouts, about {len(ours) * MB_PER_CUTOUT:.0f} MB to download")

    if not ours:
        print("  ! No Data Release 1 images here yet")
        return {"name": name, "images": 0}

    groups = group_passes(ours, BANDS)
    n_pass = n_short = 0
    for g in groups:
        short = is_short(g)
        if short:
            label = "Short visit"
            n_short += 1
        else:
            n_pass += 1
            label = f"Pass {n_pass}"
        start, end = Time(g[0]["mjd"], format="mjd"), Time(g[-1]["mjd"], format="mjd")
        span = g[-1]["mjd"] - g[0]["mjd"]
        per_band = "  ".join(f"D{b[-1]} {sum(im['band'] == b for im in g):2d}" for b in BANDS)
        print(f"    {label:12s} {start.iso[:10]} → {end.iso[:10]}  {span:4.0f} d  {len(g):3d} images  {per_band}")
        missing = [b[-2:] for b in BANDS if not any(im["band"] == b for im in g)]
        if missing and not short:
            notes.append(f"{label} has no {', '.join(missing)} images")
        if span > LONG_VISIT_DAYS:
            notes.append(f"{label} lasts {span:.0f} days: near-continuous coverage, so the "
                         f"{PASS_GAP_DAYS}-day gap rule may lump many visits into one pass")
        mid = Time((g[0]["mjd"] + g[-1]["mjd"]) / 2, format="mjd")
        for body in ["moon", "mercury", "venus", "mars", "jupiter", "saturn"]:
            sep = get_body(body, mid).separation(here).deg
            if sep < NEAR_PLANET_DEG:
                notes.append(f"{body.title()} is {sep:.2f}° away during {label}: glare or a bright mover")

    print(f"  Visits: {n_pass} passes" + (f" + {n_short} short" if n_short else ""))

    clipped = sum(distance_to_edge(ra, dec, im["s_region"]) < REQUEST_SIZE / 2 for im in ours)
    if clipped:
        notes.append(f"{clipped} of {len(ours)} cutouts reach past an image edge (partly empty)")
    if n_pass + n_short > 4:
        notes.append(f"{n_pass + n_short} visits: more than the timeline was designed around")
    if abs(ecl) < 10:
        notes.append("inside the ecliptic band: good odds of catching an asteroid")
    if abs(gal) < 10:
        notes.append("in the Milky Way: crowded field, expect many false alarms in differences")
    if abs(dec) > 80:
        notes.append("near a celestial pole: RA lines converge, watch reprojection and rotation")
    if min(ra, 360 - ra) < REQUEST_SIZE:
        notes.append("on the 0h/24h line: check that nothing wraps the wrong way")

    for n in notes:
        print(f"  ! {n}")
    return {"name": name, "images": len(ours), "passes": n_pass, "short": n_short, "notes": notes}


def main(args):
    targets = {t["id"]: t for t in json.load(open(TARGETS_JSON))}
    spots = []
    while args:
        a = args.pop(0)
        if a == "--at":
            ra, dec = float(args.pop(0)), float(args.pop(0))
            label = args.pop(0) if args and not args[0].startswith("--") else f"{ra} {dec}"
            spots.append((label, ra, dec))
        elif a in targets:
            t = targets[a]
            spots.append((f"{t['name']} ({a})", t["ra"], t["dec"]))
        else:
            sys.exit(f"unknown target {a!r}; known: {', '.join(targets)} (or use --at RA DEC NAME)")
    if not spots:
        sys.exit(__doc__ if __doc__ else "usage: python pipeline/scout.py <target id> | --at RA DEC NAME")
    for spot in spots:
        scout(*spot)


if __name__ == "__main__":
    main(sys.argv[1:])
