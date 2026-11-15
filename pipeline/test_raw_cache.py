import unittest
from raw_cache import raw_filename, source_release

class RawCacheTests(unittest.TestCase):
    def setUp(self):
        self.uri = 'https://irsa.ipac.caltech.edu/ibe/data/spherex/dr1/level2/l2b-v27-2026-196/1/image.fits?center=10,20d&size=0.15'

    def test_query_reordering_reuses_the_same_file(self):
        reordered = self.uri.split('?')[0] + '?size=0.15&center=10,20d'
        self.assertEqual(raw_filename(self.uri), raw_filename(reordered))

    def test_different_cutouts_and_releases_are_distinct(self):
        self.assertNotEqual(raw_filename(self.uri), raw_filename(self.uri.replace('0.15', '0.20')))
        self.assertNotEqual(raw_filename(self.uri), raw_filename(self.uri.replace('/dr1/', '/qr3/')))
        self.assertNotEqual(raw_filename(self.uri, 'release-a'), raw_filename(self.uri, 'release-b'))

    def test_processing_revision_is_part_of_the_identity(self):
        self.assertEqual(source_release(self.uri), 'dr1/l2b-v27-2026-196')
        self.assertNotEqual(raw_filename(self.uri), raw_filename(self.uri.replace('v27', 'v28')))

    def test_persisted_release_keeps_the_identity_stable(self):
        self.assertEqual(raw_filename(self.uri), raw_filename(self.uri, source_release(self.uri)))

if __name__ == '__main__':
    unittest.main()
