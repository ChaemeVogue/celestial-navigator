# Runs every step for one target: python pipeline/run.py m45
# Re-running is safe: downloads skip files already on disk and retry ones IRSA refused (HTTP 503).
import json
import os
import subprocess
import sys
import time

from config import DATA, PIPELINE

if len(sys.argv) < 2:
    sys.exit("usage: python pipeline/run.py <target id>")
tid = sys.argv[1]


def step(script):
    print(f"--- {script} {tid}", flush=True)
    subprocess.run([sys.executable, os.path.join(PIPELINE, script), tid], check=True)


step("query.py")
for attempt in range(4):
    step("download.py")
    results = json.load(open(os.path.join(DATA, tid, "cutouts.json")))
    failed = sum("error" in r for r in results)
    if not failed:
        break
    print(f"{failed} downloads failed, retrying in 20s", flush=True)
    time.sleep(20)
else:
    print(f"warning: {failed} cutouts still missing; continuing without them", flush=True)
step("process.py")
step("to_app.py")
