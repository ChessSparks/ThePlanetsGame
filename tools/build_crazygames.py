"""Build the CrazyGames upload: crazygames/build/ (only the files the game loads) + a zip of it.

Run from the project folder:  python tools/build_crazygames.py
Models are included only when a page or script names them, so unused ones (planet 6, spares) stay out.
"""
import shutil, zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'crazygames'
BUILD = OUT / 'build'
ZIP = OUT / 'planets-crazygames.zip'
SKIP_SRC = {'intro.js'}   # the studio intro isn't played on CrazyGames (players go straight into the game)

files = [Path('index.html'), Path('game.html')]
files += [p.relative_to(ROOT) for p in (ROOT / 'src').glob('*.js') if p.name not in SKIP_SRC]
files += [p.relative_to(ROOT) for p in (ROOT / 'vendor').rglob('*') if p.is_file()]
refs = ''.join((ROOT / p).read_text(encoding='utf-8') for p in files if p.suffix in ('.js', '.html') and p.parts[0] != 'vendor')
assets = [p for p in ROOT.glob('*.glb')] + [p for p in (ROOT / 'models').rglob('*') if p.is_file()]
used = [p.relative_to(ROOT) for p in assets if p.name in refs]
files += used

shutil.rmtree(BUILD, ignore_errors=True)
for p in files:
    (BUILD / p).parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(ROOT / p, BUILD / p)

ZIP.unlink(missing_ok=True)
with zipfile.ZipFile(ZIP, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for p in sorted(files):
        z.write(BUILD / p, p.as_posix())

size = sum((BUILD / p).stat().st_size for p in files)
print(f'{len(files)} files, {size / 2**20:.1f} MB -> {BUILD}')
print(f'zip: {ZIP.stat().st_size / 2**20:.1f} MB -> {ZIP}')
print(f'left out {len(assets) - len(used)} unused model/art files')
