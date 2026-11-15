"""Exercise the real export script against an isolated fixture, never the live data."""
import contextlib
import gzip
import io
import json
import os
from pathlib import Path
import runpy
import shutil
import sys
import tempfile
import types
import unittest
from unittest.mock import patch

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT/'science'))
from assets import encode_array

class ExportTests(unittest.TestCase):
    def test_binary_export_preserves_data_and_versions_changed_images(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for part in ('out/colour', 'out/aligned', 'src/api/mock/passes', 'scripts'):
                (root/part).mkdir(parents=True)
            shutil.copy(ROOT/'scripts/generate-previews.py', root/'scripts/generate-previews.py')
            Image.new('RGB', (8, 8), (10, 20, 30)).save(root/'out/colour/pass1.png')
            Image.new('L', (8, 8), 42).save(root/'out/aligned/pass1_D1.png')
            payload = encode_array([1.2345678901234567, np.nan, -2, 0], 2, 2)
            (root/'out/aligned/pass1_D1.bin').write_bytes(payload)
            (root/'out/aligned/pass1_D1.bin.gz').write_bytes(gzip.compress(payload))
            meta = dict(request_size_deg=.15, grid=dict(pixels=2), passes=[dict(bands=['SPHEREx-D1'], label='Pass I', mid='2025-01-01', short=False)])
            (root/'out/meta.json').write_text(json.dumps(meta))
            config = types.ModuleType('config')
            config.BANDS = ['SPHEREx-D1']; config.FIELD_DEG = .1; config.REPO = str(root)
            config.load_target = lambda: dict(id='fixture')
            previous = os.getcwd()
            try:
                os.chdir(root)
                with patch.dict(sys.modules, {'config': config}), contextlib.redirect_stdout(io.StringIO()):
                    runpy.run_path(str(ROOT/'pipeline/to_app.py'))
                    result = json.loads((root/'src/api/mock/passes/fixture.json').read_text())['passes'][0]
                    binary = root/'public'/result['bandPixelUrls']['D1'].lstrip('/')
                    self.assertEqual(binary.read_bytes(), payload)
                    self.assertEqual(gzip.decompress(Path(str(binary)+'.gz').read_bytes()), payload)
                    self.assertTrue((root/'public'/result['previewUrl'].lstrip('/')).exists())
                    original = result['imageUrl']
                    Image.new('RGB', (8, 8), (50, 60, 70)).save(root/'out/colour/pass1.png')
                    runpy.run_path(str(ROOT/'pipeline/to_app.py'))
                    changed = json.loads((root/'src/api/mock/passes/fixture.json').read_text())['passes'][0]
                    self.assertNotEqual(changed['imageUrl'], original)
                    self.assertTrue((root/'public'/original.lstrip('/')).exists())
                    self.assertEqual(changed['bandPixelUrls']['D1'], result['bandPixelUrls']['D1'])
            finally:
                os.chdir(previous)

if __name__ == '__main__':
    unittest.main()
