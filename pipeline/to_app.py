# Step 4: copy a processed target's images (colour, plus each detector alone) into the app
# and write its passes JSON (the same shape the Django backend will serve; see src/api/types.ts).
import json
import os
import shutil

from config import BANDS, FIELD_DEG, REPO, load_target

T = load_target()
tid = T["id"]
meta = json.load(open("out/meta.json"))
images = os.path.join(REPO, "public", "mock", "images", tid)
os.makedirs(images, exist_ok=True)

passes = []
for i, p in enumerate(meta["passes"]):
    shutil.copy(f"out/colour/pass{i + 1}.png", os.path.join(images, f"pass-{i + 1}.png"))
    band_urls = {}
    for band in BANDS:  # greyscale single-detector images; a short visit may lack a band
        short_name = band[-2:]  # "D1"
        if band in p["bands"]:
            name = f"pass-{i + 1}-{short_name.lower()}.png"
            shutil.copy(f"out/aligned/pass{i + 1}_{short_name}.png", os.path.join(images, name))
            band_urls[short_name] = f"/mock/images/{tid}/{name}"
    passes.append({
        "id": f"{tid}-pass-{i + 1}",
        "label": p["label"],
        "date": p["mid"] + "T00:00:00Z",
        "imageUrl": f"/mock/images/{tid}/pass-{i + 1}.png",
        "bandImageUrls": band_urls,
        **({"short": True} if p["short"] else {}),
    })

data = {
    "_source": "REAL SPHEREx data: IRSA cutouts in D1/D3/D6, median-combined per visit, reprojected "
    f"north-up (requested at {meta['request_size_deg']}°). Dates are each visit's mean observation "
    "date. Made by pipeline/to_app.py. No candidate movers yet.",
    "targetId": tid,
    "fieldSizeDeg": FIELD_DEG,
    "passes": passes,
    "candidates": [],
}
with open(os.path.join(REPO, "src", "api", "mock", "passes", f"{tid}.json"), "w") as f:
    f.write(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
print(tid, [(p["label"], p["date"][:10]) for p in passes])
