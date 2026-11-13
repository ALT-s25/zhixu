"""Restore flattened note files without removing existing public URLs."""
import json
import os
import re
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path.cwd().resolve()
index = json.loads((ROOT / 'library-search-index.json').read_text(encoding='utf-8'))
paths = sorted({unquote(x['url'].split('#')[0]) for x in index['sections']})
created = []
missing = []
for relative in paths:
    target = (ROOT / relative).resolve()
    if not target.is_relative_to(ROOT) or target == ROOT:
        raise ValueError('Unsafe indexed path: ' + relative)
    if target.is_file():
        continue
    source = ROOT / target.name
    if not source.is_file():
        missing.append(relative)
        continue
    target.parent.mkdir(parents=True, exist_ok=True)
    if target.suffix.lower() == '.html':
        text = source.read_text(encoding='utf-8')
        # Earlier image organization may have rewritten root HTML to assets/... .
        # Keep valid original ../ links; rebase only links that resolve at root.
        def repair(match):
            value = match.group(3)
            url = urlsplit(value)
            if url.scheme or url.netloc or not url.path or url.path.startswith('/'):
                return match.group(0)
            original = (source.parent / unquote(url.path)).resolve()
            expected = (target.parent / unquote(url.path)).resolve()
            if expected.is_file() or not original.is_relative_to(ROOT) or not original.is_file():
                return match.group(0)
            replacement = os.path.relpath(original, target.parent).replace(os.sep, '/')
            if url.query:
                replacement += '?' + url.query
            if url.fragment:
                replacement += '#' + url.fragment
            return match.group(1) + match.group(2) + replacement + match.group(2)
        text = re.sub(r'''((?:src|href)\s*=\s*)(["'])(.*?)\2''', repair, text, flags=re.I)
        target.write_text(text, encoding='utf-8')
    else:
        target.write_bytes(source.read_bytes())
    created.append(relative)
print(f'Restored {len(created)} paths; kept existing root files.')
for path in created:
    print('RESTORED', path)
for path in missing:
    print('MISSING SOURCE', path)
report = f'Restored: {len(created)}\nMissing source: {len(missing)}\n' + '\n'.join(missing)
if os.environ.get('GITHUB_STEP_SUMMARY'):
    with open(os.environ['GITHUB_STEP_SUMMARY'], 'a', encoding='utf-8') as out:
        out.write('### Note path restoration\n```text\n' + report + '\n```\n')
