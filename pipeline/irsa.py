# Fast listing of the SPHEREx images that cover a spot, via IRSA's image-search (SIA)
# service. Answers in about a second, so scout.py can look before anything is downloaded.
# SIA lists Data Release 1 only; the newer quick releases (QR) are only in IRSA's TAP service.
import io
import urllib.parse
import urllib.request

from astropy.io.votable import parse_single_table

SIA_URL = "https://irsa.ipac.caltech.edu/SIA"


def sia_images(ra, dec, collection="spherex_dr1"):
    """Every image in the collection that contains (ra, dec): band, start time, URL, footprint."""
    params = {
        "COLLECTION": collection,
        "POS": f"circle {ra} {dec} 0.001",
        "RESPONSEFORMAT": "VOTable",
    }
    with urllib.request.urlopen(f"{SIA_URL}?{urllib.parse.urlencode(params)}", timeout=300) as r:
        table = parse_single_table(io.BytesIO(r.read()))
    col = {f.name: i for i, f in enumerate(table.fields)}  # columns by name, not position
    return [
        {
            "band": str(rec[col["energy_bandpassname"]]),
            "mjd": float(rec[col["t_min"]]),
            "url": str(rec[col["access_url"]]),
            "s_region": str(rec[col["s_region"]]),
        }
        for rec in table.array
    ]
