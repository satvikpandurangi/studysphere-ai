from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

base = Path(__file__).resolve().parent.parent / 'outputs'
project = base / 'studysphere-ai'
archive = base / 'studysphere-ai-source.zip'
allowed_dirs = {'src', 'worker', 'supabase', 'sample-assets', 'tests'}
allowed_files = {
    '.env.example', '.gitignore', 'eslint.config.js', 'index.html',
    'OPERATIONS.md', 'package-lock.json', 'package.json', 'README.md', 'START_HERE.md', 'ZERO_COST_PILOT.md',
    'tsconfig.app.json', 'tsconfig.json', 'tsconfig.worker.json',
    'vite.config.ts', 'wrangler.toml',
}
with ZipFile(archive, 'w', compression=ZIP_DEFLATED) as output:
    for path in project.rglob('*'):
        if not path.is_file():
            continue
        relative = path.relative_to(project)
        if relative.parts[0] in allowed_dirs or relative.as_posix() in allowed_files:
            output.write(path, Path('studysphere-ai') / relative)
print(f'{archive} ({archive.stat().st_size:,} bytes)')
