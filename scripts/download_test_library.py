"""Download only reviewed publisher files. Never scrape paid platforms or upload PDFs."""
from hashlib import sha256
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import Request, urlopen
from zipfile import ZipFile
import argparse
import json
import re
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent.parent
DIRECTORY = ROOT / '.local' / 'content-library'


def validate_source(source):
    parsed = urlparse(source['url'])
    if parsed.scheme != 'https' or parsed.hostname != 'www.siyavula.com' or not parsed.path.startswith('/downloads/books/'):
        raise ValueError('Source is outside the reviewed publisher download list')
    expected = 'CC-BY-4.0' if source['adaptationAllowed'] else 'CC-BY-ND-3.0'
    if source['license'] != expected or source['format'] not in ('pdf', 'epub'):
        raise ValueError('Unsupported rights or format')
    if source['format'] == 'epub' and not source['adaptationAllowed']:
        raise ValueError('Only adaptable EPUB editions can be parsed')


def inspect_epub(path):
    with ZipFile(path) as archive:
        if len(archive.infolist()) > 20000 or any(row.file_size > 50000000 for row in archive.infolist()):
            raise ValueError('EPUB exceeds inspection bounds')
        container = ET.fromstring(archive.read('META-INF/container.xml'))
        rootfile = next(node.attrib['full-path'] for node in container.iter() if node.tag.endswith('rootfile'))
        if archive.getinfo(rootfile).file_size > 2000000:
            raise ValueError('Oversized EPUB package metadata')
        package = ET.fromstring(archive.read(rootfile))
        metadata = {}
        for node in package.iter():
            tag = node.tag.split('}')[-1]
            if tag in ('title', 'creator', 'rights') and node.text:
                metadata.setdefault(tag, []).append(node.text.strip())
        metadata['htmlDocuments'] = sum(row.filename.endswith(('.html', '.xhtml', '.htm')) for row in archive.infolist())
        metadata['licenseEvidenceFiles'] = [row.filename for row in archive.infolist() if row.filename.endswith(('.html', '.xhtml')) and any(word in row.filename.lower() for word in ('license', 'copyright', 'colophon', 'frontmatter', 'front-matter'))][:30]
        notices = '\n'.join(archive.read(name).decode('utf-8-sig') for name in metadata['licenseEvidenceFiles'] if archive.getinfo(name).file_size < 2000000)
        metadata['licenseUrls'] = sorted(set(re.findall(r'https?://creativecommons.org/licenses/[^\s"<>]+', notices)))
        return metadata


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--download', action='store_true', help='Explicitly fetch reviewed open-license files')
    args = parser.parse_args()
    config = json.loads((ROOT / 'sample-assets/content-library/sources.json').read_text(encoding='utf-8'))
    for source in config['sources']:
        validate_source(source)
    if not args.download:
        print(json.dumps({'sources': len(config['sources']), 'maximumBytes': config['maximumDownloadBytes'], 'networkUsed': False}))
        return
    destination = DIRECTORY / 'downloads'
    destination.mkdir(parents=True, exist_ok=True)
    report = {'version': config['version'], 'files': [], 'providerUploads': 0}
    total = 0
    for source in config['sources']:
        target = destination / (source['id'] + '.' + source['format'])
        if not target.exists():
            temporary = target.with_suffix(target.suffix + '.part')
            size = 0
            try:
                with urlopen(Request(source['url'], headers={'User-Agent': 'StudySphere licensed-content test fixture downloader'}), timeout=45) as response, temporary.open('wb') as output:
                    if urlparse(response.geturl()).hostname != 'www.siyavula.com':
                        raise ValueError('Unexpected publisher redirect')
                    for block in iter(lambda: response.read(262144), b''):
                        size += len(block)
                        if size > source['maximumBytes'] or total + size > config['maximumDownloadBytes']:
                            raise ValueError('Download budget exceeded')
                        output.write(block)
                temporary.replace(target)
            finally:
                if temporary.exists():
                    temporary.unlink()
        size = target.stat().st_size
        if size > source['maximumBytes'] or total + size > config['maximumDownloadBytes']:
            raise ValueError('Cached source exceeds download budget')
        total += size
        if source['format'] == 'pdf' and not target.read_bytes().startswith(b'%PDF-'):
            raise ValueError('Expected PDF signature')
        row = {**source, 'localPath': str(target.relative_to(ROOT)).replace('\\', '/'), 'bytes': size, 'sha256': sha256(target.read_bytes()).hexdigest(), 'unchangedPublisherFile': True}
        if source['format'] == 'epub':
            row['metadata'] = inspect_epub(target)
            if not any(url.rstrip('/').endswith('creativecommons.org/licenses/by/4.0') for url in row['metadata']['licenseUrls']):
                raise ValueError('The downloaded edition does not confirm the expected adaptation license')
        report['files'].append(row)
        report['totalBytes'] = total
        (DIRECTORY / 'download-report.json').write_text(json.dumps(report, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
        print(json.dumps({'downloaded': source['id'], 'bytes': size, 'totalBytes': total}), flush=True)
    print('Reviewed files saved locally; no provider uploads or curriculum-completeness claim.')


if __name__ == '__main__':
    main()
