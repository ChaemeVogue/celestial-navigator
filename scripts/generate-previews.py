"""Generate display previews only; original PNGs and numeric science data stay intact."""
import json
import hashlib
import io
from pathlib import Path
from PIL import Image

REPO = Path(__file__).resolve().parents[1]

def preview(url):
    source = REPO / 'public' / url.lstrip('/')
    if source.suffix.lower() != '.png' or not source.exists():
        return None
    with Image.open(source) as image:
        image.thumbnail((40, 40), Image.Resampling.LANCZOS)
        buffer = io.BytesIO()
        image.convert('RGB').save(buffer, 'WEBP', quality=70, method=6)
    payload = buffer.getvalue()
    digest = hashlib.sha256(payload).hexdigest()[:16]
    destination = source.with_name(source.stem + '-preview-' + digest + '.webp')
    destination.write_bytes(payload)
    return '/' + str(destination.relative_to(REPO / 'public'))

def generate(target_id=None):
    for file in (REPO / 'src/api/mock/passes').glob('*.json'):
        if target_id and file.stem != target_id:
            continue
        data = json.loads(file.read_text())
        if data.get('simulated'):
            continue
        for visit in data['passes']:
            visit['previewUrl'] = preview(visit['imageUrl'])
            visit['bandPreviewUrls'] = {band: preview(url) for band, url in visit.get('bandImageUrls', {}).items()}
        file.write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n')

if __name__ == '__main__':
    import sys
    generate(sys.argv[1] if len(sys.argv) > 1 else None)
