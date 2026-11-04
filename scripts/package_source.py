"""Package allowlisted first-party source; never traverse local/runtime folders."""
from hashlib import sha256
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

ROOT = Path(__file__).resolve().parent.parent
FOLDERS = ("src", "worker", "supabase", "tests", "sample-assets", "docs", "scripts", "archive")
ROOT_FILES = (
    "README.md", "AGENTS.md", ".env.example", ".gitignore", "package.json",
    "package-lock.json", "index.html", "eslint.config.js", "tsconfig.json",
    "tsconfig.app.json", "tsconfig.worker.json", "vite.config.ts",
    "vite.worker-bundle.config.ts", "wrangler.toml", "wrangler.deploy.toml", "wrangler.app.toml",
)
FORBIDDEN_PARTS = {"node_modules", "__pycache__", ".git", ".local", ".xdg", ".wrangler", ".npm-cache", "artifacts", "dist", "worker-dist"}


def collect(folder):
    for item in sorted(folder.iterdir()):
        if item.is_symlink():
            raise RuntimeError(f"Refusing symlink: {item.relative_to(ROOT)}")
        if item.name in FORBIDDEN_PARTS:
            continue
        if item.is_dir():
            yield from collect(item)
        elif item.is_file():
            yield item


def main():
    files = [ROOT / name for name in ROOT_FILES]
    for folder in FOLDERS:
        files.extend(collect(ROOT / folder))
    for file in files:
        if file.is_symlink() or not file.is_file():
            raise RuntimeError(f"Missing or unsafe source file: {file.relative_to(ROOT)}")
        if (file.name.startswith('.env') and file.name != '.env.example') or file.name.startswith('.dev.vars') or file.suffix in {'.zip', '.log', '.pyc'}:
            raise RuntimeError(f"Refusing local/generated file: {file.relative_to(ROOT)}")
    target = ROOT / 'artifacts' / 'releases' / 'studysphere-ai-source.zip'
    target.parent.mkdir(parents=True, exist_ok=True)
    temporary = target.with_suffix('.zip.tmp')
    with ZipFile(temporary, 'w', compression=ZIP_DEFLATED) as archive:
        for file in sorted(files):
            archive.write(file, Path('studysphere-ai') / file.relative_to(ROOT))
    with ZipFile(temporary) as archive:
        if archive.testzip() is not None or len(archive.namelist()) != len(files):
            raise RuntimeError('Archive integrity check failed')
    temporary.replace(target)
    print(f'{target.relative_to(ROOT)}: {len(files)} files, {target.stat().st_size:,} bytes')
    print(f'SHA256 {sha256(target.read_bytes()).hexdigest()}')


if __name__ == '__main__':
    main()
