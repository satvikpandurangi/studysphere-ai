from pathlib import Path
path=Path('outputs/studysphere-ai/src/pages/StudentPages.tsx')
text=path.read_text(encoding='utf-8')
marker='type TutorMessage='
assert marker in text
path.write_text(text.split(marker)[0],encoding='utf-8')
