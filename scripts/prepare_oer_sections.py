"""Select complete, credited paragraphs only from the verified adaptable editions."""
from hashlib import sha256
from html.parser import HTMLParser
from pathlib import Path
from zipfile import ZipFile
import json

ROOT = Path(__file__).resolve().parent.parent
BASE = ROOT / '.local/content-library'
SELECTIONS = [
    ('siyavula-science-4', 'OPS/xhtml/Grade-4/mm.xhtml', 'Everything around us is made up of matter.', 'Matter around us', 4),
    ('siyavula-science-6', 'OPS/xhtml/Grade-6/ll.xhtml', 'Photosynthesis is the process that plants use', 'How plants use sunlight', 6),
    ('siyavula-science-6', 'OPS/xhtml/Grade-6/ll.xhtml', "Photosynthesis is the process inside plants", 'Plants and food energy', 6),
]


class Paragraphs(HTMLParser):
    def __init__(self):
        super().__init__()
        self.active = False
        self.parts = []
        self.paragraphs = []

    def handle_starttag(self, tag, _attributes):
        if tag == 'p':
            self.active = True
            self.parts = []

    def handle_data(self, data):
        if self.active:
            self.parts.append(data)

    def handle_endtag(self, tag):
        if tag == 'p' and self.active:
            self.paragraphs.append(' '.join(''.join(self.parts).split()))
            self.active = False


def main():
    report = json.loads((BASE / 'download-report.json').read_text(encoding='utf-8'))
    sources = {row['id']: row for row in report['files']}
    sections = []
    for index, (source_id, member, prefix, title, grade) in enumerate(SELECTIONS):
        source = sources[source_id]
        if not source['adaptationAllowed'] or source['license'] != 'CC-BY-4.0':
            raise ValueError('Only verified adaptable editions can supply text')
        path = ROOT / source['localPath']
        if sha256(path.read_bytes()).hexdigest() != source['sha256']:
            raise ValueError('Source changed since inspection')
        with ZipFile(path) as archive:
            if archive.getinfo(member).file_size > 2000000:
                raise ValueError('Oversized chapter')
            parser = Paragraphs()
            parser.feed(archive.read(member).decode('utf-8-sig'))
        selected = [p for p in parser.paragraphs if p.startswith(prefix)]
        if len(selected) != 1 or len(selected[0]) > 1800 or '\ufffd' in selected[0]:
            raise ValueError('Expected one complete clean paragraph')
        body = selected[0]
        credit = f"Siyavula Education, {source['title']}, Everything Maths and Science. CC BY 4.0. Original source freely available from {source['url']}. Selected paragraph converted to plain-text Markdown; illustrations omitted."
        sections.append({'key': f'oer-{index+1}', 'grade': grade, 'subject': 'Science', 'title': title, 'body_md': f"**Licensed reference excerpt for product testing; Indian-board alignment is not approved.**\n\n{body}\n\n---\n\n{credit}\n\n[License]({source['licenseUrl']})", 'attribution': credit, 'source': {'id': source_id, 'member': member, 'license': source['license'], 'url': source['url'], 'sha256': source['sha256']}, 'reviewStatus': 'reference_excerpt_not_teacher_approved'})
    (BASE / 'licensed-sections.json').write_text(json.dumps({'sections': sections, 'copiedNCERTOrKTBS': False}, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    print(f'{len(sections)} licensed reference excerpts prepared; no restricted textbooks or PDFs imported.')


if __name__ == '__main__':
    main()
