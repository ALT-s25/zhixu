from pathlib import Path
from urllib.parse import unquote, urlsplit
import os, re, hashlib, json

root = Path.cwd().resolve()
images = {p.name: p for p in root.glob('*.png')}
target = root / 'assets/images/notes'
changes = []
hashes = {n: hashlib.sha256(p.read_bytes()).hexdigest() for n,p in images.items()}
if images:
    target.mkdir(parents=True, exist_ok=True)
    for name, source in images.items():
        dest = target / name
        if dest.exists():
            raise RuntimeError('Destination already exists; no files moved: ' + str(dest))
    pattern = re.compile(r'''(?<![^\s"'<>`()=])[^\s"'<>`()=]+\.png(?:\?[^\s"'<>`()]*|\#[^\s"'<>`()]*|)''')
    for path in root.rglob('*'):
        if '.git' in path.parts or not path.is_file() or path.suffix.lower() not in {'.html','.css','.js','.json','.md','.svg'}:
            continue
        try:
            text = path.read_text(encoding='utf-8')
        except UnicodeDecodeError:
            continue
        count = [0]
        def replace(m):
            value = m.group(); url = urlsplit(value)
            if url.scheme or value.startswith('//'):
                return value
            name = Path(unquote(url.path)).name
            if name not in images:
                return value
            existing = (path.parent / unquote(url.path)).resolve()
            # Preserve valid references to independent copies in other directories.
            if existing.is_file() and existing != images[name]:
                return value
            count[0] += 1
            new = os.path.relpath(target/name, path.parent).replace('\\','/')
            return new + ('?'+url.query if url.query else '') + ('#'+url.fragment if url.fragment else '')
        updated = pattern.sub(replace, text)
        if updated != text:
            path.write_text(updated, encoding='utf-8')
            changes.append({'file':str(path.relative_to(root)), 'references':count[0]})
    for name, source in images.items():
        source.rename(target/name)
    for name, digest in hashes.items():
        assert hashlib.sha256((target/name).read_bytes()).hexdigest() == digest
    assert not list(root.glob('*.png'))
print(json.dumps({'moved':len(images),'changed':changes,'image_bytes_verified':True}, ensure_ascii=False, indent=2))
