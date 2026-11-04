"""Index official syllabus links, not textbook bodies or a claim of full coverage."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlparse
import csv
import json

ROOT = Path(__file__).resolve().parent.parent
BASE = ROOT / '.local/content-library'
SOURCE = 'https://cbseacademic.nic.in/curriculum_2027.html'


class Index(HTMLParser):
    def __init__(self):
        super().__init__()
        self.grade = None
        self.group = None
        self.heading = False
        self.heading_text = []
        self.link = None
        self.rows = []

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        if tag == 'h4':
            self.heading = True
            self.heading_text = []
        if tag == 'a':
            self.link = {'href': attrs.get('href', ''), 'text': []}

    def handle_data(self, text):
        if self.heading:
            self.heading_text.append(text)
        if self.link is not None:
            self.link['text'].append(text)

    def handle_endtag(self, tag):
        if tag == 'h4':
            title = ' '.join(''.join(self.heading_text).split())
            self.heading = False
            if '(Class IX)' in title:
                self.grade, self.group = 9, None
            elif '(Class X)' in title:
                self.grade, self.group = 10, None
            elif 'XI-XII' in title:
                self.grade, self.group = None, None
            elif self.grade and any(word in title for word in ('Languages', 'Main Subjects', 'Optional Subjects', 'Electives', 'Internal Assessment')):
                self.group = title
        if tag == 'a' and self.link is not None:
            link, self.link = self.link, None
            url = urljoin(SOURCE, link['href'])
            if self.grade and self.group and urlparse(url).hostname == 'cbseacademic.nic.in' and urlparse(url).path.lower().endswith('.pdf'):
                label = ' '.join(''.join(link['text']).split())
                if label in ('Course A', 'Course B'):
                    label = 'Urdu ' + label
                self.rows.append({'board': 'CBSE', 'academicYear': '2026-27', 'grade': self.grade, 'group': self.group, 'subjectLabel': label, 'sourceUrl': url, 'chapterInventoryVerified': False, 'materialsImported': False})


def main():
    parser = Index()
    parser.feed((BASE / 'cbse-2026-27-curriculum.html').read_text(encoding='utf-8'))
    if not parser.rows or {row['grade'] for row in parser.rows} != {9, 10}:
        raise ValueError('Official subject index structure was not recognized')
    rows = list({(r['grade'], r['group'], r['subjectLabel'], r['sourceUrl']): r for r in parser.rows}.values())
    summary = {str(grade): {'listedLinks': sum(r['grade'] == grade for r in rows), 'groups': sorted({r['group'] for r in rows if r['grade'] == grade})} for grade in (9, 10)}
    result = {'source': SOURCE, 'retrievedOn': '2026-10-29', 'scope': 'Official secondary subject/course index only; not all items are required for every learner', 'grades': summary, 'rows': rows, 'completeSyllabus': False}
    (BASE / 'cbse-secondary-subject-index.json').write_text(json.dumps(result, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    with (BASE / 'cbse-secondary-subject-index.csv').open('w', encoding='utf-8', newline='') as output:
        writer = csv.DictWriter(output, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)
    print(json.dumps({'officialSubjectLinks': len(rows), 'grades': summary, 'textbooksCopied': False, 'completeSyllabus': False}))


if __name__ == '__main__':
    main()
