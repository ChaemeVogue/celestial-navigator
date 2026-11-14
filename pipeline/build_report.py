# Builds the one-file preview report (pipeline/data/report.html) from every processed target,
# in targets.json order, with all images embedded. Usage: python pipeline/build_report.py
import base64
import datetime
import json
import os

from config import DATA, PIPELINE, TARGETS_JSON

targets = {}
for t in json.load(open(TARGETS_JSON)):
    out = os.path.join(DATA, t["id"], "out")
    if not os.path.exists(os.path.join(out, "meta.json")):
        continue  # not processed yet
    images = {}
    for root, _, files in os.walk(out):
        for name in files:
            if name.endswith(".png"):
                path = os.path.join(root, name)
                encoded = base64.b64encode(open(path, "rb").read()).decode()
                images[os.path.relpath(path, out)] = "data:image/png;base64," + encoded
    targets[t["id"]] = {"meta": json.load(open(os.path.join(out, "meta.json"))), "images": images}

data = {"targets": targets, "processed": datetime.date.today().isoformat()}
template = open(os.path.join(PIPELINE, "report", "template.html")).read()
html = template.replace("__DATA__", json.dumps(data, separators=(",", ":")))
path = os.path.join(DATA, "report.html")
open(path, "w").write(html)
print(path, round(len(html) / 1e6, 2), "MB", {k: len(v["images"]) for k, v in targets.items()})
