"""Content-addressed names for raw downloads, independent of query ordering."""
import hashlib
import json
import re
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit


def canonical_url(uri):
    parts = urlsplit(uri)
    # Fragments are not sent to the archive; IRSA query parameter order is immaterial.
    return urlunsplit((parts.scheme.lower(), parts.netloc.lower(), parts.path,
                       urlencode(sorted(parse_qsl(parts.query, keep_blank_values=True))), ''))


def source_release(uri, release=None):
    if release:
        return str(release)
    path = urlsplit(uri).path
    collection = re.search(r'/spherex/([^/]+)/', path, re.IGNORECASE)
    processing = re.search(r'(l2[b-z]-v[^/]+)', path, re.IGNORECASE)
    return '/'.join(match.group(1) for match in (collection, processing) if match) or 'unversioned'


def raw_filename(uri, release=None):
    identity = json.dumps([canonical_url(uri), source_release(uri, release)], separators=(',', ':'))
    return hashlib.sha256(identity.encode('utf-8')).hexdigest() + '.fits'
