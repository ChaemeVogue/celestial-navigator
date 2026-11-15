# Step 4: copy a processed target's images (colour, plus each detector alone) into the app
# and write its passes JSON (the same shape the Django backend will serve; see src/api/types.ts).
import json
import hashlib
from pathlib import Path
import os
import shutil
import subprocess
import sys

from config import BANDS, FIELD_DEG, REPO, load_target

T = load_target()
tid = T["id"]
meta = json.loads(Path("out/meta.json").read_text())
images = os.path.join(REPO, "public", "mock", "images", tid)
os.makedirs(images, exist_ok=True)

passes = []
for i, p in enumerate(meta["passes"]):
    colour_source = f"out/colour/pass{i + 1}.png"
    colour_digest = hashlib.sha256(Path(colour_source).read_bytes()).hexdigest()[:16]
    colour_name = f"pass-{i + 1}-{colour_digest}.png"
    shutil.copy(colour_source, os.path.join(images, colour_name))
    band_urls = {}
    pixel_urls = {}
    for band in BANDS:  # greyscale single-detector images; a short visit may lack a band
        short_name = band[-2:]  # "D1"
        if band in p["bands"]:
            band_source = f"out/aligned/pass{i + 1}_{short_name}.png"
            band_digest = hashlib.sha256(Path(band_source).read_bytes()).hexdigest()[:16]
            name = f"pass-{i + 1}-{short_name.lower()}-{band_digest}.png"
            shutil.copy(band_source, os.path.join(images, name))
            extension = "bin" if os.path.exists(f"out/aligned/pass{i + 1}_{short_name}.bin") else "json"
            pixel_source = f"out/aligned/pass{i + 1}_{short_name}.{extension}"
            if os.path.exists(pixel_source):
                pixel_digest = hashlib.sha256(Path(pixel_source).read_bytes()).hexdigest()[:16]
                pixel_name = f"pass-{i + 1}-{short_name.lower()}-{pixel_digest}.{extension}"
                shutil.copy(pixel_source, os.path.join(images, pixel_name))
                if os.path.exists(pixel_source + ".gz"):
                    shutil.copy(pixel_source + ".gz", os.path.join(images, pixel_name + ".gz"))
                pixel_urls[short_name] = f"/mock/images/{tid}/{pixel_name}"
            band_urls[short_name] = f"/mock/images/{tid}/{name}"
    passes.append({
        "id": f"{tid}-pass-{i + 1}",
        "label": p["label"],
        "date": p["mid"] + "T00:00:00Z",
        "imageUrl": f"/mock/images/{tid}/{colour_name}",
        "bandImageUrls": band_urls,
        "bandPixelUrls": pixel_urls,
        **({"short": True} if p["short"] else {}),
    })

data = {
    "_source": "REAL SPHEREx data: IRSA cutouts in D1/D3/D6, median-combined per visit, reprojected "
    f"north-up (requested at {meta['request_size_deg']}°). Dates are each visit's mean observation "
    "date. Made by pipeline/to_app.py. No candidate movers yet.",
    "targetId": tid,
    "fieldSizeDeg": FIELD_DEG,
    "_processing": {"grid": meta["grid"], "request_size_deg": meta["request_size_deg"], "export_version": "binary-v1"},
    "passes": passes,
    "candidates": [],
}
with open(os.path.join(REPO, "src", "api", "mock", "passes", f"{tid}.json"), "w") as f:
    f.write(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
print(tid, [(p["label"], p["date"][:10]) for p in passes])

subprocess.run([sys.executable, os.path.join(REPO, "scripts", "generate-previews.py"), tid], check=True)
